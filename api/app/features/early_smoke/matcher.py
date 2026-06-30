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
        Extracts valid listed stock tickers from raw text.
        1. Runs SpaCy NER to extract organization/product/person entities.
        2. Scans token candidates. A candidate is only considered if it is an explicit Cashtag ($TICKER),
           or strictly UPPERCASE, or recognized by SpaCy as an Entity.
        3. Runs exact dictionary lookups on these strictly filtered candidates.
        4. Runs Levenshtein fuzzy matching only on multi-word extracted entities.
        """
        if not text:
            return []

        mentions: List[Dict[str, Any]] = []
        seen_tickers: Set[str] = set()

        # 1. Run SpaCy Named Entity Recognition
        doc = self.nlp(text)
        entities = [
            ent.text.strip().lower() 
            for ent in doc.ents 
            if ent.label_ in ["ORG", "PRODUCT", "PERSON"]
        ]

        # 2. Tokenize candidates
        # Keep original case for casing rules
        cleaned_text = re.sub(r"[^\w\s&$]", " ", text)
        words = [w.strip() for w in cleaned_text.split() if w.strip()]

        candidates: List[str] = []
        for i, word in enumerate(words):
            candidates.append(word)
            if i < len(words) - 1:
                # Add bigrams (e.g. "Reliance Industries")
                candidates.append(f"{word} {words[i + 1]}")

        for candidate in candidates:
            candidate_lower = candidate.lower()
            if candidate_lower in EXCLUSION_BLACKLIST:
                continue

            # Strict Filter: Must be Cashtag, OR completely Uppercase, OR a SpaCy Entity
            is_cashtag = candidate.startswith("$") and len(candidate) > 1
            is_uppercase = candidate.isupper() and len(candidate) > 2
            is_entity = any(candidate_lower in ent or ent in candidate_lower for ent in entities)

            if not (is_cashtag or is_uppercase or is_entity):
                continue
                
            # Clean cashtag prefix for lookup
            lookup_key = candidate_lower.lstrip("$")

            # Check exact O(1) dictionary match
            ticker = corporate_dict.get_ticker(lookup_key)
            if ticker:
                if ticker not in seen_tickers:
                    # Extra guardrails: skip exact matches on conversational blacklisted words
                    if ticker == "YESBANK" and lookup_key == "yes":
                        continue
                    if ticker == "GOODRICKE" and lookup_key == "good":
                        continue

                    seen_tickers.add(ticker)
                    mentions.append(
                        {
                            "ticker": ticker,
                            "match_type": "exact",
                            "confidence": 1.0,
                        }
                    )
                continue

            # 3. If no exact match, check fuzzy matching ONLY for long entities
            # This allows fuzzy matching on spelling mistakes ONLY if the word is classified as an Entity
            if is_entity and len(lookup_key) >= 5 and " " in lookup_key:
                known_names = corporate_dict.get_all_names()
                match = process.extractOne(lookup_key, known_names, scorer=fuzz.ratio)
                if match:
                    matched_name, score, _ = match
                    # Require high Levenshtein ratio for fuzzy spelling
                    if score >= 90.0:
                        if matched_name in EXCLUSION_BLACKLIST:
                            continue

                        ticker = corporate_dict.get_ticker(matched_name)
                        if ticker and ticker not in seen_tickers:
                            seen_tickers.add(ticker)
                            mentions.append(
                                {
                                    "ticker": ticker,
                                    "match_type": "fuzzy",
                                    "confidence": float(score) / 100.0,
                                }
                            )

        return mentions

# Global matcher instance
ticker_matcher = TickerMatcher()
