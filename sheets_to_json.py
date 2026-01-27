#!/usr/bin/env python3
import csv
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from typing import Dict, Optional

# Published (public) sheet ID from:
# https://docs.google.com/spreadsheets/d/e/<SHEET_PUB_ID>/pubhtml
SHEET_PUB_ID = os.environ.get("SHEET_PUB_ID", "").strip()

OUT_MENU = "data/menu.json"
OUT_EVENTS = "data/events.json"
OUT_REVIEWS = "data/reviews.json"

TABS = {
    "menu_cocktails": ["name", "desc", "price", "tags"],
    "menu_beer": ["name", "desc", "price"],
    "menu_food": ["name", "desc", "price"],
    "events": ["id", "title", "dateISO", "time", "genre", "description", "lineup", "ticketUrl", "igPostUrl"],
    "reviews": ["rating", "text", "timeAgo"],
}

UA_HEADERS = {"User-Agent": "Mozilla/5.0"}

def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA_HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def get_pubhtml_url() -> str:
    return f"https://docs.google.com/spreadsheets/d/e/{SHEET_PUB_ID}/pubhtml"

def build_gid_map(pubhtml: str) -> Dict[str, str]:
    """
    Tries to map sheet visible names to gid by parsing pubhtml anchors.
    This is a best-effort fallback.
    """
    gid_map: Dict[str, str] = {}

    # Common pattern in pubhtml: ...#gid=12345">SheetName</a>
    for m in re.finditer(r'gid=(\d+)[^"]*">([^<]+)</a>', pubhtml, flags=re.IGNORECASE):
        gid = m.group(1).strip()
        name = m.group(2).strip()
        if name and gid and name not in gid_map:
            gid_map[name] = gid

    return gid_map

def fetch_csv(tab_name: str) -> str:
    if not SHEET_PUB_ID:
        raise RuntimeError("SHEET_PUB_ID mancante (GitHub secret).")

    # Try multiple export endpoints (some published sheets behave differently)
    base_e = f"https://docs.google.com/spreadsheets/d/e/{SHEET_PUB_ID}"

    url_variants = [
        # Variant 1: gviz with sheet name (works for many)
        f"{base_e}/gviz/tq?{urllib.parse.urlencode({'tqx':'out:csv','sheet':tab_name})}",
        # Variant 2: pub output=csv with sheet name (works in other cases)
        f"{base_e}/pub?{urllib.parse.urlencode({'output':'csv','sheet':tab_name})}",
    ]

    last_err: Optional[Exception] = None
    for url in url_variants:
        try:
            return http_get(url)
        except Exception as e:
            last_err = e

    # Fallback: parse pubhtml and try by gid
    try:
        pubhtml = http_get(get_pubhtml_url())
        gid_map = build_gid_map(pubhtml)

        # Sometimes the anchor text might differ; try exact first,
        # then case-insensitive match.
        gid = gid_map.get(tab_name)
        if not gid:
            for k, v in gid_map.items():
                if k.strip().lower() == tab_name.strip().lower():
                    gid = v
                    break

        if gid:
            gid_url = f"{base_e}/pub?{urllib.parse.urlencode({'output':'csv','gid':gid})}"
            return http_get(gid_url)

        # If we can't find gid, print what we did find to help debugging
        found = ", ".join(sorted(gid_map.keys())) if gid_map else "(nessuno trovato nel pubhtml)"
        raise RuntimeError(f"Tab '{tab_name}' non trovato via pubhtml. Tab trovati: {found}")

    except Exception as e:
        if last_err:
            raise RuntimeError(f"Impossibile scaricare CSV per tab '{tab_name}'. Ultimo errore: {last_err}. Fallback error: {e}")
        raise

def must_headers(got, required, tab):
    missing = [h for h in required if h not in got]
    if missing:
        raise RuntimeError(f"[{tab}] colonne mancanti: {missing}. Trovate: {got}")

def norm_price(x):
    x = (x or "").strip().replace(",", ".")
    if x == "":
        return ""
    try:
        v = float(x)
        return str(int(v)) if v.is_integer() else str(v)
    except ValueError:
        return x

def split_tags(x):
    x = (x or "").strip()
    if not x:
        return []
    return [t.strip() for t in x.split(",") if t.strip()]

def read_tab(tab):
    txt = fetch_csv(tab)
    reader = csv.DictReader(txt.splitlines())
    headers = reader.fieldnames or []
    must_headers(headers, TABS[tab], tab)

    rows = []
    for row in reader:
        if not any((row.get(k) or "").strip() for k in headers):
            continue
        rows.append({k: (row.get(k) or "").strip() for k in headers})
    return rows

def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def main():
    if not SHEET_PUB_ID:
        print("ERROR: SHEET_PUB_ID mancante (GitHub secret).", file=sys.stderr)
        sys.exit(1)

    cocktails = read_tab("menu_cocktails")
    beer = read_tab("menu_beer")
    food = read_tab("menu_food")
    events = read_tab("events")
    reviews = read_tab("reviews")

    menu_json = {
        "cocktails": [
            {
                "name": r["name"],
                "desc": r["desc"],
                "price": norm_price(r["price"]),
                "tags": split_tags(r["tags"]),
            }
            for r in cocktails
            if r.get("name", "").strip()
        ],
        "beer": [
            {"name": r["name"], "desc": r["desc"], "price": norm_price(r["price"])}
            for r in beer
            if r.get("name", "").strip()
        ],
        "food": [
            {"name": r["name"], "desc": r["desc"], "price": norm_price(r["price"])}
            for r in food
            if r.get("name", "").strip()
        ],
    }

    events_json = [
        {
            "id": r["id"],
            "title": r["title"],
            "dateISO": r["dateISO"],
            "time": r["time"],
            "genre": r["genre"],
            "description": r["description"],
            "lineup": r["lineup"],
            "ticketUrl": r["ticketUrl"],
            "igPostUrl": r["igPostUrl"],
        }
        for r in events
        if r.get("id", "").strip()
    ]

    reviews_json = [
        {
            "rating": int(r["rating"]) if r.get("rating", "").strip().isdigit() else r["rating"],
            "text": r["text"],
            "timeAgo": r["timeAgo"],
        }
        for r in reviews
        if r.get("text", "").strip()
    ]

    write_json(OUT_MENU, menu_json)
    write_json(OUT_EVENTS, events_json)
    write_json(OUT_REVIEWS, reviews_json)

    print("OK:", OUT_MENU, OUT_EVENTS, OUT_REVIEWS)

if __name__ == "__main__":
    main()
