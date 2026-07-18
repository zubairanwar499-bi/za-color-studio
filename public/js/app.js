/* ============================================================
   AIColors / ZA Color Studio — Frontend Application logic
   Organized as a single-page split-pane editor matching the 
   provided layout mockup.
   ============================================================ */

const ICONS = {
  heart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 8.6a5 5 0 00-8.5-3.4L12 5.5l-.3-.3A5 5 0 003.2 8.6c0 5 8.8 10.4 8.8 10.4s8.8-5.4 8.8-10.4z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13h8l1-13"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>'
};

/* ---------------- Application State ---------------- */
const state = {
  theme: (function(){ try { return localStorage.getItem('aicolors_theme') || 'light'; } catch(e){ return 'light'; } })(),
  activeTab: 'new', // 'new', 'top', 'views', 'history'
  generated: [],   // palettes generated in current session
  library: [],     // curated starter palettes
  favorites: [],   // user starred palettes
  history: [],     // history items from server
  selectedPalette: null, // Currently selected palette object
  providerStatus: null
};

// Set theme at startup
document.body.dataset.theme = state.theme;

/* ---------------- API Helpers ---------------- */
async function api(path, opts) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error('API Request failed: ' + res.status);
  return res.json();
}

/* ---------------- Toast Notifications ---------------- */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = ICONS.check + ` <span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------------- Render Sidebars based on Tabs ---------------- */
function renderSidebar() {
  const container = document.getElementById('paletteListContainer');
  if (!container) return;

  let palettesList = [];
  let showFavButton = false;
  let showDelButton = false;

  if (state.activeTab === 'new') {
    palettesList = state.generated;
    showFavButton = true;
    showDelButton = false;
  } else if (state.activeTab === 'top') {
    palettesList = state.library;
    showFavButton = true;
    showDelButton = false;
  } else if (state.activeTab === 'views') {
    palettesList = state.favorites;
    showFavButton = false;
    showDelButton = true;
  } else if (state.activeTab === 'history') {
    palettesList = state.history;
    showFavButton = true;
    showDelButton = true;
  }

  // Filter if search input has text
  const searchVal = document.getElementById('paletteSearch').value.toLowerCase().trim();
  if (searchVal) {
    palettesList = palettesList.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchVal);
      const matchMood = (p.mood || '').toLowerCase().includes(searchVal);
      const matchHex = Object.values(p.colors).some(c => c.toLowerCase().includes(searchVal));
      return matchName || matchMood || matchHex;
    });
  }

  if (palettesList.length === 0) {
    container.innerHTML = `<div class="empty-hint">No palettes found.</div>`;
    return;
  }

  container.innerHTML = palettesList.map((p, idx) => {
    const isSelected = state.selectedPalette && state.selectedPalette.name === p.name;
    const colors = p.colors;
    
    // Check if favorited
    const isFav = state.favorites.some(f => f.name === p.name);

    return `
      <div class="palette-card-item ${isSelected ? 'selected' : ''}" data-idx="${idx}">
        <div class="palette-card-header">
          <div>
            <div class="palette-card-title" title="${p.name}">${p.name}</div>
            <div class="palette-card-mood">${p.mood || ''}</div>
          </div>
          <div class="palette-card-actions">
            ${showFavButton ? `
              <button class="palette-card-btn ${isFav ? 'active-fav' : ''}" data-fav="${idx}" title="Favorite">
                ${ICONS.heart}
              </button>` : ''}
            ${showDelButton ? `
              <button class="palette-card-btn" data-del="${idx}" title="Delete">
                ${ICONS.trash}
              </button>` : ''}
          </div>
        </div>
        <div class="palette-card-colors">
          <div class="palette-card-color" style="background: ${colors.primary}"></div>
          <div class="palette-card-color" style="background: ${colors.accent}"></div>
          <div class="palette-card-color" style="background: ${colors.secondary}"></div>
          <div class="palette-card-color" style="background: ${colors.background}"></div>
          <div class="palette-card-color" style="background: ${colors.surface}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.palette-card-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't change selection if user clicked a button
      if (e.target.closest('.palette-card-btn')) return;
      const idx = parseInt(item.dataset.idx);
      selectPalette(palettesList[idx]);
      renderSidebar();
    });
  });

  // Favorite button handler
  container.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.fav);
      const palette = palettesList[idx];
      
      const alreadyFav = state.favorites.some(f => f.name === palette.name);
      if (alreadyFav) {
        // Remove from favorites
        const existing = state.favorites.find(f => f.name === palette.name);
        if (existing && existing.id) {
          try {
            await api('/favorites/' + existing.id, { method: 'DELETE' });
            state.favorites = state.favorites.filter(f => f.name !== palette.name);
            showToast('Removed from favorites');
            renderSidebar();
          } catch(e) {
            showToast('Could not remove from favorites');
          }
        }
      } else {
        // Save to favorites
        const tempId = palette.id || 'lib_' + palette.name.replace(/\s+/g,'_').toLowerCase();
        const payload = { ...palette, id: tempId };
        try {
          await api('/favorites', { method: 'POST', body: JSON.stringify(payload) });
          state.favorites.push(payload);
          showToast(`Saved "${palette.name}"`);
          renderSidebar();
        } catch(err) {
          showToast('Could not save favorite');
        }
      }
    });
  });

  // Delete button handler (for favorites or history)
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.del);
      const palette = palettesList[idx];

      if (state.activeTab === 'views') {
        // Delete favorite
        try {
          await api('/favorites/' + palette.id, { method: 'DELETE' });
          state.favorites = state.favorites.filter(f => f.id !== palette.id);
          showToast('Removed from favorites');
          renderSidebar();
        } catch(e) { showToast('Delete failed'); }
      } else if (state.activeTab === 'history') {
        // Delete history
        try {
          await api('/history/' + palette.id, { method: 'DELETE' });
          state.history = state.history.filter(h => h.id !== palette.id);
          showToast('Removed from history');
          renderSidebar();
        } catch(e) { showToast('Delete failed'); }
      }
    });
  });
}

/* ---------------- Active Palette Management ---------------- */
function selectPalette(palette) {
  state.selectedPalette = palette;
  applyMockupPreview(palette);
  renderActiveSwatchesBar(palette);
}

function seededVals(seedStr, n, min, max) {
  let seed = 0; for(const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [];
  for(let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    out.push(min + (seed % 1000) / 1000 * (max - min));
  }
  return out;
}

function applyMockupPreview(p) {
  if (!p) return;
  const container = document.getElementById('mockupContainer');
  if (!container) return;

  const c = p.colors;
  container.style.setProperty('--preview-primary', c.primary);
  container.style.setProperty('--preview-secondary', c.secondary);
  container.style.setProperty('--preview-accent', c.accent);
  container.style.setProperty('--preview-bg', c.background);
  container.style.setProperty('--preview-surface', c.surface);
  container.style.setProperty('--preview-text', c.text);
  container.style.setProperty('--preview-border', c.border);
  
  if (c.success) container.style.setProperty('--preview-success', c.success);
  if (c.danger) container.style.setProperty('--preview-danger', c.danger);

  // 1. Render alternating bars chart (2019: Orange/Accent, 2020: Blue/Primary)
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
  const barVals1 = seededVals(p.name + '-bar1', 9, 20, 75); // 2019
  const barVals2 = seededVals(p.name + '-bar2', 9, 30, 95); // 2020
  
  const barsContainer = document.getElementById('udBarsChart');
  if (barsContainer) {
    barsContainer.innerHTML = months.map((m, idx) => `
      <div class="ud-bar-column">
        <div class="ud-bar-pair">
          <div class="ud-bar bar-orange" style="height: ${barVals1[idx]}%; background-color: var(--preview-accent);"></div>
          <div class="ud-bar bar-primary" style="height: ${barVals2[idx]}%; background-color: var(--preview-primary);"></div>
        </div>
        <div class="ud-bar-label">${m}</div>
      </div>
    `).join('');
  }

  // 2. Render Circle Donut SVG segment colors
  const donut = document.getElementById('udDonutChart');
  if (donut) {
    const r = 30;
    const circ = 2 * Math.PI * r;
    donut.innerHTML = `
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${c.border}" stroke-width="8"></circle>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${c.primary}" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - 0.55)}" stroke-linecap="round" transform="rotate(-90 40 40)"></circle>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${c.accent}" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - 0.45)}" stroke-linecap="round" transform="rotate(72 40 40)"></circle>
      <text x="40" y="44" text-anchor="middle" font-size="11" font-weight="700" fill="${c.text}" font-family="Inter">45%</text>
    `;
  }

  // 3. Render Double Wave Chart Areas & Lines
  const wave1Area = document.getElementById('udWave1Area');
  const wave1Line = document.getElementById('udWave1Line');
  const wave2Area = document.getElementById('udWave2Area');
  const wave2Line = document.getElementById('udWave2Line');
  if (wave1Area && wave1Line && wave2Area && wave2Line) {
    const wv1 = seededVals(p.name + '-wave1', 6, 20, 80);
    const wv2 = seededVals(p.name + '-wave2', 6, 10, 70);
    
    // Wave points path
    const pts1 = wv1.map((v, i) => `${i * 68},${100 - v}`).join(' ');
    const pts2 = wv2.map((v, i) => `${i * 68},${100 - v}`).join(' ');

    wave1Area.setAttribute('d', `M 0,100 L 0,${100 - wv1[0]} ` + wv1.map((v, i) => `L ${i * 68},${100 - v}`).join(' ') + ` L 340,100 Z`);
    wave1Line.setAttribute('d', `M 0,${100 - wv1[0]} ` + wv1.map((v, i) => `L ${i * 68},${100 - v}`).join(' '));
    
    wave2Area.setAttribute('d', `M 0,100 L 0,${100 - wv2[0]} ` + wv2.map((v, i) => `L ${i * 68},${100 - v}`).join(' ') + ` L 340,100 Z`);
    wave2Line.setAttribute('d', `M 0,${100 - wv2[0]} ` + wv2.map((v, i) => `L ${i * 68},${100 - v}`).join(' '));
  }

  // 4. Render Calendar Day Grid
  const calGrid = document.getElementById('udCalGrid');
  if (calGrid) {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let calHtml = days.map(d => `<div class="ud-cal-day">${d}</div>`).join('');
    for (let d = 1; d <= 30; d++) {
      let extraClass = '';
      if (d === 2 || d === 11) extraClass = 'primary-sel';
      else if (d === 15) extraClass = 'accent-sel';
      calHtml += `<div class="ud-cal-num ${extraClass}">${d}</div>`;
    }
    calGrid.innerHTML = calHtml;
  }
}

function renderActiveSwatchesBar(p) {
  const bar = document.getElementById('activeSwatchesBar');
  if (!bar || !p) return;

  const roles = ['primary', 'accent', 'secondary', 'background', 'surface'];
  bar.innerHTML = roles.map(role => {
    const val = p.colors[role];
    return `
      <div class="swatch-chip-horizontal" style="background: ${val}" data-hex="${val}" data-role="${role}" title="Copy ${role}: ${val}">
        <div class="swatch-chip-label">${val.toUpperCase()}</div>
      </div>
    `;
  }).join('');

  // Click swatches to copy to clipboard
  bar.querySelectorAll('.swatch-chip-horizontal').forEach(chip => {
    chip.addEventListener('click', () => {
      navigator.clipboard?.writeText(chip.dataset.hex);
      showToast(`Copied ${chip.dataset.role}: ${chip.dataset.hex.toUpperCase()}`);
    });
  });
}

/* ---------------- Run Palette Generation ---------------- */
async function runGenerate() {
  const input = document.getElementById('aiPromptInput');
  const btn = document.getElementById('aiGenerateBtn');
  const prompt = input.value.trim();

  btn.classList.add('loading');
  btn.textContent = 'Generating...';

  try {
    const { palettes, providerUsed } = await api('/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: prompt || "Halloween warm whimsical" })
    });
    
    state.generated = palettes;
    state.activeTab = 'new';
    
    // Select active navigation tab
    updateActiveTabUI();

    // Select the first variation
    if (palettes.length > 0) {
      selectPalette(palettes[0]);
    }

    renderSidebar();
    showToast(`Generated using ${providerUsed}`);
    fetchProviderStatus();
  } catch (err) {
    showToast('AI Generation failed. Check server status.');
    console.error(err);
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Generate';
  }
}

/* ---------------- Tab Switching Actions ---------------- */
function updateActiveTabUI() {
  document.querySelectorAll('.rail-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`.rail-tab[data-tab="${state.activeTab}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

async function switchTab(tabId) {
  if (tabId === 'edit') {
    // Open inline edit modal instead of reloading sidebar
    openEditModal();
    return;
  }

  state.activeTab = tabId;
  updateActiveTabUI();

  // Load backend data if needed
  try {
    if (tabId === 'top') {
      state.library = await api('/library');
    } else if (tabId === 'views') {
      state.favorites = await api('/favorites');
    } else if (tabId === 'history') {
      state.history = await api('/history');
    }
  } catch(e) {
    console.warn(`Could not load latest list for tab: ${tabId}`);
  }

  renderSidebar();
}

/* ---------------- Active AI Provider Status ---------------- */
async function fetchProviderStatus() {
  try {
    const status = await api('/status');
    state.providerStatus = status;
    const dot = document.getElementById('providerDot');
    const label = document.getElementById('providerLabel');
    
    const activePool = status.pools.find(p => p.availableKeys > 0);
    if (dot && label) {
      if (activePool) {
        dot.classList.remove('offline');
        label.textContent = activePool.provider + ' active';
      } else {
        dot.classList.add('offline');
        label.textContent = 'Local fallback';
      }
    }
  } catch(e) {
    // Silent fail if endpoint unreachable
  }
}

/* ---------------- Export Functionality ---------------- */
function doExport(format) {
  const p = state.selectedPalette;
  if (!p) {
    showToast('No active palette to export');
    return;
  }

  if (format === 'json') {
    navigator.clipboard?.writeText(JSON.stringify(p, null, 2));
    showToast('JSON copied to clipboard');
  } else if (format === 'css') {
    const cssContent = `:root {\n` + 
      Object.entries(p.colors).map(([k, v]) => `  --color-${k}: ${v};`).join('\n') + 
      `\n}`;
    navigator.clipboard?.writeText(cssContent);
    showToast('CSS variables copied');
  } else if (format === 'tailwind') {
    const twContent = `colors: {\n` + 
      Object.entries(p.colors).map(([k, v]) => `  '${k}': '${v}',`).join('\n') + 
      `\n}`;
    navigator.clipboard?.writeText(twContent);
    showToast('Tailwind configuration copied');
  }
  
  closeModal('exportModal');
}

/* ---------------- Color Tweak Dialog Editor ---------------- */
function openEditModal() {
  const p = state.selectedPalette;
  if (!p) {
    showToast('No palette selected to edit');
    return;
  }

  const container = document.getElementById('editInputsContainer');
  if (!container) return;

  // Render input fields for all active colors
  container.innerHTML = Object.entries(p.colors).map(([name, val]) => `
    <div class="edit-input-group">
      <label>${name}</label>
      <div class="edit-color-field">
        <input type="color" value="${val}" id="edit_picker_${name}">
        <input type="text" value="${val}" id="edit_txt_${name}" maxlength="7">
      </div>
    </div>
  `).join('');

  // Sync text fields with color pickers
  Object.keys(p.colors).forEach(name => {
    const picker = document.getElementById(`edit_picker_${name}`);
    const txt = document.getElementById(`edit_txt_${name}`);

    picker.addEventListener('input', () => {
      txt.value = picker.value.toUpperCase();
    });
    txt.addEventListener('input', () => {
      const v = txt.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(v)) {
        picker.value = v;
      }
    });
  });

  openModal('editModal');
}

function saveEditChanges() {
  const p = state.selectedPalette;
  if (!p) return;

  // Extract values
  const updatedColors = {};
  Object.keys(p.colors).forEach(name => {
    const txt = document.getElementById(`edit_txt_${name}`);
    if (txt) {
      let v = txt.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9A-F]{6}$/i.test(v)) {
        updatedColors[name] = v;
      } else {
        updatedColors[name] = p.colors[name]; // Keep original if invalid
      }
    }
  });

  // Apply to active state
  state.selectedPalette.colors = updatedColors;
  selectPalette(state.selectedPalette);
  
  // Re-render sidebar to update the swatches
  renderSidebar();

  closeModal('editModal');
  showToast('Palette colors updated');
}

/* ---------------- Modal Controllers ---------------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

/* ---------------- Startup Initialization ---------------- */
async function init() {
  // Load initial library lists
  try {
    state.library = await api('/library').catch(() => []);
    state.favorites = await api('/favorites').catch(() => []);
    state.history = await api('/history').catch(() => []);
  } catch(e) {}

  // If we have history or library, pick first item as default preview
  if (state.library && state.library.length > 0) {
    selectPalette(state.library[0]);
  } else if (state.history && state.history.length > 0) {
    selectPalette(state.history[0]);
  } else {
    // Dynamic fallbacks
    selectPalette({
      name: "Default Startup",
      mood: "Clean . Modern",
      colors: {
        primary: "#4F46E5",
        accent: "#10B981",
        secondary: "#6B7280",
        background: "#F3F4F6",
        surface: "#FFFFFF",
        text: "#111827",
        border: "#E5E7EB"
      }
    });
  }

  // Load default rail tab
  renderSidebar();

  /* Setup Global Events */

  // AI Prompt generation
  document.getElementById('aiGenerateBtn').addEventListener('click', runGenerate);
  document.getElementById('aiPromptInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runGenerate();
  });

  // Navigation rail clicks
  document.querySelectorAll('.rail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Sidebar search
  document.getElementById('paletteSearch').addEventListener('input', renderSidebar);

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = state.theme;
    localStorage.setItem('aicolors_theme', state.theme);
  });

  // Modal open triggers
  document.getElementById('howToUseLink').addEventListener('click', () => openModal('howToUseModal'));
  document.getElementById('canvasExportBtn').addEventListener('click', () => openModal('exportModal'));

  // Modal close triggers
  document.getElementById('modalCloseBtn').addEventListener('click', () => closeModal('howToUseModal'));
  document.getElementById('exportCloseBtn').addEventListener('click', () => closeModal('exportModal'));
  document.getElementById('editCloseBtn').addEventListener('click', () => closeModal('editModal'));

  // Export selection clicks
  document.querySelectorAll('.export-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      doExport(btn.dataset.exp);
    });
  });

  // Save edits action
  document.getElementById('saveEditBtn').addEventListener('click', saveEditChanges);

  // Click outside modal overlays to close them
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Periodic provider checking
  fetchProviderStatus();
  setInterval(fetchProviderStatus, 30000);
}

// Bootstrap
window.addEventListener('DOMContentLoaded', init);
