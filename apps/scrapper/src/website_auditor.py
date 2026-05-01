"""
website_auditor.py
------------------
Lightweight website audit layer for city-prospect-radar.

For each BusinessRecord that has a website_url, fetch the page with
requests and extract commercial signals useful for the landing-page pitch.

Design principles:
    - never crash the whole run because one site is bad
    - short timeouts — we don't wait more than ~10 s per site
    - no browser automation (requests + BeautifulSoup only)
    - graceful degradation — partial results are kept
    - practical heuristics, not perfection

Public API
----------
    audit_website(record: BusinessRecord) -> BusinessRecord
    audit_websites(records: list[BusinessRecord], delay_s: float) -> list[BusinessRecord]

Dependencies
------------
    pip install requests beautifulsoup4
"""

import logging
import re
import time
from dataclasses import replace
from typing import Optional
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
    _DEPS_AVAILABLE = True
except ImportError:
    _DEPS_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "website_auditor: 'requests' and/or 'beautifulsoup4' not installed. "
        "Install them with: pip install requests beautifulsoup4\n"
        "audit_website() will return records unchanged until dependencies are available."
    )

from models import BusinessRecord

logger = logging.getLogger(__name__)

# ===========================================================================
# HTTP configuration
# ===========================================================================

_HTTP_TIMEOUT      = 10          # seconds per request
_MAX_CONTENT_BYTES = 500_000     # stop reading after 500 KB
_EXCERPT_MAX_CHARS = 600         # characters for website_main_text_excerpt

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ===========================================================================
# Heuristic patterns
# ===========================================================================

# Words that suggest a gallery / portfolio section
_GALLERY_PATTERNS = [
    "galería", "galeria", "gallery", "portafolio", "portfolio",
    "proyectos", "trabajos", "instalaciones", "foto", "fotos",
    "imagen", "imágenes", "ver más",
]

# Words that suggest a call-to-action toward contact / quote
_CTA_PATTERNS = [
    "cotizar", "cotización", "presupuesto", "contactar", "contacto",
    "pedir", "solicitar", "whatsapp", "llamar", "llamanos",
    "contáctanos", "quote", "contact us", "get a quote", "free quote",
    "enviar mensaje", "escríbenos", "háblanos",
]

# Indicators of a WhatsApp contact button or link
_WHATSAPP_PATTERNS = [
    "wa.me", "api.whatsapp.com", "whatsapp", "wa.link",
    "chat by whatsapp", "escríbenos al whats",
]

# Section headings that suggest a services / offerings area
_SERVICE_SECTION_PATTERNS = [
    "servicios", "services", "productos", "products",
    "nuestros servicios", "lo que ofrecemos", "especialidades",
    "soluciones", "what we do", "ofrecemos",
]

# Contact form indicators
_CONTACT_FORM_PATTERNS = [
    "<form", "contact-form", "contactform", "wpcf7",
    "cf7", "gravityforms", "wpforms", "hubspot",
]

# Signals of low-quality / outdated copy
_BAD_COPY_PATTERNS = [
    "lorem ipsum", "your content here", "coming soon",
    "under construction", "en construcción", "página en mantenimiento",
    "sitio en desarrollo", "próximamente",
]

# Signals of a modern-looking site (rough proxy — not a guarantee)
_MODERN_SIGNALS = [
    "viewport", "bootstrap", "tailwind", "react", "vue", "angular",
    "svelte", "next", "nuxt", "css-grid", "flexbox",
    "animate", "slider", "swiper", "gsap",
]

# ===========================================================================
# HTTP fetcher
# ===========================================================================


def _fetch_html(url: str) -> tuple[Optional[str], str]:
    """
    Fetch raw HTML from *url*.

    Returns (html_text_or_None, status_code_string).
    Status code is "timeout", "error", or the HTTP status as a string e.g. "200".

    Never raises — always returns a tuple.
    """
    if not _DEPS_AVAILABLE:
        return None, "deps_missing"

    try:
        session = requests.Session()
        response = session.get(
            url,
            headers=_DEFAULT_HEADERS,
            timeout=_HTTP_TIMEOUT,
            allow_redirects=True,
            stream=True,
        )
        # Read limited content to avoid huge pages hanging the process
        content_bytes = b""
        for chunk in response.iter_content(chunk_size=32_768):
            content_bytes += chunk
            if len(content_bytes) >= _MAX_CONTENT_BYTES:
                break

        status = str(response.status_code)

        encoding = response.encoding or "utf-8"
        try:
            html = content_bytes.decode(encoding, errors="replace")
        except Exception:
            html = content_bytes.decode("utf-8", errors="replace")

        return html, status

    except requests.exceptions.Timeout:
        logger.debug("Timeout fetching %s", url)
        return None, "timeout"
    except requests.exceptions.SSLError:
        logger.debug("SSL error for %s — retrying without verify", url)
        # One retry without SSL verification (common for small MX business sites)
        try:
            response = requests.get(
                url, headers=_DEFAULT_HEADERS,
                timeout=_HTTP_TIMEOUT, verify=False, stream=True,
            )
            content_bytes = response.content[:_MAX_CONTENT_BYTES]
            html = content_bytes.decode("utf-8", errors="replace")
            return html, str(response.status_code)
        except Exception as exc:
            logger.debug("SSL retry also failed for %s: %s", url, exc)
            return None, "ssl_error"
    except requests.exceptions.ConnectionError:
        logger.debug("Connection error for %s", url)
        return None, "connection_error"
    except Exception as exc:
        logger.debug("Unexpected fetch error for %s: %s", url, exc)
        return None, "error"


# ===========================================================================
# HTML parsing helpers
# ===========================================================================


def _parse_soup(html: str) -> Optional["BeautifulSoup"]:
    """Parse HTML into a BeautifulSoup tree. Returns None on failure."""
    if not _DEPS_AVAILABLE or not html:
        return None
    try:
        return BeautifulSoup(html, "html.parser")
    except Exception:
        return None


def _extract_title(soup: "BeautifulSoup") -> str:
    """Extract the page <title> text."""
    try:
        tag = soup.find("title")
        return (tag.get_text(strip=True) if tag else "")[:200]
    except Exception:
        return ""


def _extract_meta_description(soup: "BeautifulSoup") -> str:
    """Extract <meta name='description'> content."""
    try:
        tag = soup.find("meta", attrs={"name": re.compile(r"description", re.I)})
        if tag:
            return (tag.get("content") or "")[:300].strip()
    except Exception:
        pass
    return ""


def _extract_h1(soup: "BeautifulSoup") -> str:
    """Extract the first <h1> text."""
    try:
        tag = soup.find("h1")
        return (tag.get_text(strip=True) if tag else "")[:200]
    except Exception:
        return ""


def _extract_main_text_excerpt(soup: "BeautifulSoup") -> str:
    """
    Extract a representative text excerpt from the main content area.
    Ignores navigation, footer, scripts, styles.
    Returns at most EXCERPT_MAX_CHARS characters.
    """
    try:
        # Remove noise tags
        for tag_name in ["nav", "footer", "header", "script", "style",
                         "noscript", "aside", "form"]:
            for el in soup.find_all(tag_name):
                el.decompose()

        # Try to find a main content area
        main = (
            soup.find("main")
            or soup.find(id=re.compile(r"content|main|body", re.I))
            or soup.find(class_=re.compile(r"content|main|body|text", re.I))
            or soup.body
        )

        text = (main or soup).get_text(separator=" ", strip=True) if main else ""
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text).strip()
        return text[:_EXCERPT_MAX_CHARS]
    except Exception:
        return ""


def _check_html_pattern(html_lower: str, patterns: list[str]) -> bool:
    """Return True if *html_lower* contains any of the given patterns."""
    return any(p in html_lower for p in patterns)


def _check_soup_text(soup: "BeautifulSoup", patterns: list[str]) -> bool:
    """Return True if the soup's visible text contains any pattern."""
    try:
        text = soup.get_text(separator=" ").lower()
        return any(p in text for p in patterns)
    except Exception:
        return False


def _check_links_and_attrs(soup: "BeautifulSoup", patterns: list[str]) -> bool:
    """
    Check href attributes and text content of all <a> and <button> elements
    for any of the given patterns.
    """
    try:
        for tag in soup.find_all(["a", "button"]):
            href = (tag.get("href") or "").lower()
            text = tag.get_text(strip=True).lower()
            if any(p in href or p in text for p in patterns):
                return True
    except Exception:
        pass
    return False


# ===========================================================================
# Individual signal detectors
# ===========================================================================


def _detect_gallery(soup: "BeautifulSoup") -> bool:
    """True if the page appears to have a gallery, portfolio, or project section."""
    if _check_soup_text(soup, _GALLERY_PATTERNS):
        return True
    # Check for common gallery implementations
    try:
        gallery_classes = ["gallery", "galeria", "portfolio", "slider",
                           "carousel", "swiper", "lightbox"]
        for c in gallery_classes:
            if soup.find(class_=re.compile(c, re.I)) or soup.find(id=re.compile(c, re.I)):
                return True
    except Exception:
        pass
    return False


def _detect_cta(soup: "BeautifulSoup") -> bool:
    """True if the page has visible calls-to-action toward contact or quote."""
    return _check_links_and_attrs(soup, _CTA_PATTERNS)


def _detect_whatsapp(soup: "BeautifulSoup", html_lower: str) -> bool:
    """True if the page has a WhatsApp contact button or link."""
    if _check_html_pattern(html_lower, _WHATSAPP_PATTERNS):
        return True
    return _check_links_and_attrs(soup, ["whatsapp", "wa.me"])


def _detect_service_sections(soup: "BeautifulSoup") -> bool:
    """True if the page has identifiable service or product sections."""
    for tag in soup.find_all(["h2", "h3", "h4", "section", "div"]):
        text = tag.get_text(strip=True).lower() if hasattr(tag, "get_text") else ""
        if any(p in text for p in _SERVICE_SECTION_PATTERNS):
            return True
    return False


def _detect_contact_form(soup: "BeautifulSoup", html_lower: str) -> bool:
    """True if the page appears to have a contact form."""
    if soup.find("form"):
        # Make sure it's not just a search form
        form = soup.find("form")
        if form:
            inputs = form.find_all("input") + form.find_all("textarea")
            if len(inputs) >= 2:
                return True
    return _check_html_pattern(html_lower, _CONTACT_FORM_PATTERNS)


def _detect_bad_copy(soup: "BeautifulSoup", html_lower: str) -> bool:
    """True if the page shows signs of placeholder / outdated content."""
    return _check_html_pattern(html_lower, _BAD_COPY_PATTERNS)


def _detect_modern_look(html_lower: str) -> bool:
    """
    Rough proxy for 'modern-looking site'.
    Checks for modern framework / CSS signals in the page source.
    This is intentionally generous — any modern tooling counts.
    """
    return _check_html_pattern(html_lower, _MODERN_SIGNALS)


# ===========================================================================
# Single-record audit
# ===========================================================================


def audit_website(record: BusinessRecord) -> BusinessRecord:
    """
    Fetch and analyse the website for a single BusinessRecord.

    If the record has no website_url, returns the record unchanged.
    If fetch fails, populates website_status with the error code and
    leaves all other website_* fields at their defaults.

    Never raises — always returns a BusinessRecord.

    Parameters
    ----------
    record : A BusinessRecord, typically post-heuristics enrichment.

    Returns
    -------
    A new BusinessRecord with website_* fields populated.
    """
    if not record.website_url:
        return record

    url = record.website_url
    logger.info("Auditing website | %s | %s", record.business_name, url)

    html, status_code = _fetch_html(url)

    if html is None:
        logger.debug("  → no HTML (%s) for %s", status_code, url)
        return replace(record, website_status=status_code)

    soup = _parse_soup(html)
    if soup is None:
        return replace(record, website_status=status_code)

    html_lower = html.lower()

    title            = _extract_title(soup)
    meta_description = _extract_meta_description(soup)
    h1               = _extract_h1(soup)
    excerpt          = _extract_main_text_excerpt(soup)

    has_gallery         = _detect_gallery(soup)
    has_cta             = _detect_cta(soup)
    has_whatsapp        = _detect_whatsapp(soup, html_lower)
    has_service_sections= _detect_service_sections(soup)
    has_contact_form    = _detect_contact_form(soup, html_lower)
    has_bad_copy        = _detect_bad_copy(soup, html_lower)
    looks_modern        = _detect_modern_look(html_lower)

    logger.debug(
        "  → status=%s | title='%s' | cta=%s | wa=%s | modern=%s",
        status_code, title[:40], has_cta, has_whatsapp, looks_modern,
    )

    return replace(
        record,
        website_status               = status_code,
        website_title                = title,
        website_meta_description     = meta_description,
        website_h1                   = h1,
        website_main_text_excerpt    = excerpt,
        website_has_gallery          = has_gallery,
        website_has_cta              = has_cta,
        website_has_whatsapp_button  = has_whatsapp,
        website_has_service_sections = has_service_sections,
        website_has_contact_form     = has_contact_form,
        website_has_bad_copy_signals = has_bad_copy,
        website_looks_modern_heuristic = looks_modern,
    )


# ===========================================================================
# Batch audit
# ===========================================================================


def audit_websites(
    records: list[BusinessRecord],
    delay_s: float = 2.5,
) -> list[BusinessRecord]:
    """
    Audit websites for all records that have a website_url.

    Records without a website_url are returned unchanged.
    A short delay is inserted between requests to be polite.

    Parameters
    ----------
    records : Enriched BusinessRecord list (post-heuristics).
    delay_s : Seconds to wait between HTTP requests. Default 2.5 s.
              Increase for overnight unattended runs if desired.

    Returns
    -------
    The same list with website_* fields populated where possible.
    Preserves original ordering.
    """
    if not _DEPS_AVAILABLE:
        logger.error(
            "website_auditor: dependencies not installed. "
            "Run: pip install requests beautifulsoup4"
        )
        return records

    audited: list[BusinessRecord] = []
    to_audit = [(i, r) for i, r in enumerate(records) if r.website_url]
    total = len(to_audit)

    logger.info(
        "Website audit starting | %d/%d records have a website URL",
        total, len(records),
    )

    # Build a position index so we can re-insert in original order
    audit_map: dict[int, BusinessRecord] = {}

    for seq, (orig_idx, record) in enumerate(to_audit, start=1):
        logger.info("Auditing %d/%d | %s", seq, total, record.business_name)
        try:
            audited_record = audit_website(record)
        except Exception as exc:
            logger.warning(
                "Unexpected error auditing %s: %s — keeping original.",
                record.business_name, exc,
            )
            audited_record = record

        audit_map[orig_idx] = audited_record

        if seq < total:
            time.sleep(delay_s)

    # Reconstruct the full list in original order
    result = []
    for i, record in enumerate(records):
        result.append(audit_map.get(i, record))

    audited_count = sum(1 for r in result if r.website_status)
    logger.info(
        "Website audit complete | audited=%d | ok=%d | failed=%d",
        audited_count,
        sum(1 for r in result if r.website_status == "200"),
        sum(1 for r in result if r.website_status not in ("", "200")),
    )

    return result
