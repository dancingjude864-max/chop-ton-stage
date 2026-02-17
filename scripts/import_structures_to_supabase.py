#!/usr/bin/env python3
"""Importe le CSV Google Sheet dans public.structures (Supabase).

Usage:
  python3 scripts/import_structures_to_supabase.py --url <SUPABASE_URL> --key <SUPABASE_ANON_KEY>

Optionnel:
  --csv <CSV_URL>
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from typing import Dict, List

DEFAULT_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8Y_oUGMr7Va9oOsiGIJIuCip20ieVmritCf67ThHu-aDLKEH0e-6NyZL8AAAuPz0oXS0rJSGNGKXr/pub?output=csv"
)


def clean(value: object) -> str:
    return "" if value is None else str(value).strip()


def normalize_for_search(value: str) -> str:
    base = clean(value).lower()
    base = unicodedata.normalize("NFD", base)
    base = "".join(ch for ch in base if unicodedata.category(ch) != "Mn")
    return base


def make_structure_id(row: Dict[str, str]) -> str:
    raw = "|".join(
        [
            clean(row.get("nom_structure")),
            clean(row.get("ville")),
            clean(row.get("departement")),
            clean(row.get("association")),
        ]
    )
    normalized = normalize_for_search(raw)
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def fetch_csv_rows(csv_url: str) -> List[List[str]]:
    with urllib.request.urlopen(csv_url) as resp:  # nosec B310
        raw = resp.read().decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(raw))
    return [row for row in reader]


def to_structure_row(cols: List[str]) -> Dict[str, str]:
    # 17 colonnes source attendues
    padded = cols + [""] * (17 - len(cols))
    row = {
        "secteur": clean(padded[0]),
        "type_structure": clean(padded[1]),
        "association": clean(padded[2]),
        "departement": clean(padded[3]),
        "nom_structure": clean(padded[4]),
        "email_contact": clean(padded[5]),
        "telephone_contact": clean(padded[6]),
        "poste_contact": clean(padded[7]),
        "genre_contact": clean(padded[8]),
        "gratification": clean(padded[9]),
        "ville": clean(padded[10]),
        "type_public": clean(padded[11]),
        "duree_stage": clean(padded[12]),
        "diplome_associe": clean(padded[13]),
        "missions": clean(padded[14]),
        "ambiance": clean(padded[15]),
        "conseils": clean(padded[16]),
        "source": "Google Sheet",
    }
    row["structure_id"] = make_structure_id(row)
    return row


def chunks(items: List[Dict[str, str]], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def upsert_batch(base_url: str, api_key: str, rows: List[Dict[str, str]]) -> None:
    endpoint = f"{base_url}/rest/v1/structures?on_conflict=structure_id"
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req) as resp:  # nosec B310
        if resp.status not in (200, 201, 204):
            raise RuntimeError(f"Upsert batch failed with status {resp.status}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="Supabase project URL")
    parser.add_argument("--key", required=True, help="Supabase anon/public key")
    parser.add_argument("--csv", default=DEFAULT_CSV_URL, help="Google Sheet CSV URL")
    parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()

    base_url = clean(args.url).rstrip("/")
    api_key = clean(args.key)
    csv_url = clean(args.csv)
    if not base_url or not api_key or not csv_url:
        print("Paramètres invalides.", file=sys.stderr)
        return 1

    rows = fetch_csv_rows(csv_url)
    if not rows:
        print("CSV vide.", file=sys.stderr)
        return 1

    has_header = clean(rows[0][0]).lower().startswith("secteur") if rows[0] else False
    data_rows = rows[1:] if has_header else rows
    mapped = [to_structure_row(cols) for cols in data_rows]
    mapped = [row for row in mapped if row.get("nom_structure") and row.get("structure_id")]

    if not mapped:
        print("Aucune ligne valide à importer.")
        return 0

    sent = 0
    for batch in chunks(mapped, args.batch_size):
        upsert_batch(base_url, api_key, batch)
        sent += len(batch)
        print(f"Upsert: {sent}/{len(mapped)}")

    print(f"Import terminé. {len(mapped)} lignes envoyées vers public.structures")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
