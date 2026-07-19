"""
classify_batches.py
-------------------
Calls Gemini API to classify IndiYatra snippets into categories and tags.
Processes batch_01.csv through batch_08.csv (or a specific batch).

Usage:
    python classify_batches.py --api-key YOUR_KEY            # all batches
    python classify_batches.py --api-key YOUR_KEY --batch 3  # single batch
    python classify_batches.py --api-key YOUR_KEY --batch 3 --fix-missing  # retry missing rows only

Get your API key at: https://aistudio.google.com/app/apikey
"""

import argparse
import csv
import io
import re
import sys
import time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Install the Gemini SDK first:  pip install google-genai")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BATCHES_DIR = Path(__file__).parent
RESULTS_DIR = BATCHES_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Valid IDs
# ---------------------------------------------------------------------------
VALID_CATS = {f"CAT_{i:03d}" for i in range(1, 14)}
VALID_TERMS = {f"TERM_{i:03d}" for i in range(1, 80)}

# ---------------------------------------------------------------------------
# Prompt (matches GEMINI_PROMPT.md, without the count-check section —
# we enforce counts in code instead)
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are classifying educational snippets about Indian history and culture.
Each snippet must receive exactly ONE category and 3–4 tags from the approved lists.
Return only a CSV block — no prose before or after it.
"""

CLASSIFICATION_PROMPT = """\
## YOUR TASK

Classify each row below into ONE category and 3–4 tags from the approved lists.
Read the hook and explanation carefully before deciding.

## CATEGORIES — pick exactly ONE

CAT_001 God & Theology
CAT_002 Sacred Works
CAT_003 Philosophy & Systems
CAT_004 Physical & Spiritual Well-being
CAT_005 Ancient Science & Applied Systems
CAT_006 Dance, Drama, Music & Festivals
CAT_007 Sculpture & Architecture
CAT_008 Deities, Rishis & Gurus
CAT_009 History, Kings & Leaders
CAT_010 Pilgrimage & Regional Knowledge
CAT_011 Identity & Sacred Animals/Plants
CAT_012 Dharmic Traditions
CAT_013 Society & Culture

Guidance:
- CAT_001 = theology/nature of God, not just a god's name
- CAT_008 = primary subject is a specific rishi, guru, saint or reformer
- CAT_009 = battles, kings, dynasties, historical events
- CAT_010 = specific sacred places, temples, rivers, pilgrimage sites
- CAT_012 = Buddhism, Jainism or Sikhism as traditions

## TAGS — pick 3–4

TERM_001 Aesthetics        TERM_041 Libraries/Manuscripts
TERM_002 Animals           TERM_042 Literature
TERM_003 Archaeology       TERM_043 Marriage
TERM_004 Architecture      TERM_044 Mathas/Pithas
TERM_005 Arts and Crafts   TERM_045 Mathematics
TERM_006 Ashramas          TERM_046 Medicine/Ayurveda
TERM_007 Astrology         TERM_047 Melas
TERM_008 Astronomy         TERM_048 Mountains
TERM_009 Battles           TERM_049 Murals
TERM_010 Bhaktas           TERM_050 Music
TERM_011 Books             TERM_051 Mythological Characters
TERM_012 Buddhism          TERM_052 Oriental Institute
TERM_013 Caves             TERM_053 Painting
TERM_014 Concept           TERM_054 Pantha (Sects)
TERM_015 Dance             TERM_055 Philosophy
TERM_016 Dharmasastras     TERM_056 Places
TERM_017 Drama             TERM_057 Poetics
TERM_018 Dynasties         TERM_058 Polity
TERM_019 Education         TERM_059 Pramana
TERM_020 Festivals         TERM_060 Races
TERM_021 Folk Arts         TERM_061 Reformers
TERM_022 Folk Dance/Music  TERM_062 Rituals
TERM_023 Folk Literature   TERM_063 Rivers
TERM_024 Folk Music        TERM_064 Rishi Muni
TERM_025 Fruits/Flowers    TERM_065 Sampradaya
TERM_026 Geography         TERM_066 Samskara
TERM_027 Gods/Goddesses    TERM_067 Science
TERM_028 Grammar           TERM_068 Sculpture
TERM_029 Guna/Quality      TERM_069 Sikhism
TERM_030 History           TERM_070 Sports
TERM_031 Iconography       TERM_071 Temples and Caves
TERM_032 Indologists       TERM_072 Theatre and Cinema
TERM_033 Institutions      TERM_073 Thinkers/Writers
TERM_034 Itihasa/Purana    TERM_074 Tirthas
TERM_035 Jainism           TERM_075 Trade and Commerce
TERM_036 Jnana             TERM_076 Warriors
TERM_037 Kings             TERM_077 Weapons
TERM_038 Ksetras           TERM_078 Women
TERM_039 Languages         TERM_079 Yoga
TERM_040 Law/Legislature

## RULES

1. Use ONLY the IDs listed above. Do not invent new ones.
2. Every input row must appear in the output. Do not skip any.
3. Do NOT use TERM_014 or TERM_073 as generic fallbacks.
4. Aim for 3–4 tags. If you have 2, find a third.
5. Person snippets: add an era/context tag (TERM_030, TERM_018, TERM_056, TERM_078).
   Place/temple snippets: add a content-type tag (TERM_062, TERM_034, TERM_027, TERM_030).
6. Work through rows in order, one at a time.

## OUTPUT FORMAT

Return ONLY a CSV block, no other text:

snippet_key,category_id,tag_ids,notes
<key>,<CAT_XXX>,<TERM_NNN|TERM_NNN|TERM_NNN>,<one sentence reason>

## INPUT ROWS TO CLASSIFY

{rows_csv}
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_batch(batch_num: int) -> list[dict]:
    path = BATCHES_DIR / f"batch_{batch_num:02d}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Batch file not found: {path}")
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_missing(batch_num: int) -> list[dict] | None:
    path = BATCHES_DIR / f"batch_{batch_num:02d}_missing.csv"
    if not path.exists():
        return None
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def rows_to_csv_text(rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["snippet_key", "hook", "explanation"])
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()


def parse_csv_response(text: str) -> list[dict]:
    """Extract the CSV block from Gemini's response."""
    # Strip markdown code fences if present
    text = re.sub(r"```[a-z]*\n?", "", text).strip()

    results = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        # Keep only our four columns; ignore extras
        clean = {
            "snippet_key": (row.get("snippet_key") or "").strip(),
            "category_id": (row.get("category_id") or "").strip(),
            "tag_ids": (row.get("tag_ids") or "").strip(),
            "notes": (row.get("notes") or "").strip(),
        }
        if clean["snippet_key"]:
            results.append(clean)
    return results


def validate_row(row: dict) -> list[str]:
    """Return a list of error strings (empty = valid)."""
    errors = []
    cat = row["category_id"]
    if cat not in VALID_CATS:
        errors.append(f"invalid category '{cat}'")

    tags = [t.strip() for t in row["tag_ids"].split("|") if t.strip()]
    invalid_tags = [t for t in tags if t not in VALID_TERMS]
    if invalid_tags:
        errors.append(f"invalid tags {invalid_tags}")
    if len(tags) < 3:
        errors.append(f"only {len(tags)} tag(s) — need ≥3")
    return errors


def save_results(batch_num: int, rows: list[dict]):
    path = RESULTS_DIR / f"result_batch_{batch_num:02d}.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["snippet_key", "category_id", "tag_ids", "notes"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Saved {len(rows)} rows → {path.name}")


# ---------------------------------------------------------------------------
# Core classify call
# ---------------------------------------------------------------------------

def classify(client, model, input_rows: list[dict], attempt: int = 1) -> tuple[list[dict], list[str]]:
    """
    Call Gemini, parse and validate. Returns (valid_rows, missing_keys).
    """
    csv_text = rows_to_csv_text(input_rows)
    prompt = CLASSIFICATION_PROMPT.format(rows_csv=csv_text)

    print(f"  → Sending {len(input_rows)} rows to Gemini (attempt {attempt})…")
    response = client.models.generate_content(model=model, contents=prompt)
    raw = response.text

    parsed = parse_csv_response(raw)
    input_keys = {str(r["snippet_key"]) for r in input_rows}
    output_keys = {r["snippet_key"] for r in parsed}
    missing_keys = sorted(input_keys - output_keys, key=lambda x: int(x) if x.isdigit() else x)

    # Validate each returned row
    valid = []
    bad = []
    for row in parsed:
        errs = validate_row(row)
        if errs:
            bad.append((row["snippet_key"], errs))
        else:
            valid.append(row)

    if bad:
        print(f"  ⚠ {len(bad)} rows with validation errors:")
        for key, errs in bad[:10]:
            print(f"    snippet_key={key}: {'; '.join(errs)}")

    print(f"  ✓ Valid: {len(valid)}  |  Missing: {len(missing_keys)}  |  Invalid: {len(bad)}")
    if missing_keys:
        print(f"    Missing keys: {missing_keys}")

    return valid, missing_keys


# ---------------------------------------------------------------------------
# Main batch processor
# ---------------------------------------------------------------------------

def process_batch(client, model, batch_num: int, fix_missing: bool = False):
    print(f"\n{'='*60}")
    print(f"Batch {batch_num:02d}")
    print(f"{'='*60}")

    all_rows = load_batch(batch_num)
    input_keys = [str(r["snippet_key"]) for r in all_rows]

    # Check if result already exists
    result_path = RESULTS_DIR / f"result_batch_{batch_num:02d}.csv"
    existing = {}
    if result_path.exists():
        with open(result_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing[row["snippet_key"]] = row
        print(f"  Found existing result: {len(existing)} rows")

    if fix_missing:
        # Only classify rows not already in the result file
        done_keys = set(existing.keys())
        missing_rows = [r for r in all_rows if str(r["snippet_key"]) not in done_keys]
        if not missing_rows:
            print("  Nothing missing — skipping.")
            return
        print(f"  Fixing {len(missing_rows)} missing rows…")
        valid, still_missing = classify(client, model, missing_rows)
        # Retry once
        if still_missing:
            retry_rows = [r for r in missing_rows if str(r["snippet_key"]) in still_missing]
            time.sleep(3)
            valid2, _ = classify(client, model, retry_rows, attempt=2)
            valid.extend(valid2)
        # Merge with existing
        for row in valid:
            existing[row["snippet_key"]] = row
        merged = [existing[k] for k in input_keys if k in existing]
        save_results(batch_num, merged)
        return

    # Fresh run
    valid, missing_keys = classify(client, model, all_rows)

    # One automatic retry for missing rows
    if missing_keys:
        print(f"  Retrying {len(missing_keys)} missing rows…")
        time.sleep(3)
        retry_rows = [r for r in all_rows if str(r["snippet_key"]) in missing_keys]
        valid2, still_missing = classify(client, model, retry_rows, attempt=2)
        valid.extend(valid2)
        if still_missing:
            print(f"  ⚠ Still missing after retry: {still_missing}")

    # Sort by original order
    key_order = {k: i for i, k in enumerate(input_keys)}
    valid.sort(key=lambda r: key_order.get(r["snippet_key"], 9999))

    save_results(batch_num, valid)

    # Summary
    coverage = len(valid) / len(all_rows) * 100
    print(f"\n  Batch {batch_num:02d} complete: {len(valid)}/{len(all_rows)} rows ({coverage:.0f}%)")
    if len(valid) < len(all_rows):
        classified_keys = {r["snippet_key"] for r in valid}
        final_missing = [k for k in input_keys if k not in classified_keys]
        print(f"  Still missing: {final_missing}")
        print(f"  → Re-run with: --batch {batch_num} --fix-missing")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Classify IndiYatra snippets via Gemini API")
    parser.add_argument("--api-key", required=True, help="Gemini API key from aistudio.google.com")
    parser.add_argument("--batch", type=int, help="Process only this batch number (1–8)")
    parser.add_argument("--fix-missing", action="store_true",
                        help="Only classify rows missing from the existing result file")
    parser.add_argument("--model", default="gemini-2.0-flash",
                        help="Model name (default: gemini-1.5-pro)")
    args = parser.parse_args()

    client = genai.Client(api_key=args.api_key)
    model = args.model
    print(f"Using model: {model}")

    batches = [args.batch] if args.batch else list(range(1, 9))

    for batch_num in batches:
        try:
            process_batch(client, model, batch_num, fix_missing=args.fix_missing)
            if len(batches) > 1:
                time.sleep(5)  # Rate-limit pause between batches
        except FileNotFoundError as e:
            print(f"  Skipping batch {batch_num}: {e}")
        except Exception as e:
            print(f"  ERROR on batch {batch_num}: {e}")
            raise

    print("\nDone.")


if __name__ == "__main__":
    main()
