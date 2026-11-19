import * as THREE from '../assets/vendor/three.module.min.js';

// The sculpture's display shares its records with the full history page.
// Only the current and next record are rasterized, keeping GPU memory bounded.
export function createHistoryScreen(onRecord = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 520; canvas.height = 1200;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  let records = [], index = 0, offset = 0, tick = 0, hold = 4, disposed = false;
  const pages = new Map();
  function lines(ctx, text, x, y, width, size, color = '#a3ffba') {
    ctx.font = `${size}px AlarmPixel, monospace`; ctx.fillStyle = color;
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        ctx.fillText(line, x, y); y += size * 1.12; line = word;
      } else line = next;
    }
    if (line) { ctx.fillText(line, x, y); y += size * 1.12; }
    return y;
  }
  function page(record) {
    if (pages.has(record)) return pages.get(record);
    const sheet = document.createElement('canvas'); sheet.width = 520; sheet.height = 5000;
    const ctx = sheet.getContext('2d'); ctx.fillStyle = '#010503'; ctx.fillRect(0, 0, 520, 5000);
    let y = lines(ctx, `RECORD ${String(record.number).padStart(2, '0')} / ${records.length}`, 28, 48, 464, 24, '#7dba8b');
    y = lines(ctx, record.title, 28, y + 20, 464, 40);
    y = lines(ctx, record.date, 28, y + 12, 464, 28, '#c6dec9');
    y += 24;
    const imageTop = y, imageHeight = 340;
    ctx.strokeStyle = '#214e2c'; ctx.strokeRect(28, imageTop, 464, imageHeight);
    y += imageHeight + 34;
    y = lines(ctx, record.title, 28, y, 464, 27);
    for (const field of record.fields) y = lines(ctx, field, 28, y + 18, 464, 25, '#a2c7aa');
    for (const paragraph of record.description) y = lines(ctx, paragraph, 28, y + 24, 464, 25, '#bcd5c2');
    const result = { sheet, height: Math.max(1240, Math.ceil(y + 80)) };
    pages.set(record, result);
    const image = new Image(); image.decoding = 'async';
    image.onload = () => {
      if (disposed || !pages.has(record)) return;
      const scale = Math.min(444 / image.naturalWidth, 320 / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      ctx.drawImage(image, 28 + (464 - w) / 2, imageTop + (imageHeight - h) / 2, w, h);
      tick = 1;
    };
    image.src = record.image;
    return result;
  }
  function draw() {
    context.fillStyle = '#010503'; context.fillRect(0, 0, 520, 1200);
    if (!records.length) {
      lines(context, 'GRIFFIN HISTORY', 28, 64, 464, 38);
      lines(context, 'Historical objects / museum collections', 28, 140, 464, 28);
    } else {
      const current = page(records[index]), nextIndex = (index + 1) % records.length;
      context.drawImage(current.sheet, 0, -offset);
      if (current.height - offset < 1200) context.drawImage(page(records[nextIndex]).sheet, 0, current.height - offset);
      context.fillStyle = '#010503'; context.fillRect(0, 0, 520, 35);
      lines(context, 'I / GRIFFIN HISTORY', 28, 25, 464, 22, '#7dba8b');
      onRecord(records[index].number, Math.floor(offset));
      for (const key of pages.keys()) if (key !== records[index] && key !== records[nextIndex]) pages.delete(key);
    }
    texture.needsUpdate = true;
  }
  draw();
  const ready = Promise.all([
    fetch(new URL('history.html', import.meta.url)).then(response => {
      if (!response.ok) throw new Error(`History: ${response.status}`);
      return response.text();
    }),
    document.fonts.load('28px AlarmPixel').catch(() => {})
  ]).then(([html]) => {
    if (disposed) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = element => element?.textContent.replace(/\s+/g, ' ').trim() || '';
    records = [...doc.querySelectorAll('[data-record]')].map(article => ({
      number: Number(article.dataset.record),
      title: text(article.querySelector('h2')).replace(/^Object Type:\s*/, ''),
      date: text(article.querySelector('.history-date')),
      image: new URL(article.querySelector('img').getAttribute('src'), import.meta.url).href,
      fields: [...article.querySelectorAll('.history-fields p')].map(text),
      description: [...article.querySelectorAll('.history-description p')].map(text)
    }));
    draw();
  }).catch(error => console.warn('ALARM history display:', error));
  return {
    texture, ready,
    update(dt, moving = true) {
      if (disposed || !records.length) return;
      if (moving) {
        if (hold > 0) hold -= dt;
        else {
          offset += 22 * dt;
          if (offset >= page(records[index]).height) { offset = 0; index = (index + 1) % records.length; }
        }
      }
      tick += dt;
      if (tick >= .125) { tick = 0; draw(); }
    },
    dispose() { disposed = true; pages.clear(); texture.dispose(); canvas.width = canvas.height = 1; }
  };
}
