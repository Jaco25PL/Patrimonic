"""Normalize the parsed guide into the app's dataset.

Usage: python3 scripts/build_data.py
Reads  data/raw-guide.json (+ data/fixes.json for hand corrections)
Writes src/data/places.json
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
raw = json.loads((ROOT / "data/raw-guide.json").read_text())
fixes = json.loads((ROOT / "data/fixes.json").read_text())

DAY_RE = re.compile(r"^(S[áa]bado|Domingo|Viernes) \d", re.I)
ADDRESS_HINT = re.compile(r"\d|esq\.|\bentre\b|\by\b.+|Ruta|Rambla|Av\.|Avda\.|Calle", re.I)

NOT_ADDRESS = re.compile(
    r"^(Visita|Apertura|Muestra|Exposici|Exhibici|Charla|Se |Recorrido|Aportes|Exposiciones|Escenario)", re.I
)

# Order matters: first match wins.
CATEGORIES = [
    ("faros", r"\bfaro\b"),
    ("palacios", r"palacio|castillo|casona|quinta|chalet|villa |residencia|mausoleo"),
    ("museos", r"museo|pinacoteca|archivo|colecci[oó]n"),
    ("iglesias", r"iglesia|parroquia|catedral|capilla|bas[ií]lica|templo|logia|santuario"),
    ("teatros", r"teatro|auditorio|sodre|cine|sala "),
    ("bodegas", r"bodega|viña|viñedo|vino|granja|chacra|almac[eé]n|restaurante|bar |caf[eé]"),
    ("naturaleza", r"parque|plaza|humedal|reserva|sendero|jard[ií]n|arboretum|quebrada|ecoparque|playa|arroyo|r[ií]o "),
    ("militar", r"regimiento|batall[oó]n|escuela militar|escuela naval|base |prefectura|fortaleza|fuerte|cuartel|armada|liceo militar"),
    ("recorridos", r"circuito|recorrido|ruta |bus |l[ií]nea hist|caminata|paseo|traslado"),
    ("embajadas", r"embajada"),
]


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:60].rstrip("-")


def clean(s):
    if s is None:
        return None
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace(" ,", ",")
    return s or None


def categorize(e):
    hay = f"{e['name']} {e.get('activity') or ''}".lower()
    for key, pattern in CATEGORIES:
        if re.search(pattern, hay):
            return key
    return "cultura"


def days_of(program):
    text = " ".join(program).lower()
    sat, sun = "sábado" in text or "sabado" in text, "domingo" in text
    if not sat and not sun:
        sat = sun = True
    return [d for d, on in (("sab", sat), ("dom", sun)) if on]


def main():
    places = []
    by_key = {}
    for i, e in enumerate(raw):
        fx = fixes["entries"].get(str(i), {})
        e = {**e, **fx}
        if e.get("skip"):
            continue
        program = [clean(p) for p in e["program"] if clean(p)]
        address = clean(e["address"])
        activity = clean(e["activity"])
        if not address and activity and ADDRESS_HINT.search(activity) and len(activity) < 70:
            address, activity = activity, None
        if not address and program and not DAY_RE.match(program[0]) and len(program[0]) < 70:
            address = program.pop(0)
        if address and NOT_ADDRESS.match(address):
            program.insert(0, address)
            address = None
        address = e.get("addressOverride") or address
        locality = clean(e["locality"]) or fixes["defaultLocality"].get(e["dept"], e["dept"])
        locality = fixes["localityRename"].get(locality, locality)
        name = clean(e["name"]).rstrip(".")
        # dedupe the same venue appearing twice (different activities)
        key = (name.lower(), (address or "").lower())
        if key in by_key:
            prev = by_key[key]
            if activity and activity not in (prev["activities"] or []):
                prev["activities"].append(activity)
            prev["program"].extend(program)
            prev["days"] = sorted(set(prev["days"]) | set(days_of(program)), key=["sab", "dom"].index)
            continue
        place = {
            "id": i,
            "slug": None,
            "name": name,
            "activities": [activity] if activity else [],
            "dept": e["dept"],
            "locality": locality,
            "municipio": clean(e["municipio"]),
            "address": address,
            "program": program,
            "accessibility": clean(e["accessibility"]),
            "organizer": clean(e["organizer"]),
            "days": days_of(program),
            "page": e["page"],
        }
        place["category"] = fixes["category"].get(str(i)) or categorize({"name": name, "activity": activity})
        by_key[key] = place
        places.append(place)

    seen = {}
    for p in places:
        base = slugify(p["name"])
        if base in seen:
            base = slugify(f"{p['name']} {p['locality']}")
        n, slug = 2, base
        while slug in seen:
            slug, n = f"{base}-{n}", n + 1
        seen[slug] = True
        p["slug"] = slug

    out = ROOT / "src/data/places.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(places, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {len(places)} places -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
