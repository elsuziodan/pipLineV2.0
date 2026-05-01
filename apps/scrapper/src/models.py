"""
models.py
---------
Core data model for the city-prospect-radar pipeline.

BusinessRecord is the canonical, stable shape that every module in this
project reads and writes.  It is intentionally a plain dataclass so that
it stays serialisable, portable, and free of external dependencies.

Lifecycle of a record
    discovery  →  [enrichment]  →  [scoring]  →  export
    This file only defines the shape; nothing here mutates the data.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional


@dataclass
class BusinessRecord:
    # ------------------------------------------------------------------
    # Identity / origin  (always set by the discovery layer)
    # ------------------------------------------------------------------
    city: str
    search_keyword: str
    source_platform: str = "google_maps"
    listing_url: str = ""              # canonical Google Maps place URL

    # ------------------------------------------------------------------
    # Cross-keyword discovery tracking  (set by discovery layer)
    # ------------------------------------------------------------------
    matched_keywords: List[str] = field(default_factory=list)  # all keywords that found this business
    matched_keywords_count: int = 0    # derived: len(matched_keywords)
    times_found: int = 1               # how many keyword searches returned this business

    # ------------------------------------------------------------------
    # Basic business info  (set by discovery layer)
    # ------------------------------------------------------------------
    business_name: str = ""
    google_category: str = ""
    address: str = ""
    phone: str = ""
    website_url: str = ""

    # ------------------------------------------------------------------
    # Review signals  (set by discovery layer)
    # ------------------------------------------------------------------
    rating: Optional[float] = None
    review_count: int = 0
    has_reviews: bool = False          # derived: review_count > 0
    review_count_bucket: str = ""      # derived: "0" | "1-4" | "5-19" | "20-99" | "100+"

    # ------------------------------------------------------------------
    # Digital presence  (set by enrichment layer)
    # ------------------------------------------------------------------
    has_website: bool = False          # derived: website_url != ""
    website_structure_type: str = "unknown" # "unknown" | "landing" | "catalog" | "ecommerce"
    has_facebook: bool = False
    has_instagram: bool = False
    has_whatsapp_link: bool = False
    website_status: str = ""           # e.g. "200" | "404" | "timeout" | ""
    social_links_count: int = 0

    # ------------------------------------------------------------------
    # Service / niche signals  (set by enrichment layer)
    # ------------------------------------------------------------------
    services_detected: List[str] = field(default_factory=list)
    business_description: str = ""

    # ------------------------------------------------------------------
    # Website content signals  (set by website auditor)
    # ------------------------------------------------------------------
    website_title: str = ""
    website_meta_description: str = ""
    website_h1: str = ""
    website_main_text_excerpt: str = ""
    website_has_gallery: bool = False
    website_has_cta: bool = False
    website_has_whatsapp_button: bool = False
    website_has_service_sections: bool = False
    website_has_contact_form: bool = False
    website_has_bad_copy_signals: bool = False
    website_looks_modern_heuristic: bool = False

    # ------------------------------------------------------------------
    # Commercial classification flags  (set by heuristics layer)
    # ------------------------------------------------------------------
    residential_signal: bool = False   # derived predominantly B2C/home focus
    industrial_signal: bool = False    # derived predominantly B2B/corporate focus
    premium_signal: bool = False       # premium/luxury branding
    generic_signal: bool = False       # low cost/commodity branding
    good_visual_potential: bool = False# niche requires visual proof (e.g. canceles)
    likely_easy_pitch: bool = False    # overall fit logic = good/excellent
    likely_hard_pitch: bool = False    # overall fit logic = weak or industrial

    # ------------------------------------------------------------------
    # Prospect scoring  (set by scorer)
    # ------------------------------------------------------------------
    prospect_score: int = 0            # operational ranking score
    prospect_tier: str = "low"         # "low" | "medium" | "high" | "top"

    # ------------------------------------------------------------------
    # Extended heuristic signals  (set by heuristics layer)
    # ------------------------------------------------------------------
    website_domain_type: str = "none"  # "none" | "own_domain" | "facebook_only" |
                                       # "instagram_only" | "marketplace_or_directory" |
                                       # "hosted_builder" | "unknown"
    review_signal: str = "none"        # "none" | "low" | "medium" | "high"
    size_hint: str = "unclear"         # "tiny" | "small" | "established" | "unclear"
    pitch_fit: str = "weak"            # "excellent" | "good" | "weak"
    needs_better_web_presence: bool = False
    contact_strength: str = "weak"     # "strong" | "medium" | "weak"
    listing_quality_hint: str = "weak" # "weak" | "average" | "strong"
    preliminary_commercial_score: int = 0  # mirrored from prospect_score for downstream export readability

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return the full record as a plain dictionary (deep copy via asdict)."""
        return asdict(self)

    def to_csv_row(self) -> dict:
        """
        Return a flat dictionary suitable for writing to CSV.
        Lists are serialised as semicolon-delimited strings so that
        each record maps cleanly to a single row.
        """
        data = asdict(self)
        data["services_detected"]  = ";".join(self.services_detected)
        data["matched_keywords"]   = ";".join(self.matched_keywords)
        return data
