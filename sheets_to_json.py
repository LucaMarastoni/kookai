#!/usr/bin/env python3
import csv, json, os, sys, urllib.parse, urllib.request

SHEET_ID = os.environ.get("SHEET_ID", "").strip()

OUT_MENU    = "data/menu.json"
OUT_EVENTS  = "data/events.json"
OUT_REVIEWS = "data/reviews.json"

TABS = {
  "menu_cocktails": ["name","desc","price","tags"],
  "menu_beer":      ["name","desc","price"],
  "menu_food":      ["name","desc","price"],
  "events":         ["id","title","dateISO","time","genre","description","lineup","ticketUrl","igPostUrl"],
  "reviews":        ["rating","text","timeAgo"],
}

def fetch_csv(tab_name: str) -> str:
    base = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
    query = urllib.parse.urlencode({"tqx":"out:csv","sheet":tab_name})
    url = f"{base}?{query}"
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def must_headers(got, required, tab):
    missing = [h for h in required if h not in got]
    if missing:
        raise RuntimeError(f"[{tab}] colonne mancanti: {missing}. Trovate: {got}")

def norm_price(x):
    x = (x or "").strip().replace(",", ".")
    if x == "": return ""
    try:
        v = float(x)
        return str(int(v)) if v.is_integer() else str(v)
    except ValueError:
        return x

def split_tags(x):
    x = (x or "").strip()
    if not x: return []
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
    if not SHEET_ID:
        print("ERROR: SHEET_ID mancante (GitHub secret).", file=sys.stderr)
        sys.exit(1)

    cocktails = read_tab("menu_cocktails")
    beer      = read_tab("menu_beer")
    food      = read_tab("menu_food")
    events    = read_tab("events")
    reviews   = read_tab("reviews")

    menu_json = {
      "cocktails": [
        {"name": r["name"], "desc": r["desc"], "price": norm_price(r["price"]), "tags": split_tags(r["tags"])}
        for r in cocktails if r.get("name","").strip()
      ],
      "beer": [
        {"name": r["name"], "desc": r["desc"], "price": norm_price(r["price"])}
        for r in beer if r.get("name","").strip()
      ],
      "food": [
        {"name": r["name"], "desc": r["desc"], "price": norm_price(r["price"])}
        for r in food if r.get("name","").strip()
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
      for r in events if r.get("id","").strip()
    ]

    reviews_json = [
      {
        "rating": int(r["rating"]) if (r.get("rating","").strip().isdigit()) else r["rating"],
        "text": r["text"],
        "timeAgo": r["timeAgo"],
      }
      for r in reviews if r.get("text","").strip()
    ]

    write_json(OUT_MENU, menu_json)
    write_json(OUT_EVENTS, events_json)
    write_json(OUT_REVIEWS, reviews_json)

    print("OK:", OUT_MENU, OUT_EVENTS, OUT_REVIEWS)

if __name__ == "__main__":
    main()
