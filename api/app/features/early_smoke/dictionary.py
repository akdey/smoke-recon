import logging
from typing import Dict

logger = logging.getLogger("dictionary_loader")

# A pre-defined local mapping of colloquial abbreviations and company snippets to official tickers
# as a fallback/seed dictionary.
SEED_DICTIONARY: Dict[str, str] = {
    "infosys": "INFY",
    "infy": "INFY",
    "reliance": "RELIANCE",
    "tata motors": "TATAMOTORS",
    "tata": "TATAMOTORS",
    "mahindra": "M&M",
    "m&m": "M&M",
    "wipro": "WIPRO",
    "state bank of india": "SBIN",
    "sbin": "SBIN",
    "sbi": "SBIN",
    "hdfc bank": "HDFCBANK",
    "hdfc": "HDFCBANK",
    "icici bank": "ICICIBANK",
    "icici": "ICICIBANK",
    "yes bank": "YESBANK",
    "yes": "YESBANK",
    "tcs": "TCS",
    "tata consultancy services": "TCS",
    "goodricke group": "GOODRICKE",
    "goodricke": "GOODRICKE",
}


class CorporateDictionary:
    """
    Index-cached corporate name-to-ticker mapping.
    Initialized at startup from public NSE/BSE master exchange lists (mocked/seeded here for stability).
    """

    def __init__(self) -> None:
        self._mapping: Dict[str, str] = {}

    def load(self) -> None:
        """
        Loads corporate mapping into memory.
        """
        logger.info("Initializing corporate dictionary...")
        # Populate mapping with lowercased colloquial terms for case-insensitive lookup
        for name, ticker in SEED_DICTIONARY.items():
            self._mapping[name.lower()] = ticker.upper()
        logger.info(
            f"Corporate dictionary initialized with {len(self._mapping)} entries."
        )

    def get_ticker(self, name: str) -> str | None:
        """
        Retrieves ticker if name exists in dictionary.
        """
        return self._mapping.get(name.lower())

    def get_all_names(self) -> list[str]:
        """
        Returns all known colloquial names.
        """
        return list(self._mapping.keys())


# Global corporate dictionary instance
corporate_dict = CorporateDictionary()
