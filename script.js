document.documentElement.classList.add("js");

const body = document.body;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav]");
const navLinks = navMenu ? Array.from(navMenu.querySelectorAll("a")) : [];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const closeMenu = () => {
  if (!navToggle) return;
  body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Apri menu");
};

const openMenu = () => {
  if (!navToggle) return;
  body.classList.add("nav-open");
  navToggle.setAttribute("aria-expanded", "true");
  navToggle.setAttribute("aria-label", "Chiudi menu");
};

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    if (body.classList.contains("nav-open")) {
      closeMenu();
      return;
    }
    openMenu();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!body.classList.contains("nav-open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (navMenu.contains(target) || navToggle.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
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

const revealItems = Array.from(document.querySelectorAll(".reveal"));

if (!revealItems.length || prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
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

  revealItems.forEach((item) => observer.observe(item));
}
