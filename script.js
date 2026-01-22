const DATA_PATH = "data";
const WHATSAPP_NUMBER = document.body.dataset.wa || "390450000000";
const LOCATION_NAME = "KOOKAI Cocktail Bar, Via Marconi 66, 37060 Castel d'Azzano (VR), Italia";

document.documentElement.classList.add("js");

const els = {
  signatureGrid: document.getElementById("signature-grid"),
  foodGrid: document.getElementById("food-grid"),
  eventsGrid: document.getElementById("events-grid"),
  reviewsGrid: document.getElementById("reviews-grid"),
  menuList: document.getElementById("menu-list"),
  menuModal: document.getElementById("menu-modal"),
  openMenu: document.getElementById("open-menu"),
  closeMenu: document.querySelector("[data-close-menu]"),
  nextTitle: document.querySelector("[data-next-title]"),
  nextDate: document.querySelector("[data-next-date]"),
  nextLineup: document.querySelector("[data-next-lineup]"),
  calendarBtn: document.getElementById("add-calendar-btn"),
  calendarPop: document.getElementById("calendar-pop"),
  calendarGoogle: document.getElementById("calendar-google"),
  calendarIcs: document.getElementById("calendar-ics"),
  navToggle: document.querySelector(".nav-toggle"),
  navMenu: document.getElementById("site-menu"),
  navOverlay: document.querySelector("[data-nav-overlay]"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightbox-image"),
  lightboxCaption: document.getElementById("lightbox-caption"),
  closeLightbox: document.querySelector("[data-close-lightbox]"),
  mapPlaceholder: document.getElementById("map-placeholder"),
  mapEmbed: document.getElementById("map-embed"),
};

const tiltValues = ["-1.6deg", "0.9deg", "1.2deg", "-0.5deg", "0.6deg", "-1deg"];
const offsetValues = ["0px", "-6px", "4px", "-10px", "6px", "-2px"];

const formatDate = (dateISO, time) => {
  const date = new Date(`${dateISO}T${time}:00`);
  const day = new Intl.DateTimeFormat("it-IT", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("it-IT", { month: "short" })
    .format(date)
    .toUpperCase();
  const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" }).format(date);
  return {
    date,
    short: `${day} ${month}`,
    full: `${weekday} ${day} ${month.toLowerCase()} · ${time}`,
  };
};

const toIcsDate = (date) => {
  const pad = (num) => String(num).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    "00Z"
  );
};

const buildGoogleLink = (event) => {
  const start = new Date(`${event.dateISO}T${event.time}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const dates = `${toIcsDate(start)}/${toIcsDate(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: event.description,
    location: LOCATION_NAME,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

const buildIcs = (event) => {
  const start = new Date(`${event.dateISO}T${event.time}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KOOKAI//Event//IT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@rumorebuono.local`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description} | Lineup: ${event.lineup}`,
    `LOCATION:${LOCATION_NAME}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\n");
};

const setCalendarLinks = (event) => {
  els.calendarGoogle.href = buildGoogleLink(event);
  const icsBlob = new Blob([buildIcs(event)], { type: "text/calendar" });
  els.calendarIcs.href = URL.createObjectURL(icsBlob);
};

const openModal = (modal) => {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeModal = (modal) => {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

const applyTilts = (nodes, offsets = false) => {
  nodes.forEach((node, index) => {
    node.style.setProperty("--tilt", tiltValues[index % tiltValues.length]);
    if (offsets) {
      node.style.setProperty("--offset", offsetValues[index % offsetValues.length]);
    }
  });
};

const renderSignature = (cocktails) => {
  const slice = cocktails.slice(0, 6);
  els.signatureGrid.innerHTML = slice
    .map(
      (drink) => `
        <article class="paper-card drink-card">
          <h3>${drink.name}</h3>
          <p>${drink.desc}</p>
          <div class="price">€ ${drink.price}</div>
          <div class="drink-tags">
            ${drink.tags
              .slice(0, 3)
              .map((tag) => `<span class="tag">${tag}</span>`)
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
  applyTilts(Array.from(els.signatureGrid.children));
};

const renderFood = (foodItems) => {
  const labels = ["HOT", "VEG?", "CLASSIC"];
  const images = [
    "assets/img/food-burger.svg",
    "assets/img/food-focaccia.svg",
    "assets/img/food-snack.svg",
  ];
  const featured = [foodItems[0], foodItems[2], foodItems[4]].filter(Boolean);
  els.foodGrid.innerHTML = featured
    .map(
      (item, index) => `
        <article class="paper-card food-card">
          <img src="${images[index % images.length]}" alt="${item.name}" loading="lazy" />
          <span class="sticker">${labels[index % labels.length]}</span>
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
          <div class="price">€ ${item.price}</div>
        </article>
      `
    )
    .join("");
  applyTilts(Array.from(els.foodGrid.children));
};

const renderEvents = (events) => {
  const ordered = [...events].sort(
    (a, b) =>
      new Date(`${a.dateISO}T${a.time}:00`) - new Date(`${b.dateISO}T${b.time}:00`)
  );
  els.eventsGrid.innerHTML = ordered
    .map((event) => {
      const formatted = formatDate(event.dateISO, event.time);
      const igLink = event.igPostUrl || "https://instagram.com";
      return `
        <article class="paper-card event-card">
          <div class="event-date">${formatted.short}</div>
          <h3>${event.title}</h3>
          <div class="event-meta">${event.genre} · ${event.time}</div>
          <p>${event.description}</p>
          <p><strong>${event.lineup}</strong></p>
          <a class="btn btn-small" href="${igLink}" target="_blank" rel="noopener">Info / DM Instagram</a>
        </article>
      `;
    })
    .join("");
  applyTilts(Array.from(els.eventsGrid.children), true);
};

const renderReviews = (reviews) => {
  els.reviewsGrid.innerHTML = reviews
    .slice(0, 6)
    .map(
      (review) => `
        <article class="paper-card">
          <div class="review-stars">${"★".repeat(review.rating)}</div>
          <p>${review.text}</p>
          <div class="review-time">${review.timeAgo}</div>
        </article>
      `
    )
    .join("");
  applyTilts(Array.from(els.reviewsGrid.children));
};

const renderMenuModal = (menu) => {
  const group = (title, items) => `
    <div class="menu-group">
      <h4>${title}</h4>
      ${items
        .map(
          (item) => `
            <div class="menu-item">
              <div>
                <strong>${item.name}</strong><br />
                <span>${item.desc || ""}</span>
              </div>
              <div>€ ${item.price}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
  els.menuList.innerHTML = [
    group("Cocktail", menu.cocktails),
    group("Birre", menu.beer),
    group("Food", menu.food),
  ].join("");
};

const setNextEvent = (events) => {
  const now = new Date();
  const sorted = [...events].sort(
    (a, b) =>
      new Date(`${a.dateISO}T${a.time}:00`) - new Date(`${b.dateISO}T${b.time}:00`)
  );
  const upcoming = sorted.find(
    (event) => new Date(`${event.dateISO}T${event.time}:00`) > now
  );
  const next = upcoming || sorted[0];
  if (!next) return;
  const formatted = formatDate(next.dateISO, next.time);
  els.nextTitle.textContent = next.title;
  els.nextDate.textContent = formatted.full;
  els.nextLineup.textContent = `Lineup: ${next.lineup}`;
  setCalendarLinks(next);
};

const setupNavMenu = () => {
  if (!els.navToggle || !els.navMenu) return;
  const menuLinks = Array.from(els.navMenu.querySelectorAll("a"));
  let lastFocus = null;

  const setTabState = (open) => {
    menuLinks.forEach((link) => {
      link.setAttribute("tabindex", open ? "0" : "-1");
    });
  };

  const openMenu = () => {
    lastFocus = document.activeElement;
    document.body.classList.add("menu-open");
    els.navToggle.setAttribute("aria-expanded", "true");
    els.navToggle.setAttribute("aria-label", "Chiudi menu");
    els.navMenu.setAttribute("aria-hidden", "false");
    if (els.navOverlay) {
      els.navOverlay.setAttribute("aria-hidden", "false");
    }
    setTabState(true);
    menuLinks[0]?.focus();
  };

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    els.navToggle.setAttribute("aria-expanded", "false");
    els.navToggle.setAttribute("aria-label", "Apri menu");
    els.navMenu.setAttribute("aria-hidden", "true");
    if (els.navOverlay) {
      els.navOverlay.setAttribute("aria-hidden", "true");
    }
    setTabState(false);
    (lastFocus || els.navToggle)?.focus();
  };

  els.navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("menu-open");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  if (els.navOverlay) {
    els.navOverlay.addEventListener("click", () => {
      closeMenu();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  setTabState(false);
};

const setupMenuModal = () => {
  if (!els.menuModal) return;
  let lastFocus;
  els.openMenu.addEventListener("click", () => {
    lastFocus = document.activeElement;
    openModal(els.menuModal);
  });
  els.closeMenu.addEventListener("click", () => {
    closeModal(els.menuModal);
    lastFocus?.focus();
  });
  els.menuModal.addEventListener("click", (event) => {
    if (event.target === els.menuModal) {
      closeModal(els.menuModal);
      lastFocus?.focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.menuModal.classList.contains("open")) {
      closeModal(els.menuModal);
      lastFocus?.focus();
    }
  });
};

const setupLightbox = () => {
  const items = document.querySelectorAll(".gallery-item");
  let lastFocus;
  items.forEach((item) => {
    item.addEventListener("click", () => {
      lastFocus = document.activeElement;
      const src = item.getAttribute("data-full");
      const img = item.querySelector("img");
      els.lightboxImage.src = src;
      els.lightboxImage.alt = img?.alt || "";
      els.lightboxCaption.textContent = img?.alt || "";
      openModal(els.lightbox);
    });
  });
  els.closeLightbox.addEventListener("click", () => {
    closeModal(els.lightbox);
    lastFocus?.focus();
  });
  els.lightbox.addEventListener("click", (event) => {
    if (event.target === els.lightbox) {
      closeModal(els.lightbox);
      lastFocus?.focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.lightbox.classList.contains("open")) {
      closeModal(els.lightbox);
      lastFocus?.focus();
    }
  });
};

const setupCalendar = () => {
  const closePop = () => {
    els.calendarPop.classList.remove("open");
    els.calendarBtn.setAttribute("aria-expanded", "false");
  };
  els.calendarBtn.addEventListener("click", () => {
    const isOpen = els.calendarPop.classList.toggle("open");
    els.calendarBtn.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (!els.calendarPop.contains(event.target) && event.target !== els.calendarBtn) {
      closePop();
    }
  });
};

const setupScrollSpy = () => {
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const links = Array.from(document.querySelectorAll(".site-nav a"));
  const linkIds = links.map((link) => link.getAttribute("href"));
  const tracked = sections.filter((section) => linkIds.includes(`#${section.id}`));
  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0.1,
    }
  );
  tracked.forEach((section) => observer.observe(section));
};

const setupMap = () => {
  if (!els.mapEmbed) return;
  const loadMap = () => {
    if (els.mapEmbed.querySelector("iframe")) return;
    const src = els.mapEmbed.getAttribute("data-src");
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Mappa KOOKAI — Via Marconi 66, Castel d'Azzano";
    iframe.width = "100%";
    iframe.height = "320";
    iframe.loading = "lazy";
    iframe.style.border = "0";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    els.mapEmbed.appendChild(iframe);
    if (els.mapPlaceholder) {
      els.mapPlaceholder.remove();
    }
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMap();
            obs.disconnect();
          }
        });
      },
      { rootMargin: "250px 0px" }
    );
    const target = document.getElementById("location") || els.mapEmbed;
    observer.observe(target);
  } else {
    loadMap();
  }
};

const setupReveal = () => {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  items.forEach((item) => observer.observe(item));
};

const setupWhatsApp = () => {
  const message = "Ciao! Vorrei prenotare un tavolo per...";
  document.querySelectorAll(`a[href^="https://wa.me/${WHATSAPP_NUMBER}"]`).forEach((link) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    link.setAttribute("href", url);
  });
};

const init = async () => {
  try {
    const [events, menu, reviews] = await Promise.all([
      fetch(`${DATA_PATH}/events.json`).then((res) => res.json()),
      fetch(`${DATA_PATH}/menu.json`).then((res) => res.json()),
      fetch(`${DATA_PATH}/reviews.json`).then((res) => res.json()),
    ]);

    renderSignature(menu.cocktails);
    renderFood(menu.food);
    renderEvents(events);
    renderReviews(reviews);
    renderMenuModal(menu);
    setNextEvent(events);
  } catch (error) {
    console.error("Errore nel caricamento dati:", error);
  }

  setupMenuModal();
  setupNavMenu();
  setupLightbox();
  setupCalendar();
  setupScrollSpy();
  setupReveal();
  setupMap();
  setupWhatsApp();
};

document.addEventListener("DOMContentLoaded", init);
