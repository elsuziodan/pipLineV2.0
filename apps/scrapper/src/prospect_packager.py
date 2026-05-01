"""
prospect_packager.py
--------------------
Export and packaging layer for city-prospect-radar.

Converts enriched BusinessRecord lists into formats optimised for:
    1. Human review (CSV, JSON)
    2. Gemini 3 Pro batch analysis (structured JSON batches)
    3. WhatsApp outreach shortlist (ranked, filtered CSV)

Public API
----------
    export_master_csv(records, output_path)
    export_master_json(records, output_path)
    export_gemini_batches(records, output_dir, batch_size)
    export_shortlist_csv(records, output_path, top_n)
    export_all(records, output_dir, ...)   ← main convenience function

No external dependencies beyond the standard library.
"""

import csv
import json
import logging
import os
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from models import BusinessRecord

logger = logging.getLogger(__name__)

# ===========================================================================
# Configuration
# ===========================================================================

DEFAULT_BATCH_SIZE   = 15   # prospects per Gemini batch (12–18 is ideal)
DEFAULT_TOP_N        = 30   # records in the WhatsApp shortlist
SHORTLIST_MIN_SCORE  = 5    # minimum heuristic score to appear in shortlist

# ===========================================================================
# Field selection for different export types
# ===========================================================================

# These are the fields that matter for commercial decision-making.
# The order here is preserved in CSV headers.
_PROSPECT_FIELDS = [
    # --- Identity ---
    "city",
    "business_name",
    "google_category",
    "phone",
    "address",
    "listing_url",
    "website_url",
    # --- Google Maps signals ---
    "rating",
    "review_count",
    "review_count_bucket",
    # --- Heuristic commercial signals ---
    "prospect_score",
    "prospect_tier",
    "website_structure_type",
    "website_domain_type",
    "contact_strength",
    "review_signal",
    "size_hint",
    "residential_signal",
    "industrial_signal",
    "premium_signal",
    "generic_signal",
    "good_visual_potential",
    "pitch_fit",
    "needs_better_web_presence",
    "listing_quality_hint",
    "preliminary_commercial_score",
    # --- Cross-keyword discovery ---
    "matched_keywords",
    "matched_keywords_count",
    "times_found",
    # --- Website audit ---
    "website_status",
    "website_title",
    "website_h1",
    "website_meta_description",
    "website_main_text_excerpt",
    "website_has_gallery",
    "website_has_cta",
    "website_has_whatsapp_button",
    "website_has_service_sections",
    "website_has_contact_form",
    "website_has_bad_copy_signals",
    "website_looks_modern_heuristic",
    # --- Description ---
    "business_description",
]

# Fields used in the Gemini batch prompt — optimised for AI readability.
# Excludes very chatty fields like website_main_text_excerpt (too long for batch).
_GEMINI_FIELDS = [
    "city",
    "business_name",
    "google_category",
    "address",
    "phone",
    "listing_url",
    "website_url",
    "rating",
    "review_count",
    "has_website",
    "website_structure_type",
    "website_domain_type",
    "contact_strength",
    "review_signal",
    "size_hint",
    "residential_signal",
    "industrial_signal",
    "premium_signal",
    "generic_signal",
    "good_visual_potential",
    "pitch_fit",
    "needs_better_web_presence",
    "listing_quality_hint",
    "preliminary_commercial_score",
    "matched_keywords",
    "times_found",
    "website_status",
    "website_title",
    "website_h1",
    "website_has_gallery",
    "website_has_cta",
    "website_has_whatsapp_button",
    "website_has_service_sections",
    "website_has_contact_form",
    "website_has_bad_copy_signals",
    "website_looks_modern_heuristic",
    "business_description",
]

# ===========================================================================
# Record serialisation helpers
# ===========================================================================


def _record_to_flat_dict(record: BusinessRecord) -> dict:
    """
    Convert a BusinessRecord to a flat dict suitable for export.

    Reads both dataclass fields (via asdict) AND any extra heuristic
    attributes attached dynamically by heuristics.enrich_record().

    Lists are serialised as semicolon-separated strings for CSV compat.
    """
    # Start with the dataclass canonical fields
    base = asdict(record)

    # Overlay any dynamically-attached heuristic attributes
    for key, val in record.__dict__.items():
        if key not in base:
            base[key] = val

    # Serialise lists for CSV
    for key, val in base.items():
        if isinstance(val, list):
            base[key] = ";".join(str(v) for v in val)
        elif isinstance(val, bool):
            base[key] = val   # keep as bool — JSON handles it fine, CSV gets True/False

    return base


def _pick_fields(flat: dict, fields: list[str]) -> dict:
    """Return a new dict containing only the requested fields (in order)."""
    return {f: flat.get(f, "") for f in fields}


def _sort_by_score(records: list[BusinessRecord]) -> list[BusinessRecord]:
    """Sort records by prospect_score descending, then review_count descending."""
    return sorted(
        records,
        key=lambda r: (r.prospect_score, r.review_count),
        reverse=True,
    )


# ===========================================================================
# Export: Master CSV
# ===========================================================================


def export_master_csv(
    records: list[BusinessRecord],
    output_path: str,
) -> str:
    """
    Write all enriched records to a master CSV file.

    Returns the absolute path of the written file.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    sorted_records = _sort_by_score(records)

    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=_PROSPECT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for record in sorted_records:
            flat = _record_to_flat_dict(record)
            row  = _pick_fields(flat, _PROSPECT_FIELDS)
            writer.writerow(row)

    logger.info("Master CSV written | %d records | %s", len(records), path)
    return str(path.resolve())


# ===========================================================================
# Export: Master JSON
# ===========================================================================


def export_master_json(
    records: list[BusinessRecord],
    output_path: str,
) -> str:
    """
    Write all enriched records to a master JSON file (array of objects).

    Returns the absolute path of the written file.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    sorted_records = _sort_by_score(records)
    payload = [_record_to_flat_dict(r) for r in sorted_records]

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2, default=str)

    logger.info("Master JSON written | %d records | %s", len(records), path)
    return str(path.resolve())


# ===========================================================================
# Export: Gemini batches
# ===========================================================================

_GEMINI_SYSTEM_PROMPT = """\
You are a commercial intelligence analyst helping a small digital-services agency
identify the BEST local businesses to approach with a landing-page / digital
presence upgrade pitch in Mexico.

The agency specialises in: aluminio y vidrio, cancelería, ventanas de aluminio,
canceles de baño, vidrio templado.  Their ideal client is a small-to-medium family
business that serves residential customers, has some local reputation (reviews, phone),
but has a weak or non-existent website.

For each prospect in the batch below, analyse the structured data and provide:

1. fit_score  (integer 1–10, where 10 = perfect pitch target)
2. fit_reason  (1 sentence explaining the score)
3. contact_priority  ("high" | "medium" | "low")
4. conversation_opener  (a brief, specific, friendly WhatsApp message opener in Spanish
   that references something real about this business — never generic)
5. red_flags  (list of reasons NOT to approach, if any; empty list if none)
6. recommendation  ("approach" | "monitor" | "skip")

Return your response as a JSON array, one object per prospect, in the same order.
Do NOT add extra commentary outside the JSON array.

Batch of prospects to evaluate:
"""


def export_gemini_batches(
    records: list[BusinessRecord],
    output_dir: str,
    batch_size: int = DEFAULT_BATCH_SIZE,
    min_score: int = 0,
) -> list[str]:
    """
    Split the best records into small JSON batch files for Gemini analysis.

    Each batch file contains:
        - a system_prompt field with context + instructions for Gemini
        - a prospects array with concise structured data per record

    Parameters
    ----------
    records    : Enriched, sorted BusinessRecord list.
    output_dir : Directory to write batch files.
    batch_size : Number of prospects per batch (recommended 12–18).
    min_score  : Minimum heuristic score to include in batches.
                 Set to 0 to include all records.

    Returns
    -------
    List of written file paths.
    """
    outdir = Path(output_dir)
    outdir.mkdir(parents=True, exist_ok=True)

    # Filter and sort
    eligible = [r for r in records if r.prospect_score >= min_score]
    sorted_records = _sort_by_score(eligible)

    if not sorted_records:
        logger.warning("No eligible records for Gemini batches (min_score=%d).", min_score)
        return []

    written_paths: list[str] = []
    batch_num = 1
    total = len(sorted_records)

    for start in range(0, total, batch_size):
        batch = sorted_records[start : start + batch_size]
        prospects_data = []
        for rec in batch:
            flat = _record_to_flat_dict(rec)
            prospects_data.append(_pick_fields(flat, _GEMINI_FIELDS))

        payload = {
            "batch_id":      batch_num,
            "batch_size":    len(batch),
            "generated_at":  datetime.now().isoformat(timespec="seconds"),
            "system_prompt": _GEMINI_SYSTEM_PROMPT,
            "prospects":     prospects_data,
        }

        filename = f"gemini_batch_{batch_num:02d}.json"
        out_path = outdir / filename
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2, default=str)

        logger.info(
            "Gemini batch %d/%d written | %d prospects | %s",
            batch_num, -(-total // batch_size), len(batch), out_path,
        )
        written_paths.append(str(out_path.resolve()))
        batch_num += 1

    return written_paths


# ===========================================================================
# Export: WhatsApp shortlist CSV
# ===========================================================================


def export_shortlist_csv(
    records: list[BusinessRecord],
    output_path: str,
    top_n: int = DEFAULT_TOP_N,
    min_score: int = SHORTLIST_MIN_SCORE,
) -> str:
    """
    Export a 'best candidates first' shortlist — the records you should
    contact by WhatsApp first.

    Filters to records with a heuristic score ≥ min_score, takes the
    top_n by score, and writes a clean, action-oriented CSV.

    Returns the absolute path of the written file.
    """
    sorted_records = _sort_by_score(records)
    shortlist = [r for r in sorted_records if r.prospect_score >= min_score][:top_n]

    if not shortlist:
        logger.warning(
            "Shortlist is empty (min_score=%d). Consider lowering the threshold.",
            min_score,
        )

    # Shortlist uses a focused subset of fields
    shortlist_fields = [
        "prospect_tier",
        "prospect_score",
        "business_name",
        "google_category",
        "phone",
        "address",
        "city",
        "website_url",
        "has_website",
        "website_structure_type",
        "website_domain_type",
        "needs_better_web_presence",
        "contact_strength",
        "review_signal",
        "review_count",
        "rating",
        "pitch_fit",
        "good_visual_potential",
        "residential_signal",
        "listing_url",
        "matched_keywords",
        "times_found",
        "website_title",
        "website_has_whatsapp_button",
        "website_has_cta",
    ]

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=shortlist_fields, extrasaction="ignore")
        writer.writeheader()
        for record in shortlist:
            flat = _record_to_flat_dict(record)
            row  = _pick_fields(flat, shortlist_fields)
            writer.writerow(row)

    logger.info(
        "Shortlist CSV written | %d records (top %d, min_score=%d) | %s",
        len(shortlist), top_n, min_score, path,
    )
    return str(path.resolve())


# ===========================================================================
# Convenience: export everything at once
# ===========================================================================


def export_all(
    records: list[BusinessRecord],
    output_dir: str,
    city: Optional[str] = None,
    run_label: Optional[str] = None,
    batch_size: int = DEFAULT_BATCH_SIZE,
    shortlist_top_n: int = DEFAULT_TOP_N,
    shortlist_min_score: int = SHORTLIST_MIN_SCORE,
    gemini_min_score: int = 0,
) -> dict[str, object]:
    """
    Run all exports in one call.  Creates a timestamped subdirectory.

    Parameters
    ----------
    records            : Fully enriched BusinessRecord list.
    output_dir         : Root output directory (e.g. "data/exports").
    run_label          : Optional label appended to the directory name.
                         Defaults to ISO timestamp.
    batch_size         : Gemini batch size.
    shortlist_top_n    : Maximum prospects in shortlist.
    shortlist_min_score: Minimum score for shortlist inclusion.
    gemini_min_score   : Minimum score for Gemini batch inclusion.

    Returns
    -------
    A dict with keys:
        run_dir          – path to the export directory
        master_csv       – path to master CSV
        master_json      – path to master JSON
        shortlist_csv    – path to shortlist CSV
        gemini_batches   – list of Gemini batch file paths
        stats            – summary statistics dict
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if run_label:
        label = run_label
    elif city:
        city_slug = city.strip().lower().replace(" ", "_")
        label = f"{city_slug}_{timestamp}"
    else:
        label = timestamp
    run_dir = Path(output_dir) / label
    run_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("Exporting %d enriched records to: %s", len(records), run_dir)
    logger.info("=" * 60)

    master_csv_path  = export_master_csv(records,  str(run_dir / "master.csv"))
    master_json_path = export_master_json(records, str(run_dir / "master.json"))
    shortlist_path   = export_shortlist_csv(
        records, str(run_dir / "shortlist.csv"),
        top_n=shortlist_top_n, min_score=shortlist_min_score,
    )

    gemini_dir   = run_dir / "gemini_batches"
    batch_paths  = export_gemini_batches(
        records, str(gemini_dir),
        batch_size=batch_size, min_score=gemini_min_score,
    )

    # Compute summary stats
    tiers = [r.prospect_tier for r in records]
    stats = {
        "total_records":  len(records),
        "tier_top":       tiers.count("top"),
        "tier_high":      tiers.count("high"),
        "tier_medium":    tiers.count("medium"),
        "tier_low":       tiers.count("low"),
        "with_phone":     sum(1 for r in records if r.phone),
        "with_website":   sum(1 for r in records if r.website_url),
        "no_website":     sum(1 for r in records if not r.website_url),
        "gemini_batches": len(batch_paths),
    }

    # Write a brief run summary
    summary_path = run_dir / "run_summary.json"
    with open(summary_path, "w", encoding="utf-8") as fh:
        json.dump(
            {"label": label, "exported_at": datetime.now().isoformat(), **stats},
            fh, ensure_ascii=False, indent=2,
        )

    logger.info("Export complete. Summary: %s", stats)

    return {
        "run_dir":        str(run_dir),
        "master_csv":     master_csv_path,
        "master_json":    master_json_path,
        "shortlist_csv":  shortlist_path,
        "gemini_batches": batch_paths,
        "stats":          stats,
    }
