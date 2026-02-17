document.documentElement.classList.add("js");

const body = document.body;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const mobileMenu = document.getElementById("site-menu");
const navOverlay = document.querySelector("[data-nav-overlay]");
const mobileMenuLinks = mobileMenu
  ? Array.from(mobileMenu.querySelectorAll('a[href^="#"]'))
  : [];
const desktopNavLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const setMenuState = (open) => {
  if (!navToggle || !mobileMenu || !navOverlay) return;
  body.classList.toggle("menu-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  navToggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
  navOverlay.setAttribute("aria-hidden", open ? "false" : "true");
};

const closeMenu = () => setMenuState(false);

if (navToggle && mobileMenu && navOverlay) {
  setMenuState(false);

  navToggle.addEventListener("click", () => {
    setMenuState(!body.classList.contains("menu-open"));
  });

  navOverlay.addEventListener("click", () => {
    closeMenu();
  });

  mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768 && body.classList.contains("menu-open")) {
      closeMenu();
    }
  });
}

const smoothScrollTo = (hash) => {
  if (!hash || hash === "#") return false;

  if (hash === "#top") {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
    });
    return true;
  }

  const target = document.querySelector(hash);
  if (!target) return false;

  const offset = header ? header.offsetHeight + 12 : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion.matches ? "auto" : "smooth",
  });

  return true;
};

document.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
  if (!link) return;

  const hash = link.getAttribute("href");
  if (!smoothScrollTo(hash)) return;

  event.preventDefault();
  history.replaceState(null, "", hash);
  closeMenu();
});

window.addEventListener("load", () => {
  if (!window.location.hash) return;
  setTimeout(() => {
    smoothScrollTo(window.location.hash);
  }, 60);
});

if (desktopNavLinks.length && "IntersectionObserver" in window) {
  const desktopTargets = desktopNavLinks
    .map((link) => link.getAttribute("href"))
    .filter((href) => href && href.startsWith("#"))
    .map((href) => document.querySelector(href))
    .filter(Boolean);

  const setActiveLink = (id) => {
    desktopNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0.05,
    }
  );

  desktopTargets.forEach((section) => navObserver.observe(section));
}

const revealItems = Array.from(document.querySelectorAll(".reveal"));

if (!revealItems.length || prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}
