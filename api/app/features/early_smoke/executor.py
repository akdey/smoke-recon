import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any
from app.features.early_smoke.matcher import ticker_matcher

# Isolated thread pool for CPU-bound string tokenization and fuzzy matching
_extractor_pool = ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="early_smoke_matcher"
)


async def extract_mentions_async(text: str) -> List[Dict[str, Any]]:
    """
    Offloads fuzzy ticker extraction to the isolated thread pool.
    Prevents event loop stalling on single-core/low-spec containers.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _extractor_pool, ticker_matcher.extract_mentions, text
    )
