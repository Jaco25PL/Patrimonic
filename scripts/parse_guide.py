"""Parse the official 'Guía Día del Patrimonio 2026' PDF into structured JSON.

Usage: python3 scripts/parse_guide.py <guia.pdf> > data/raw-guide.json
Relies on the typographic hierarchy of the PDF:
  AvenirLT-Black 21/24  -> department / region header
  AvenirLT-Black 12     -> locality (barrio / ciudad)
  AvenirLT-Heavy 9      -> municipio (Montevideo only)
  OfficinaSansStd-Bold 11 -> "Lugar | Actividad" title
  everything else       -> body
"""
import json
import re
import sys

import pymupdf

FIRST_PAGE, LAST_PAGE = 9, 85  # 1-indexed, inclusive (activity pages)
COL_SPLIT = 270
DAY_RE = re.compile(r"^(S[áa]bado|Domingo)\b", re.I)
SKIP_RE = re.compile(r"D[ÍI]A DEL PATRIMONIO 2026 /|^\d+$|^\|")

DEPT_FIX = {"colonia": "Colonia", "MONTEVIDEO": "Montevideo", "CANELONES": "Canelones"}


def kind(span):
    f, s = span["font"], round(span["size"], 1)
    if f.startswith("AvenirLT-Black") and s >= 20:
        return "dept"
    if f.startswith("AvenirLT-Black") and s in (10.0, 11.0):
        return "deptlabel"
    if f.startswith("AvenirLT-Black") and s == 12.0:
        return "locality"
    if f.startswith("AvenirLT-Heavy") and s == 9.0:
        return "municipio"
    if f.startswith("OfficinaSansStd-Bold") and s == 11.0:
        return "title"
    if f.startswith("HelveticaNeueLT") or f.startswith("AvenirLT-Book"):
        return "skip"
    return "body"


def page_lines(page):
    """Yield (kind, text) lines in reading order: left column, then right."""
    rows = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            x0 = spans[0]["bbox"][0]
            y0 = spans[0]["bbox"][1]
            if y0 > 735:  # footer
                continue
            col = 0 if x0 < COL_SPLIT else 1
            k = kind(spans[0])
            rows.append((col, round(y0), x0, k, "".join(s["text"] for s in spans)))
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    # merge spans on same visual line (same col/y) into one line
    merged = []
    for col, y, x, k, t in rows:
        if merged and merged[-1][0] == col and abs(merged[-1][1] - y) <= 2:
            merged[-1][4] += t
        else:
            merged.append([col, y, x, k, t])
    for col, y, x, k, t in merged:
        yield k, re.sub(r"\s+", " ", t).strip()


def join_lines(lines):
    out = ""
    for ln in lines:
        if not out:
            out = ln
        elif out.endswith("-") and not out.endswith(" -") and ln[:1].islower():
            out = out[:-1] + ln
        else:
            out += " " + ln
    return out.strip()


def main(path):
    doc = pymupdf.open(path)
    entries = []
    dept, loc, muni = "Montevideo", None, None
    last_kind = None
    cur = None
    pending_title = []

    def flush():
        nonlocal cur
        if cur:
            entries.append(cur)
        cur = None

    for pn in range(FIRST_PAGE - 1, LAST_PAGE):
        for k, t in page_lines(doc[pn]):
            if not t or SKIP_RE.search(t) or k == "skip":
                continue
            if k != "locality":
                last_kind = k
            if k == "deptlabel":
                continue
            if k == "dept":
                if t.upper().startswith("REGIÓN"):
                    continue
                flush()
                dept = DEPT_FIX.get(t, t.title() if t.isupper() else t)
                loc = muni = None
                continue
            if k == "locality":
                if cur is None and loc and last_kind == "locality":
                    loc = f"{loc} {t}"  # locality name wrapped onto two lines
                    continue
                flush()
                loc, muni = t, None
                last_kind = "locality"
                continue
            if k == "municipio":
                muni = t
                continue
            if k == "title":
                if cur and not cur["body"]:
                    cur["title"].append(t)  # title continues
                    continue
                flush()
                cur = {"dept": dept, "locality": loc, "municipio": muni, "title": [t], "body": [], "page": pn + 1}
                continue
            if cur is None:
                continue
            cur["body"].append(t)
    flush()

    out = []
    for e in entries:
        title = join_lines(e["title"])
        name, _, activity = title.partition("|")
        body = e["body"]
        # address = lines before the first day header, when they look like an address
        first_day = next((j for j, ln in enumerate(body) if DAY_RE.match(ln)), len(body))
        pre = body[:first_day]
        CONNECT = ("esq.", " y", "entre", "-", "frente al", "Coronel", "Av.", "esq", "N.°", ",")
        if len(pre) <= 2 and all(len(p) < 62 and not p.endswith(".") for p in pre):
            i = len(pre)
        else:
            i = 1
            while i < len(pre) and i < 3 and pre[i - 1].rstrip().endswith(CONNECT):
                i += 1
        addr = body[:i]
        rest = body[i:]
        organizer = None
        access = None
        lines = []
        buf = []
        for ln in rest:
            buf.append(ln)
        text = []
        # rebuild paragraphs: new paragraph on day header, hour start, Organiza, Accesib.
        para = []
        for ln in buf:
            starts_new = (
                DAY_RE.match(ln)
                or re.match(r"^(De |A las |Desde |\d{1,2}([:.]\d{2})? ?h)", ln)
                or ln.startswith(("Organiza", "Accesib", "- ", "• "))
            )
            if starts_new and para:
                text.append(join_lines(para))
                para = []
            para.append(ln)
        if para:
            text.append(join_lines(para))
        paras = []
        for p in text:
            if p.startswith("Organiza"):
                organizer = re.sub(r"^Organiza[n]?:?\s*", "", p).rstrip(".")
            elif p.lower().startswith("accesib"):
                access = p
            else:
                paras.append(p)
        out.append(
            {
                "dept": e["dept"],
                "locality": e["locality"],
                "municipio": e["municipio"],
                "name": name.strip(),
                "activity": activity.strip().replace(" | ", " · ") or None,
                "address": join_lines(addr),
                "program": paras,
                "accessibility": access,
                "organizer": organizer,
                "page": e["page"],
            }
        )
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
