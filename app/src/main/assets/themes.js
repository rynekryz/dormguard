const themes = {
  default: {
    name: 'Default',
  },
  strawberry: {
    name: 'Strawberry Cupcake',
    '--md-sys-color-primary':               'rgb(240 182 193)',
    '--md-sys-color-on-primary':            'rgb(255 255 255)',
    '--md-sys-color-primary-container':     'rgb(255 210 220)',
    '--md-sys-color-on-primary-container':  'rgb(90 35 55)',
    '--md-sys-color-background':            'rgb(252 248 249)',
    '--md-sys-color-on-background':         'rgb(120 60 80)',
    '--md-sys-color-surface':               'rgb(252 248 249)',
    '--md-sys-color-on-surface':            'rgb(120 60 80)',
    '--md-sys-color-outline':               'rgb(220 195 200)',
    '--md-sys-color-surface-container':     'rgb(245 235 238)',
    '--md-sys-color-surface-container-high': 'rgb(240 230 233)',
    '--md-sys-color-surface-dim':           'rgb(228 218 221)',
    '--md-sys-color-surface-bright':        'rgb(252 248 249)',
  },
  tomato: {
    name: 'Tomato Jelly',
    '--md-sys-color-primary':               'rgb(220 70 60)',
    '--md-sys-color-on-primary':            'rgb(255 255 255)',
    '--md-sys-color-primary-container':     'rgb(255 210 205)',
    '--md-sys-color-on-primary-container':  'rgb(90 20 15)',
    '--md-sys-color-background':            'rgb(253 249 248)',
    '--md-sys-color-on-background':         'rgb(110 35 30)',
    '--md-sys-color-surface':               'rgb(253 249 248)',
    '--md-sys-color-on-surface':            'rgb(110 35 30)',
    '--md-sys-color-outline':               'rgb(215 190 185)',
    '--md-sys-color-surface-container':     'rgb(243 236 234)',
    '--md-sys-color-surface-container-high': 'rgb(238 231 229)',
    '--md-sys-color-surface-dim':           'rgb(226 219 217)',
    '--md-sys-color-surface-bright':        'rgb(253 249 248)',
  },
  honey: {
    name: 'Honey Amber',
    '--md-sys-color-primary':               'rgb(240 180 60)',
    '--md-sys-color-on-primary':            'rgb(60 35 0)',
    '--md-sys-color-primary-container':     'rgb(255 225 160)',
    '--md-sys-color-on-primary-container':  'rgb(70 45 0)',
    '--md-sys-color-background':            'rgb(253 251 246)',
    '--md-sys-color-on-background':         'rgb(80 55 10)',
    '--md-sys-color-surface':               'rgb(253 251 246)',
    '--md-sys-color-on-surface':            'rgb(80 55 10)',
    '--md-sys-color-outline':               'rgb(215 205 185)',
    '--md-sys-color-surface-container':     'rgb(243 240 231)',
    '--md-sys-color-surface-container-high': 'rgb(238 235 226)',
    '--md-sys-color-surface-dim':           'rgb(226 223 214)',
    '--md-sys-color-surface-bright':        'rgb(253 251 246)',
  },
  mint: {
    name: 'Mint Breeze',
    '--md-sys-color-primary':               'rgb(170 230 210)',
    '--md-sys-color-on-primary':            'rgb(0 60 50)',
    '--md-sys-color-primary-container':     'rgb(210 245 235)',
    '--md-sys-color-on-primary-container':  'rgb(0 80 70)',
    '--md-sys-color-background':            'rgb(245 255 252)',
    '--md-sys-color-on-background':         'rgb(40 70 65)',
    '--md-sys-color-surface':               'rgb(245 255 252)',
    '--md-sys-color-on-surface':            'rgb(40 70 65)',
    '--md-sys-color-outline':               'rgb(180 220 210)',
    '--md-sys-color-surface-container':     'rgb(230 250 245)',
    '--md-sys-color-surface-container-high': 'rgb(220 245 240)',
    '--md-sys-color-surface-dim':           'rgb(205 235 230)',
    '--md-sys-color-surface-bright':        'rgb(245 255 252)',
  },
  android: {
    name: 'Android Green',
    '--md-sys-color-primary':               'rgb(91 122 74)',
    '--md-sys-color-on-primary':            'rgb(255 255 255)',
    '--md-sys-color-primary-container':     'rgb(221 241 208)',
    '--md-sys-color-on-primary-container':  'rgb(40 60 30)',
    '--md-sys-color-background':            'rgb(248 251 245)',
    '--md-sys-color-on-background':         'rgb(60 75 50)',
    '--md-sys-color-surface':               'rgb(248 251 245)',
    '--md-sys-color-on-surface':            'rgb(60 75 50)',
    '--md-sys-color-outline':               'rgb(195 210 185)',
    '--md-sys-color-surface-container':     'rgb(238 245 230)',
    '--md-sys-color-surface-container-high': 'rgb(233 240 225)',
    '--md-sys-color-surface-dim':           'rgb(218 230 215)',
    '--md-sys-color-surface-bright':        'rgb(248 251 245)',
  },
  blueberry: {
    name: 'Blueberry Muffin',
    '--md-sys-color-primary':               'rgb(100 120 200)',
    '--md-sys-color-on-primary':            'rgb(255 255 255)',
    '--md-sys-color-primary-container':     'rgb(210 218 245)',
    '--md-sys-color-on-primary-container':  'rgb(20 35 100)',
    '--md-sys-color-background':            'rgb(248 249 253)',
    '--md-sys-color-on-background':         'rgb(35 45 110)',
    '--md-sys-color-surface':               'rgb(248 249 253)',
    '--md-sys-color-on-surface':            'rgb(35 45 110)',
    '--md-sys-color-outline':               'rgb(190 198 215)',
    '--md-sys-color-surface-container':     'rgb(235 238 246)',
    '--md-sys-color-surface-container-high': 'rgb(230 233 241)',
    '--md-sys-color-surface-dim':           'rgb(218 221 229)',
    '--md-sys-color-surface-bright':        'rgb(248 249 253)',
  },
  amethyst: {
    name: 'Amethyst Shard',
    '--md-sys-color-primary':               'rgb(155 110 200)',
    '--md-sys-color-on-primary':            'rgb(255 255 255)',
    '--md-sys-color-primary-container':     'rgb(225 210 248)',
    '--md-sys-color-on-primary-container':  'rgb(55 20 100)',
    '--md-sys-color-background':            'rgb(250 248 253)',
    '--md-sys-color-on-background':         'rgb(70 35 115)',
    '--md-sys-color-surface':               'rgb(250 248 253)',
    '--md-sys-color-on-surface':            'rgb(70 35 115)',
    '--md-sys-color-outline':               'rgb(205 195 220)',
    '--md-sys-color-surface-container':     'rgb(238 233 244)',
    '--md-sys-color-surface-container-high': 'rgb(233 228 239)',
    '--md-sys-color-surface-dim':           'rgb(221 216 227)',
    '--md-sys-color-surface-bright':        'rgb(250 248 253)',
  },
  coco: {
    name: 'Coco Cream',
    '--md-sys-color-primary':               'rgb(210 180 140)',
    '--md-sys-color-on-primary':            'rgb(60 40 20)',
    '--md-sys-color-primary-container':     'rgb(240 220 190)',
    '--md-sys-color-on-primary-container':  'rgb(80 55 30)',
    '--md-sys-color-background':            'rgb(253 250 245)',
    '--md-sys-color-on-background':         'rgb(80 60 40)',
    '--md-sys-color-surface':               'rgb(253 250 245)',
    '--md-sys-color-on-surface':            'rgb(80 60 40)',
    '--md-sys-color-outline':               'rgb(215 200 185)',
    '--md-sys-color-surface-container':     'rgb(243 236 226)',
    '--md-sys-color-surface-container-high': 'rgb(238 231 221)',
    '--md-sys-color-surface-dim':           'rgb(226 219 209)',
    '--md-sys-color-surface-bright':        'rgb(253 250 245)',
  },
};

function haptic(duration = 30) {
  if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

function openModal({ modalId, boxId, backdropId }) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeModal({ modalId, boxId, backdropId }) {
  const modal = document.getElementById(modalId);
  const box = document.getElementById(boxId);
  const backdrop = document.getElementById(backdropId);
  
  if (box) box.style.animation = 'popupFadeOut .25s ease-in forwards';
  if (backdrop) backdrop.style.animation = 'popupBackdropFadeOut .25s ease-in forwards';
  
  setTimeout(() => {
    if (modal) modal.style.display = 'none';
    if (box) box.style.animation = '';
    if (backdrop) backdrop.style.animation = '';
  }, 250);
}

function applyPalette(key) {
  haptic(22);
  const theme = themes[key];
  if (!theme) return;

  const currentTheme = localStorage.getItem('palette') || 'default';
  const duration = (key === 'void' || currentTheme === 'void') ? 0 : 350;

  document.body.style.setProperty('--theme-transition-duration', `${duration}ms`);
  document.body.classList.add('theme-transitioning');
  document.body.style.willChange = 'background-color, color';

  const themeVars = [
    '--md-sys-color-primary',
    '--md-sys-color-on-primary',
    '--md-sys-color-primary-container',
    '--md-sys-color-on-primary-container',
    '--md-sys-color-background',
    '--md-sys-color-on-background',
    '--md-sys-color-surface',
    '--md-sys-color-on-surface',
    '--md-sys-color-outline',
    '--md-sys-color-surface-container',
    '--md-sys-color-surface-container-high',
    '--md-sys-color-surface-dim',
    '--md-sys-color-surface-bright',
  ];

  if (key === 'default') {
    themeVars.forEach(varName => {
      document.body.style.removeProperty(varName);
    });
  } else {
    Object.entries(theme).forEach(([prop, val]) => {
      if (prop.startsWith('--')) document.body.style.setProperty(prop, val);
    });
  }

  const surfaceContainer = theme['--md-sys-color-surface-container'] || 'rgb(240 237 237)';
  document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.setAttribute('content', surfaceContainer));
  document.querySelector('meta[name="msapplication-navbutton-color"]')?.setAttribute('content', surfaceContainer);
  document.querySelector('meta[name="msapplication-TileColor"]')?.setAttribute('content', surfaceContainer);

  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
    document.body.style.willChange = 'auto';
  }, duration + 30);

  localStorage.setItem('palette', key);
  
  const themeDisplay = document.getElementById('themeDisplay');
  if (themeDisplay) {
    themeDisplay.textContent = theme.name;
  }
  
  document.querySelectorAll('.theme-check').forEach(el => el.classList.remove('visible'));
  document.getElementById(`check-${key}`)?.classList.add('visible');
}

function initTheme() {
  applyPalette(localStorage.getItem('palette') || 'default');
}

let paletteWasPickedBeforeOpen = false;

function openThemeModal() {
  openModal({ modalId: 'themeModal', boxId: 'themeBox', backdropId: 'themeBackdrop' });
  const saved = localStorage.getItem('palette') || 'default';
  paletteWasPickedBeforeOpen = saved !== 'default';
  document.querySelectorAll('.theme-check').forEach(el => el.classList.remove('visible'));
  document.getElementById(`check-${saved}`)?.classList.add('visible');
}

function closeThemeModal() {
  closeModal({ modalId: 'themeModal', boxId: 'themeBox', backdropId: 'themeBackdrop' });

  const saved = localStorage.getItem('palette') || 'default';
  if (!paletteWasPickedBeforeOpen && saved === 'default' && paletteCheckbox) {
    paletteCheckbox.checked = false;
    localStorage.setItem('paletteEnabled', 'false');
  }
}

const paletteCheckbox = document.getElementById('paletteCheckbox');
const darkModeSwitch = document.getElementById('darkModeSwitch');
const paletteItem = document.getElementById('paletteItem');
const paletteSwitch = document.getElementById('paletteSwitch');
const contrastSwitch = document.getElementById('contrastSwitch');

function loadPaletteStates() {
  const paletteEnabled = localStorage.getItem('paletteEnabled') === 'true';
  const contrastEnabled = localStorage.getItem('contrast') === 'on';

  const savedDarkMode = localStorage.getItem('darkModeEnabled');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const darkModeEnabled = savedDarkMode !== null ? savedDarkMode === 'true' : prefersDark;

  if (paletteCheckbox) paletteCheckbox.checked = paletteEnabled;

  if (darkModeSwitch) {
    darkModeSwitch.checked = darkModeEnabled;
  }

  updatePaletteState();
}

function updatePaletteState() {
  const isDarkModeOn = darkModeSwitch?.checked || false;
  const isContrastOn = contrastSwitch?.checked || false;
  const isPaletteOn = paletteCheckbox?.checked || false;

  if (darkModeSwitch) {
    localStorage.setItem('darkModeEnabled', isDarkModeOn ? 'true' : 'false');
  }

  if (paletteCheckbox && paletteSwitch) {
    if (isDarkModeOn || isContrastOn) {
      paletteCheckbox.checked = false;
      paletteCheckbox.disabled = true;
      paletteSwitch.style.opacity = '0.5';
      if (paletteItem) paletteItem.style.pointerEvents = 'none';
      localStorage.setItem('paletteEnabled', 'false');
    } else {
      paletteCheckbox.disabled = false;
      paletteSwitch.style.opacity = '1';
      if (paletteItem) paletteItem.style.pointerEvents = 'auto';
    }
  }

  if (!isPaletteOn || isDarkModeOn || isContrastOn) {
    applyPalette('default');
    localStorage.setItem('paletteEnabled', 'false');
  } else {
    const lastTheme = localStorage.getItem('palette') || 'default';
    applyPalette(lastTheme);
    localStorage.setItem('paletteEnabled', 'true');
  }
}

function setupPaletteControls() {
  if (paletteCheckbox) {
    paletteCheckbox.addEventListener('change', () => {
      if (navigator.vibrate) navigator.vibrate(48);

      if (paletteCheckbox.checked && !darkModeSwitch?.checked && !contrastSwitch?.checked) {
        localStorage.setItem('paletteEnabled', 'true');
        openThemeModal();
      } else if (!paletteCheckbox.checked) {
        localStorage.setItem('paletteEnabled', 'false');
        applyPalette('default');
      }
    });
  }

  if (darkModeSwitch) {
    darkModeSwitch.addEventListener('change', () => {
      if (navigator.vibrate) navigator.vibrate(48);
      if (typeof window.applyTheme === 'function') {
        window.applyTheme(darkModeSwitch.checked ? 'dark' : 'light');
      }

      updatePaletteState();
    });
  }

  if (contrastSwitch) {
    contrastSwitch.addEventListener('change', updatePaletteState);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadPaletteStates();
    setupPaletteControls();
  });
} else {
  initTheme();
  loadPaletteStates();
  setupPaletteControls();
}

// dynamic pallete
(function () {
  const dynamicColorSwitch = document.getElementById('dynamicColorSwitch');
  const dynamicColorItem = document.getElementById('dynamicColorItem');

  if (!dynamicColorSwitch) return;

  const DYNAMIC_STORAGE_KEY = 'dynamicColorEnabled';

  const THEME_VARS = [
    '--md-sys-color-primary',
    '--md-sys-color-on-primary',
    '--md-sys-color-primary-container',
    '--md-sys-color-on-primary-container',
    '--md-sys-color-background',
    '--md-sys-color-on-background',
    '--md-sys-color-surface',
    '--md-sys-color-on-surface',
    '--md-sys-color-outline',
    '--md-sys-color-surface-container',
    '--md-sys-color-surface-container-high',
    '--md-sys-color-surface-dim',
    '--md-sys-color-surface-bright'
  ];

  function isDynamicColorSupported() {
    if (window.Android && typeof window.Android.isDynamicColorAvailable === 'function') {
      try {
        return window.Android.isDynamicColorAvailable();
      } catch (e) {
        return false;
      }
    }
    return !!(window.Android && typeof window.Android.getMaterialYouColors === 'function');
  }

  function fetchDynamicTokens(isDark) {
    try {
      if (!window.Android || typeof window.Android.getMaterialYouColors !== 'function') return null;
      const json = window.Android.getMaterialYouColors(isDark);
      const data = JSON.parse(json);
      if (!data.supported) return null;

      return {
        '--md-sys-color-primary': data.primary,
        '--md-sys-color-on-primary': data.onPrimary,
        '--md-sys-color-primary-container': data.primaryContainer,
        '--md-sys-color-on-primary-container': data.onPrimaryContainer,
        '--md-sys-color-background': data.background,
        '--md-sys-color-on-background': data.onBackground,
        '--md-sys-color-surface': data.surface,
        '--md-sys-color-on-surface': data.onSurface,
        '--md-sys-color-outline': data.outline,
        '--md-sys-color-surface-container': data.surfaceContainer,
        '--md-sys-color-surface-container-high': data.surfaceContainerHigh,
        '--md-sys-color-surface-dim': data.surfaceDim,
        '--md-sys-color-surface-bright': data.surfaceBright
      };
    } catch (e) {
      return null;
    }
  }

  function applyDynamicPalette() {
    const isDark = darkModeSwitch?.checked || false;
    const isHighContrast = contrastSwitch?.checked || false;

    const dynamicTokens = fetchDynamicTokens(isDark);
    if (!dynamicTokens) return;

    if (isHighContrast) {
      dynamicTokens['--md-sys-color-outline'] = isDark ? 'rgb(255 255 255)' : 'rgb(0 0 0)';
      dynamicTokens['--md-sys-color-on-surface'] = isDark ? 'rgb(255 255 255)' : 'rgb(0 0 0)';
    }

    Object.entries(dynamicTokens).forEach(([prop, val]) => {
      document.body.style.setProperty(prop, val);
    });

    const surfaceContainer = dynamicTokens['--md-sys-color-surface-container'];
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.setAttribute('content', surfaceContainer));
  }

  function clearInlineTokens() {
    THEME_VARS.forEach(varName => {
      document.body.style.removeProperty(varName);
    });
  }

  function syncDynamicState() {
    const supported = isDynamicColorSupported();

    if (!supported) {
      dynamicColorSwitch.checked = false;
      dynamicColorSwitch.disabled = true;
      if (dynamicColorItem) {
        dynamicColorItem.style.display = 'none';
      }
      localStorage.setItem(DYNAMIC_STORAGE_KEY, 'false');
      updatePaletteState();
      return;
    }

    if (dynamicColorItem) {
      dynamicColorItem.style.display = '';
    }

    const isDynamicOn = localStorage.getItem(DYNAMIC_STORAGE_KEY) === 'true';
    dynamicColorSwitch.checked = isDynamicOn;

    if (isDynamicOn) {
      if (paletteCheckbox) {
        paletteCheckbox.checked = false;
        paletteCheckbox.disabled = true;
      }
      if (paletteSwitch) paletteSwitch.style.opacity = '0.5';
      if (paletteItem) paletteItem.style.pointerEvents = 'none';
      localStorage.setItem('paletteEnabled', 'false');

      applyDynamicPalette();
    } else {
      const isDarkModeOn = darkModeSwitch?.checked || false;
      const isContrastOn = contrastSwitch?.checked || false;

      if (!isDarkModeOn && !isContrastOn && paletteCheckbox && paletteSwitch) {
        paletteCheckbox.disabled = false;
        paletteSwitch.style.opacity = '1';
        if (paletteItem) paletteItem.style.pointerEvents = 'auto';
      }

      clearInlineTokens();
      updatePaletteState();
    }
  }

  dynamicColorSwitch.addEventListener('change', () => {
    if (navigator.vibrate) navigator.vibrate(48);

    const isChecked = dynamicColorSwitch.checked;
    localStorage.setItem(DYNAMIC_STORAGE_KEY, isChecked ? 'true' : 'false');

    if (window.Android && typeof window.Android.setDynamicColorEnabled === 'function') {
      window.Android.setDynamicColorEnabled(isChecked);
    }

    syncDynamicState();
  });

  darkModeSwitch?.addEventListener('change', () => {
    if (localStorage.getItem(DYNAMIC_STORAGE_KEY) === 'true') {
      applyDynamicPalette();
    }
  });

  contrastSwitch?.addEventListener('change', () => {
    if (localStorage.getItem(DYNAMIC_STORAGE_KEY) === 'true') {
      applyDynamicPalette();
    }
  });

  syncDynamicState();
})();