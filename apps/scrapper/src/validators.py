"""
validators.py
-------------
Integrity and validation layer for city-prospect-radar.

Ensures that the data pipeline produces consistent, predictable records
before they are exported or sent to downstream AI evaluation.

Public API:
    validate_records(records: list[BusinessRecord]) -> list[BusinessRecord]
"""

import logging
from typing import Any

from models import BusinessRecord
import prospect_packager
from heuristics import score_to_tier

logger = logging.getLogger(__name__)

# Strict schema validation cache
_EXPECTED_FIELDS: set[str] | None = None

def _get_expected_export_fields() -> set[str]:
    """Gather all fields that the packager expects to exist."""
    global _EXPECTED_FIELDS
    if _EXPECTED_FIELDS is None:
        _EXPECTED_FIELDS = set(
            prospect_packager._PROSPECT_FIELDS +
            prospect_packager._GEMINI_FIELDS
        )
    return _EXPECTED_FIELDS


def validate_schema(record: BusinessRecord) -> list[str]:
    """
    Verify that the record has all fields expected by the export layer.
    Returns a list of missing field names.
    """
    missing = []
    
    try:
        # Convert to dict the same way the packager does it
        flat = prospect_packager._record_to_flat_dict(record)
    except Exception as exc:
        return [f"ERROR_FLATTENING_RECORD: {exc}"]
        
    for field in _get_expected_export_fields():
        if field not in flat:
            missing.append(field)
            
    return missing


def validate_logical_integrity(record: BusinessRecord) -> list[str]:
    """
    Verify that the data makes logical sense.
    Returns a list of warning/error messages for contradictions.
    """
    warnings = []
    
    # Review contradictions
    if record.has_reviews and record.review_count == 0:
        warnings.append(f"has_reviews=True but review_count={record.review_count}")
    if not record.has_reviews and record.review_count > 0:
        warnings.append(f"has_reviews=False but review_count={record.review_count}")
        
    # Website contradictions
    if record.has_website and not record.website_url:
        warnings.append("has_website=True but website_url is empty")
    if not record.has_website and record.website_url:
        warnings.append(f"has_website=False but website_url='{record.website_url}'")
        
    if record.website_status == "200" and not record.website_url:
        warnings.append("website_status=200 but no website_url")
        
    # Score out of bounds (heuristic is tunable, but flag extreme outliers)
    if record.prospect_score < -10 or record.prospect_score > 50:
        warnings.append(f"prospect_score {record.prospect_score} is extremely out of expected bounds")
        
    # Tier logic (must match heuristics.py exactly)
    expected_tier = score_to_tier(record.prospect_score)
    if record.prospect_tier != expected_tier:
        warnings.append(
            f"prospect_tier '{record.prospect_tier}' is inconsistent with "
            f"score {record.prospect_score} (expected '{expected_tier}')"
        )
        
    return warnings


def validate_records(records: list[BusinessRecord]) -> list[BusinessRecord]:
    """
    Run integrity checks on a list of records.
    Logs warnings for any malformed or logically inconsistent records.
    Returns the same list, untouched, but validated.
    """
    if not records:
        return records

    logger.info("Validating %d records before export...", len(records))
    
    schema_failures = 0
    logic_failures = 0
    
    for i, record in enumerate(records):
        missing = validate_schema(record)
        if missing:
            schema_failures += 1
            if schema_failures <= 3:  # don't spam the logs
                logger.error(
                    "Schema error on record '%s': missing export fields: %s",
                    record.business_name, missing
                )
                
        warnings = validate_logical_integrity(record)
        if warnings:
            logic_failures += 1
            if logic_failures <= 3:
                logger.warning(
                    "Integrity warning on record '%s': %s",
                    record.business_name, " | ".join(warnings)
                )

    if schema_failures > 0 or logic_failures > 0:
        logger.warning(
            "Validation complete with issues: %d schema errors, %d logical warnings",
            schema_failures, logic_failures
        )
    else:
        logger.info("Validation complete: strict schema and logic checks passed.")
        
    return records
