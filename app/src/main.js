// Vice Cover Studio — the editor. Wires the page: photo uploads (several photos),
// per-panel crop and position (drag on the preview, scroll to zoom, or the sliders),
// the editable caption, the grade and size pickers, and the one-click PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { COVER_SIZES, GRADES, defaultPlacements, drawCover, layoutFor, panelAt } from './cover.js';
import { runShot } from './shots.js';

const DEMO_PHOTOS = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard sunset' },
  { src: 'samples/pier.jpg', name: 'Pier fishing' },
];
const PANEL_NAMES = ['Hero', 'Panel 2', 'Panel 3'];
const PREVIEW_MAX_SIDE = 900;

const canvas = document.getElementById('cover');
const status = document.getElementById('status');

const state = {
  size: 'square',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Palms · Chrome · Neon Nights',
  photos: [],
  panels: defaultPlacements(),
  selectedPanel: 0,
  selectedPhoto: 0,
};
let lastLayout = layoutFor(state.size, canvas.width, canvas.height);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const size = COVER_SIZES[state.size];
  // The cover screenshot scene paints at full export size so the shot is crisp;
  // the editor preview stays at a smaller size for speed.
  const fullRes = document.body.classList.contains('shot-cover');
  const scale = fullRes ? 1 : Math.min(1, PREVIEW_MAX_SIDE / Math.max(size.width, size.height));
  const width = Math.round(size.width * scale);
  const height = Math.round(size.height * scale);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  lastLayout = drawCover(canvas, state);
  syncPanelControls();
}

function syncPanelControls() {
  const placement = state.panels[state.selectedPanel];
  document.getElementById('zoom').value = placement.zoom;
  document.getElementById('zoomValue').textContent = `${placement.zoom.toFixed(2)}×`;
  document.getElementById('offsetX').value = placement.ox;
  document.getElementById('offsetY').value = placement.oy;
  document.querySelectorAll('#panelTabs button').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === state.selectedPanel));
    button.classList.toggle('active', i === state.selectedPanel);
  });
  document.querySelectorAll('#thumbs button').forEach((button, i) => {
    button.classList.toggle('selected', i === state.selectedPhoto);
  });
}

function renderThumbs() {
  const strip = document.getElementById('thumbs');
  strip.replaceChildren();
  if (state.photos.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'No photos yet — add some, or use the demo photos.';
    strip.appendChild(empty);
    return;
  }
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(i === state.selectedPhoto));
    button.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    button.appendChild(img);
    button.addEventListener('click', () => assignPhotoToSelectedPanel(i));
    strip.appendChild(button);
  });
  syncPanelControls();
}

function assignPhotoToSelectedPanel(photoIndex) {
  state.selectedPhoto = photoIndex;
  state.panels[state.selectedPanel].photo = photoIndex;
  redraw();
  renderThumbs();
}

// Fills every panel with the selected photo, each panel cropped differently so one
// photo still reads as a multi-panel poster.
function fillAllPanelsWithSelectedPhoto() {
  if (state.photos.length === 0) return;
  const crops = [
    { zoom: 1.0, ox: 0, oy: -0.15 },
    { zoom: 1.6, ox: -0.4, oy: 0.3 },
    { zoom: 2.1, ox: 0.45, oy: -0.5 },
  ];
  state.panels = state.panels.map((panel, i) => ({
    ...panel,
    photo: state.selectedPhoto,
    ...crops[i % crops.length],
  }));
  redraw();
}

async function loadDemoPhotos() {
  for (const demo of DEMO_PHOTOS) {
    if (state.photos.some((photo) => photo.src === demo.src)) continue;
    try {
      const img = await loadImage(demo.src);
      state.photos.push({ img, name: demo.name, src: demo.src, thumb: demo.src });
    } catch {
      status.textContent = `Could not load the demo photo ${demo.name}.`;
    }
  }
  renderThumbs();
  redraw();
}

async function addUploadedPhotos(files) {
  let added = false;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ img, name: file.name, src: url, thumb: url });
      state.selectedPhoto = state.photos.length - 1;
      state.panels[state.selectedPanel].photo = state.selectedPhoto;
      added = true;
    } catch {
      URL.revokeObjectURL(url);
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  if (added) {
    renderThumbs();
    redraw();
  }
}

function buildPanelTabs() {
  const tabs = document.getElementById('panelTabs');
  PANEL_NAMES.forEach((name, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.textContent = name;
    button.addEventListener('click', () => {
      state.selectedPanel = i;
      redraw();
    });
    tabs.appendChild(button);
  });
}

function buildGradePick() {
  const pick = document.getElementById('gradePick');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.grade = key;
    const swatch = document.createElement('span');
    swatch.className = `swatch swatch-${key}`;
    button.append(swatch, grade.label);
    button.addEventListener('click', () => setGrade(key));
    pick.appendChild(button);
  });
  syncGradePick();
}

function syncGradePick() {
  document.querySelectorAll('#gradePick button').forEach((button) => {
    const on = button.dataset.grade === state.grade;
    button.setAttribute('aria-checked', String(on));
    button.classList.toggle('active', on);
  });
}

function setGrade(key) {
  state.grade = key;
  syncGradePick();
  redraw();
}

function buildSizePick() {
  const pick = document.getElementById('sizePick');
  Object.entries(COVER_SIZES).forEach(([key, size]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.size = key;
    const dims = document.createElement('strong');
    dims.textContent = size.label;
    const shape = document.createElement('span');
    shape.className = 'size-shape';
    shape.textContent = size.shape;
    button.append(dims, shape);
    button.addEventListener('click', () => setSize(key));
    pick.appendChild(button);
  });
  syncSizePick();
}

function syncSizePick() {
  document.querySelectorAll('#sizePick button').forEach((button) => {
    const on = button.dataset.size === state.size;
    button.setAttribute('aria-checked', String(on));
    button.classList.toggle('active', on);
  });
}

function setSize(key) {
  state.size = key;
  syncSizePick();
  redraw();
}

// Renders the cover at full export size and downloads it as a PNG. Returns the
// file name once the download has started.
export async function exportCoverPNG() {
  const size = COVER_SIZES[state.size];
  const fileName = `vice-cover-${size.width}x${size.height}.png`;
  await document.fonts.ready;
  const offscreen = document.createElement('canvas');
  offscreen.width = size.width;
  offscreen.height = size.height;
  drawCover(offscreen, state);
  const blob = await new Promise((resolve) => offscreen.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  status.textContent = `Saved ${fileName}`;
  return fileName;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// How wide and tall the selected panel's photo is drawn, in canvas pixels: dragging
// moves the photo by the pointer's own distance, so the offsets follow from it.
function drawnPhotoSize() {
  const rect = lastLayout.panels[state.selectedPanel];
  const placement = state.panels[state.selectedPanel];
  const photo = state.photos[placement.photo];
  if (!photo) return { dw: rect.w, dh: rect.h };
  const scale =
    Math.max(rect.w / photo.img.naturalWidth, rect.h / photo.img.naturalHeight) * placement.zoom;
  return { dw: photo.img.naturalWidth * scale, dh: photo.img.naturalHeight * scale };
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(lastLayout, point.x, point.y);
  if (hit === -1) return;
  state.selectedPanel = hit;
  const placement = state.panels[hit];
  drag = { x: point.x, y: point.y, ox: placement.ox, oy: placement.oy };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const rect = lastLayout.panels[state.selectedPanel];
  const { dw, dh } = drawnPhotoSize();
  const placement = state.panels[state.selectedPanel];
  if (dw > rect.w) {
    placement.ox = Math.max(-1, Math.min(1, drag.ox + (2 * (point.x - drag.x)) / (dw - rect.w)));
  }
  if (dh > rect.h) {
    placement.oy = Math.max(-1, Math.min(1, drag.oy + (2 * (point.y - drag.y)) / (dh - rect.h)));
  }
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const hit = panelAt(lastLayout, point.x, point.y);
  if (hit !== -1) state.selectedPanel = hit;
  const placement = state.panels[state.selectedPanel];
  placement.zoom = Math.max(1, Math.min(3, placement.zoom * Math.exp(-event.deltaY * 0.0012)));
  redraw();
}, { passive: false });

document.getElementById('photoFiles').addEventListener('change', (event) => {
  addUploadedPhotos(event.target.files);
  event.target.value = '';
});
const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');
  addUploadedPhotos(event.dataTransfer.files);
});
document.getElementById('useDemos').addEventListener('click', loadDemoPhotos);
document.getElementById('fillAll').addEventListener('click', fillAllPanelsWithSelectedPhoto);
document.getElementById('resetCrop').addEventListener('click', () => {
  state.panels[state.selectedPanel] = {
    ...state.panels[state.selectedPanel],
    zoom: 1,
    ox: 0,
    oy: 0,
  };
  redraw();
});
document.getElementById('zoom').addEventListener('input', (event) => {
  state.panels[state.selectedPanel].zoom = Number(event.target.value);
  redraw();
});
document.getElementById('offsetX').addEventListener('input', (event) => {
  state.panels[state.selectedPanel].ox = Number(event.target.value);
  redraw();
});
document.getElementById('offsetY').addEventListener('input', (event) => {
  state.panels[state.selectedPanel].oy = Number(event.target.value);
  redraw();
});
document.getElementById('title').addEventListener('input', (event) => {
  state.title = event.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (event) => {
  state.subtitle = event.target.value;
  redraw();
});
document.getElementById('export').addEventListener('click', () => {
  exportCoverPNG().catch(() => {
    status.textContent = 'Export failed — please try again.';
  });
});

buildPanelTabs();
buildGradePick();
buildSizePick();
renderThumbs();

// The display font loads after the first paint; redraw once it is ready so the
// lettering on the preview is the real Anton.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => redraw());
}

// Handle for screenshot automation and for the finalist review's own checks.
window.__viceCover = { state, redraw, exportCoverPNG, setSize, setGrade };

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadDemos: loadDemoPhotos,
    setSize,
    setGrade,
    setCaption: (title, subtitle) => {
      state.title = title;
      state.subtitle = subtitle;
      document.getElementById('title').value = title;
      document.getElementById('subtitle').value = subtitle;
    },
    redraw,
  });
} else {
  loadDemoPhotos();
  redraw();
}
