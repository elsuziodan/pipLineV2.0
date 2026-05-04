"""
run_pipeline.py
---------------
Complete city-prospect-radar intelligence pipeline.

Usage:
    python run_pipeline.py                         # mock data, no site audit
    python run_pipeline.py --provider real         # real Google Maps scrape
    python run_pipeline.py --audit                 # + website audit (slower)
    python run_pipeline.py --city "Guadalajara" --provider real --audit

All exports are written to:  data/exports/<timestamp>/
    master.csv          — all records, sorted by score
    master.json         — same, as JSON
    shortlist.csv       — top 30 best prospects for WhatsApp outreach
    gemini_batches/     — 1–N batch JSON files ready to paste into Gemini

Overnight recommended command:
    nohup python run_pipeline.py --provider real --audit > logs/run.log 2>&1 &
"""

import argparse
import logging
import sys
from pathlib import Path

# ── Logging setup ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("pipeline")

# ── Pipeline imports ────────────────────────────────────────────────────────
from discovery        import search_multiple_keywords
from heuristics       import enrich_records
from website_auditor  import audit_websites
from prospect_packager import export_all
from validators       import validate_records
from providers.google_maps_browser import _emit_pipeline_event

# ===========================================================================
# Configuration — edit these before an overnight run
# ===========================================================================

CITY = "Querétaro"

KEYWORDS = [
    "taller mecanico",
    "taller de suspensiones",
    "hojalateria y pintura",
    "afinaciones automotrices",
    "servicio automotriz especializado",
    "taller electrico automotriz",
]

MAX_RESULTS_PER_KEYWORD = 15   # keep low — quality > quantity

OUTPUT_DIR = "data/exports"

# Checkpoint directory for the Google Maps browser provider
# (a separate file per keyword, so each can resume independently)
CHECKPOINT_DIR = "data/checkpoints"

# ===========================================================================
# Argument parsing
# ===========================================================================


def parse_args():
    parser = argparse.ArgumentParser(description="city-prospect-radar pipeline")
    parser.add_argument(
        "--provider",
        choices=["mock", "real"],
        default="mock",
        help="'mock' for dev/testing, 'real' for actual Google Maps scraping",
    )
    parser.add_argument(
        "--city",
        default=CITY,
        help=f"Target city (default: {CITY})",
    )
    parser.add_argument(
        "--audit",
        action="store_true",
        default=False,
        help="Run lightweight website audit on businesses with a website URL",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=MAX_RESULTS_PER_KEYWORD,
        help=f"Max results per keyword (default: {MAX_RESULTS_PER_KEYWORD})",
    )
    parser.add_argument(
        "--keywords",
        type=str,
        default="",
        help="Comma-separated list of keywords to search",
    )
    return parser.parse_args()


# ===========================================================================
# Pipeline
# ===========================================================================


def run(city: str, provider_name: str, run_audit: bool, max_results: int, custom_keywords: list = None):
    actual_provider = "google_maps_browser" if provider_name == "real" else "mock"
    keywords_to_use = custom_keywords if custom_keywords else KEYWORDS

    logger.info("=" * 65)
    logger.info("  city-prospect-radar  |  Intelligence Pipeline")
    logger.info("  City: %s | Provider: %s | Audit: %s | MaxPer: %d",
                city, actual_provider, run_audit, max_results)
    logger.info("  Keywords: %s", ", ".join(keywords_to_use))
    logger.info("=" * 65)

    # ── Step 1: Discovery ──────────────────────────────────────────────────
    logger.info("\n[1/4] Discovery ...")

    # Build per-keyword checkpoint file paths for resumable real runs
    extra_kwargs: dict = {"max_results": max_results}

    if actual_provider == "google_maps_browser":
        Path(CHECKPOINT_DIR).mkdir(parents=True, exist_ok=True)
        # We call search_multiple_keywords which internally calls search_businesses
        # per keyword, but can't pass per-keyword checkpoints via the public API.
        # For full checkpoint support per keyword, call search_businesses() directly:
        from discovery import search_businesses
        from heuristics import enrich_record
        from dataclasses import replace

        seen: dict = {}
        all_records = []

        for kw in keywords_to_use:
            checkpoint_path = (
                f"{CHECKPOINT_DIR}/{city.lower().replace(' ', '_')}"
                f"_{kw.lower().replace(' ', '_').replace('/', '_')}.json"
            )
            recs = search_businesses(
                city=city,
                keyword=kw,
                provider=actual_provider,
                max_results=max_results,
                checkpoint_file=checkpoint_path,
            )
            for rec in recs:
                key = (rec.listing_url,) if rec.listing_url else (
                    rec.business_name.lower().strip(),
                    rec.phone.lower().strip(),
                    rec.address.lower().strip(),
                )
                if key in seen:
                    idx = seen[key]
                    existing = all_records[idx]
                    kws = existing.matched_keywords.copy()
                    if kw not in kws:
                        kws.append(kw)
                    all_records[idx] = replace(
                        existing,
                        matched_keywords=kws,
                        matched_keywords_count=len(kws),
                        times_found=existing.times_found + 1,
                    )
                else:
                    rec = replace(rec, matched_keywords=[kw],
                                  matched_keywords_count=1, times_found=1)
                    seen[key] = len(all_records)
                    all_records.append(rec)
    else:
        all_records = search_multiple_keywords(
            city=city,
            keywords=keywords_to_use,
            provider=actual_provider,
            max_results=max_results,
        )

    logger.info("  → %d unique businesses discovered", len(all_records))

    if not all_records:
        logger.warning("No records found — exiting.")
        return

    # ── Step 2: Heuristics enrichment ─────────────────────────────────────
    logger.info("\n[2/4] Heuristics enrichment ...")
    enriched = enrich_records(all_records)
    logger.info("  → Enriched %d records | Top prospect: '%s' (score=%d, tier=%s)",
                len(enriched),
                enriched[0].business_name,
                enriched[0].prospect_score,
                enriched[0].prospect_tier)

    # ── Step 3: Website audit ──────────────────────────────────────────────
    if run_audit:
        logger.info("\n[3/4] Website audit ...")
        enriched = audit_websites(enriched, delay_s=3.0)
        # Re-enrich after audit so heuristics can use website_looks_modern_heuristic
        enriched = enrich_records(enriched)
        logger.info("  → Audit complete")
    else:
        logger.info("\n[3/4] Website audit — SKIPPED (use --audit to enable)")

    # ── Step 4: Validation ──────────────────────────────────────────────────
    logger.info("\n[4/5] Data Integrity Validation ...")
    enriched = validate_records(enriched)

    # ── Step 5: Export ─────────────────────────────────────────────────────
    logger.info("\n[5/5] Packaging exports ...")
    result = export_all(
        enriched,
        output_dir=OUTPUT_DIR,
        city=city,
        batch_size=15,
        shortlist_top_n=100,
        shortlist_min_score=1,
    )

    logger.info("\n" + "=" * 65)
    logger.info("  PIPELINE COMPLETE")
    logger.info("  Output directory : %s", result["run_dir"])
    logger.info("  Master CSV       : %s", result["master_csv"])
    logger.info("  Shortlist CSV    : %s", result["shortlist_csv"])
    logger.info("  Gemini batches   : %d files", len(result["gemini_batches"]))
    logger.info("  Stats            : %s", result["stats"])
    logger.info("=" * 65)

    # Emit final event for the Node.js orchestrator
    _emit_pipeline_event({
        "event": "complete",
        "city": city,
        "leads": len(enriched),
        "shortlist": str(result["shortlist_csv"]),
        "master": str(result["master_csv"]),
    })

    return result


if __name__ == "__main__":
    args = parse_args()
    custom_keywords = [k.strip() for k in args.keywords.split(',')] if args.keywords else None
    run(
        city=args.city,
        provider_name=args.provider,
        run_audit=args.audit,
        max_results=args.max_results,
        custom_keywords=custom_keywords,
    )
