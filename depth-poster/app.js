// ============================================
// DEPTH POSTER — Main Application
// ============================================

// --- STATE ---
const state = {
  originalImageUrl: null,
  originalImage: null,      // HTMLImageElement (full photo)
  subjectImage: null,        // HTMLImageElement (extracted subject, transparent)
  characters: [],            // Array of CharacterObject
  selectedCharId: null,
  inputText: 'DEPTH',
  globalFont: 'Hahmlet',
  globalFontFamily: "'Hahmlet', serif",
  globalColor: '#FFFFFF',
  globalFontSize: 200,
  canvasWidth: 1080,
  canvasHeight: 1350,
  isExtracting: false,
};

// --- FONT MAP ---
const FONT_MAP = {
  'Pretendard': "Pretendard, -apple-system, sans-serif",
  'Noto Sans KR': "'Noto Sans KR', sans-serif",
  'SUIT': "'SUIT', sans-serif",
  'IBM Plex Sans KR': "'IBM Plex Sans KR', sans-serif",
  'GmarketSans': "'GmarketSans', sans-serif",
  'Noto Serif KR': "'Noto Serif KR', serif",
  'Nanum Myeongjo': "'Nanum Myeongjo', serif",
  'Gowun Batang': "'Gowun Batang', serif",
  'Hahmlet': "'Hahmlet', serif",
  'Song Myung': "'Song Myung', serif",
};

// --- KONVA ---
let stage, bgLayer, behindTextLayer, subjectLayer, aboveTextLayer, transformerLayer;
let bgImageNode, subjectImageNode, transformer;
let displayScale = 1;

// --- DOM ---
const $ = (id) => document.getElementById(id);
const uploadZone = $('upload-zone');
const imageInput = $('image-upload');
const extractionStatus = $('extraction-status');
const textInput = $('text-input');
const fontSelect = $('font-select');
const colorPicker = $('color-picker');
const hexInput = $('hex-input');
const sizeSlider = $('size-slider');
const sizeDisplay = $('size-display');
const btnApplyText = $('btn-apply-text');
const btnApplySelected = $('btn-apply-selected');
const btnApplyAll = $('btn-apply-all');
const btnSendBehind = $('btn-send-behind');
const btnBringAbove = $('btn-bring-above');
const btnExport = $('btn-export');
const emptyState = $('empty-state');
const charList = $('char-list');
const charCount = $('char-count');
const canvasArea = $('canvas-area');
const konvaContainer = $('konva-container');
const appLoader = $('app-loader');
const loaderBar = $('loader-bar');
const toastContainer = $('toast-container');

// --- INIT ---
function init() {
  // Hide loader immediately (no AI preload needed until image upload)
  setTimeout(() => {
    loaderBar.style.width = '100%';
    setTimeout(() => appLoader.classList.add('hidden'), 300);
  }, 500);

  setupKonva();
  setupEventListeners();
  renderCharList();
  textInput.value = state.inputText;
}

// --- KONVA SETUP ---
function setupKonva() {
  const container = canvasArea;
  const padding = 60;
  const maxH = container.clientHeight - padding * 2;
  const maxW = container.clientWidth - padding * 2;
  displayScale = Math.min(maxW / state.canvasWidth, maxH / state.canvasHeight, 1);

  const w = Math.floor(state.canvasWidth * displayScale);
  const h = Math.floor(state.canvasHeight * displayScale);

  stage = new Konva.Stage({
    container: 'konva-container',
    width: w,
    height: h,
    scaleX: displayScale,
    scaleY: displayScale,
  });

  bgLayer = new Konva.Layer();
  behindTextLayer = new Konva.Layer();
  subjectLayer = new Konva.Layer();
  aboveTextLayer = new Konva.Layer();
  transformerLayer = new Konva.Layer();

  stage.add(bgLayer);
  stage.add(behindTextLayer);
  stage.add(subjectLayer);
  stage.add(aboveTextLayer);
  stage.add(transformerLayer);

  // Background rect
  const bgRect = new Konva.Rect({
    x: 0, y: 0,
    width: state.canvasWidth,
    height: state.canvasHeight,
    fill: '#1a1a1e',
  });
  bgLayer.add(bgRect);

  // Transformer
  transformer = new Konva.Transformer({
    borderStroke: '#c8ff00',
    borderStrokeWidth: 1.5,
    anchorStroke: '#c8ff00',
    anchorFill: '#111',
    anchorSize: 8,
    anchorCornerRadius: 2,
    rotateAnchorOffset: 25,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    boundBoxFunc: (oldBox, newBox) => {
      if (newBox.width < 10 || newBox.height < 10) return oldBox;
      return newBox;
    },
  });
  transformerLayer.add(transformer);

  // Click on empty space to deselect
  stage.on('click tap', (e) => {
    if (e.target === stage || e.target.getClassName() === 'Rect' || e.target === bgImageNode || e.target === subjectImageNode) {
      selectChar(null);
    }
  });

  bgLayer.draw();
}

// --- RESIZE ---
function handleResize() {
  if (!stage) return;
  const container = canvasArea;
  const padding = 60;
  const maxH = container.clientHeight - padding * 2;
  const maxW = container.clientWidth - padding * 2;
  displayScale = Math.min(maxW / state.canvasWidth, maxH / state.canvasHeight, 1);

  const w = Math.floor(state.canvasWidth * displayScale);
  const h = Math.floor(state.canvasHeight * displayScale);

  stage.width(w);
  stage.height(h);
  stage.scaleX(displayScale);
  stage.scaleY(displayScale);
  stage.batchDraw();
}

// --- IMAGE UPLOAD ---
async function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;

  // Show canvas, hide empty state
  emptyState.classList.add('hidden');

  // Load original image
  const url = URL.createObjectURL(file);
  state.originalImageUrl = url;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.originalImage = img;
    drawBackground(img);
    // Show thumbnail in upload zone
    showUploadThumb(url);
    // Start extraction
    extractSubject(file);
  };
  img.src = url;
}

function drawBackground(img) {
  if (bgImageNode) bgImageNode.destroy();

  // Cover fit
  const scale = Math.max(state.canvasWidth / img.width, state.canvasHeight / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (state.canvasWidth - w) / 2;
  const y = (state.canvasHeight - h) / 2;

  bgImageNode = new Konva.Image({
    image: img,
    x, y,
    width: w, height: h,
    listening: false,
  });

  // Remove old bg rect, add image
  bgLayer.destroyChildren();
  bgLayer.add(bgImageNode);
  bgLayer.draw();
}

function drawSubject(img) {
  if (subjectImageNode) subjectImageNode.destroy();

  // Same positioning as background
  const origImg = state.originalImage;
  const scale = Math.max(state.canvasWidth / origImg.width, state.canvasHeight / origImg.height);
  const w = origImg.width * scale;
  const h = origImg.height * scale;
  const x = (state.canvasWidth - w) / 2;
  const y = (state.canvasHeight - h) / 2;

  subjectImageNode = new Konva.Image({
    image: img,
    x, y,
    width: w, height: h,
    listening: false,
  });

  subjectLayer.destroyChildren();
  subjectLayer.add(subjectImageNode);
  subjectLayer.draw();
}

function showUploadThumb(url) {
  uploadZone.classList.add('has-image');
  const existing = uploadZone.querySelector('.upload-thumb');
  if (existing) existing.remove();
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.className = 'upload-thumb';
  uploadZone.insertBefore(thumb, uploadZone.firstChild);
  uploadZone.querySelector('.upload-text').textContent = 'Change image';
}

// --- SUBJECT EXTRACTION ---
async function extractSubject(file) {
  state.isExtracting = true;
  extractionStatus.classList.add('visible');
  extractionStatus.classList.remove('error');
  extractionStatus.querySelector('span').textContent = 'Loading AI model... (first time ~40MB download)';

  try {
    // Dynamic ESM import from jsdelivr (official recommended approach)
    const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
    const removeBackground = module.removeBackground || module.default;
    
    extractionStatus.querySelector('span').textContent = 'Extracting subject...';
    console.log('removeBackground function loaded, starting extraction...');
    
    const blob = await removeBackground(file);
    console.log('Background removal succeeded, blob size:', blob.size);

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.subjectImage = img;
      drawSubject(img);
      extractionStatus.classList.remove('visible');
      showToast('Subject extracted successfully!', 'success');
    };
    img.onerror = () => {
      console.error('Failed to load extracted subject image');
      extractionStatus.querySelector('span').textContent = 'Failed to load result image.';
      extractionStatus.classList.add('error');
    };
    img.src = url;
  } catch (err) {
    console.error('Extraction failed:', err);
    extractionStatus.querySelector('span').textContent = 'Extraction failed. Text layers still work.';
    extractionStatus.classList.add('error');
    showToast('Subject extraction failed: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    state.isExtracting = false;
  }
}

// --- TEXT / CHARACTERS ---
let charIdCounter = 0;

function generateCharId() {
  return 'char_' + (++charIdCounter);
}

function applyText() {
  const text = textInput.value.trim();
  if (!text) return;

  // Remove old characters from canvas
  state.characters.forEach(c => {
    if (c.konvaNode) c.konvaNode.destroy();
  });

  state.characters = [];
  state.selectedCharId = null;
  transformer.nodes([]);

  const chars = Array.from(text);
  const fontSize = state.globalFontSize;

  // Calculate layout: center chars across canvas with wrapping
  const charSpacing = fontSize * 0.05;
  const lineHeight = fontSize * 1.1;
  const maxWidth = state.canvasWidth - 60; // padding

  // Measure rough char widths
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  chars.forEach((ch) => {
    const cw = ch === ' ' ? fontSize * 0.3 : fontSize * 0.7;
    if (currentWidth + cw > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
    currentLine.push({ ch, width: cw });
    currentWidth += cw + charSpacing;
  });
  if (currentLine.length > 0) lines.push(currentLine);

  // Total text block height
  const totalHeight = lines.length * lineHeight;
  const startY = (state.canvasHeight - totalHeight) / 2;

  let charIndex = 0;
  lines.forEach((line, lineIdx) => {
    const lineW = line.reduce((s, c) => s + c.width + charSpacing, -charSpacing);
    let x = (state.canvasWidth - lineW) / 2;
    const y = startY + lineIdx * lineHeight;

    line.forEach((item) => {
      const charObj = {
        id: generateCharId(),
        char: item.ch,
        x: x,
        y: y,
        fontFamily: state.globalFont,
        fontFamilyCSS: state.globalFontFamily,
        fontSize: fontSize,
        color: state.globalColor,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        // Alternate behind/above for visual effect
        layerMode: charIndex % 2 === 0 ? 'aboveSubject' : 'behindSubject',
        konvaNode: null,
      };
      state.characters.push(charObj);
      x += item.width + charSpacing;
      charIndex++;
    });
  });

  renderAllChars();
  renderCharList();
}

function renderAllChars() {
  behindTextLayer.destroyChildren();
  aboveTextLayer.destroyChildren();

  state.characters.forEach(c => {
    const targetLayer = c.layerMode === 'behindSubject' ? behindTextLayer : aboveTextLayer;
    const node = createCharNode(c);
    targetLayer.add(node);
    c.konvaNode = node;
  });

  behindTextLayer.draw();
  aboveTextLayer.draw();
  transformerLayer.draw();

  // Re-attach transformer if something was selected
  if (state.selectedCharId) {
    const ch = state.characters.find(c => c.id === state.selectedCharId);
    if (ch && ch.konvaNode) {
      transformer.nodes([ch.konvaNode]);
      transformerLayer.draw();
    }
  }
}

function createCharNode(charObj) {
  const node = new Konva.Text({
    id: charObj.id,
    text: charObj.char,
    x: charObj.x,
    y: charObj.y,
    fontSize: charObj.fontSize,
    fontFamily: charObj.fontFamilyCSS,
    fill: charObj.color,
    rotation: charObj.rotation,
    scaleX: charObj.scaleX,
    scaleY: charObj.scaleY,
    draggable: true,
    fontStyle: 'bold',
  });

  node.on('click tap', (e) => {
    e.cancelBubble = true;
    selectChar(charObj.id);
  });

  node.on('dragend', () => {
    charObj.x = node.x();
    charObj.y = node.y();
  });

  node.on('transformend', () => {
    charObj.x = node.x();
    charObj.y = node.y();
    charObj.rotation = node.rotation();
    charObj.scaleX = node.scaleX();
    charObj.scaleY = node.scaleY();
    renderCharList();
  });

  return node;
}

function selectChar(id) {
  state.selectedCharId = id;
  if (id) {
    const ch = state.characters.find(c => c.id === id);
    if (ch && ch.konvaNode) {
      transformer.nodes([ch.konvaNode]);
    }
  } else {
    transformer.nodes([]);
  }
  transformerLayer.draw();
  renderCharList();
}

function setCharLayer(id, mode) {
  const ch = state.characters.find(c => c.id === id);
  if (!ch) return;
  if (ch.layerMode === mode) return;

  ch.layerMode = mode;
  renderAllChars();
  renderCharList();
}

// --- CHARACTER LIST (RIGHT SIDEBAR) ---
function renderCharList() {
  const count = state.characters.length;
  charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    charList.innerHTML = `
      <div class="char-list-empty">
        <p>No characters yet.</p>
        <p>Type text and press "Apply Text"</p>
      </div>`;
    return;
  }

  charList.innerHTML = state.characters.map(c => {
    const isSelected = c.id === state.selectedCharId;
    const displayChar = c.char === ' ' ? '␣' : c.char;
    const badgeClass = c.layerMode === 'behindSubject' ? 'badge-behind' : 'badge-above';
    const badgeText = c.layerMode === 'behindSubject' ? 'Behind' : 'Above';
    const sizeText = `${Math.round(c.fontSize * c.scaleX)}px`;

    return `
      <div class="char-item ${isSelected ? 'selected' : ''}" data-id="${c.id}">
        <div class="char-preview" style="font-family:${c.fontFamilyCSS};color:${c.color}">${displayChar}</div>
        <div class="char-info">
          <div class="char-info-name">${displayChar}</div>
          <div class="char-info-meta">${sizeText} · ${c.fontFamily}</div>
        </div>
        <span class="char-layer-badge ${badgeClass}">${badgeText}</span>
      </div>`;
  }).join('');

  // Click handlers
  charList.querySelectorAll('.char-item').forEach(el => {
    el.addEventListener('click', () => {
      selectChar(el.dataset.id);
    });
  });
}

// --- APPLY STYLES ---
function applyStyleToSelected() {
  const ch = state.characters.find(c => c.id === state.selectedCharId);
  if (!ch) {
    showToast('Select a character first', 'error');
    return;
  }
  applyStyleToChar(ch);
  renderAllChars();
  renderCharList();
}

function applyStyleToAll() {
  state.characters.forEach(ch => applyStyleToChar(ch));
  renderAllChars();
  renderCharList();
}

function applyStyleToChar(ch) {
  ch.fontFamily = state.globalFont;
  ch.fontFamilyCSS = state.globalFontFamily;
  ch.color = state.globalColor;
  ch.fontSize = state.globalFontSize;
  ch.scaleX = 1;
  ch.scaleY = 1;
}

// --- EXPORT ---
async function exportPoster() {
  if (state.characters.length === 0 && !state.originalImage) {
    showToast('Nothing to export', 'error');
    return;
  }

  // Deselect to hide transformer
  const prevSelected = state.selectedCharId;
  selectChar(null);

  // Wait a frame for transformer to disappear
  await new Promise(r => setTimeout(r, 50));

  try {
    // Export at full resolution
    const dataURL = stage.toDataURL({
      pixelRatio: state.canvasWidth / stage.width(),
      mimeType: 'image/png',
    });

    const link = document.createElement('a');
    link.download = 'depth-poster.png';
    link.href = dataURL;
    link.click();

    showToast('Poster exported!', 'success');
  } catch (err) {
    console.error('Export failed:', err);
    showToast('Export failed', 'error');
  }

  // Restore selection
  if (prevSelected) selectChar(prevSelected);
}

// --- TOAST ---
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Upload
  uploadZone.addEventListener('click', () => imageInput.click());
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
  });
  imageInput.addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
  });

  // Text
  btnApplyText.addEventListener('click', () => {
    state.inputText = textInput.value;
    applyText();
  });

  // Font
  fontSelect.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    state.globalFont = opt.value;
    state.globalFontFamily = opt.dataset.family || opt.value;
  });

  // Color
  colorPicker.addEventListener('input', (e) => {
    state.globalColor = e.target.value;
    hexInput.value = e.target.value.toUpperCase();
  });
  hexInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      state.globalColor = val;
      colorPicker.value = val;
    }
  });

  // Size
  sizeSlider.addEventListener('input', (e) => {
    state.globalFontSize = parseInt(e.target.value);
    sizeDisplay.textContent = state.globalFontSize + 'px';
  });

  // Apply
  btnApplySelected.addEventListener('click', applyStyleToSelected);
  btnApplyAll.addEventListener('click', applyStyleToAll);

  // Layer buttons
  btnSendBehind.addEventListener('click', () => {
    if (state.selectedCharId) setCharLayer(state.selectedCharId, 'behindSubject');
  });
  btnBringAbove.addEventListener('click', () => {
    if (state.selectedCharId) setCharLayer(state.selectedCharId, 'aboveSubject');
  });

  // Export
  btnExport.addEventListener('click', exportPoster);

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (!state.selectedCharId) return;
    // Don't capture if user is typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCharLayer(state.selectedCharId, 'behindSubject');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCharLayer(state.selectedCharId, 'aboveSubject');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const ch = state.characters.find(c => c.id === state.selectedCharId);
      if (ch?.konvaNode) ch.konvaNode.destroy();
      state.characters = state.characters.filter(c => c.id !== state.selectedCharId);
      selectChar(null);
      renderCharList();
      behindTextLayer.draw();
      aboveTextLayer.draw();
    }
  });

  // Resize
  window.addEventListener('resize', handleResize);
}

// --- BOOT ---
document.addEventListener('DOMContentLoaded', init);
