"""
v1.2.1
google_maps_browser.py
----------------------
Browser-based Google Maps discovery provider for city-prospect-radar.

Uses Playwright (sync API) to search Google Maps, scroll results, open
individual listings, and extract raw business data.

Designed for:
    - slow, unattended overnight runs
    - small batches (10–40 results per query)
    - graceful failure on bad listings
    - clean shutdown even on error
    - resumable runs via a lightweight JSON checkpoint

Usage
-----
    from providers.google_maps_browser import search_google_maps_businesses

    results = search_google_maps_businesses(
        city="Monterrey",
        keyword="cancelería",
        max_results=20,
    )
    # results → list[dict] with keys matching BusinessRecord mapping layer

Resumability
------------
Pass a checkpoint_file path to persist progress.  On restart the scraper
skips any listing URLs already present in the checkpoint file.

    results = search_google_maps_businesses(
        city="Monterrey",
        keyword="cancelería",
        max_results=20,
        checkpoint_file="data/checkpoints/monterrey_canceleria.json",
    )

Dependencies
------------
    pip install playwright
    playwright install chromium
"""

import json
import logging
import os
import random
import re
import signal
import sys
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Page,
    sync_playwright,
    TimeoutError as PlaywrightTimeoutError,
)

logger = logging.getLogger(__name__)

# ===========================================================================
# PIPELINE INTEGRATION
# Emits machine-readable events to stdout so the Node.js orchestrator
# (scraper_adapter.ts) can parse progress and display it in the Dashboard.
# Format: PIPELINE_EVENT:{"event": "...", ...}
# ===========================================================================

def _emit_pipeline_event(data: dict) -> None:
    """
    Print a structured event to stdout for the Node.js orchestrator to parse.
    Uses flush=True so the adapter receives it immediately (no buffering).
    """
    print(f"PIPELINE_EVENT:{json.dumps(data, ensure_ascii=False)}", flush=True)


def _handle_sigterm(signum, frame) -> None:  # type: ignore[type-arg]
    """
    Handle SIGTERM gracefully.
    The checkpoint has already been saved after each listing, so
    exiting here is always safe — the run can resume from where it left off.
    """
    logger.info("SIGTERM received — checkpoint is up to date. Exiting cleanly.")
    _emit_pipeline_event({"event": "stopped", "reason": "SIGTERM"})
    sys.exit(0)


signal.signal(signal.SIGTERM, _handle_sigterm)

# ===========================================================================
# SAFE-RUN CONFIGURATION
# Tweak these constants to control pacing, volume, and browser behaviour.
# They are the single place to adjust for overnight vs. daytime runs.
# ===========================================================================

# --- Timing (seconds) -------------------------------------------------------
# All waits are randomised ± JITTER_FACTOR so the pattern is never robotic.

DELAY_SHORT    = 2.0   # between minor UI interactions (hover, scroll step)
DELAY_MEDIUM   = 4.5   # after navigation / search submit
DELAY_LONG     = 7.0   # after opening a listing (heavy page load)
DELAY_EXTRA    = 14.0  # occasional "human took a coffee break" pause

JITTER_FACTOR  = 0.40  # ± 40 % uniform jitter applied to every wait

# How often (1-in-N listings) to insert the extra-long pause.
# 1-in-6 means roughly every 6th listing you get a 10–20 s break.
EXTRA_PAUSE_FREQUENCY = 6

# --- Timeouts (milliseconds) ------------------------------------------------

TIMEOUT_ELEMENT = 10_000   # per-selector wait (10 s)
TIMEOUT_NAV     = 25_000   # full-page navigation (25 s)

# --- Scrolling --------------------------------------------------------------

MAX_SCROLL_STEPS   = 20      # maximum panel scroll steps per search
SCROLL_PIXELS      = 700     # px to scroll per step
SCROLL_STEP_WAIT   = DELAY_SHORT  # wait between scroll steps (jittered)

# --- Browser behaviour ------------------------------------------------------

HEADLESS   = True   # set False to watch the browser (debugging only)
SLOW_MO_MS = 60     # ms injected between Playwright actions

# ===========================================================================
# Checkpoint helpers — lightweight JSON persistence
# ===========================================================================


def _load_checkpoint(checkpoint_file: str | None) -> dict:
    """
    Load the checkpoint file from disk.

    The checkpoint is a JSON object with shape:
        {
            "processed_urls": ["https://...", ...],  # listing URLs already visited
            "results": [{...}, ...]                  # extracted dicts so far
        }

    Returns an empty checkpoint dict if the file does not exist or is corrupt.
    """
    if not checkpoint_file:
        return {"processed_urls": [], "results": []}

    path = Path(checkpoint_file)
    if not path.exists():
        return {"processed_urls": [], "results": []}

    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        processed = data.get("processed_urls", [])
        results   = data.get("results", [])
        logger.info(
            "Checkpoint loaded | file=%s | processed=%d | results=%d",
            checkpoint_file, len(processed), len(results),
        )
        return {"processed_urls": list(processed), "results": list(results)}
    except Exception as exc:
        logger.warning("Could not load checkpoint (%s): %s — starting fresh.", checkpoint_file, exc)
        return {"processed_urls": [], "results": []}


def _save_checkpoint(checkpoint_file: str | None, processed_urls: list[str], results: list[dict]) -> None:
    """
    Persist the current progress to disk atomically (write → rename).
    Silent no-op if checkpoint_file is None.
    """
    if not checkpoint_file:
        return

    path = Path(checkpoint_file)
    path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "processed_urls": processed_urls,
        "results": results,
    }

    tmp_path = path.with_suffix(".tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        # Atomic replace — safe even if the process is killed mid-write
        tmp_path.replace(path)
    except Exception as exc:
        logger.warning("Could not save checkpoint to %s: %s", checkpoint_file, exc)


# ===========================================================================
# Sleep helpers — every wait is jittered so pacing is never perfectly uniform
# ===========================================================================


def _jitter(base: float) -> float:
    """Return base ± JITTER_FACTOR as a uniform random value."""
    delta = base * JITTER_FACTOR
    return base + random.uniform(-delta, delta)


def _wait(base: float) -> None:
    """Sleep for a jittered version of *base* seconds."""
    time.sleep(max(0.5, _jitter(base)))


def _short_wait() -> None:
    _wait(DELAY_SHORT)


def _medium_wait() -> None:
    _wait(DELAY_MEDIUM)


def _long_wait() -> None:
    _wait(DELAY_LONG)


def _maybe_extra_pause(count: int) -> None:
    """
    Occasionally insert a longer pause to mimic a human pausing or
    getting distracted.  Triggered roughly every EXTRA_PAUSE_FREQUENCY listings.
    """
    if count > 0 and count % EXTRA_PAUSE_FREQUENCY == 0:
        pause = _jitter(DELAY_EXTRA)
        logger.debug("Extra pause: %.1f s (human-like break at listing %d).", pause, count)
        time.sleep(pause)


# ===========================================================================
# DOM extraction helpers
# ===========================================================================


def _try_selectors_text(page: Page, selectors: list[str]) -> str:
    """
    Try CSS selectors in order; return the first non-empty innerText found.
    Uses query_selector (non-blocking) — does NOT wait, so this is fast.
    """
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                text = (el.inner_text() or "").strip()
                if text:
                    return text
        except Exception:
            pass
    return ""


def _try_selectors_attr(page: Page, selectors: list[tuple[str, str]]) -> str:
    """
    Try (selector, attr) pairs in order; return the first non-empty attr value.
    Signature: selectors = [("a[data-item-id='authority']", "href"), ...]
    """
    for sel, attr in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                val = (el.get_attribute(attr) or "").strip()
                if val:
                    return val
        except Exception:
            pass
    return ""


def _aria_label_text(page: Page, selectors: list[str], strip_prefix: str = "") -> str:
    """
    Read the aria-label attribute of the first matching element.
    Optionally strip a known prefix (e.g. "Dirección: ").
    """
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                val = (el.get_attribute("aria-label") or "").strip()
                if val:
                    if strip_prefix and val.startswith(strip_prefix):
                        val = val[len(strip_prefix):].strip()
                    return val
        except Exception:
            pass
    return ""


# ===========================================================================
# Parsing helpers — lenient, bilingual (ES / EN)
# ===========================================================================


def _parse_rating(text: str) -> float | None:
    """
    Extract a float star rating from text like "4.3", "4,3", "4.3 stars",
    "4,3 estrellas".  Accepts comma-decimal format used in Spanish locales.
    Returns None when no parseable rating is found.
    """
    # Normalise decimal separator
    normalised = text.replace(",", ".")
    match = re.search(r"\b([1-5](?:\.\d)?)\b", normalised)
    if match:
        try:
            value = float(match.group(1))
            if 1.0 <= value <= 5.0:
                return round(value, 1)
        except ValueError:
            pass
    return None


def _parse_review_count(text: str) -> int:
    """
    Extract an integer review count from strings like:
        "4.3 (87)"          → 87
        "(1,234)"           → 1234
        "2.345 reseñas"     → 2345   (dot used as thousands separator in ES)
        "1,234 reviews"     → 1234

    Strategy: strip all non-digit characters except spaces, collect runs of
    digits, then return the largest that is plausibly a review count (≥ 1).
    Ratings (e.g. "43" from "4.3") are small enough that max() naturally
    prefers the review count when both are present.
    """
    # Replace common separators so "1.234" and "1,234" both become "1234"
    cleaned = re.sub(r"[.,]", "", text)
    numbers = [int(n) for n in re.findall(r"\d+", cleaned) if int(n) > 0]
    return max(numbers) if numbers else 0


def _clean_website_url(url: str) -> str:
    """
    Remove Google redirect wrappers from website URLs.
    Google Maps sometimes wraps external URLs as:
        https://www.google.com/url?q=https%3A%2F%2Fexample.com&...
    """
    if not url:
        return ""
    if "google.com/url" in url:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        target = qs.get("q", [""])[0] or qs.get("url", [""])[0]
        if target:
            return target.strip()
    return url.strip()


# ===========================================================================
# Browser setup
# ===========================================================================


def _create_browser(playwright) -> tuple[Browser, BrowserContext]:
    """
    Launch a Chromium browser tuned for low-profile, slow overnight scraping.
    Returns (browser, context).
    """
    browser = playwright.chromium.launch(
        headless=HEADLESS,
        slow_mo=SLOW_MO_MS,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-plugins",
            "--lang=es-MX",
        ],
    )

    context = browser.new_context(
        locale="es-MX",
        timezone_id="America/Monterrey",
        viewport={"width": 1366, "height": 900},
        user_agent=(
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        # Disable HTTP/2 push and other signals that differ from real browsers
        extra_http_headers={
            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
        },
    )

    # Mask navigator.webdriver — basic anti-bot mitigation
    context.add_init_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        "Object.defineProperty(navigator, 'languages', {get: () => ['es-MX', 'es', 'en']});"
    )

    return browser, context


# ===========================================================================
# Navigation and search
# ===========================================================================


def _navigate_to_search(page: Page, keyword: str, city: str) -> bool:
    """
    Open Google Maps and search for *keyword* in *city*.
    Returns True on success, False if navigation fails.
    """
    query = f"{keyword} en {city}"
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.google.com/maps/search/{encoded}"

    logger.info("Navigating → %s", url)

    try:
        page.goto(url, timeout=TIMEOUT_NAV, wait_until="domcontentloaded")
        _medium_wait()
    except PlaywrightTimeoutError:
        logger.error("Timeout navigating to Google Maps for query: %s", query)
        return False
    except Exception as exc:
        logger.error("Navigation error for query '%s': %s", query, exc)
        return False

    _dismiss_consent_dialog(page)
    _medium_wait()
    return True


def _dismiss_consent_dialog(page: Page) -> None:
    """
    Accept Google consent / cookie dialogs if they appear.
    Silent no-op when not present.
    """
    candidates = [
        "button[aria-label='Aceptar todo']",
        "button[aria-label='Accept all']",
        "button[aria-label='Aceitar tudo']",       # PT fallback
        "form[action*='consent'] button",
        "#L2AGLb",
        "button.tHlp8d",
    ]
    for sel in candidates:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                logger.debug("Dismissed consent dialog via: %s", sel)
                _short_wait()
                return
        except Exception:
            pass


# ===========================================================================
# Results panel scrolling
# ===========================================================================


def _find_results_panel(page: Page):
    """
    Locate the scrollable results panel element.
    Returns the element handle or None if not found.
    """
    panel_selectors = [
        "[role='feed']",
        "div[aria-label*='Resultados']",
        "div[aria-label*='Results']",
        ".m6QErb.DxyBCb",
        ".m6QErb[aria-label]",
    ]
    for sel in panel_selectors:
        try:
            el = page.query_selector(sel)
            if el:
                logger.debug("Results panel located via: %s", sel)
                return el
        except Exception:
            pass
    return None


def _count_listing_cards(page: Page) -> int:
    """Return how many listing cards are currently rendered in the panel."""
    card_selectors = [
        "a[href*='/maps/place/']",
        ".Nv2PK",
        "[data-result-index]",
    ]
    for sel in card_selectors:
        try:
            count = page.locator(sel).count()
            if count > 0:
                return count
        except Exception:
            pass
    return 0


def _is_end_of_results(page: Page) -> bool:
    """Return True if the 'end of list' marker is visible."""
    end_texts = [
        "final de la lista",
        "reached the end of the list",
    ]
    for text in end_texts:
        try:
            if page.get_by_text(text, exact=False).count() > 0:
                return True
        except Exception:
            pass
    return False


def _scroll_results_panel(page: Page, target_count: int) -> None:
    """
    Scroll the results panel until we have *target_count* cards loaded
    or we hit the end of the list, whichever comes first.
    Uses variable scroll amounts and pacing to look less mechanical.
    """
    panel = _find_results_panel(page)
    if not panel:
        logger.warning("Results panel not found — skipping scroll phase.")
        return

    stale_scrolls = 0  # consecutive scrolls with no new cards

    for step in range(1, MAX_SCROLL_STEPS + 1):
        before = _count_listing_cards(page)

        if before >= target_count:
            logger.debug("Target %d cards reached at scroll step %d.", target_count, step)
            break

        if _is_end_of_results(page):
            logger.debug("End-of-results marker detected at scroll step %d.", step)
            break

        # Vary the scroll amount slightly each step
        scroll_px = SCROLL_PIXELS + random.randint(-100, 150)
        try:
            page.evaluate("(el, px) => el.scrollBy(0, px)", panel, scroll_px)
        except Exception:
            try:
                panel.press("PageDown")
            except Exception:
                logger.debug("Scroll step %d: could not scroll panel.", step)

        _wait(SCROLL_STEP_WAIT)

        after = _count_listing_cards(page)
        logger.debug(
            "Scroll %d/%d | cards before=%d after=%d",
            step, MAX_SCROLL_STEPS, before, after,
        )

        if after <= before:
            stale_scrolls += 1
            if stale_scrolls >= 3:
                logger.debug("No new cards after 3 consecutive scrolls — stopping early.")
                break
        else:
            stale_scrolls = 0


# ===========================================================================
# Listing URL collection
# ===========================================================================


def _collect_listing_links(page: Page, max_results: int) -> list[str]:
    """
    Gather unique /maps/place/ listing URLs from the results panel.
    Returns up to *max_results* URLs in the order they appear.
    """
    seen: set[str] = set()
    links: list[str] = []

    selectors = [
        "a[href*='/maps/place/']",
    ]

    for sel in selectors:
        try:
            elements = page.query_selector_all(sel)
            for el in elements:
                href = (el.get_attribute("href") or "").strip()
                if "/maps/place/" in href and href not in seen:
                    seen.add(href)
                    links.append(href)
                    if len(links) >= max_results:
                        return links
        except Exception:
            pass

    return links


# ===========================================================================
# Single listing: navigation
# ===========================================================================


def _open_listing(page: Page, url: str) -> bool:
    """
    Navigate to a listing URL and wait for it to settle.
    Returns True on success, False on timeout / error.
    """
    try:
        page.goto(url, timeout=TIMEOUT_NAV, wait_until="domcontentloaded")
        _long_wait()
        return True
    except PlaywrightTimeoutError:
        logger.warning("Timeout opening listing: %s", url)
        return False
    except Exception as exc:
        logger.warning("Failed to open listing (%s): %s", url, exc)
        return False


# ===========================================================================
# Single listing: field extraction
# ===========================================================================


def _extract_business_name(page: Page) -> str:
    """Extract business name — tried in order of reliability."""
    return _try_selectors_text(page, [
        "h1.DUwDvf",
        "h1[class*='fontHeadlineLarge']",
        "h1.x3AX1-LfntMc-header-title-title",
        "h1",
    ])


def _extract_category(page: Page) -> str:
    """Extract the primary Google Maps category label."""
    return _try_selectors_text(page, [
        "button.DkEaL",
        "[jsaction*='category'] span",
        ".LBgpqf button",
        "span.mgr77e",
        "div.skqShb span",
    ])


def _extract_address(page: Page) -> str:
    """
    Extract street address.  Prefer the structured aria-label button;
    fall back to visible text selectors.
    """
    # Primary: aria-label on the address button (most reliable)
    addr = _aria_label_text(page, [
        "button[data-item-id='address']",
        "button[aria-label*='Dirección']",
        "button[aria-label*='Address']",
    ], strip_prefix="Dirección: ")

    if addr:
        # Also strip English prefix if locale switched
        addr = addr.removeprefix("Address: ").strip()
        return addr

    # Fallback: inner text of the address info row
    return _try_selectors_text(page, [
        "[data-item-id='address'] .Io6YTe",
        "[data-item-id='address'] span.UsdlK",
        "span[aria-label*='Dirección']",
        "span[aria-label*='Address']",
    ])


def _extract_phone(page: Page) -> str:
    """
    Extract phone number.  Prefer the structured aria-label button.
    """
    phone = _aria_label_text(page, [
        "button[data-item-id*='phone:tel']",
        "button[aria-label*='Teléfono']",
        "button[aria-label*='Phone']",
    ], strip_prefix="Teléfono: ")

    if phone:
        phone = phone.removeprefix("Phone: ").strip()
        return phone

    return _try_selectors_text(page, [
        "[data-item-id*='phone'] .Io6YTe",
        "[data-item-id*='phone'] span.UsdlK",
        "span[aria-label*='Teléfono']",
        "span[aria-label*='Phone number']",
    ])


def _extract_website(page: Page) -> str:
    """
    Extract external website URL, unwrapping any Google redirect wrappers.
    """
    raw = _try_selectors_attr(page, [
        ("a[data-item-id='authority']", "href"),
        ("a[aria-label*='Sitio web']", "href"),
        ("a[aria-label*='Website']", "href"),
        ("a[data-item-id*='website']", "href"),
    ])
    return _clean_website_url(raw)


def _extract_rating_and_reviews(page: Page) -> tuple[float | None, int]:
    """
    Extract rating and review count in a single pass.
    Returns (rating_float_or_None, review_count_int).
    """
    rating: float | None = None
    review_count: int = 0

    # --- Rating ---
    rating_text = _try_selectors_text(page, [
        "div.F7nice span[aria-hidden='true']",
        "span.ceNzKf[aria-label*='estrellas']",
        "span.ceNzKf[aria-label*='stars']",
        "span.MW4etd",
        "div.fontBodyMedium span[aria-hidden='true']",
    ])
    if rating_text:
        rating = _parse_rating(rating_text)

    # If the aria-label on the rating element contains both rating and review
    # count (e.g. "4.3 stars 87 reviews"), try to extract both from it.
    rating_aria = _aria_label_text(page, [
        "span.ceNzKf",
        "div.F7nice",
    ])
    if rating_aria and rating is None:
        rating = _parse_rating(rating_aria)
    if rating_aria and review_count == 0:
        review_count = _parse_review_count(rating_aria)

    # --- Review count (dedicated selectors) ---
    if review_count == 0:
        review_text = _try_selectors_text(page, [
            "div.F7nice span[aria-label*='reseñas']",
            "div.F7nice span[aria-label*='reviews']",
            "span[aria-label*='reseñas']",
            "span[aria-label*='reviews']",
            "button[aria-label*='reseñas']",
            "button[aria-label*='reviews']",
            "span.UY7F9",
        ])
        if review_text:
            review_count = _parse_review_count(review_text)

        if review_count == 0:
            review_aria = _aria_label_text(page, [
                "span[aria-label*='reseñas']",
                "span[aria-label*='reviews']",
                "button[aria-label*='reseñas']",
            ])
            if review_aria:
                review_count = _parse_review_count(review_aria)

    return rating, review_count


def _extract_description(page: Page) -> str:
    """
    Extract editorial summary / business description if present.
    This field is often absent — gracefully returns "".
    """
    return _try_selectors_text(page, [
        "div.PYvSYb",                    # editorial description
        "span.HlvSq",                    # "From the business" excerpt
        "div.WeS02d span",               # alternate description container
        "div[data-attrid*='description'] span",
    ])


def _extract_listing_fields(page: Page, listing_url: str) -> dict:
    """
    Extract all available structured fields from an already-open listing page.

    Every field is extracted defensively with fallback selectors.
    Partial extractions (missing phone, website, etc.) are acceptable and
    expected — only a missing business_name causes the record to be rejected.

    Returns a raw dict compatible with discovery.py's mapping layer.
    """
    raw: dict = {
        "source_platform":      "google_maps",
        "listing_url":          listing_url,
        "business_name":        "",
        "google_category":      "",
        "address":              "",
        "phone":                "",
        "website_url":          "",
        "rating":               None,
        "review_count":         0,
        "business_description": "",
    }

    raw["business_name"]        = _extract_business_name(page)
    raw["google_category"]      = _extract_category(page)
    raw["address"]              = _extract_address(page)
    raw["phone"]                = _extract_phone(page)
    raw["website_url"]          = _extract_website(page)
    raw["business_description"] = _extract_description(page)

    rating, review_count = _extract_rating_and_reviews(page)
    raw["rating"]        = rating
    raw["review_count"]  = review_count

    return raw


# ===========================================================================
# Duplicate detection (URL-level, before fetching)
# ===========================================================================


def _normalise_listing_url(url: str) -> str:
    """
    Normalise a Google Maps place URL for deduplication purposes.
    Strips query parameters and trailing slashes so equivalent URLs compare equal.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        # Keep only scheme + host + path; discard query and fragment
        return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))
    except Exception:
        return url


# ===========================================================================
# Public entry point
# ===========================================================================


def search_google_maps_businesses(
    city: str,
    keyword: str,
    max_results: int = 20,
    checkpoint_file: str | None = None,
) -> list[dict]:
    """
    Search Google Maps for local businesses matching *keyword* in *city*.

    Designed for slow, overnight, unattended runs with graceful failure
    and resumability between sessions.

    Parameters
    ----------
    city            : Target city, e.g. "Monterrey".
    keyword         : Search term, e.g. "cancelería".
    max_results     : Upper bound on results to collect.  Recommended: 10–30.
                      Keep this low — quality over quantity.
    checkpoint_file : Optional path to a JSON checkpoint file.
                      If given, already-processed listing URLs are skipped
                      and new results are appended on resume.
                      If None, no checkpoint is written.

    Returns
    -------
    List of raw business dicts compatible with discovery.py's mapping layer.
    Each dict includes:
        source_platform, listing_url, business_name, google_category,
        address, phone, website_url, rating, review_count, business_description
    """
    logger.info(
        "GoogleMapsBrowser | city=%s | keyword=%s | max=%d | checkpoint=%s",
        city, keyword, max_results, checkpoint_file or "none",
    )

    # --- Load existing checkpoint ---
    checkpoint    = _load_checkpoint(checkpoint_file)
    already_done  = set(_normalise_listing_url(u) for u in checkpoint["processed_urls"])
    results       = checkpoint["results"]   # may be non-empty on resume

    with sync_playwright() as playwright:
        browser, context = _create_browser(playwright)
        try:
            page = context.new_page()

            # Step 1: navigate to search results
            if not _navigate_to_search(page, keyword, city):
                logger.error("Search navigation failed — aborting.")
                return results

            # Step 2: scroll results panel to load cards
            _scroll_results_panel(page, target_count=max_results)
            _medium_wait()

            # Step 3: collect all listing URLs visible in the panel
            all_urls = _collect_listing_links(page, max_results=max_results)
            logger.info("Panel yielded %d listing URLs.", len(all_urls))

            if not all_urls:
                logger.warning(
                    "No listing URLs found | city=%s keyword=%s. "
                    "Google Maps layout may have changed — check selectors.",
                    city, keyword,
                )
                return results

            # Filter out already-processed URLs (checkpoint skip)
            pending_urls = [
                u for u in all_urls
                if _normalise_listing_url(u) not in already_done
            ]
            skipped = len(all_urls) - len(pending_urls)
            if skipped:
                logger.info("Skipping %d already-processed URLs (checkpoint).", skipped)

            if not pending_urls:
                logger.info("All listing URLs already processed — nothing new to extract.")
                return results

            # Step 4: visit each pending listing and extract fields
            extracted_this_run = 0

            for idx, url in enumerate(pending_urls, start=1):
                logger.info(
                    "Listing %d/%d | extracting ...", idx, len(pending_urls)
                )

                # Occasional extra-long pause (human-like break)
                _maybe_extra_pause(idx)

                norm_url = _normalise_listing_url(url)

                try:
                    if not _open_listing(page, url):
                        # Navigation failed — mark as processed so we don't retry
                        # endlessly; skip gracefully.
                        already_done.add(norm_url)
                        checkpoint["processed_urls"].append(url)
                        _save_checkpoint(checkpoint_file, checkpoint["processed_urls"], results)
                        continue

                    raw = _extract_listing_fields(page, listing_url=url)

                    if raw.get("business_name"):
                        results.append(raw)
                        extracted_this_run += 1
                        logger.info(
                            "  ✓ %s | phone=%s | rating=%s | reviews=%d",
                            raw["business_name"],
                            raw["phone"] or "(none)",
                            raw["rating"] if raw["rating"] is not None else "—",
                            raw["review_count"],
                        )
                    else:
                        logger.warning(
                            "  ✗ Listing %d/%d — no business name extracted. URL: %s",
                            idx, len(pending_urls), url,
                        )

                except Exception as exc:
                    # A bad listing must never kill the whole run
                    logger.error(
                        "  ✗ Unexpected error on listing %d/%d (%s): %s",
                        idx, len(pending_urls), url, exc,
                    )

                # Mark URL as processed and persist checkpoint
                already_done.add(norm_url)
                checkpoint["processed_urls"].append(url)
                checkpoint["results"] = results
                _save_checkpoint(checkpoint_file, checkpoint["processed_urls"], results)

                # Emit progress event for the Node.js orchestrator / Dashboard
                _emit_pipeline_event({
                    "event": "progress",
                    "city": city,
                    "keyword": keyword,
                    "found": len(results),
                    "current": idx,
                    "total": len(pending_urls),
                })

                # Polite inter-listing wait — essential for overnight runs
                _medium_wait()

            logger.info(
                "Extraction complete | new=%d | total=%d | city=%s | keyword=%s",
                extracted_this_run, len(results), city, keyword,
            )

        finally:
            # Always clean up — guaranteed even if something above raised
            for resource, name in [(context, "context"), (browser, "browser")]:
                try:
                    resource.close()
                except Exception as exc:
                    logger.debug("Error closing %s: %s", name, exc)

            logger.info(
                "GoogleMapsBrowser | shutdown | city=%s | keyword=%s | total_results=%d",
                city, keyword, len(results),
            )

    return results
