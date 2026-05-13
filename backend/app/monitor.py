import hashlib
import logging
import time
from typing import Tuple

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


def fetch_html(url: str) -> str:
    """Fetch HTML with retry logic for transient errors."""
    max_retries = 2
    retry_delay = 2  # seconds
    
    # Check if URL is local
    is_local = any(x in url for x in ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"])
    
    for attempt in range(max_retries + 1):
        try:
            with sync_playwright() as p:
                launch_args = {}
                if is_local:
                    launch_args["args"] = ["--ignore-certificate-errors", "--disable-web-resources"]
                browser = p.chromium.launch(**launch_args)
                try:
                    context = browser.new_context(ignore_https_errors=True)
                    page = context.new_page()
                    try:
                        # Disable caching to ensure fresh content
                        page.context.set_extra_http_headers({"Cache-Control": "no-cache, no-store, must-revalidate"})
                        # Wait for full page load including JavaScript
                        page.goto(url, wait_until="networkidle", timeout=45000)
                        # Additional wait for React/JS framework updates
                        page.wait_for_timeout(1000)
                        html = page.content()
                        logger.info(f"Fetched {url} - HTML length: {len(html)} bytes")
                        return html
                    finally:
                        page.close()
                finally:
                    context.close()
                    browser.close()
        except Exception as e:
            error_str = str(e)
            is_transient = any(x in error_str for x in [
                "TargetClosedError",
                "ERR_ABORTED",
                "frame was detached",
                "Connection lost"
            ])
            
            if is_transient and attempt < max_retries:
                logger.warning(f"Transient error on attempt {attempt + 1}, retrying in {retry_delay}s: {error_str}")
                time.sleep(retry_delay)
                continue
            
            logger.error(f"Failed to fetch {url} after {attempt + 1} attempt(s): {error_str}")
            raise


def extract_structure(html: str, selector: str | None) -> Tuple[str | None, bool]:
    if not html:
        return None, True

    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(selector) if selector else soup.body
    if root is None:
        return None, True

    parts: list[str] = []
    for element in root.find_all(True):
        attrs = ",".join(sorted(element.attrs.keys()))
        parts.append(f"{element.name}[{attrs}]")

    if not parts:
        return None, True

    # Get full text content and normalize whitespace
    full_text = root.get_text()
    # Normalize whitespace: collapse multiple spaces and strip
    normalized_text = " ".join(full_text.split())
    
    # Combine structure and content
    structure_str = "|".join(parts)
    combined = f"{structure_str}|||{normalized_text}"
    
    logger.debug(f"extract_structure: selector={selector}, parts_count={len(parts)}, text_length={len(normalized_text)}")
    
    return combined, False


def compute_hash(structure: str | None) -> str | None:
    if structure is None:
        return None
    digest = hashlib.sha256(structure.encode("utf-8")).hexdigest()
    return digest


def run_check(url: str, selector: str | None) -> Tuple[str | None, bool]:
    html = fetch_html(url)
    structure, missing = extract_structure(html, selector)
    current_hash = compute_hash(structure)
    if missing:
        logger.warning("Missing data for url=%s selector=%s", url, selector)
    if structure:
        logger.info(f"Extracted content (first 500 chars): {structure[:500]}")
    return current_hash, missing
