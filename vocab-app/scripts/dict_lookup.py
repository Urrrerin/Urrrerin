#!/usr/bin/env python3
"""Lookup English words in local ECDICT (vocab-app/.dict/ecdict.csv)."""
from __future__ import annotations
import csv, sys
from pathlib import Path

ECDICT = Path(__file__).resolve().parents[1] / ".dict" / "ecdict.csv"

def unesc(s: str) -> str:
    return (s or "").replace("\\n", "\n")

def main(words: list[str]) -> None:
    want = {w.lower() for w in words}
    found = {}
    with ECDICT.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            w = (row.get("word") or "").strip()
            if w.lower() in want:
                found[w.lower()] = row
    for w in words:
        row = found.get(w.lower())
        if not row:
            print(f"## {w}\n(not found)\n")
            continue
        print(f"## {row['word']}")
        print(f"phonetic: {row.get('phonetic')}")
        print(unesc(row.get("translation") or ""))
        print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: dict_lookup.py word [word...]")
        sys.exit(1)
    if not ECDICT.exists():
        print(f"missing dictionary: {ECDICT}", file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1:])
