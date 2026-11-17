/* Slow cross-fades, with a persistent pause control and reduced-motion support. */
(() => {
  const carousel = document.querySelector('.slider-container');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.slide')];
  const pause = carousel.querySelector('.slider-pause');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = false;
  let timer;
  function sync() {
    clearInterval(timer);
    if (paused || motion.matches || document.hidden || slides.length < 2) return;
    timer = setInterval(() => {
      slides[current].classList.remove('active');
      slides[current].setAttribute('aria-hidden', 'true');
      slides[current].querySelector('a')?.setAttribute('tabindex', '-1');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
      slides[current].setAttribute('aria-hidden', 'false');
      slides[current].querySelector('a')?.removeAttribute('tabindex');
    }, 6500);
  }
  slides.forEach((slide, i) => {
    slide.setAttribute('aria-hidden', String(i !== current));
    // Load carousel photographs ahead of their transition, including hidden slides.
    const image = slide.querySelector('img');
    if (image) image.loading = 'eager';
  });
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pause.setAttribute('aria-pressed', String(paused));
    sync();
  });
  // Keyboard focus pauses rotation until the visitor explicitly resumes it.
  carousel.addEventListener('focusin', event => {
    if (!event.target.closest('.slide-caption')) return;
    paused = true;
    pause.textContent = 'Play';
    pause.setAttribute('aria-label', 'Play slideshow');
    pause.setAttribute('aria-pressed', 'true');
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  sync();
})();
