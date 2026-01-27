#!/usr/bin/env python3
import csv
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from typing import Dict

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

def pub_base() -> str:
    return f"https://docs.google.com/spreadsheets/d/e/{SHEET_PUB_ID}"

def fetch_pubhtml() -> str:
    return http_get(f"{pub_base()}/pubhtml")

def build_gid_map(pubhtml: str) -> Dict[str, str]:
    """
    Extracts gid + tab name pairs from the published HTML.
    Works with common '...#gid=12345">TabName</a>' patterns.
    """
    gid_map: Dict[str, str] = {}

    # Most common pattern
    for m in re.finditer(r'gid=(\d+)[^"]*">([^<]+)</a>', pubhtml, flags=re.IGNORECASE):
        gid = m.group(1).strip()
        name = m.group(2).strip()
        if name and gid:
            gid_map[name] = gid

    # Fallback pattern sometimes appears in JS blobs
    # e.g. "gid":12345,"name":"events"
    for m in re.finditer(r'"gid"\s*:\s*(\d+)\s*,\s*"name"\s*:\s*"([^"]+)"', pubhtml, flags=re.IGNORECASE):
        gid = m.group(1).strip()
        name = m.group(2).strip()
        if name and gid:
            gid_map[name] = gid

    return gid_map

def normalize_key(s: str) -> str:
    return s.strip().lower()

def gid_for(tab_name: str, gid_map: Dict[str, str]) -> str:
    # Exact match first
    if tab_name in gid_map:
        return gid_map[tab_name]
    # Case-insensitive match
    target = normalize_key(tab_name)
    for k, v in gid_map.items():
        if normalize_key(k) == target:
            return v
    found = ", ".join(sorted(gid_map.keys())) if gid_map else "(nessuno trovato)"
    raise RuntimeError(f"Tab '{tab_name}' non trovato nel pubhtml. Tab trovati: {found}")

def fetch_csv_by_gid(gid: str) -> str:
    url = f"{pub_base()}/pub?{urllib.parse.urlencode({'output':'csv','gid':gid})}"
    return http_get(url)

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

def read_tab(tab_name: str, gid_map: Dict[str, str]):
    gid = gid_for(tab_name, gid_map)
    txt = fetch_csv_by_gid(gid)

    reader = csv.DictReader(txt.splitlines())
    headers = reader.fieldnames or []
    must_headers(headers, TABS[tab_name], tab_name)

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

    pubhtml = fetch_pubhtml()
    gid_map = build_gid_map(pubhtml)
    if not gid_map:
        raise RuntimeError("Impossibile estrarre i gid dal pubhtml. Assicurati che il foglio sia 'Pubblicato sul web'.")

    cocktails = read_tab("menu_cocktails", gid_map)
    beer = read_tab("menu_beer", gid_map)
    food = read_tab("menu_food", gid_map)
    events = read_tab("events", gid_map)
    reviews = read_tab("reviews", gid_map)

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
