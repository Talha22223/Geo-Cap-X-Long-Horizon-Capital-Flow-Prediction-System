"""
Text Normalization Utility for Ingestion Pipeline.
"""
import re
import html
import unicodedata
from config import settings


class TextNormalizer:
    @staticmethod
    def normalize(text: str) -> str:
        """
        Normalize text to ensure consistent string formatting.
        - Unescapes HTML entities
        - Normalizes Unicode characters to NFKC form
        - Cleans whitespaces and strips leading/trailing blocks
        - Standardizes quotes and hyphens
        """
        if not text:
            return ""

        # Unescape HTML entities
        text = html.unescape(text)

        # Normalize unicode NFKC form
        text = unicodedata.normalize("NFKC", text)

        # Strip HTML tags
        text = re.sub(r"<[^>]+>", " ", text)

        # Standardize curly quotes and long hyphens
        text = (
            text.replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
            .replace("—", "-")
            .replace("–", "-")
        )

        # Clean multiple spaces and newlines
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    @staticmethod
    def is_valid(text: str) -> bool:
        """Verify normalized text satisfies length limits to discard empty boilerplate."""
        return len(text) >= settings.MIN_TEXT_LENGTH
