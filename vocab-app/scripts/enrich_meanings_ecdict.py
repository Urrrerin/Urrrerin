#!/usr/bin/env python3
"""Re-enrich azkaban-vocabulary.html meanings from local ECDICT.

Requires: vocab-app/.dict/ecdict.csv (gitignored).
Usage: python3 vocab-app/scripts/enrich_meanings_ecdict.py
"""
from __future__ import annotations

import csv
import html as html_lib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "public" / "azkaban-vocabulary.html"
ECDICT = ROOT / ".dict" / "ecdict.csv"
TS_PATH = ROOT / "src" / "data" / "azkabanWords.ts"

POS_MAP = {
    "a.": "adj.",
    "adj.": "adj.",
    "ad.": "adv.",
    "adv.": "adv.",
    "n.": "n.",
    "v.": "v.",
    "vi.": "vi.",
    "vt.": "vt.",
    "prep.": "prep.",
    "conj.": "conj.",
    "pron.": "pron.",
    "int.": "int.",
    "num.": "num.",
    "art.": "art.",
    "aux.": "aux.",
    "abbr.": "abbr.",
}

TAG_TO_APP = {
    "四级": "cet4",
    "六级": "cet6",
    "考研": "kaoyan",
    "雅思": "ielts",
    "托福": "toefl",
    "专四": "tem4",
    "专八": "tem8",
}


def unescape_field(s: str) -> str:
    return (s or "").replace("\\n", "\n").replace("\\r", "")


def load_ecdict():
    by_word = {}
    morph_to_base = {}
    with ECDICT.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            w = (row.get("word") or "").strip()
            if not w:
                continue
            key = w.lower()
            if key not in by_word:
                by_word[key] = {
                    "translation": unescape_field(row.get("translation") or "").strip()
                }
            ex = row.get("exchange") or ""
            for part in ex.split("/"):
                if ":" not in part:
                    continue
                _, forms = part.split(":", 1)
                for form in forms.split(","):
                    form = form.strip().lower()
                    if form and form != key and form not in morph_to_base:
                        morph_to_base[form] = key
    return by_word, morph_to_base


def clean_sense_body(body: str) -> str:
    body = body.strip()
    body = re.sub(r"^(\[[^\]]+\]\s*)+", "", body)
    body = re.sub(r"(\s*\[[^\]]+\])+$", "", body)
    body = re.sub(r"\[(计|医|法|化|网络|经|口|俚|非正式|心|生物)\]", "", body)
    body = body.replace(",", "，").replace(";", "；")
    body = re.sub(r"[，；]\s+", lambda m: m.group(0)[0], body)
    body = re.sub(r"\s+", " ", body)
    body = re.sub(r"[；，]{2,}", lambda m: m.group(0)[0], body)
    return body.strip(" ；，")


def parse_translation(trans: str, prefer_phr: bool = False):
    if not trans:
        return []
    senses = []
    for raw_line in unescape_field(trans).split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("[网络]"):
            continue
        m = re.match(r"^([a-zA-Z]+\.)\s*(.*)$", line)
        if m:
            pos_raw = m.group(1).lower()
            if pos_raw == "a.":
                pos = "adj."
            elif pos_raw == "ad.":
                pos = "adv."
            else:
                pos = POS_MAP.get(pos_raw, pos_raw)
            body = clean_sense_body(m.group(2))
            if body:
                senses.append((pos, body))
        else:
            body = clean_sense_body(line)
            if body and not body.startswith("["):
                senses.append(("phr." if prefer_phr else "", body))
    # drop unpos orphans when pos senses exist
    if any(p for p, _ in senses):
        senses = [(p, b) for p, b in senses if p]
    merged = []
    for pos, body in senses:
        if merged and merged[-1][0] == pos and pos:
            prev = merged[-1][1]
            if body not in prev:
                merged[-1] = [pos, prev + "；" + body]
        else:
            merged.append([pos, body])
    return [(p, b) for p, b in merged]


def lookup(word: str, by_word, morph_to_base):
    key = word.strip().lower()
    if key in by_word and by_word[key]["translation"]:
        return by_word[key]
    if " " in word:
        return None
    if key in morph_to_base:
        base = morph_to_base[key]
        if base in by_word and by_word[base]["translation"]:
            return by_word[base]
    for suf in ("'s", "s", "es", "ed", "ing", "ly", "er", "est"):
        if key.endswith(suf) and len(key) > len(suf) + 2:
            stem = key[: -len(suf)]
            if stem in by_word and by_word[stem]["translation"]:
                return by_word[stem]
            if suf in ("ing", "ed") and (stem + "e") in by_word and by_word[stem + "e"]["translation"]:
                return by_word[stem + "e"]
    if key.endswith("ies") and (key[:-3] + "y") in by_word:
        return by_word[key[:-3] + "y"]
    return None


def meaning_html_from_senses(senses, note_html=""):
    parts = []
    for pos, body in senses:
        if pos:
            parts.append(f'<span class="pos">{html_lib.escape(pos)}</span> {html_lib.escape(body)}')
        else:
            parts.append(html_lib.escape(body))
    return "<br>".join(parts) + (note_html or "")


def extract_note(meaning_inner: str) -> str:
    m = re.search(r'(<span class="note">.*?</span>)', meaning_inner, re.S)
    return m.group(1) if m else ""


def cell_text(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    return html_lib.unescape(s).strip()


def enrich_html():
    by_word, morph_to_base = load_ecdict()
    text = HTML_PATH.read_text(encoding="utf-8")
    stats = {"total": 0, "updated": 0, "kept_phrase": 0, "missing": 0, "same": 0}
    missing = []

    row_pat = re.compile(
        r'(<td class="word">(.*?)</td>)(.*?)(<td class="meaning">)(.*?)(</td>\s*<td class="example">)',
        re.S,
    )

    def repl(m):
        stats["total"] += 1
        word_td, word_html, mid, mean_open, meaning, mean_close = m.groups()
        word = cell_text(word_html)
        note = extract_note(meaning)
        row = lookup(word, by_word, morph_to_base)
        if not row:
            if " " in word:
                stats["kept_phrase"] += 1
            else:
                stats["missing"] += 1
                missing.append(word)
            return m.group(0)
        senses = parse_translation(row["translation"], prefer_phr=(" " in word))
        if not senses:
            stats["missing"] += 1
            missing.append(word)
            return m.group(0)
        if len(senses) == 1 and not senses[0][0]:
            om = re.search(r'class="pos">([^<]+)', meaning)
            if om:
                senses = [(om.group(1).strip(), senses[0][1])]
            elif " " in word:
                senses = [("phr.", senses[0][1])]
        new_meaning = meaning_html_from_senses(senses, note)
        old_plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", meaning)).strip()
        new_plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", new_meaning)).strip()
        if old_plain == new_plain:
            stats["same"] += 1
            return m.group(0)
        stats["updated"] += 1
        return f"{word_td}{mid}{mean_open}{new_meaning}{mean_close}"

    HTML_PATH.write_text(row_pat.sub(repl, text), encoding="utf-8")
    return stats, missing


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
            title = re.sub(r"\s+", " ", self.cur_chapter).strip()
            self.chapters.append({"title": title, "rows": []})
        if tag == "td" and self.in_td:
            self.in_td = False
            text = "".join(self.td_parts)
            if "meaning" not in self.td_class.split():
                text = re.sub(r"\s+", " ", text).strip()
            else:
                text = re.sub(r"\n{2,}", "\n", text).strip()
            self.row_cells.append((self.td_class, text))
        if tag == "tr" and self.in_tr:
            self.in_tr = False
            if len(self.row_cells) >= 8 and self.chapters:
                self.chapters[-1]["rows"].append(self.row_cells)

    def handle_data(self, data):
        if self.in_header:
            self.cur_chapter += data
        if self.in_td:
            self.td_parts.append(data)


def rebuild_ts():
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
            tags_raw = vals[5]
            app_tags = []
            if tags_raw and tags_raw not in {"—", "-", "/"}:
                for name, key in TAG_TO_APP.items():
                    if name in tags_raw:
                        app_tags.append(key)
            if not app_tags:
                app_tags = ["other"]
            pm = re.match(r"^([a-zA-Z]+\.)\s*", meaning)
            pos = pm.group(1) if pm else None
            note_extra = None
            if " — " in meaning:
                meaning, note_extra = meaning.split(" — ", 1)
                meaning = meaning.strip()
                note_extra = note_extra.strip()
            exam_names = [n for n, k in TAG_TO_APP.items() if k in app_tags]
            note = note_base
            if exam_names:
                note = f"{note_base} · 词库 {' '.join(exam_names)}"
            if note_extra:
                note = f"{note} · {note_extra}"
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
                    "note": note,
                }
            )

    def esc(s: str) -> str:
        return json.dumps(s, ensure_ascii=False)

    lines = [
        "import type { WordEntry } from '../types'",
        "",
        "/** 《阿兹卡班的囚徒》前 6 章生词表（由 azkaban-vocabulary.html 录入；释义经 ECDICT 校准） */",
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


def main():
    if not ECDICT.exists():
        raise SystemExit(f"missing {ECDICT}; download ECDICT ecdict.csv into vocab-app/.dict/")
    stats, missing = enrich_html()
    n = rebuild_ts()
    print("stats", stats)
    print("missing", missing)
    print("ts_entries", n)


if __name__ == "__main__":
    main()
