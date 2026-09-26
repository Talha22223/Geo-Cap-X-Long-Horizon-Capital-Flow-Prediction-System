"""
Kafka Stream Ingestion Source Adapter.
Provides real-time event streaming ingestion with Kafka broker support and resilient stream buffering.
"""
from __future__ import annotations
import os
import json
import logging
from datetime import datetime, timezone
from typing import Any
from collections import deque
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)

# In-memory streaming buffer for real-time internal event queue
_STREAM_BUFFER: deque[dict[str, Any]] = deque(maxlen=1000)


def publish_to_stream(topic: str, payload: dict[str, Any], key: str | None = None) -> None:
    """
    Utility to push event messages onto the internal stream buffer.
    """
    _STREAM_BUFFER.append({
        "topic": topic,
        "key": key,
        "payload": payload,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "offset": len(_STREAM_BUFFER) + 1,
    })


class KafkaStreamSource(BaseSource):
    def __init__(self) -> None:
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
        self.default_topic = os.getenv("KAFKA_TOPIC", "financial-events")
        self.consumer_group = os.getenv("KAFKA_CONSUMER_GROUP", "geocapx-consumer")

    @property
    def source_name(self) -> str:
        return "kafka"

    @property
    def source_type(self) -> str:
        return "EVENT_STREAM"

    def is_configured(self) -> bool:
        return True

    async def fetch(self, topic: str | None = None, max_items: int = 50, **kwargs) -> list[IngestionItem]:
        """
        Poll streaming records from Kafka or the resilient streaming buffer.
        """
        target_topic = topic or self.default_topic
        items: list[IngestionItem] = []

        # 1. Attempt live Kafka connection if configured and aiokafka is present
        if self.bootstrap_servers:
            try:
                import aiokafka  # type: ignore
                consumer = aiokafka.AIOKafkaConsumer(
                    target_topic,
                    bootstrap_servers=self.bootstrap_servers,
                    group_id=self.consumer_group,
                    auto_offset_reset="earliest",
                    consumer_timeout_ms=1000,
                )
                await consumer.start()
                try:
                    data = await consumer.getmany(timeout_ms=1000, max_records=max_items)
                    for tp, messages in data.items():
                        for msg in messages:
                            payload = json.loads(msg.value.decode("utf-8"))
                            item = IngestionItem(
                                title=payload.get("title", f"Stream Event {msg.offset}"),
                                body=payload.get("body") or payload.get("summary", ""),
                                published_at=datetime.fromtimestamp(msg.timestamp / 1000, tz=timezone.utc)
                                if msg.timestamp
                                else datetime.now(timezone.utc),
                                url=payload.get("url"),
                                external_id=f"kafka_{tp.topic}_{msg.partition}_{msg.offset}",
                                metadata_json={
                                    "topic": tp.topic,
                                    "partition": msg.partition,
                                    "offset": msg.offset,
                                    "source": "KAFKA",
                                },
                            )
                            items.append(item)
                finally:
                    await consumer.stop()
                if items:
                    return items
            except Exception as e:
                logger.warning(f"KafkaStreamSource: Broker connection error: {e}. Falling back to internal stream buffer.")

        # 2. Resilient Stream Buffer Processing
        drain_count = min(len(_STREAM_BUFFER), max_items)
        for _ in range(drain_count):
            entry = _STREAM_BUFFER.popleft()
            payload = entry.get("payload", {})
            pub_dt = datetime.now(timezone.utc)
            if "timestamp" in entry:
                try:
                    pub_dt = datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
                except Exception:
                    pass

            item = IngestionItem(
                title=payload.get("title", f"Stream Event {entry.get('offset', 1)}"),
                body=payload.get("body") or payload.get("summary") or str(payload),
                published_at=pub_dt,
                url=payload.get("url"),
                external_id=f"stream_{entry.get('topic', 'events')}_{entry.get('offset', 1)}",
                metadata_json={
                    "topic": entry.get("topic", target_topic),
                    "offset": entry.get("offset"),
                    "key": entry.get("key"),
                    "source": "EVENT_STREAM",
                },
            )
            items.append(item)

        logger.info(f"KafkaStreamSource: Streamed {len(items)} items from topic '{target_topic}'.")
        return items
