# Rumore Buono — sito one-page

Sito statico per cocktail bar punk/DIY a Castel d'Azzano. Tutto vanilla HTML/CSS/JS con contenuti in JSON.

## Struttura
```
/site
  /assets
    /img
    /icons
  /data
    events.json
    menu.json
    reviews.json
  index.html
  styles.css
  script.js
  README.md
```

## Come cambiare i contenuti

### Eventi
Modifica `data/events.json`:
- `title`, `dateISO`, `time`, `genre`, `description`, `lineup`.
- `igPostUrl` per il link “Info / DM Instagram”.

### Menu
Modifica `data/menu.json`:
- `cocktails` (12 voci), `beer` (6), `food` (8).
- I primi 6 cocktail compaiono nella sezione “Signature”.

### Recensioni
Modifica `data/reviews.json`:
- `rating` (1-5), `text`, `timeAgo`.

### Testi, contatti, orari
Modifica direttamente in `index.html`:
- Indirizzo, telefono, orari.
- Link Instagram.
- JSON-LD LocalBusiness.
Per WhatsApp aggiorna `data-wa` nel tag `<body>` in `index.html`.

### Immagini
Sostituisci i placeholder in `assets/img` con le tue immagini reali mantenendo gli stessi nomi file,
oppure aggiorna i percorsi in `index.html`.

Consiglio: usa JPG/WEBP ottimizzati (larghezza 1200px circa) e conserva il `loading="lazy"`.

## Funzioni interattive
- Eventi/menu/recensioni vengono caricati da JSON in `script.js`.
- Lightbox gallery.
- Modal “Menu completo”.
- Scroll-spy per la nav.
- “Aggiungi a calendario” crea link Google Calendar + file ICS.
- Mappa caricata solo al click (GDPR-friendly).

## Sviluppo locale
Per vedere i JSON in locale serve un server statico:
```
python3 -m http.server 8000
```
Poi apri `http://localhost:8000/site/`.

## Deploy
### GitHub Pages
1. Metti la cartella `site` nella root del repo.
2. Commit + push.
3. GitHub → Settings → Pages → Source: `main` / `/site`.

### Netlify
- Drag & drop della cartella `site` nell'interfaccia Netlify.

## Note
- Il sito è 100% statico, senza framework.
- Accessibilità: focus visibile, contrasto alto, navigazione tastiera.
- Performance: immagini lazy, JS minimale.
