// Vice Cover Studio — the cover renderer. Draws a GTA-style multi-panel poster:
// a hero panel plus two supporting panels in a dark grid, a Vice City sunset or neon
// colour grade over every photo, and bold Anton caption lettering on a plum band.
// Pure canvas, no network: drawCover(canvas, state) paints at the canvas's own size,
// so the editor preview and the full-size PNG export share exactly this code.

export const COVER_SIZES = {
  square: { width: 1080, height: 1080, label: '1080 × 1080', shape: 'Square' },
  portrait: { width: 1080, height: 1350, label: '1080 × 1350', shape: 'Portrait' },
  wide: { width: 1920, height: 1080, label: '1920 × 1080', shape: 'Wide' },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.32) contrast(1.08) brightness(1.03)',
    wash: { blend: 'overlay', alpha: 0.16, stops: [[0, '#ff8a3d'], [1, '#ff2e88']] },
    tint: { blend: 'soft-light', alpha: 0.55, stops: [[0, '#ffb347'], [0.55, '#ff5e78'], [1, '#5b1a6e']] },
    vignette: 0.34,
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.5) contrast(1.12) brightness(0.99) hue-rotate(-6deg)',
    wash: { blend: 'overlay', alpha: 0.14, stops: [[0, '#ff2e88'], [1, '#00d4ff']] },
    tint: { blend: 'soft-light', alpha: 0.6, stops: [[0, '#ff2e88'], [0.5, '#7a2bff'], [1, '#00c2ff']] },
    vignette: 0.38,
  },
  chrome: {
    label: 'Clean Chrome',
    filter: 'saturate(1.12) contrast(1.05) brightness(1.02)',
    wash: { blend: 'soft-light', alpha: 0.1, stops: [[0, '#ffffff'], [1, '#ffd9a0']] },
    tint: { blend: 'soft-light', alpha: 0.25, stops: [[0, '#ffe8c2'], [1, '#2b1a4d']] },
    vignette: 0.26,
  },
};

export const BAND_BACKGROUND_TOP = '#1d0c28';
export const BAND_BACKGROUND_BOTTOM = '#0c0513';
export const COVER_BACKGROUND = '#0c0513';

// A panel placement: which photo fills the panel, how far it is zoomed in (1 = just
// covering the panel), and where it sits inside it (ox, oy in [-1, 1]: -1 pins the
// photo's left/top edge to the panel, 1 pins the right/bottom edge).
export function defaultPlacements() {
  return [
    { photo: 0, zoom: 1.0, ox: 0, oy: -0.75 },
    { photo: 1, zoom: 1.0, ox: 0, oy: -0.7 },
    { photo: 0, zoom: 1.9, ox: 0.35, oy: -0.55 },
  ];
}

// Panel rectangles for a size, in canvas pixels: the hero panel, two supporting
// panels, and the caption band. Panels are inset by half the gap on every side, so
// the dark cover background shows as even gutters between them and a thin frame.
export function layoutFor(sizeKey, width, height) {
  const gap = Math.max(4, Math.round(Math.min(width, height) * 0.009));
  const half = gap / 2;
  const bandHeight =
    sizeKey === 'wide' ? height * 0.24 : sizeKey === 'portrait' ? height * 0.19 : height * 0.205;
  const photoHeight = height - bandHeight;
  const inset = (x, y, w, h) => ({ x: x + half, y: y + half, w: w - gap, h: h - gap });
  let panels;
  if (sizeKey === 'portrait') {
    const heroHeight = photoHeight * 0.64;
    panels = [
      inset(0, 0, width, heroHeight),
      inset(0, heroHeight, width / 2, photoHeight - heroHeight),
      inset(width / 2, heroHeight, width / 2, photoHeight - heroHeight),
    ];
  } else if (sizeKey === 'wide') {
    const heroWidth = width * 0.56;
    panels = [
      inset(0, 0, heroWidth, photoHeight),
      inset(heroWidth, 0, width - heroWidth, photoHeight / 2),
      inset(heroWidth, photoHeight / 2, width - heroWidth, photoHeight / 2),
    ];
  } else {
    const heroWidth = width * 0.615;
    panels = [
      inset(0, 0, heroWidth, photoHeight),
      inset(heroWidth, 0, width - heroWidth, photoHeight / 2),
      inset(heroWidth, photoHeight / 2, width - heroWidth, photoHeight / 2),
    ];
  }
  return {
    panels,
    band: { x: 0, y: photoHeight, w: width, h: bandHeight },
    gap,
  };
}

// Which panel (index, or -1) holds the point (x, y) in canvas pixels.
export function panelAt(layout, x, y) {
  for (let i = 0; i < layout.panels.length; i += 1) {
    const p = layout.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

// Draws the whole cover onto `canvas` at its own pixel size. `state` carries the
// size key, the grade key, the title and subtitle, the loaded photos (Image objects,
// in order) and one placement per panel.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = layoutFor(state.size, w, h);
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.save();
  ctx.fillStyle = COVER_BACKGROUND;
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((rect, i) => {
    const placement = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const entry = state.photos[placement.photo] ?? null;
    // A photo entry is either an Image itself or an object carrying one as .img.
    const photo = entry && 'img' in entry ? entry.img : entry;
    drawPhotoPanel(ctx, rect, photo, placement, grade);
  });
  drawCaptionBand(ctx, layout.band, state.title, state.subtitle, w);
  ctx.restore();
  return layout;
}

// One photo panel: the photo cover-fitted with its zoom and pan, the grade's filter
// and colour overlays, a vignette, and a hairline highlight along its edges.
function drawPhotoPanel(ctx, rect, photo, placement, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (photo && photo.naturalWidth > 0) {
    const scale =
      Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * placement.zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = rect.x + (rect.w - dw) * (0.5 + placement.ox * 0.5);
    const dy = rect.y + (rect.h - dh) * (0.5 + placement.oy * 0.5);
    ctx.filter = grade.filter;
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    empty.addColorStop(0, '#3a1c52');
    empty.addColorStop(1, '#160a24');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  paintGradeOverlay(ctx, rect, grade);
  paintVignette(ctx, rect, grade.vignette);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.restore();
}

// The grade's two colour washes, blended over the panel so the photo reads as one
// sunset or neon scene instead of a plain snapshot.
function paintGradeOverlay(ctx, rect, grade) {
  for (const layer of [grade.wash, grade.tint]) {
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    for (const [at, color] of layer.stops) gradient.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = layer.blend;
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}

function paintVignette(ctx, rect, strength) {
  const radius = Math.hypot(rect.w, rect.h) / 2;
  const shade = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, radius * 0.45,
    rect.x + rect.w / 2, rect.y + rect.h / 2, radius,
  );
  shade.addColorStop(0, 'rgba(10, 2, 18, 0)');
  shade.addColorStop(1, `rgba(10, 2, 18, ${strength})`);
  ctx.save();
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// The caption band: plum background, a neon sunset rule along its top, the title in
// huge Anton capitals with a dark outline, the subtitle letter-spaced beneath it.
function drawCaptionBand(ctx, band, title, subtitle, coverWidth) {
  const bg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bg.addColorStop(0, BAND_BACKGROUND_TOP);
  bg.addColorStop(1, BAND_BACKGROUND_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  const ruleHeight = Math.max(3, band.h * 0.03);
  const rule = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
  rule.addColorStop(0, '#ff2e88');
  rule.addColorStop(0.45, '#ff9a3d');
  rule.addColorStop(0.8, '#ffe14d');
  rule.addColorStop(1, '#00d4ff');
  ctx.fillStyle = rule;
  ctx.fillRect(band.x, band.y, band.w, ruleHeight);

  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const centerX = band.x + band.w / 2;
  const maxWidth = band.w * 0.92;
  const maxTitleSize = band.h * (sub ? 0.46 : 0.58);
  if (text) {
    const { lines, size } = fitTitleLines(ctx, text, maxWidth, maxTitleSize, band.h * 0.72);
    const titleFill = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    titleFill.addColorStop(0, '#ffffff');
    titleFill.addColorStop(1, '#ffd9a8');
    ctx.save();
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.04;
    const lineHeight = size * 1.02;
    const blockHeight = lineHeight * lines.length;
    const firstBaseline =
      band.y + (band.h - blockHeight) / 2 + lineHeight / 2 - (sub ? size * 0.16 : 0);
    lines.forEach((line, i) => {
      const y = firstBaseline + i * lineHeight;
      ctx.lineWidth = Math.max(2, size * 0.16);
      ctx.strokeStyle = '#14071d';
      ctx.strokeText(line, centerX, y);
      ctx.fillStyle = titleFill;
      ctx.fillText(line, centerX, y);
    });
    ctx.restore();
    if (sub) {
      const subSize = Math.max(12, Math.min(size * 0.3, band.h * 0.14));
      ctx.save();
      ctx.font = `${subSize}px Anton, 'Arial Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas: no tracking */ }
      ctx.fillStyle = '#ff8ac2';
      ctx.fillText(sub, centerX, band.y + band.h - band.h * 0.16);
      try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
      ctx.restore();
    }
  }

  ctx.save();
  ctx.font = `${Math.max(9, Math.round(coverWidth * 0.008))}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('MADE WITH VICE COVER STUDIO', band.x + band.w - band.w * 0.015, band.y + band.h - band.h * 0.07);
  ctx.restore();
}

// Wraps the title into at most two lines and shrinks it until every line fits the
// band's width and the block fits its height.
function fitTitleLines(ctx, text, maxWidth, maxSize, maxBlockHeight) {
  let size = maxSize;
  const words = text.split(/\s+/).filter(Boolean);
  const wrap = (fontSize) => {
    ctx.font = `${fontSize}px Anton, 'Arial Black', sans-serif`;
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width <= maxWidth || !line) {
        line = trial;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = wrap(size);
  while (size > 14 && (lines.length > 2 || lines.length * size * 1.02 > maxBlockHeight)) {
    size = Math.floor(size * 0.92);
    lines = wrap(size);
  }
  if (lines.length > 2) {
    // A very long title: keep the first two lines and let the rest fall away rather
    // than shrinking the lettering to nothing.
    lines = lines.slice(0, 2);
  }
  return { lines, size };
}
