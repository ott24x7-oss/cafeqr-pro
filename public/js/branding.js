/* branding.js — applies admin-overridable platform branding to every
 * customer-facing page on the WatShop Cafe marketing site.
 *
 * Mark elements that should be patched:
 *   <img data-brand-logo src="/watshop-cafe-lockup.svg">      → src + alt
 *   <span data-brand-name>WatShop Cafe</span>                  → textContent
 *   <p   data-brand-tagline>...</p>                            → textContent
 *   <p   data-brand-footer>...</p>                             → textContent
 *
 * If the admin hasn't customised a field, the existing static markup
 * stays — there's no flash to a fallback. Per-cafe branding lives in a
 * different place and is unaffected by this script.
 */
(function () {
  function applyBranding(b) {
    if (!b) return;
    if (b.logo) {
      document.querySelectorAll('[data-brand-logo]').forEach(function (el) {
        if (el.tagName === 'IMG') {
          el.src = b.logo;
          if (b.brandName) el.alt = b.brandName;
        } else {
          el.style.backgroundImage = 'url("' + b.logo + '")';
        }
      });
    }
    if (b.brandName) {
      document.querySelectorAll('[data-brand-name]').forEach(function (el) {
        el.textContent = b.brandName;
      });
      // Patch <title> if it contains the default brand
      if (document.title && document.title.indexOf('WatShop Cafe') !== -1) {
        document.title = document.title.split('WatShop Cafe').join(b.brandName);
      }
    }
    if (b.tagline) {
      document.querySelectorAll('[data-brand-tagline]').forEach(function (el) {
        el.textContent = b.tagline;
      });
    }
    if (b.footer) {
      document.querySelectorAll('[data-brand-footer]').forEach(function (el) {
        el.textContent = b.footer;
      });
    }
    if (b.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', b.primaryColor);
      document.querySelectorAll('[data-brand-color]').forEach(function (el) {
        el.style.color = b.primaryColor;
      });
    }
  }

  function load() {
    fetch('/api/branding', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(applyBranding)
      .catch(function () { /* silent — keep static fallbacks */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
