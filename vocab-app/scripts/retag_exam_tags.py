#!/usr/bin/env python3
"""Retag HTML + azkabanWords.ts exam labels.

Sources (gitignored under vocab-app/.dict/):
  - ecdict.csv → cet4 / cet6 / ky(考研) / ielts
  - lists/tem.txt → 专四（无*）/ 专八（行首*）

Usage:
  python3 vocab-app/scripts/retag_exam_tags.py
"""
from __future__ import annotations

import csv
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "public" / "azkaban-vocabulary.html"
ECDICT = ROOT / ".dict" / "ecdict.csv"
TEM_PATH = ROOT / ".dict" / "lists" / "tem.txt"
TS_PATH = ROOT / "src" / "data" / "azkabanWords.ts"

TAG_ORDER = ["cet4", "cet6", "kaoyan", "tem4", "tem8", "ielts"]
TAG_LABEL = {
    "cet4": "四级",
    "cet6": "六级",
    "kaoyan": "考研",
    "tem4": "专四",
    "tem8": "专八",
    "ielts": "雅思",
}
TAG_CLASS = {
    "cet4": "t4",
    "cet6": "t6",
    "kaoyan": "tkaoyan",
    "tem4": "tem4",
    "tem8": "tem8",
    "ielts": "ti",
}


def load_ecdict_tags():
    by: dict[str, set[str]] = {}
    morph: dict[str, str] = {}
    with ECDICT.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            w = (row.get("word") or "").strip().lower()
            if not w:
                continue
            tag = (row.get("tag") or "").strip()
            if w not in by:
                by[w] = set(tag.split()) if tag else set()
            elif tag:
                by[w].update(tag.split())
            for part in (row.get("exchange") or "").split("/"):
                if ":" not in part:
                    continue
                _, forms = part.split(":", 1)
                for form in forms.split(","):
                    form = form.strip().lower()
                    if form and form not in morph:
                        morph[form] = w
    return by, morph


def load_tem():
    tem4, tem8 = set(), set()
    for line in TEM_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        star = line.startswith("*")
        if star:
            line = line[1:]
        m = re.match(r"^([A-Za-z][A-Za-z\-'\.]*(?:\s+[A-Za-z][A-Za-z\-'\.]*)*)", line)
        if not m:
            continue
        w = m.group(1).strip().lower()
        (tem8 if star else tem4).add(w)
    return tem4, tem8


def resolve_lemma(word: str, by, morph) -> str:
    key = word.strip().lower()
    if key in by:
        return key
    if key in morph:
        return morph[key]
    for suf in ("'s", "s", "es", "ed", "ing", "ly", "er", "est"):
        if key.endswith(suf) and len(key) > len(suf) + 2:
            stem = key[: -len(suf)]
            if stem in by:
                return stem
            if suf in ("ing", "ed") and stem + "e" in by:
                return stem + "e"
    if key.endswith("ies") and key[:-3] + "y" in by:
        return key[:-3] + "y"
    return key


def tags_for(word: str, by, morph, tem4, tem8) -> list[str]:
    key = word.strip().lower()
    lemma = resolve_lemma(word, by, morph)
    etags = by.get(lemma, set()) | by.get(key, set())
    out = []
    if "cet4" in etags:
        out.append("cet4")
    if "cet6" in etags:
        out.append("cet6")
    if "ky" in etags:
        out.append("kaoyan")
    if key in tem4 or lemma in tem4:
        out.append("tem4")
    if key in tem8 or lemma in tem8:
        out.append("tem8")
    if "ielts" in etags:
        out.append("ielts")
    return [t for t in TAG_ORDER if t in out]


def render_tags_html(tags: list[str]) -> str:
    if not tags:
        return '<td class="exam-tags lemma-empty">—</td>'
    spans = " ".join(f'<span class="{TAG_CLASS[t]}">{TAG_LABEL[t]}</span>' for t in tags)
    return f'<td class="exam-tags">{spans}</td>'


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chapters = []
        self.cur_chapter = ""
        self.in_header = False
        self.in_td = False
        self.td_parts = []
        self.row_cells = []
        self.in_tr = False
        self.td_class = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        cls = attrs.get("class", "")
        if tag == "div" and "chapter-header" in cls.split():
            self.in_header = True
            self.cur_chapter = ""
        if tag == "tr":
            self.in_tr = True
            self.row_cells = []
        if tag == "td" and self.in_tr:
            self.in_td = True
            self.td_parts = []
            self.td_class = cls
        if tag == "br" and self.in_td and "meaning" in self.td_class.split():
            self.td_parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "div" and self.in_header:
            self.in_header = False
            self.chapters.append({"title": re.sub(r"\s+", " ", self.cur_chapter).strip(), "rows": []})
        if tag == "td" and self.in_td:
            self.in_td = False
            t = "".join(self.td_parts)
            if "meaning" not in self.td_class.split():
                t = re.sub(r"\s+", " ", t).strip()
            else:
                t = re.sub(r"\n{2,}", "\n", t).strip()
            self.row_cells.append((self.td_class, t))
        if tag == "tr" and self.in_tr:
            self.in_tr = False
            if len(self.row_cells) >= 8 and self.chapters:
                self.chapters[-1]["rows"].append(self.row_cells)

    def handle_data(self, data):
        if self.in_header:
            self.cur_chapter += data
        if self.in_td:
            self.td_parts.append(data)


def rebuild_ts(by, morph, tem4, tem8):
    parser = TableParser()
    parser.feed(HTML_PATH.read_text(encoding="utf-8"))
    entries = []
    gid = 0
    for ch in parser.chapters:
        title = ch["title"]
        m = re.match(r"(Chapter\s+\d+)\s*(.*)$", title)
        if m:
            rest = re.sub(r"\s*·\s*\d+\s*条\s*$", "", m.group(2)).strip()
            note_base = f"{m.group(1)} {rest}".strip(" ·")
        else:
            note_base = title
        for cells in ch["rows"]:
            vals = [c[1] for c in cells]
            try:
                int(vals[0])
            except Exception:
                continue
            gid += 1
            word = vals[1]
            phonetic = None if vals[2] in {"", "/"} else vals[2]
            meaning = vals[6]
            example = vals[7] if vals[7] not in {"", "/"} else None
            tags = tags_for(word, by, morph, tem4, tem8)
            app_tags = tags if tags else ["other"]
            pm = re.match(r"^([a-zA-Z]+\.)\s*", meaning)
            pos = pm.group(1) if pm else None
            note_bits = [note_base]
            if tags:
                note_bits.append("词库 " + " ".join(TAG_LABEL[t] for t in tags))
            keep_lines = []
            for ln in meaning.split("\n"):
                s = ln.strip()
                if s.startswith("—") or s.startswith("–"):
                    note_bits.append(s.lstrip("—– ").strip())
                elif s.startswith("文中特指"):
                    keep_lines.append(s)
                elif " — " in ln:
                    main, ed = ln.split(" — ", 1)
                    if main.strip():
                        keep_lines.append(main.strip())
                    note_bits.append(ed.strip())
                else:
                    keep_lines.append(ln)
            meaning = "\n".join(keep_lines).strip()
            entries.append(
                {
                    "id": f"azkaban-{gid}",
                    "word": word,
                    "phonetic": phonetic,
                    "pos": pos,
                    "meaning": meaning,
                    "example": example,
                    "frequency": 1,
                    "tags": app_tags,
                    "note": " · ".join(b for b in note_bits if b),
                }
            )

    def esc(s: str) -> str:
        return json.dumps(s, ensure_ascii=False)

    lines = [
        "import type { WordEntry } from '../types'",
        "",
        "/** 《阿兹卡班的囚徒》前 6 章生词表（释义经 ECDICT 校准；考试标签经 ECDICT+专四专八词表重标） */",
        "export const azkabanWords: WordEntry[] = [",
    ]
    for e in entries:
        lines.append("  {")
        lines.append(f'    id: {esc(e["id"])},')
        lines.append(f'    word: {esc(e["word"])},')
        if e["phonetic"]:
            lines.append(f'    phonetic: {esc(e["phonetic"])},')
        if e["pos"]:
            lines.append(f'    pos: {esc(e["pos"])},')
        lines.append(f'    meaning: {esc(e["meaning"])},')
        if e["example"]:
            lines.append(f'    example: {esc(e["example"])},')
        lines.append(f'    frequency: {e["frequency"]},')
        lines.append(f'    tags: {json.dumps(e["tags"], ensure_ascii=False)},')
        lines.append(f'    note: {esc(e["note"])},')
        lines.append("  },")
    lines.append("]")
    lines.append("")
    TS_PATH.write_text("\n".join(lines), encoding="utf-8")
    return len(entries)


def main() -> None:
    if not ECDICT.exists() or not TEM_PATH.exists():
        raise SystemExit(f"missing dict files under {ROOT / '.dict'}")
    by, morph = load_ecdict_tags()
    tem4, tem8 = load_tem()
    text = HTML_PATH.read_text(encoding="utf-8")
    pat = re.compile(
        r'(<td class="word">(.*?)</td>)(.*?)(<td class="exam-tags[^"]*">.*?</td>)',
        re.S,
    )
    stats = {t: 0 for t in TAG_ORDER}
    empty = 0

    def repl(m):
        nonlocal empty
        word = html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
        tags = tags_for(word, by, morph, tem4, tem8)
        for t in tags:
            stats[t] += 1
        if not tags:
            empty += 1
        return m.group(1) + m.group(3) + render_tags_html(tags)

    HTML_PATH.write_text(pat.sub(repl, text), encoding="utf-8")
    n = rebuild_ts(by, morph, tem4, tem8)
    print("stats", stats, "empty", empty, "entries", n)


if __name__ == "__main__":
    main()
