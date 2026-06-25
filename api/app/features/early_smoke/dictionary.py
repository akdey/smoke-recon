import os
import csv
import io
import urllib.request
import ssl
import logging
import re
from typing import Dict, List

logger = logging.getLogger("dictionary_loader")

# Suffixes split by cleaning stages to generate progressive colloquial names
CORPORATE_SUFFIXES = [
    " limited", " ltd.", " ltd", " corp.", " corp", " corporation", " co.", 
    " co", " company", " group", " groups"
]

SECTOR_SUFFIXES = [
    " bank", " industries", " industry", " holdings", " holding", 
    " technologies", " technology", " solutions", " solution", " systems", " system",
    " enterprise", " enterprises"
]

def clean_company_name(name: str) -> str:
    """
    Cleans official company names by removing corporate suffixes.
    """
    name_lower = name.strip().lower()
    for suffix in CORPORATE_SUFFIXES:
        if name_lower.endswith(suffix):
            name_lower = name_lower[:-len(suffix)].strip()
            break
    return name_lower

def deep_clean_company_name(name: str) -> str:
    """
    Applies aggressive cleaning of sector/industry suffixes for alias generation.
    """
    cleaned = clean_company_name(name)
    for suffix in SECTOR_SUFFIXES:
        if cleaned.endswith(suffix):
            cleaned = cleaned[:-len(suffix)].strip()
            break
    return cleaned

def generate_acronym(name: str) -> str | None:
    """
    Generates a lowercase acronym from a cleaned company name by taking initials 
    of significant words, ignoring common prepositions and fillers.
    """
    # Strip common non-alphanumeric chars first to split cleanly
    cleaned = re.sub(r"[^\w\s]", " ", name.lower())
    words = cleaned.split()
    
    # Filler words to ignore when generating acronyms
    fillers = {"of", "and", "the", "for", "in", "on", "at", "by", "with", "a", "an"}
    filtered_words = [w for w in words if w not in fillers]
    
    if len(filtered_words) >= 3:
        acronym = "".join(w[0] for w in filtered_words if w)
        if len(acronym) >= 3:
            return acronym
    return None

class CorporateDictionary:
    """
    Index-cached corporate name-to-ticker mapping.
    Initialized at startup by reading/fetching the official NSE corporate listing.
    """

    def __init__(self) -> None:
        self._mapping: Dict[str, str] = {}
        self._ticker_to_name: Dict[str, str] = {}

    def load(self) -> None:
        """
        Loads corporate mapping into memory. Attempts online fetch, falls back to local CSV.
        """
        logger.info("Initializing corporate dictionary...")
        self._mapping.clear()
        self._ticker_to_name.clear()
        csv_content = ""
        
        # 1. Attempt online fetch
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            logger.info(f"Attempting to fetch live NSE equity list from {url}...")
            ctx = ssl._create_unverified_context()
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=8) as response:
                csv_content = response.read().decode('utf-8')
            logger.info("Successfully fetched live equity list from NSE archives.")
        except Exception as e:
            logger.warning(f"Could not fetch online NSE equity list (likely blocked or offline): {e}. Falling back to bundled CSV resource.")

        # 2. Fall back to local CSV if online fetch failed
        if not csv_content:
            local_path = os.path.join(os.path.dirname(__file__), "resources", "nse_equities.csv")
            try:
                logger.info(f"Loading local equity list from {local_path}...")
                with open(local_path, "r", encoding="utf-8") as f:
                    csv_content = f.read()
            except Exception as ex:
                logger.error(f"Failed to load local equity fallback list: {ex}")
                return

        # 3. Parse CSV content and populate dictionary
        try:
            f = io.StringIO(csv_content.strip())
            reader = csv.reader(f)
            # Skip header row: SYMBOL,NAME OF COMPANY, SERIES, ...
            header = next(reader, None)
            
            count = 0
            for row in reader:
                if len(row) < 3:
                    continue
                
                symbol = row[0].strip().upper()
                company_name = row[1].strip()
                series = row[2].strip()
                
                # We focus primarily on EQ (Equity), BE (Trade-to-Trade) and SM (SME Equity) series
                if series not in ["EQ", "BE", "SM"]:
                    continue

                # Add to ticker-to-name mapping
                self._ticker_to_name[symbol] = company_name

                # Clean company name to create colloquial match targets
                colloquial_name = clean_company_name(company_name)
                deep_colloquial = deep_clean_company_name(company_name)
                
                if colloquial_name:
                    self._mapping[colloquial_name] = symbol
                if deep_colloquial:
                    self._mapping[deep_colloquial] = symbol
                
                # Acronym mapping
                acronym = generate_acronym(colloquial_name)
                if acronym:
                    self._mapping[acronym] = symbol
                
                self._mapping[symbol.lower()] = symbol
                count += 1
                
            logger.info(f"Corporate dictionary initialized. Indexed {count} stocks into {len(self._mapping)} name mapping entries.")
            
            # Broadcast corporate dictionary loaded event dynamically
            from app.features.early_smoke.broadcaster import broadcaster
            broadcaster.broadcast(
                event_type="system",
                message=f"NSE/BSE Corporate Dictionary successfully cached in memory. Indexed {count} stocks.",
                source="dictionary",
                details={"size": len(self._mapping), "stock_count": count}
            )
        except Exception as e:
            logger.error(f"Error parsing equities CSV: {e}")

    def get_ticker(self, name: str) -> str | None:
        """
        Retrieves ticker if name exists in dictionary.
        """
        return self._mapping.get(name.lower())

    def get_company_name(self, ticker: str) -> str:
        """
        Retrieves the official company name for a given ticker symbol.
        Falls back to the ticker itself if not found.
        """
        return self._ticker_to_name.get(ticker.upper(), ticker)

    def get_all_names(self) -> List[str]:
        """
        Returns all known colloquial names and symbols.
        """
        return list(self._mapping.keys())

# Global corporate dictionary instance
corporate_dict = CorporateDictionary()
