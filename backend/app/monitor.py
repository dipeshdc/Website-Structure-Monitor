import hashlib
import logging
from typing import Tuple

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


def fetch_html(url: str) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        html = page.content()
        browser.close()
    return html


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

    return "|".join(parts), False


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
    return current_hash, missing
