(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-links');
  const closeMenu = () => { if (!menu || !menuButton) return; menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.textContent = 'Menu'; };
  menuButton?.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded', String(open)); menuButton.textContent = open ? 'Close' : 'Menu'; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); document.querySelectorAll('.site-links details[open]').forEach(x => x.open = false); } });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) { closeMenu(); document.querySelectorAll('.site-links details[open]').forEach(x => x.open = false); } });
  document.querySelectorAll('.site-links details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) document.querySelectorAll('.site-links details').forEach(other => { if (other !== detail) other.open = false; }); }));
  document.querySelectorAll('.site-links a').forEach(a => { if (new URL(a.href).pathname === location.pathname && !a.hash) a.setAttribute('aria-current', 'page'); a.addEventListener('click', closeMenu); });
  const year = document.querySelector('[data-year]'); if (year) year.textContent = String(new Date().getFullYear());
  const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch {} } };
  const privacy = document.querySelector('.privacy-choice');
  let analyticsLoaded = false;
  function analytics() {
    if (analyticsLoaded || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied' });
    window.gtag('js', new Date()); window.gtag('config', 'G-6EB0M3KD2R', { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script'); script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=G-6EB0M3KD2R'; document.head.append(script);
  }
  if (storage.get('daa-analytics') === 'yes') analytics();
  document.querySelectorAll('[data-privacy-open]').forEach(button => button.addEventListener('click', () => { privacy.hidden = false; privacy.querySelector('button')?.focus(); }));
  privacy?.querySelectorAll('button[data-choice]').forEach(button => button.addEventListener('click', () => { const enabled = button.dataset.choice === 'yes'; storage.set('daa-analytics', enabled ? 'yes' : 'no'); privacy.hidden = true; if (enabled) analytics(); else if (analyticsLoaded) { window.gtag?.('consent','update',{analytics_storage:'denied'}); location.reload(); } }));
  document.querySelectorAll('[data-close-popup]').forEach(button => button.addEventListener('click', () => { try { if (window.parent !== window && window.parent.location.origin === location.origin && typeof window.parent.closePopup === 'function') { window.parent.closePopup(); return; } } catch {} location.href = 'exhibition-env.html'; }));
})();
