"""
heuristics.py
-------------
Prospect Intelligence Layer for city-prospect-radar.

Derives lightweight commercial signals from a BusinessRecord using
transparent, rule-based heuristics.  No ML, no external calls, no I/O.

Every function in this module is a pure transformation:
    BusinessRecord  →  BusinessRecord  (with heuristic fields populated)

Public API
----------
    enrich_record(record: BusinessRecord) -> BusinessRecord
    enrich_records(records: list[BusinessRecord]) -> list[BusinessRecord]

The main entry point is enrich_records(), which runs the full heuristic
pipeline on a list of records and returns them ranked by preliminary score.
"""

import logging
import re
import urllib.parse
from dataclasses import replace

from models import BusinessRecord

logger = logging.getLogger(__name__)

# ===========================================================================
# Keyword lists — the niche vocabulary for aluminio/vidrio/canceleria in MX
# ===========================================================================

# Terms that suggest a residential-facing operation (good pitch target)
_RESIDENTIAL_KEYWORDS = [
    "residencial", "hogar", "casa", "departamento", "depa", "habitacional",
    "fraccionamiento", "vivienda", "domicilio", "cochera", "baño",
    "cancel", "canceles", "mampara", "mamparas", "ventana", "ventanas",
    "puerta", "puertas", "fachada", "fachadas", "terraza", "balcón",
    "closet", "clóset", "espejo", "espejos",
]

# Terms that suggest an industrial / B2B focus (harder pitch, less visual)
_INDUSTRIAL_KEYWORDS = [
    "industrial", "constructora", "construcción", "taller", "fábrica",
    "herraje", "herrajes", "perfilería", "perfil", "distribuidor",
    "mayorista", "bodega", "bodegas", "ferretería", "ferretero",
    "maquiladora", "maquila", "proyectos", "obra", "obras", "contratista",
]

# Terms that suggest a premium / design-oriented business (easier aesthetic pitch)
_PREMIUM_KEYWORDS = [
    "premium", "lujo", "luxury", "elegante", "elegancia", "exclusivo",
    "exclusiva", "diseño", "design", "decoración", "decorativo",
    "minimalista", "moderno", "moderna", "contemporáneo", "vanguardia",
    "alta calidad", "premier",
]

# Generic or commodity-sounding terms (harder to differentiate, lower urgency)
_GENERIC_KEYWORDS = [
    "genérico", "barato", "económico", "precio", "oferta", "descuento",
    "express", "rápido", "inmediato", "entrega", "24 hrs", "24hrs",
    "todo tipo", "todo uso", "varios", "en general",
]

# Terms that suggest visual/aesthetic services (good for web presence pitch)
_VISUAL_KEYWORDS = [
    "cancel", "canceles", "mampara", "mamparas", "espejo", "espejos",
    "fachada", "fachadas", "decorativo", "decoración", "cristal",
    "templado", "laminado", "vidrio", "doble", "triple", "premium",
    "lujo", "baño", "aluminio", "ventana", "puerta",
]

# ===========================================================================
# Domain / website type classifier
# ===========================================================================

# Domain patterns for common platforms (not own domains)
_FACEBOOK_PATTERNS   = ["facebook.com", "fb.com", "fb.me"]
_INSTAGRAM_PATTERNS  = ["instagram.com", "instagr.am"]
_MARKETPLACE_PATTERNS = [
    "mercadolibre", "mercadolibre.com.mx", "amazon", "etsy",
    "páginas-amarillas", "paginas-amarillas", "yp.com",
    "foursquare", "yelp", "tripadvisor", "google.com/maps",
    "maps.google",
]


def classify_website_domain(website_url: str) -> str:
    """
    Classify the type of web presence by looking at the domain.

    Returns one of:
        "none"                    – no website_url at all
        "own_domain"              – proper own-domain website
        "facebook_only"           – Facebook page used as website
        "instagram_only"          – Instagram profile used as website
        "marketplace_or_directory"– Mercado Libre, Yelp, Google Maps, etc.
        "hosted_builder"          – Wix, Squarespace, Blogspot, etc.
        "unknown"                 – has a URL but unclear type
    """
    if not website_url or website_url.strip() == "":
        return "none"

    url = website_url.lower().strip()

    for pattern in _FACEBOOK_PATTERNS:
        if pattern in url:
            return "facebook_only"

    for pattern in _INSTAGRAM_PATTERNS:
        if pattern in url:
            return "instagram_only"

    # Check builders before marketplaces to ensure builder platforms are correctly classified
    _BUILDER_PATTERNS = ["wix.com", "weebly.com", "blogspot.com",
                         "wordpress.com", "squarespace.com"]
    for pattern in _BUILDER_PATTERNS:
        if pattern in url:
            return "hosted_builder"

    for pattern in _MARKETPLACE_PATTERNS:
        if pattern in url:
            return "marketplace_or_directory"

    # If the URL has a recognisable TLD and doesn't match the above, treat it
    # as an own domain.
    try:
        parsed = urllib.parse.urlparse(website_url)
        hostname = parsed.hostname or ""
        if hostname and "." in hostname:
            return "own_domain"
    except Exception:
        pass

    return "unknown"


# ===========================================================================
# Review signal mapper
# ===========================================================================


def classify_review_signal(review_count: int) -> str:
    """
    Classify review volume as a commercial signal.

    Returns one of: "none" | "low" | "medium" | "high"

    A business with medium reviews (≥10) has proven local traction —
    an easy conversation starter.  High reviews (≥50) suggests they're
    doing real volume and may have more at stake in their online image.
    """
    if review_count <= 0:
        return "none"
    if review_count < 10:
        return "low"
    if review_count < 50:
        return "medium"
    return "high"


# ===========================================================================
# Business size hint
# ===========================================================================


def infer_size_hint(record: BusinessRecord) -> str:
    """
    Rough size inference from the available record fields.

    Returns one of: "tiny" | "small" | "established" | "unclear"

    Logic:
        established  → rating + medium/high reviews + address + phone
        small        → some reviews OR has website
        tiny         → no reviews, no website, sparse info
        unclear      → can't tell (e.g. no data at all)
    """
    has_address  = bool(record.address)
    has_phone    = bool(record.phone)
    has_website  = bool(record.website_url)
    review_sig   = classify_review_signal(record.review_count)

    completeness = sum([has_address, has_phone, has_website])

    if review_sig in ("medium", "high") and completeness >= 2:
        return "established"

    if review_sig == "low" or has_website or completeness >= 2:
        return "small"

    if completeness == 0 and review_sig == "none":
        return "unclear"

    return "tiny"


# ===========================================================================
# Name / text keyword detection helpers
# ===========================================================================


def _text_corpus(record: BusinessRecord) -> str:
    """Build a single lowercase text blob from all descriptive fields."""
    parts = [
        record.business_name,
        record.google_category,
        record.business_description,
        record.website_title,
        record.website_h1,
        record.website_main_text_excerpt,
        record.website_meta_description,
    ]
    return " ".join(p for p in parts if p).lower()


def _contains_any(text: str, keywords: list[str]) -> bool:
    """Return True if *text* contains any keyword as a substring."""
    for kw in keywords:
        if kw in text:
            return True
    return False


def detect_residential_signal(record: BusinessRecord) -> bool:
    """True if the business text corpus contains residential-service keywords."""
    return _contains_any(_text_corpus(record), _RESIDENTIAL_KEYWORDS)


def detect_industrial_signal(record: BusinessRecord) -> bool:
    """True if the business text corpus suggests industrial / B2B focus."""
    return _contains_any(_text_corpus(record), _INDUSTRIAL_KEYWORDS)


def detect_premium_signal(record: BusinessRecord) -> bool:
    """True if the business presents itself as premium / high-end."""
    return _contains_any(_text_corpus(record), _PREMIUM_KEYWORDS)


def detect_generic_signal(record: BusinessRecord) -> bool:
    """True if the business uses commodity / price-focused language."""
    return _contains_any(_text_corpus(record), _GENERIC_KEYWORDS)


def detect_good_visual_potential(record: BusinessRecord) -> bool:
    """
    True if the business category or description suggests visually interesting
    products (canceles, espejos, fachadas, vidrio templado, etc.) that
    would benefit greatly from high-quality photography on a landing page.
    """
    return _contains_any(_text_corpus(record), _VISUAL_KEYWORDS)


# ===========================================================================
# Pitch fit heuristic
# ===========================================================================


def infer_pitch_fit(record: BusinessRecord) -> str:
    """
    High-level pitch-fit assessment for the landing-page sales conversation.

    Returns one of: "excellent" | "good" | "weak"

    Scoring logic (additive, transparent):
        +2  has good visual potential
        +2  residential signal (direct-to-consumer = easier sale)
        +1  premium signal (willing to invest in image)
        +1  review_signal medium or high (real traction, real business)
        -2  industrial signal (corporate buyer, longer cycle)
        -1  generic signal (price-focused, commodity mindset)
        -1  no reviews + no website + no phone (may not be real business)
    """
    score = 0

    if detect_good_visual_potential(record):
        score += 2
    if detect_residential_signal(record):
        score += 2
    if detect_premium_signal(record):
        score += 1
    if classify_review_signal(record.review_count) in ("medium", "high"):
        score += 1
    if detect_industrial_signal(record):
        score -= 2
    if detect_generic_signal(record):
        score -= 1

    has_any_contact = bool(record.phone or record.website_url)
    if not has_any_contact and record.review_count == 0:
        score -= 1

    if score >= 3:
        return "excellent"
    if score >= 1:
        return "good"
    return "weak"


# ===========================================================================
# Needs-better-web-presence heuristic
# ===========================================================================


def infer_needs_better_web_presence(record: BusinessRecord) -> bool:
    """
    Return True when the business is a good candidate for the web-presence
    sales pitch — i.e. it has real traction but weak digital presence.

    Conditions (any of):
        - no website at all  AND  any reviews or phone
        - website is Facebook/Instagram only  AND  has reviews
        - website exists but website_looks_modern_heuristic is False AND has reviews
        - hosted_builder site  (Wix/Blogspot etc.) → strong upgrade pitch
    """
    domain_type  = classify_website_domain(record.website_url)
    review_sig   = classify_review_signal(record.review_count)
    has_traction = review_sig in ("low", "medium", "high") or bool(record.phone)

    if domain_type == "none" and has_traction:
        return True

    if domain_type in ("facebook_only", "instagram_only") and review_sig != "none":
        return True

    if domain_type == "hosted_builder":
        return True

    if domain_type == "own_domain" and not record.website_looks_modern_heuristic \
            and review_sig in ("medium", "high"):
        return True

    return False


# ===========================================================================
# Contact strength heuristic
# ===========================================================================


def infer_contact_strength(record: BusinessRecord) -> str:
    """
    How easy is it to reach this business?

    Returns one of: "strong" | "medium" | "weak"

    strong → phone + (website OR listing_url) — can reach by WhatsApp + verify
    medium → phone only OR website only
    weak   → neither phone nor website
    """
    has_phone   = bool(record.phone and record.phone.strip())
    has_web     = bool(record.website_url)
    has_listing = bool(record.listing_url)

    if has_phone and (has_web or has_listing):
        return "strong"
    if has_phone or has_web:
        return "medium"
    return "weak"


# ===========================================================================
# Listing quality hint
# ===========================================================================


def infer_listing_quality(record: BusinessRecord) -> str:
    """
    How complete and trustworthy does this Google Maps listing look?

    Returns one of: "weak" | "average" | "strong"

    strong  → name + address + phone + (website or description) + some reviews
    average → name + address or phone, some info
    weak    → sparse or empty fields
    """
    field_scores = [
        bool(record.business_name),
        bool(record.address),
        bool(record.phone),
        bool(record.website_url or record.business_description),
        record.review_count > 0,
        bool(record.google_category),
    ]
    score = sum(field_scores)

    if score >= 5:
        return "strong"
    if score >= 3:
        return "average"
    return "weak"


# ===========================================================================
# Preliminary commercial score
# ===========================================================================
#
# This score is a rough pre-sort to surface the most promising records
# before sending to Gemini.  It is NOT a final judgment.
#
# The point allocations are intentionally transparent, heuristic, and highly tunable.
# There is no rigid maximum score — it evolves as rules are added or tweaked.
#
# Target benchmarks:
# Excellent prospects typically score > 15
# Good prospects score 11–15
# Borderline prospects score 6–10
# Skip candidates score < 6


def compute_preliminary_score(
    record: BusinessRecord,
    contact_strength: str | None = None,
    review_signal: str | None = None,
    needs_better_web_presence: bool | None = None,
    website_domain_type: str | None = None,
    good_visual_potential: bool | None = None,
    pitch_fit: str | None = None,
    listing_quality_hint: str | None = None,
    industrial_signal: bool | None = None,
    generic_signal: bool | None = None,
) -> int:
    """
    Compute a tunable heuristic commercial score for the record.

    Higher → prioritise for Gemini review and WhatsApp outreach.

    Breaking down the typical point allocations (subject to tuning):
        Contact reachability   (max +4)
        Review traction        (max +4)
        Digital presence gap   (max +5  explicit flag + up to +3 domain gap)
        Visual potential       (max +3)
        Pitch fit alignment    (max +4)
        Listing legitimacy     (max +1, penalises overly perfect listings)
        Deductions             (up to -4)
    """
    score = 0

    # --- Contact reachability ---
    contact = contact_strength if contact_strength is not None else infer_contact_strength(record)
    score += {"strong": 4, "medium": 2, "weak": 0}[contact]

    # --- Review traction (legitimacy signal) ---
    review_sig = review_signal if review_signal is not None else classify_review_signal(record.review_count)
    score += {"none": 0, "low": 1, "medium": 3, "high": 4}[review_sig]

    # --- Digital presence gap (the bigger the gap, the stronger the pitch) ---
    needs_web = needs_better_web_presence if needs_better_web_presence is not None else infer_needs_better_web_presence(record)
    if needs_web:
        score += 5  # massive bump for explicit gap detection

    domain_type = website_domain_type if website_domain_type is not None else classify_website_domain(record.website_url)
    score += {
        "none":                    3,
        "facebook_only":           3,
        "instagram_only":          3,
        "hosted_builder":          2,
        "marketplace_or_directory": 1,
        "own_domain":              0,
        "unknown":                 0,
    }[domain_type]

    # --- Visual / aesthetic potential ---
    visual = good_visual_potential if good_visual_potential is not None else detect_good_visual_potential(record)
    if visual:
        score += 3

    # --- Pitch fit ---
    pfit = pitch_fit if pitch_fit is not None else infer_pitch_fit(record)
    score += {"excellent": 4, "good": 2, "weak": 0}[pfit]

    # --- Listing legitimacy ---
    # Dampened to avoid prioritizing businesses that are already "too perfect" and don't need help
    listing_quality = listing_quality_hint if listing_quality_hint is not None else infer_listing_quality(record)
    score += {"strong": 1, "average": 0, "weak": -1}[listing_quality]

    # --- Deductions ---
    ind_sig = industrial_signal if industrial_signal is not None else detect_industrial_signal(record)
    if ind_sig:
        score -= 2   # harder close
        
    gen_sig = generic_signal if generic_signal is not None else detect_generic_signal(record)
    if gen_sig:
        score -= 1   # commodity mindset
        
    if review_sig == "none" and not record.phone:
        score -= 1   # ghost listing — not worth pursuing

    return max(0, score)


# ===========================================================================
# Prospect tier from score
# ===========================================================================


def score_to_tier(score: int) -> str:
    """
    Convert a preliminary commercial score to a named tier.

    Returns one of: "top" | "high" | "medium" | "low"
    """
    if score >= 16:
        return "top"
    if score >= 11:
        return "high"
    if score >= 6:
        return "medium"
    return "low"


# ===========================================================================
# Full record enrichment
# ===========================================================================


def enrich_record(record: BusinessRecord) -> BusinessRecord:
    """
    Run the full heuristic pipeline on a single BusinessRecord.

    Returns a new BusinessRecord with all heuristic fields populated.
    Does NOT mutate the input record.

    Fields populated correspond 1-to-1 with BusinessRecord dataclass
    fields added in models.py under the 'Extended heuristic signals' block.
    """
    website_domain_type          = classify_website_domain(record.website_url)
    review_signal_val            = classify_review_signal(record.review_count)
    size_hint_val                = infer_size_hint(record)
    residential_sig              = detect_residential_signal(record)
    industrial_sig               = detect_industrial_signal(record)
    premium_sig                  = detect_premium_signal(record)
    generic_sig                  = detect_generic_signal(record)
    visual_potential             = detect_good_visual_potential(record)
    pitch_fit_val                = infer_pitch_fit(record)
    needs_web                    = infer_needs_better_web_presence(record)
    contact_strength_val         = infer_contact_strength(record)
    listing_quality_val          = infer_listing_quality(record)
    score = compute_preliminary_score(
        record,
        contact_strength=contact_strength_val,
        review_signal=review_signal_val,
        needs_better_web_presence=needs_web,
        website_domain_type=website_domain_type,
        good_visual_potential=visual_potential,
        pitch_fit=pitch_fit_val,
        listing_quality_hint=listing_quality_val,
        industrial_signal=industrial_sig,
        generic_signal=generic_sig,
    )
    tier                         = score_to_tier(score)

    enriched = replace(
        record,
        # Re-derive basics defensively
        has_reviews  = record.review_count > 0,
        has_website  = bool(record.website_url),
        # Website structure
        website_structure_type = "unknown", # will be populated via structure classifier if added later
        website_domain_type    = website_domain_type,
        # Review signal
        review_signal = review_signal_val,
        # Size hint
        size_hint = size_hint_val,
        # Keyword signals and Commercial classification
        residential_signal = residential_sig,
        industrial_signal  = industrial_sig,
        premium_signal     = premium_sig,
        generic_signal     = generic_sig,
        good_visual_potential = visual_potential,
        likely_easy_pitch  = pitch_fit_val in ("excellent", "good"),
        likely_hard_pitch  = pitch_fit_val == "weak" or industrial_sig,
        # Pitch fit + web presence
        pitch_fit                  = pitch_fit_val,
        needs_better_web_presence  = needs_web,
        # Reachability
        contact_strength   = contact_strength_val,
        # Listing quality
        listing_quality_hint = listing_quality_val,
        # Scoring
        prospect_score               = score,
        prospect_tier                = tier,
        preliminary_commercial_score = score,
    )

    logger.debug(
        "Enriched | %s | score=%d | tier=%s | pitch=%s | domain=%s",
        record.business_name, score, tier, pitch_fit_val, website_domain_type,
    )

    return enriched



def enrich_records(records: list[BusinessRecord]) -> list[BusinessRecord]:
    """
    Enrich a list of BusinessRecords and return them sorted by heuristic score
    (highest first) so the most promising prospects surface immediately.

    Parameters
    ----------
    records : Raw BusinessRecord list from the discovery layer.

    Returns
    -------
    Enriched and pre-sorted BusinessRecord list.
    """
    enriched = []
    for rec in records:
        try:
            enriched.append(enrich_record(rec))
        except Exception as exc:
            logger.warning("Failed to enrich record '%s': %s", rec.business_name, exc)
            enriched.append(rec)  # keep unenriched rather than dropping

    enriched.sort(key=lambda r: r.prospect_score, reverse=True)

    logger.info(
        "Heuristics enrichment complete | records=%d | top_score=%d | top_tier=%s",
        len(enriched),
        enriched[0].prospect_score if enriched else 0,
        enriched[0].prospect_tier  if enriched else "—",
    )
    return enriched
