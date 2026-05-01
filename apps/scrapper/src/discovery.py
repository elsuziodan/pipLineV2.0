"""
discovery.py
------------
Discovery layer for the city-prospect-radar pipeline.

Responsibilities
    - Search for local businesses by city + keyword using a pluggable provider
    - Normalise raw provider output into clean BusinessRecord objects
    - Deduplicate records across multiple keyword searches

Out of scope (handled by other modules)
    - Website auditing / enrichment
    - Commercial scoring / classification
    - AI inference
    - City-level analysis

Public API
    search_businesses(city, keyword, provider, max_results) -> list[BusinessRecord]
    search_multiple_keywords(city, keywords, provider, max_results) -> list[BusinessRecord]

Available providers
    "mock"                 – built-in catalogue; useful for dev/testing
    "google_maps_browser"  – real Playwright-based Google Maps scraper
    "google_maps"          – placeholder (falls back to mock until implemented via API)
    "places_api"           – placeholder (requires GOOGLE_PLACES_API_KEY)
    "serpapi"              – placeholder (requires SERPAPI_API_KEY)
    "apify"                – placeholder (requires APIFY_API_TOKEN)
"""

import logging
from dataclasses import replace as _dc_replace
from typing import Callable

from models import BusinessRecord

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider registry
# Maps provider name  →  internal search function
# Signature: (city: str, keyword: str, **kwargs) -> list[dict]
# ---------------------------------------------------------------------------

_PROVIDERS: dict[str, Callable] = {}


def _register_provider(name: str):
    """Decorator that registers a function as a named provider."""
    def decorator(fn: Callable):
        _PROVIDERS[name] = fn
        return fn
    return decorator


# ---------------------------------------------------------------------------
# Helper: review count buckets
# ---------------------------------------------------------------------------

def get_review_count_bucket(review_count: int) -> str:
    """
    Map a raw review count to a human-readable bucket string.

    Buckets:
        0       → "0"
        1–4     → "1-4"
        5–19    → "5-19"
        20–99   → "20-99"
        100+    → "100+"
    """
    if review_count <= 0:
        return "0"
    if review_count <= 4:
        return "1-4"
    if review_count <= 19:
        return "5-19"
    if review_count <= 99:
        return "20-99"
    return "100+"


# ---------------------------------------------------------------------------
# Helper: safe field normalisation
# ---------------------------------------------------------------------------

def _clean_str(value) -> str:
    """Return a stripped string or an empty string if value is falsy/None."""
    if value is None:
        return ""
    return str(value).strip()


def _safe_float(value, default=None):
    """Parse value as float. Returns default if the conversion fails."""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _safe_int(value, default: int = 0) -> int:
    """Parse value as int. Returns default if the conversion fails."""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------------------
# Mapper: raw dict  →  BusinessRecord
# ---------------------------------------------------------------------------

def _map_raw_to_business_record(
    raw: dict,
    city: str,
    keyword: str,
    source_platform: str,
) -> BusinessRecord:
    """
    Safely convert a raw provider dictionary into a BusinessRecord.

    Only sets fields that the discovery layer is responsible for:
        - identity fields (city, keyword, source_platform)
        - basic business fields (name, category, address, phone, website_url)
        - review signals (rating, review_count, has_reviews, review_count_bucket)
        - has_website (derived from website_url)

    All enrichment, classification, and scoring fields retain their dataclass
    defaults and will be populated by downstream modules.
    """
    business_name = _clean_str(raw.get("name") or raw.get("business_name"))
    google_category = _clean_str(raw.get("category") or raw.get("google_category"))
    address = _clean_str(raw.get("address"))
    phone = _clean_str(raw.get("phone"))
    website_url = _clean_str(raw.get("website") or raw.get("website_url"))
    business_description = _clean_str(raw.get("description") or raw.get("business_description"))
    listing_url = _clean_str(raw.get("listing_url"))

    rating = _safe_float(raw.get("rating"))
    review_count = _safe_int(raw.get("review_count") or raw.get("reviews", 0))

    has_reviews = review_count > 0
    has_website = bool(website_url)
    review_count_bucket = get_review_count_bucket(review_count)

    return BusinessRecord(
        city=city,
        search_keyword=keyword,
        source_platform=source_platform,
        listing_url=listing_url,
        business_name=business_name,
        google_category=google_category,
        address=address,
        phone=phone,
        website_url=website_url,
        rating=rating,
        review_count=review_count,
        has_reviews=has_reviews,
        review_count_bucket=review_count_bucket,
        has_website=has_website,
        business_description=business_description,
    )


# ---------------------------------------------------------------------------
# Mock provider
# ---------------------------------------------------------------------------

# Realistic sample businesses for the Mexican aluminium/glass/windows niche.
# Each entry uses a "tags" list that drives light keyword-relevance filtering
# so different keywords return slightly different subsets.

_MOCK_BUSINESSES: list[dict] = [
    {
        "name": "Aluminios del Norte S.A.",
        "category": "Empresa de aluminio y vidrio",
        "address": "Blvd. Independencia 1420, Torreón, Coah.",
        "phone": "871-312-5500",
        "website": "https://aluminiosdelnorte.com.mx",
        "rating": 4.3,
        "review_count": 87,
        "description": "Fabricación e instalación de ventanas, puertas y canceles de aluminio para uso residencial e industrial.",
        "tags": ["aluminio", "ventanas", "cancelería", "industrial"],
    },
    {
        "name": "Vidrios y Cancelería Monterrey",
        "category": "Vidriería",
        "address": "Av. Constitución 850, Monterrey, N.L.",
        "phone": "81-8345-9900",
        "website": "",
        "rating": 3.9,
        "review_count": 34,
        "description": "Venta y corte de vidrio templado, laminado y claro. Canceles de baño con perfilería de aluminio.",
        "tags": ["vidrio", "vidriería", "cancelería", "vidrio templado", "canceles de baño"],
    },
    {
        "name": "Canceles Premium GDL",
        "category": "Cancelería",
        "address": "Calle López Cotilla 2300, Guadalajara, Jal.",
        "phone": "33-3650-1122",
        "website": "https://cancelespremium.mx",
        "rating": 4.8,
        "review_count": 210,
        "description": "Especialistas en canceles de baño a medida, espejos, vidrio templado y mamparas de lujo.",
        "tags": ["cancelería", "canceles de baño", "vidrio templado", "premium"],
    },
    {
        "name": "Ferroaluminio Juárez",
        "category": "Ferretería y Aluminio",
        "address": "Av. Tecnológico 4500, Cd. Juárez, Chih.",
        "phone": "656-618-4400",
        "website": "",
        "rating": 3.5,
        "review_count": 12,
        "description": "Distribución de perfilería de aluminio, herrajes y vidrio para constructoras y talleres.",
        "tags": ["aluminio", "industrial", "vidrio"],
    },
    {
        "name": "Ventanas y Puertas Orión",
        "category": "Ventanas y Puertas",
        "address": "Periférico Sur 780, Puebla, Pue.",
        "phone": "222-230-6655",
        "website": "https://ventanasorion.com",
        "rating": 4.1,
        "review_count": 55,
        "description": "Fabricamos ventanas y puertas de aluminio y PVC para casas y departamentos. Instalación rápida.",
        "tags": ["ventanas", "aluminio", "cancelería", "residencial"],
    },
    {
        "name": "Cristalería San Marcos",
        "category": "Cristalería",
        "address": "Calle 5 de Febrero 315, Mérida, Yuc.",
        "phone": "999-925-8800",
        "website": "",
        "rating": None,
        "review_count": 0,
        "description": "Espejo, vidrio recto y curvo, cristal templado. Servicio a domicilio en Mérida y zona conurbada.",
        "tags": ["vidrio", "vidriería", "cristalería", "vidrio templado"],
    },
    {
        "name": "Alumex Querétaro",
        "category": "Aluminio y Vidrio",
        "address": "Blvd. Bernardo Quintana 4050, Querétaro, Qro.",
        "phone": "442-214-7720",
        "website": "https://alumexqro.mx",
        "rating": 4.5,
        "review_count": 143,
        "description": "30 años fabricando sistemas de aluminio para ventanas corredizas, abatibles y fijas. Proyectos residenciales y comerciales.",
        "tags": ["aluminio", "ventanas", "cancelería", "residencial", "industrial"],
    },
    {
        "name": "Vidrio Templado Express",
        "category": "Vidrio Templado",
        "address": "Insurgentes Norte 2200, Ciudad de México, CDMX",
        "phone": "55-5587-3300",
        "website": "https://vidriotempladoexpress.com",
        "rating": 4.0,
        "review_count": 78,
        "description": "Vidrio templado, laminado y doble acristalamiento para oficinas, baños y fachadas. Entrega en 24 hrs.",
        "tags": ["vidrio templado", "vidrio", "canceles de baño", "vidriería"],
    },
]


def _keyword_matches_business(keyword: str, business: dict) -> bool:
    """
    Return True if the business is loosely relevant to the search keyword.
    Checks both the tags list and the business description/name so that
    a keyword like "ventanas" matches businesses tagged with that term or
    that mention it in their description.
    """
    kw = keyword.lower().strip()
    tags = [t.lower() for t in business.get("tags", [])]
    name = business.get("name", "").lower()
    description = business.get("description", "").lower()

    return (
        any(kw in tag or tag in kw for tag in tags)
        or kw in name
        or kw in description
    )


@_register_provider("mock")
def _search_with_mock(city: str, keyword: str, **_kwargs) -> list[dict]:
    """
    Return a filtered subset of the mock business catalogue.
    Businesses are filtered by keyword relevance so that different keywords
    return slightly different subsets, making the mock useful for multi-keyword
    pipeline testing.
    """
    relevant = [b for b in _MOCK_BUSINESSES if _keyword_matches_business(keyword, b)]

    # If the keyword is very niche and no record matches, return all records
    # so that the pipeline always has data to work with during development.
    if not relevant:
        logger.debug(
            "Mock: no businesses matched keyword '%s' — returning full catalogue.", keyword
        )
        relevant = list(_MOCK_BUSINESSES)

    # Inject the city into each raw record so the mapper can use it
    # without modifying the shared catalogue.
    return [{**b, "_city_override": city} for b in relevant]


# ---------------------------------------------------------------------------
# Real provider: google_maps_browser
# ---------------------------------------------------------------------------

@_register_provider("google_maps_browser")
def _search_with_google_maps_browser(city: str, keyword: str, **kwargs) -> list[dict]:
    """
    Real browser-based Google Maps provider using Playwright.

    Delegates entirely to providers/google_maps_browser.py which contains
    all the scraping logic.  This keeps discovery.py clean and provider-agnostic.

    Optional kwargs
    ---------------
    max_results     : int        — forwarded to the provider (default 20)
    checkpoint_file : str|None  — path to a JSON checkpoint file for resumable runs
    """
    # Lazy import so Playwright is only required when this provider is used
    from providers.google_maps_browser import search_google_maps_businesses

    max_results: int = kwargs.get("max_results", 20)
    checkpoint_file: str | None = kwargs.get("checkpoint_file", None)
    return search_google_maps_businesses(
        city=city,
        keyword=keyword,
        max_results=max_results,
        checkpoint_file=checkpoint_file,
    )


# ---------------------------------------------------------------------------
# Placeholder providers (fall back to mock, log a warning)
# ---------------------------------------------------------------------------

def _fallback_to_mock(provider_name: str, city: str, keyword: str, **kwargs) -> list[dict]:
    """Shared fallback logic for unimplemented providers."""
    logger.warning(
        "Provider '%s' is not yet implemented. Falling back to 'mock'.",
        provider_name,
    )
    return _search_with_mock(city, keyword)


@_register_provider("google_maps")
def _search_with_google_maps(city: str, keyword: str, **kwargs) -> list[dict]:
    """
    [PLACEHOLDER] Google Maps API-based provider.
    Use provider='google_maps_browser' for the real browser implementation.
    """
    return _fallback_to_mock("google_maps", city, keyword)


@_register_provider("places_api")
def _search_with_places_api(city: str, keyword: str, **kwargs) -> list[dict]:
    """
    [PLACEHOLDER] Google Places API (New) integration.
    Requires a GOOGLE_PLACES_API_KEY environment variable.
    Not yet implemented — falls back to mock.
    """
    return _fallback_to_mock("places_api", city, keyword)


@_register_provider("serpapi")
def _search_with_serpapi(city: str, keyword: str, **kwargs) -> list[dict]:
    """
    [PLACEHOLDER] SerpAPI Google Maps search.
    Requires a SERPAPI_API_KEY environment variable.
    Not yet implemented — falls back to mock.
    """
    return _fallback_to_mock("serpapi", city, keyword)


@_register_provider("apify")
def _search_with_apify(city: str, keyword: str, **kwargs) -> list[dict]:
    """
    [PLACEHOLDER] Apify Google Maps Scraper actor integration.
    Requires an APIFY_API_TOKEN environment variable.
    Not yet implemented — falls back to mock.
    """
    return _fallback_to_mock("apify", city, keyword)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_businesses(
    city: str,
    keyword: str,
    provider: str = "mock",
    max_results: int = 40,
    **kwargs,
) -> list[BusinessRecord]:
    """
    Search for businesses in *city* using *keyword* via the specified *provider*.

    Parameters
    ----------
    city        : The target city (e.g. "Monterrey").
    keyword     : The search term (e.g. "cancelería").
    provider    : One of "mock", "google_maps_browser", "google_maps",
                  "places_api", "serpapi", "apify".
                  Unknown providers raise ValueError.
    max_results : Upper bound on results (forwarded to real providers).
                  Ignored by the mock provider.

    Returns
    -------
    A list of normalised BusinessRecord objects.
    """
    if provider not in _PROVIDERS:
        available = ", ".join(sorted(_PROVIDERS))
        raise ValueError(
            f"Unknown provider '{provider}'. Available providers: {available}"
        )

    logger.info(
        "Searching | city=%s | keyword=%s | provider=%s | max_results=%d",
        city, keyword, provider, max_results,
    )

    search_fn = _PROVIDERS[provider]

    try:
        raw_results: list[dict] = search_fn(city, keyword, max_results=max_results, **kwargs)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Provider '%s' raised an exception for city=%s keyword=%s: %s",
            provider, city, keyword, exc,
        )
        return []

    records: list[BusinessRecord] = []
    for raw in raw_results:
        try:
            record = _map_raw_to_business_record(
                raw=raw,
                city=city,
                keyword=keyword,
                source_platform=provider,
            )
            records.append(record)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to map raw record: %s | raw=%s", exc, raw)

    logger.info(
        "Found %d records | city=%s | keyword=%s | provider=%s",
        len(records), city, keyword, provider,
    )
    return records


def search_multiple_keywords(
    city: str,
    keywords: list[str],
    provider: str = "mock",
    max_results: int = 40,
) -> list[BusinessRecord]:
    """
    Run *search_businesses* for every keyword and return a deduplicated list.

    Deduplication key: (business_name, phone, address) — normalised to
    lowercase and stripped so that minor formatting differences don't
    produce duplicate entries.

    Parameters
    ----------
    city        : The target city.
    keywords    : A list of search terms (e.g. ["cancelería", "vidrio templado"]).
    provider    : Provider name — forwarded to search_businesses.
    max_results : Per-keyword upper bound — forwarded to search_businesses.

    Returns
    -------
    A deduplicated list of BusinessRecord objects.
    """
    if not keywords:
        logger.warning("search_multiple_keywords called with an empty keywords list.")
        return []

    # key → index in all_records (so we can update in-place)
    seen: dict[tuple, int] = {}
    all_records: list[BusinessRecord] = []

    for keyword in keywords:
        records = search_businesses(
            city=city,
            keyword=keyword,
            provider=provider,
            max_results=max_results,
        )
        for record in records:
            # Primary key: listing URL when available (most precise).
            # Fallback: (name, phone, address) tuple for non-URL providers.
            if record.listing_url:
                dedup_key: tuple = (record.listing_url,)
            else:
                dedup_key = (
                    record.business_name.lower().strip(),
                    record.phone.lower().strip(),
                    record.address.lower().strip(),
                )

            if dedup_key in seen:
                # Already recorded — update cross-keyword tracking fields
                idx = seen[dedup_key]
                existing = all_records[idx]

                new_keywords = existing.matched_keywords.copy()
                if keyword not in new_keywords:
                    new_keywords.append(keyword)

                all_records[idx] = _dc_replace(
                    existing,
                    matched_keywords       = new_keywords,
                    matched_keywords_count = len(new_keywords),
                    times_found            = existing.times_found + 1,
                )
                logger.debug(
                    "Cross-keyword hit: '%s' (key=%s) now matched by %d keywords",
                    existing.business_name, dedup_key, len(new_keywords),
                )
                continue

            # First time seeing this business — add it
            initial_keywords = [keyword]
            record = _dc_replace(
                record,
                matched_keywords       = initial_keywords,
                matched_keywords_count = 1,
                times_found            = 1,
            )
            seen[dedup_key] = len(all_records)
            all_records.append(record)

    logger.info(
        "search_multiple_keywords complete | city=%s | keywords=%d | unique_records=%d",
        city, len(keywords), len(all_records),
    )
    return all_records


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)-8s %(name)s | %(message)s",
    )

    # Accept optional provider argument: python discovery.py google_maps_browser
    PROVIDER = sys.argv[1] if len(sys.argv) > 1 else "mock"

    CITY = "Monterrey"
    KEYWORDS = [
        "cancelería",
        "vidrio templado",
        "ventanas de aluminio",
        "canceles de baño",
        "aluminio y vidrio",
    ]

    print(f"\n{'='*65}")
    print(f"  city-prospect-radar  |  Discovery smoke test")
    print(f"  City: {CITY}  |  Provider: {PROVIDER}  |  Keywords: {len(KEYWORDS)}")
    print(f"{'='*65}\n")

    results = search_multiple_keywords(
        city=CITY,
        keywords=KEYWORDS,
        provider=PROVIDER,
        max_results=20,
    )

    print(f"\nReturned {len(results)} unique records:\n")
    for i, rec in enumerate(results, start=1):
        rating_str = f"{rec.rating:.1f}★" if rec.rating is not None else "no rating"
        website_str = rec.website_url or "(no website)"
        print(
            f"  [{i:02d}] {rec.business_name}\n"
            f"        category   : {rec.google_category}\n"
            f"        address    : {rec.address}\n"
            f"        phone      : {rec.phone}\n"
            f"        rating     : {rating_str}  |  reviews: {rec.review_count} ({rec.review_count_bucket})\n"
            f"        website    : {website_str}\n"
            f"        keyword    : {rec.search_keyword}\n"
        )

    print(f"{'='*65}")
    print("  Smoke test passed.\n")
