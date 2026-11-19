// Vice Cover Studio — a GTA 6-style poster maker that runs fully offline.
// Photos are read on the user's own machine and never uploaded anywhere.

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const previewWrap = document.getElementById('previewWrap');
const previewHint = document.getElementById('previewHint');
const selectedPanelLabel = document.getElementById('selectedPanelLabel');
const statusLine = document.getElementById('statusLine');
const photoListEl = document.getElementById('photoList');
const zoomRange = document.getElementById('zoomRange');

const FONT_FAMILY = '"Anton", "Arial Black", sans-serif';

// Panel layouts in normalized cover coordinates (x, y, w, h, rotation in degrees).
// The hero layout has one large panel and two small ones; the strip has three
// upright panels; the grid has four panels with one tilted.
const LAYOUTS = {
  hero: [
    { x: 0.02, y: 0.02, w: 0.6, h: 0.96, rot: -1.5 },
    { x: 0.65, y: 0.02, w: 0.33, h: 0.47, rot: 1.2 },
    { x: 0.65, y: 0.51, w: 0.33, h: 0.47, rot: -1 },
  ],
  strip: [
    { x: 0.02, y: 0.05, w: 0.3, h: 0.9, rot: -1 },
    { x: 0.34, y: 0.02, w: 0.32, h: 0.96, rot: 0 },
    { x: 0.68, y: 0.05, w: 0.3, h: 0.9, rot: 1.5 },
  ],
  grid: [
    { x: 0.02, y: 0.02, w: 0.47, h: 0.47, rot: -1 },
    { x: 0.51, y: 0.02, w: 0.47, h: 0.47, rot: 1 },
    { x: 0.02, y: 0.51, w: 0.47, h: 0.47, rot: 1.2 },
    { x: 0.51, y: 0.51, w: 0.47, h: 0.47, rot: -2.5 },
  ],
};

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

let photoSeq = 0;

const state = {
  photos: [],
  layout: 'hero',
  selected: -1,
  panelsByLayout: {},
  caption: 'VICE CITY',
  tagline: 'STREETS OF THE SUN',
  captionSize: 96,
  captionColor: '#ffffff',
  captionPos: 'bottom',
  grade: 'sunset',
  gradeStrength: 0.7,
  halftone: true,
  exportSize: '1080x1080',
};

function panelsFor(layout) {
  if (!state.panelsByLayout[layout]) {
    state.panelsByLayout[layout] = LAYOUTS[layout].map(() => ({
      photoId: state.photos.length > 0 ? state.photos[0].id : null,
      zoom: 1,
      ox: 0,
      oy: 0,
      fit: 'fill',
    }));
  }
  return state.panelsByLayout[layout];
}

function currentPanels() {
  return panelsFor(state.layout);
}

function photoById(id) {
  return state.photos.find((p) => p.id === id) || null;
}

function setStatus(text) {
  statusLine.textContent = text;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => { statusLine.textContent = ''; }, 4000);
}

// ---------------------------------------------------------------- drawing

function panelRect(def, W, H) {
  return { x: def.x * W, y: def.y * H, w: def.w * W, h: def.h * H, rot: def.rot };
}

function drawPhotoInto(c, img, rect, panel) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let scale = panel.fit === 'fit'
    ? Math.min(rect.w / iw, rect.h / ih)
    : Math.max(rect.w / iw, rect.h / ih);
  scale *= panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
  c.drawImage(img, dx, dy, dw, dh);
}

function gradeOverlay(c, rect, grade, strength) {
  if (grade === 'none' || strength <= 0) return;
  const { x, y, w, h } = rect;
  c.save();
  if (grade === 'sunset') {
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(255, 140, 40, ${0.34 * strength})`);
    g.addColorStop(0.55, `rgba(255, 80, 120, ${0.26 * strength})`);
    g.addColorStop(1, `rgba(120, 40, 170, ${0.36 * strength})`);
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = `rgba(255, 120, 40, ${0.25 * strength})`;
    c.fillRect(x, y, w, h);
  } else if (grade === 'neon') {
    const glow = c.createRadialGradient(x + w * 0.2, y + h * 0.15, 0, x + w * 0.2, y + h * 0.15, w * 0.9);
    glow.addColorStop(0, `rgba(55, 230, 255, ${0.52 * strength})`);
    glow.addColorStop(1, 'rgba(55, 230, 255, 0)');
    c.globalCompositeOperation = 'screen';
    c.fillStyle = glow;
    c.fillRect(x, y, w, h);
    const glow2 = c.createRadialGradient(x + w * 0.85, y + h * 0.85, 0, x + w * 0.85, y + h * 0.85, w * 0.9);
    glow2.addColorStop(0, `rgba(255, 94, 168, ${0.54 * strength})`);
    glow2.addColorStop(1, 'rgba(255, 94, 168, 0)');
    c.fillStyle = glow2;
    c.fillRect(x, y, w, h);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = `rgba(10, 10, 60, ${0.26 * strength})`;
    c.fillRect(x, y, w, h);
  }
  c.restore();
}

function halftonePattern(c, W, H) {
  const tile = document.createElement('canvas');
  tile.width = 14;
  tile.height = 14;
  const t = tile.getContext('2d');
  t.fillStyle = 'rgba(0, 0, 0, 0.55)';
  t.beginPath();
  t.arc(7, 7, 2.1, 0, Math.PI * 2);
  t.fill();
  const pattern = c.createPattern(tile, 'repeat');
  c.save();
  c.globalAlpha = 0.16;
  c.fillStyle = pattern;
  c.fillRect(0, 0, W, H);
  c.restore();
}

function drawCaption(c, W, H) {
  const caption = state.caption.trim().toUpperCase();
  const tagline = state.tagline.trim().toUpperCase();
  if (!caption && !tagline) return;
  const base = (state.captionSize * W) / 1080;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (typeof c.letterSpacing !== 'undefined') c.letterSpacing = `${Math.round(base * 0.04)}px`;

  let size = base;
  c.font = `${size}px ${FONT_FAMILY}`;
  // A diagonal caption swings wider than its flat width, so leave it more room.
  const maxWidth = state.captionPos === 'diagonal' ? W * 0.86 : W * 0.92;
  while (size > 24 && c.measureText(caption).width > maxWidth) {
    size *= 0.92;
    c.font = `${size}px ${FONT_FAMILY}`;
  }
  const tagSize = Math.max(16, size * 0.26);
  const bandH = size * 1.9 + (tagline ? tagSize * 1.6 : 0);

  if (state.captionPos === 'diagonal') {
    c.translate(W / 2, H / 2);
    c.rotate((-5 * Math.PI) / 180);
    c.translate(-W / 2, -H / 2);
    drawCaptionLines(c, caption, tagline, W / 2, H / 2 - size * 0.2, size, tagSize);
  } else if (state.captionPos === 'top') {
    c.fillStyle = 'rgba(8, 4, 18, 0.62)';
    c.fillRect(0, 0, W, bandH);
    drawCaptionLines(c, caption, tagline, W / 2, bandH / 2 - (tagline ? tagSize * 0.4 : 0), size, tagSize);
  } else {
    c.fillStyle = 'rgba(8, 4, 18, 0.62)';
    c.fillRect(0, H - bandH, W, bandH);
    drawCaptionLines(c, caption, tagline, W / 2, H - bandH / 2 - (tagline ? tagSize * 0.4 : 0), size, tagSize);
  }
  c.restore();
}

function drawCaptionLines(c, caption, tagline, cx, cy, size, tagSize) {
  c.font = `${size}px ${FONT_FAMILY}`;
  c.lineWidth = Math.max(4, size * 0.16);
  c.lineJoin = 'round';
  c.strokeStyle = '#12081f';
  c.strokeText(caption, cx, cy);
  c.fillStyle = state.captionColor;
  c.fillText(caption, cx, cy);
  if (tagline) {
    c.font = `bold ${tagSize}px "Segoe UI", system-ui, sans-serif`;
    c.lineWidth = Math.max(2, tagSize * 0.14);
    c.strokeText(tagline, cx, cy + size * 0.72);
    c.fillStyle = '#ffd400';
    c.fillText(tagline, cx, cy + size * 0.72);
  }
}

function drawCover(c, W, H) {
  // Backdrop: a deep violet gradient so empty panels still look designed.
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#241a3d');
  bg.addColorStop(0.55, '#160d26');
  bg.addColorStop(1, '#0a0616');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  const defs = LAYOUTS[state.layout];
  const panels = currentPanels();
  const gap = Math.max(6, W * 0.008);

  defs.forEach((def, i) => {
    const rect = panelRect(def, W, H);
    const panel = panels[i];
    const photo = panel && panel.photoId !== null ? photoById(panel.photoId) : null;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    c.save();
    c.translate(cx, cy);
    c.rotate((rect.rot * Math.PI) / 180);
    c.translate(-cx, -cy);
    // Drop shadow behind the panel.
    c.fillStyle = 'rgba(0, 0, 0, 0.45)';
    c.fillRect(rect.x + gap * 0.5, rect.y + gap * 0.7, rect.w, rect.h);
    c.beginPath();
    c.rect(rect.x, rect.y, rect.w, rect.h);
    c.clip();
    if (photo) {
      drawPhotoInto(c, photo.img, rect, panel);
      gradeOverlay(c, rect, state.grade, state.gradeStrength);
    } else {
      c.fillStyle = '#2b2344';
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      c.lineWidth = Math.max(2, W * 0.002);
      c.setLineDash([W * 0.012, W * 0.008]);
      c.strokeRect(rect.x + gap, rect.y + gap, rect.w - gap * 2, rect.h - gap * 2);
      c.setLineDash([]);
      c.fillStyle = 'rgba(255, 255, 255, 0.55)';
      c.font = `bold ${Math.round(W * 0.03)}px "Segoe UI", system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`PANEL ${i + 1}`, cx, cy);
    }
    c.restore();
    // White poster border around the panel, drawn unrotated over the edge.
    c.save();
    c.translate(cx, cy);
    c.rotate((rect.rot * Math.PI) / 180);
    c.translate(-cx, -cy);
    c.strokeStyle = '#ffffff';
    c.lineWidth = Math.max(3, W * 0.006);
    c.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (state.selected === i) {
      c.strokeStyle = '#37e6ff';
      c.lineWidth = Math.max(4, W * 0.008);
      c.setLineDash([W * 0.02, W * 0.012]);
      c.strokeRect(rect.x - gap, rect.y - gap, rect.w + gap * 2, rect.h + gap * 2);
      c.setLineDash([]);
    }
    c.restore();
  });

  if (state.halftone) halftonePattern(c, W, H);

  // Vignette: darker corners pull the eye to the middle of the poster.
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  // Thin frame around the whole cover.
  c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  c.lineWidth = Math.max(3, W * 0.004);
  c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth);

  drawCaption(c, W, H);
}

function renderPreview() {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h);
  previewHint.style.display = state.photos.length === 0 ? 'block' : 'none';
  updateSelectedLabel();
}

function updateSelectedLabel() {
  const panels = currentPanels();
  if (state.selected < 0 || !panels[state.selected]) {
    selectedPanelLabel.textContent = 'No panel selected — click a panel to move its photo';
    return;
  }
  const panel = panels[state.selected];
  const photo = panel.photoId !== null ? photoById(panel.photoId) : null;
  selectedPanelLabel.textContent = `Panel ${state.selected + 1} of ${panels.length} — ${photo ? photo.name : 'empty'} · zoom ${Math.round(panel.zoom * 100)}%`;
  zoomRange.value = String(Math.round(panel.zoom * 100));
}

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  window.requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

// ---------------------------------------------------------------- photos

function addPhoto(img, name, src) {
  const photo = { id: ++photoSeq, name, img, src };
  state.photos.push(photo);
  for (const layout of Object.keys(LAYOUTS)) {
    const panels = panelsFor(layout);
    panels.forEach((panel) => {
      if (panel.photoId === null) panel.photoId = photo.id;
    });
  }
  renderPhotoList();
  requestRender();
  return photo;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => reject(new Error(`Could not read ${file.name}`));
    img.src = url;
  });
}

function loadSample(path, name) {
  const img = new Image();
  img.onload = () => {
    addPhoto(img, name, path);
    setStatus(`${name} loaded — pick a layout and export`);
  };
  img.onerror = () => setStatus(`Could not load sample ${name}`);
  img.src = path;
}

function renderPhotoList() {
  photoListEl.innerHTML = '';
  state.photos.forEach((photo) => {
    const li = document.createElement('li');
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = photo.name;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = photo.name;
    const allBtn = document.createElement('button');
    allBtn.className = 'btn small';
    allBtn.type = 'button';
    allBtn.textContent = 'All panels';
    allBtn.addEventListener('click', () => {
      for (const layout of Object.keys(LAYOUTS)) {
        panelsFor(layout).forEach((panel) => { panel.photoId = photo.id; });
      }
      requestRender();
      setStatus(`${photo.name} fills every panel`);
    });
    const oneBtn = document.createElement('button');
    oneBtn.className = 'btn small';
    oneBtn.type = 'button';
    oneBtn.textContent = 'Selected';
    oneBtn.addEventListener('click', () => {
      if (state.selected < 0) {
        setStatus('Click a panel first, then use Selected');
        return;
      }
      currentPanels()[state.selected].photoId = photo.id;
      requestRender();
    });
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn small';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${photo.name}`);
    removeBtn.addEventListener('click', () => {
      state.photos = state.photos.filter((p) => p.id !== photo.id);
      for (const layout of Object.keys(LAYOUTS)) {
        panelsFor(layout).forEach((panel) => {
          if (panel.photoId === photo.id) panel.photoId = state.photos.length > 0 ? state.photos[0].id : null;
        });
      }
      renderPhotoList();
      requestRender();
    });
    li.append(thumb, name, allBtn, oneBtn, removeBtn);
    photoListEl.append(li);
  });
}

// ---------------------------------------------------------------- export

function exportCover() {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const c = out.getContext('2d');
  drawCover(c, w, h);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — please try again');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${state.exportSize}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${state.exportSize} PNG`);
  }, 'image/png');
}

// ---------------------------------------------------------------- panel picking and dragging

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitPanel(point) {
  const [W, H] = EXPORT_SIZES[state.exportSize];
  const defs = LAYOUTS[state.layout];
  for (let i = defs.length - 1; i >= 0; i--) {
    const rect = panelRect(defs[i], W, H);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const angle = (-rect.rot * Math.PI) / 180;
    const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (Math.abs(lx) <= rect.w / 2 && Math.abs(ly) <= rect.h / 2) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const index = hitPanel(point);
  state.selected = index;
  if (index >= 0) {
    const panel = currentPanels()[index];
    drag = { x: point.x, y: point.y, ox: panel.ox, oy: panel.oy, moved: false };
    canvas.setPointerCapture(event.pointerId);
  }
  requestRender();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag || state.selected < 0) return;
  const [W, H] = EXPORT_SIZES[state.exportSize];
  const rect = panelRect(LAYOUTS[state.layout][state.selected], W, H);
  const point = canvasPoint(event);
  const dx = (point.x - drag.x) / rect.w;
  const dy = (point.y - drag.y) / rect.h;
  if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) drag.moved = true;
  const panel = currentPanels()[state.selected];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + dx));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + dy));
  requestRender();
});

canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

canvas.addEventListener('wheel', (event) => {
  if (state.selected < 0) return;
  event.preventDefault();
  const panel = currentPanels()[state.selected];
  panel.zoom = Math.max(0.5, Math.min(3, panel.zoom * (1 - event.deltaY * 0.001)));
  requestRender();
}, { passive: false });

// ---------------------------------------------------------------- controls wiring

function wireSegment(id, attr, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;
    seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    apply(btn.getAttribute(attr));
  });
}

wireSegment('layoutSeg', 'data-layout', (layout) => {
  state.layout = layout;
  state.selected = -1;
  requestRender();
});

wireSegment('fitSeg', 'data-fit', (fit) => {
  if (state.selected < 0) return;
  currentPanels()[state.selected].fit = fit;
  requestRender();
});

wireSegment('captionPosSeg', 'data-pos', (pos) => {
  state.captionPos = pos;
  requestRender();
});

wireSegment('gradeSeg', 'data-grade', (grade) => {
  state.grade = grade;
  requestRender();
});

wireSegment('exportSizeSeg', 'data-size', (size) => {
  state.exportSize = size;
  requestRender();
});

wireSegment('captionColors', 'data-color', (color) => {
  state.captionColor = color;
  requestRender();
});

zoomRange.addEventListener('input', () => {
  if (state.selected < 0) return;
  currentPanels()[state.selected].zoom = Number(zoomRange.value) / 100;
  requestRender();
});

document.getElementById('centerPanelBtn').addEventListener('click', () => {
  if (state.selected < 0) return;
  const panel = currentPanels()[state.selected];
  panel.ox = 0;
  panel.oy = 0;
  panel.zoom = 1;
  requestRender();
});

document.getElementById('captionText').addEventListener('input', (event) => {
  state.caption = event.target.value;
  requestRender();
});

document.getElementById('taglineText').addEventListener('input', (event) => {
  state.tagline = event.target.value;
  requestRender();
});

document.getElementById('captionSize').addEventListener('input', (event) => {
  state.captionSize = Number(event.target.value);
  requestRender();
});

document.getElementById('gradeStrength').addEventListener('input', (event) => {
  state.gradeStrength = Number(event.target.value) / 100;
  requestRender();
});

document.getElementById('halftoneCheck').addEventListener('change', (event) => {
  state.halftone = event.target.checked;
  requestRender();
});

document.getElementById('loadPhotoBtn').addEventListener('click', () => {
  document.getElementById('photoFile').click();
});

document.getElementById('photoFile').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      const { img, url } = await loadImageFile(file);
      addPhoto(img, file.name, url);
    } catch (err) {
      setStatus(err.message);
    }
  }
  event.target.value = '';
});

document.getElementById('sampleBoulevard').addEventListener('click', () => {
  loadSample('samples/boulevard.jpg', 'Boulevard.jpg');
});

document.getElementById('samplePier').addEventListener('click', () => {
  loadSample('samples/pier.jpg', 'Pier.jpg');
});

document.getElementById('exportBtn').addEventListener('click', exportCover);

// Drag and drop a photo straight onto the preview.
previewWrap.addEventListener('dragover', (event) => {
  event.preventDefault();
  previewWrap.classList.add('dragging');
});
previewWrap.addEventListener('dragleave', () => previewWrap.classList.remove('dragging'));
previewWrap.addEventListener('drop', async (event) => {
  event.preventDefault();
  previewWrap.classList.remove('dragging');
  const files = [...event.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    try {
      const { img, url } = await loadImageFile(file);
      addPhoto(img, file.name, url);
    } catch (err) {
      setStatus(err.message);
    }
  }
});

// A small handle for automated checks: state, a fresh render and an export.
window.coverStudio = {
  state,
  renderPreview,
  exportCover,
  drawCover,
};

// Load the display font first so the first paint already has poster lettering.
if (document.fonts) {
  document.fonts.load('96px "Anton"').catch(() => {}).finally(() => requestRender());
}
requestRender();
