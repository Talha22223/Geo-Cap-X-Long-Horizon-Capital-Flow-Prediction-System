"""
11-Step Ingestion and Inference Pipeline Orchestrator.
"""
from datetime import datetime, timezone
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from ingestion.sources.registry import SourceRegistry
from ingestion.normalizer import TextNormalizer
from ingestion.deduplicator import MultiStrategyDeduplicator
from providers.base import BaseNLPProvider
from models.event import RawEvent, ExtractedEvent, EventEntity
from models.provider_status import ProviderStatus
from core.exceptions import DuplicateEventException, IngestionException
from ingestion.resolver import EventResolver

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Main orchestrator implementing the 11-step processing pipeline.
    """

    def __init__(self, db: AsyncSession, nlp: BaseNLPProvider) -> None:
        self.db = db
        self.nlp = nlp

    async def run(self, source_name: str, **kwargs) -> dict:
        """
        Execute the pipeline for a given source adapter.
        """
        logger.info(f"Pipeline started for source: {source_name}")
        
        # Get or create ProviderStatus
        from sqlalchemy import select
        stmt = select(ProviderStatus).where(ProviderStatus.provider_name == source_name)
        res = await self.db.execute(stmt)
        status_record = res.scalars().first()
        if not status_record:
            status_record = ProviderStatus(
                provider_name=source_name, 
                is_configured=True,
                records_fetched=0,
                records_accepted=0,
                records_rejected=0
            )
            self.db.add(status_record)
            
        if status_record.records_fetched is None:
            status_record.records_fetched = 0
        if status_record.records_accepted is None:
            status_record.records_accepted = 0
        if status_record.records_rejected is None:
            status_record.records_rejected = 0
            
        source = SourceRegistry.get_source(source_name)
        status_record.is_configured = source.is_configured()
        
        if not status_record.is_configured:
            logger.warning(f"Pipeline: Source '{source_name}' is not configured.")
            status_record.latest_error = "NOT_CONFIGURED"
            await self.db.commit()
            return {"source": source_name, "error": "NOT_CONFIGURED"}

        # Step 1: Fetch
        try:
            items = await source.fetch(**kwargs)
            status_record.last_successful_fetch = datetime.now(timezone.utc)
            status_record.records_fetched += len(items)
            status_record.latest_error = None
        except Exception as e:
            logger.exception(f"Pipeline: Source '{source_name}' failed to fetch: {e}")
            status_record.last_failure = datetime.now(timezone.utc)
            status_record.latest_error = str(e)
            await self.db.commit()
            return {"source": source_name, "error": str(e)}

        logger.info(f"Step 1 (Fetch): Retrieved {len(items)} items from '{source_name}'")

        processed_count = 0
        duplicate_count = 0
        failed_count = 0

        created_event_ids: list[str] = []

        for item in items:
            try:
                if not item.title or not item.body:
                    logger.warning(f"Item discarded due to missing title or body. URL: {item.url}")
                    failed_count += 1
                    continue

                # Step 2 & 3: Normalize & Clean
                normalized_title = TextNormalizer.normalize(item.title)
                normalized_body = TextNormalizer.normalize(item.body)
                
                if not TextNormalizer.is_valid(normalized_body):
                    logger.warning(f"Item discarded due to short length: '{item.title}'")
                    failed_count += 1
                    continue

                # Step 4: Deduplicate
                is_dup, dup_conf, reason = await MultiStrategyDeduplicator.is_duplicate(
                    self.db,
                    normalized_title,
                    normalized_body,
                    source.source_name,
                    item.published_at,
                    item.external_id,
                )

                if is_dup:
                    logger.info(f"Step 4 (Deduplicate): Duplicate detected. Reason: {reason}")
                    duplicate_count += 1
                    continue

                # Step 5: Extract Entities
                extraction_result = await self.nlp.extract_entities(normalized_body)

                # Step 6: Classify Event (Sentiment + Category)
                sentiment_result = await self.nlp.calculate_sentiment(normalized_body)
                classification_result = await self.nlp.classify_event(normalized_body)

                summary = await self.nlp.generate_summary(normalized_body)
                
                context = {
                    "category": classification_result.primary_category,
                    "entity_count": len(extraction_result.companies) + len(extraction_result.people) + len(extraction_result.organizations),
                    "countries_count": len(extraction_result.countries)
                }
                severity = await self.nlp.assess_severity(normalized_body, context)

                # Step 7: Store (RawEvent + ExtractedEvent + EventEntities)
                raw_ev = RawEvent(
                    source_id=source.source_name,
                    source_type=source.source_type,
                    external_id=item.external_id,
                    title=normalized_title,
                    body=normalized_body,
                    url=item.url,
                    published_at=item.published_at,
                    content_hash=MultiStrategyDeduplicator.calculate_hash(normalized_body),
                    is_processed=True,
                    metadata_json=item.metadata_json,
                )
                self.db.add(raw_ev)
                await self.db.flush()  # get raw_ev.id

                # Calculate overall confidence
                overall_confidence = (
                    0.20 * extraction_result.extraction_confidence +
                    0.30 * classification_result.classification_confidence +
                    0.50 * sentiment_result.classification_confidence
                )

                extracted_ev = ExtractedEvent(
                    raw_event_id=raw_ev.id,
                    title=normalized_title,
                    body=normalized_body,
                    summary=summary,
                    subtype=classification_result.secondary_categories[0] if classification_result.secondary_categories else None,
                    countries=extraction_result.countries,
                    regions=extraction_result.regions,
                    sectors=extraction_result.sectors,
                    asset_classes=extraction_result.asset_classes,
                    commodities=extraction_result.commodities,
                    industry=extraction_result.industries[0] if extraction_result.industries else None,
                    company=extraction_result.companies[0] if extraction_result.companies else None,
                    currency=extraction_result.currencies[0] if extraction_result.currencies else None,
                    organizations=extraction_result.organizations,
                    people=extraction_result.people,
                    event_date=extraction_result.event_dates[0] if extraction_result.event_dates else None,
                    severity=severity,
                    keywords=extraction_result.keywords,
                    category=classification_result.primary_category,
                    sentiment=sentiment_result.sentiment,
                    publication_timestamp=item.published_at,
                    source_provider=source.source_name,
                    source_url=item.url,
                    data_origin=source.source_type,
                    extraction_method=self.nlp.model_version,
                    extraction_confidence=extraction_result.extraction_confidence,
                    classification_confidence=classification_result.classification_confidence,
                    overall_confidence=round(overall_confidence, 3),
                )
                self.db.add(extracted_ev)
                await self.db.flush()  # get extracted_ev.id
                
                # Step 8: Event Clustering and Resolution
                resolver = EventResolver(self.db)
                canonical_ev = await resolver.resolve(extracted_ev)

                # Step 9: Save Entities
                for c in extraction_result.countries:
                    self.db.add(EventEntity(event_id=extracted_ev.id, entity_type="country", entity_value=c))
                for r in extraction_result.regions:
                    self.db.add(EventEntity(event_id=extracted_ev.id, entity_type="region", entity_value=r))
                for s in extraction_result.sectors:
                    self.db.add(EventEntity(event_id=extracted_ev.id, entity_type="sector", entity_value=s))
                for cur in extraction_result.currencies:
                    self.db.add(EventEntity(event_id=extracted_ev.id, entity_type="currency", entity_value=cur))
                for com in extraction_result.commodities:
                    self.db.add(EventEntity(event_id=extracted_ev.id, entity_type="commodity", entity_value=com))

                created_event_ids.append(extracted_ev.id)
                processed_count += 1

            except Exception as e:
                logger.exception(f"Error processing item: {item.title}: {e}")
                failed_count += 1
                continue

        # Commit ingested events
        status_record.records_accepted += processed_count
        status_record.records_rejected += (failed_count + duplicate_count)
        await self.db.commit()

        # Step 8: Build Event Chain (DiGraph builder)
        chains_built = 0
        if created_event_ids:
            from event_chain.builder import EventChainBuilder
            builder = EventChainBuilder(self.db)
            # Build/update default chain
            try:
                chain = await builder.build_default_chain(created_event_ids)
                chains_built = 1
                
                # Step 10: Run Social Network Analysis (SNA) centrality scores
                from sna.analyzer import NetworkAnalyzer
                analyzer = NetworkAnalyzer(self.db)
                await analyzer.analyze_chain(chain.id)
                
                # Step 9: Run Capital Flow Predictions
                from capital_flow.engine import CapitalFlowEngine
                engine = CapitalFlowEngine(self.db)
                await engine.generate_predictions_for_events(created_event_ids)

            except Exception as e:
                logger.exception(f"Pipeline: Failed downstream chain/SNA/flow stages: {e}")

        summary = {
            "source": source_name,
            "items_fetched": len(items),
            "events_ingested": processed_count,
            "duplicates_skipped": duplicate_count,
            "failures": failed_count,
            "chains_processed": chains_built,
        }
        logger.info(f"Pipeline finished: {summary}")
        return summary
