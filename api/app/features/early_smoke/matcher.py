import re
from typing import List, Dict, Any, Set
from rapidfuzz import process, fuzz
from app.features.early_smoke.dictionary import corporate_dict

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
    Extracts stock tickers from raw text using fuzzy matching against cached corporate mappings
    and filtering out blacklist overlaps.
    """

    def __init__(self, confidence_threshold: float = 85.0) -> None:
        self.confidence_threshold = confidence_threshold

    def extract_mentions(self, text: str) -> List[Dict[str, Any]]:
        """
        Scans input text, resolves colloquial snippets to tickers, and filters out false positives.
        """
        if not text:
            return []

        # Tokenize and clean text
        cleaned_text = re.sub(r"[^\w\s&]", " ", text)
        words = [w.strip() for w in cleaned_text.split() if w.strip()]

        mentions: List[Dict[str, Any]] = []
        seen_tickers: Set[str] = set()

        # Check single words and adjacent word pairs
        candidates: List[str] = []
        for i, word in enumerate(words):
            candidates.append(word)
            if i < len(words) - 1:
                candidates.append(f"{word} {words[i + 1]}")

        known_names = corporate_dict.get_all_names()

        for candidate in candidates:
            candidate_lower = candidate.lower()

            # Skip single-word tokens that are in the exclusion blacklist
            if candidate_lower in EXCLUSION_BLACKLIST:
                continue

            # Fuzzy match candidate against known corporate names
            match = process.extractOne(candidate_lower, known_names, scorer=fuzz.WRatio)

            if match:
                matched_name, score, _ = match
                if score >= self.confidence_threshold:
                    # Reject matches on blacklisted words unless it is a near-exact match
                    if matched_name in EXCLUSION_BLACKLIST and score < 95.0:
                        continue

                    ticker = corporate_dict.get_ticker(matched_name)
                    if ticker and ticker not in seen_tickers:
                        # Extra guardrail: if matched ticker is YESBANK but the user only typed "yes", skip it.
                        if ticker == "YESBANK" and candidate_lower == "yes":
                            continue
                        if ticker == "GOODRICKE" and candidate_lower == "good":
                            continue

                        seen_tickers.add(ticker)
                        mentions.append(
                            {
                                "ticker": ticker,
                                "match_type": "exact" if score == 100.0 else "fuzzy",
                                "confidence": float(score) / 100.0,
                            }
                        )

        return mentions


# Global matcher instance
ticker_matcher = TickerMatcher()
