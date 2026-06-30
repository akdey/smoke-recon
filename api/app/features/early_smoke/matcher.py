import re
import logging
from typing import List, Dict, Any, Set
import spacy
from rapidfuzz import process, fuzz
from app.features.early_smoke.dictionary import corporate_dict

logger = logging.getLogger("matcher")

# Absolute word exclusion blacklist of ambiguous conversational words mimicking tickers.
EXCLUSION_BLACKLIST: Set[str] = {
    "yes",
    "good",
    "on",
    "no",
    "it",
    "so",
    "buy",
    "sell",
    "ceo",
    "ipo",
    "sme",
    "today",
    "now",
    "see",
    "go",
    "up",
    "down",
    "call",
    "put",
    "out",
    "run",
    "key",
}

class TickerMatcher:
    """
    Extracts stock tickers from raw text using a hybrid SpaCy NER and exact-match-first strategy.
    """

    def __init__(self) -> None:
        # Load the lightweight SpaCy English model
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            # Fallback loading if model path is direct
            try:
                import en_core_web_sm
                self.nlp = en_core_web_sm.load()
            except Exception as e:
                logger.error(f"Failed to load SpaCy model: {e}. Falling back to empty model pipeline.")
                self.nlp = spacy.blank("en")

    def extract_mentions(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts valid listed stock tickers from raw text using a 3-stage pipeline:

        Stage 1 — Cashtag scan: Explicit $TICKER mentions (highest confidence, zero noise).
        Stage 2 — Uppercase scan: ALL-CAPS tokens of length >= 3 that are exact ticker symbols.
                   This is the primary signal path for Indian finance communities (Reddit ISB, Twitter).
                   Uses the EXCLUSION_BLACKLIST to eliminate noise words.
        Stage 3 — SpaCy entity fuzzy match: Multi-word company names from NER (e.g. "Reliance Industries").
                   Only fires on SpaCy ORG/PRODUCT entities, requires score >= 90 Levenshtein.
        """
        if not text:
            return []

        mentions: List[Dict[str, Any]] = []
        seen_tickers: Set[str] = set()

        def _add(ticker: str, match_type: str, confidence: float) -> None:
            if ticker not in seen_tickers:
                seen_tickers.add(ticker)
                mentions.append({"ticker": ticker, "match_type": match_type, "confidence": confidence})

        # ── Stage 1: Cashtag scan ─────────────────────────────────────────────
        # Matches $HDFCBANK, $INFY, etc. directly — zero noise.
        for cashtag in re.findall(r"\$([A-Za-z][A-Za-z0-9]{1,14})", text):
            lookup = cashtag.lower()
            if lookup in EXCLUSION_BLACKLIST:
                continue
            ticker = corporate_dict.get_ticker(lookup)
            if ticker:
                _add(ticker, "exact", 1.0)

        # ── Stage 2: Uppercase token scan ────────────────────────────────────
        # Matches ALL-CAPS tokens that are exact ticker symbols.
        # min len=3 eliminates abbreviations like "I", "UP", "NO".
        # This is the dominant signal path for r/IndianStreetBets, Twitter.
        for token in re.findall(r"\b[A-Z][A-Z0-9]{2,14}\b", text):
            lookup = token.lower()
            if lookup in EXCLUSION_BLACKLIST:
                continue
            ticker = corporate_dict.get_ticker(lookup)
            # Only accept if the dictionary key is the ticker symbol itself
            # (prevents colloquial name overrides from matching on generic caps words)
            if ticker and ticker == token:
                _add(ticker, "exact", 1.0)

        # ── Stage 3: SpaCy entity fuzzy matching ──────────────────────────────
        # Only for multi-word company names (e.g. "Reliance Industries").
        # SpaCy en_core_web_sm is unreliable for Indian names — so we require
        # a very high Levenshtein score (>= 90) and multi-word entities only.
        doc = self.nlp(text)
        entity_texts = [
            ent.text.strip()
            for ent in doc.ents
            if ent.label_ in ["ORG", "PRODUCT"] and " " in ent.text.strip()
        ]

        if entity_texts:
            known_names = corporate_dict.get_all_names()
            for entity in entity_texts:
                entity_lower = entity.lower()
                if entity_lower in EXCLUSION_BLACKLIST:
                    continue
                match = process.extractOne(entity_lower, known_names, scorer=fuzz.ratio)
                if match:
                    matched_name, score, _ = match
                    if score >= 90.0 and matched_name not in EXCLUSION_BLACKLIST:
                        ticker = corporate_dict.get_ticker(matched_name)
                        if ticker:
                            _add(ticker, "fuzzy", float(score) / 100.0)

        return mentions

# Global matcher instance
ticker_matcher = TickerMatcher()
