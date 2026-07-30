const getUrl = key => {
  const v = localStorage.getItem(key);
  if (!v) return '';
  try { return decodeURIComponent(escape(atob(v))); } catch { return v; }
};

const $ = id => document.getElementById(id);

const EL = {
  vibrationSwitch:    $('vibrationSwitch'),
  pages:              document.querySelectorAll('.page'),
  navBtns:            document.querySelectorAll('.nav-item'),
  mdBtns:             document.querySelectorAll('.md-btn'),
  doorStatus:         $('doorStatus'),
  currentTime:        $('currentTime'),
  eventList:          $('eventList'),
  fullDatBtn:         $('fulldat'),
  latestDatBtn:       $('latestdat'),
  viewDatBtn:         $('viewdat'),
  alertToggle:        $('alertToggle'),
  alertSwitch:        $('alertSwitch'),
  darkModeSwitch:     $('darkModeSwitch'),
  contrastSwitch:     $('contrastSwitch'),
  reduceMotionSwitch: $('reduceMotionSwitch'),
  themeMeta:          document.querySelector('meta[name="theme-color"]'),
  screen:             $('screen'),
  splash:             $('splash'),
  homeH1:             document.querySelector('#home h1'),
};

window.API_KEY = getUrl('api_url');

const _vibrate = navigator.vibrate?.bind(navigator);
let vibrationEnabled = localStorage.getItem('vibration') !== 'off';
navigator.vibrate = pattern => vibrationEnabled && _vibrate?.(pattern);

const vibrateOnToggle = () => navigator.vibrate([22, 32, 24]);

document.querySelectorAll('.md-switch input[type="checkbox"]').forEach(sw => {
  sw.addEventListener('change', vibrateOnToggle);
});

if (EL.vibrationSwitch) {
  EL.vibrationSwitch.checked = !vibrationEnabled;
  EL.vibrationSwitch.addEventListener('change', () => {
    vibrationEnabled = !EL.vibrationSwitch.checked;
    localStorage.setItem('vibration', vibrationEnabled ? 'on' : 'off');
  });
}

let alertEnabled = localStorage.getItem('alert') === 'on';
let isDownloading = false;

if (EL.alertSwitch) {
  EL.alertSwitch.checked = alertEnabled;
  EL.alertSwitch.addEventListener('change', () => {
    alertEnabled = EL.alertSwitch.checked;
    localStorage.setItem('alert', alertEnabled ? 'on' : 'off');
  });
}

const formatAMPM = dateStr => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return '-';
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const formatDate = dateStr => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const lightStatus = document.getElementById('lightstatus');
const lampIcon = lightStatus?.querySelector('.lamp-icon');

const lightStates = {
  0: { icon: 'light_off', occupied: false },
  1: { icon: 'light_off', occupied: true },
  2: { icon: 'lightbulb', occupied: false },
  3: { icon: 'lightbulb', occupied: true }
};

let lastLightCode = null;

function updateLightUI(code) {
  if (!lightStatus || !lampIcon) return;
  const state = lightStates[code];
  if (!state || code === lastLightCode) return;
  lastLightCode = code;

  lightStatus.classList.toggle('occupied', state.occupied);
  lampIcon.textContent = state.icon;

  if (navigator.vibrate) {
    navigator.vibrate([32, 48]);
  }

  lampIcon.classList.remove('squeeze');
  void lampIcon.offsetWidth;
  lampIcon.classList.add('squeeze');
}

let lastDoorState = null;
let fetchTimer = null;
let lastRawDataString = "";

async function fetchSheetData() {
  try {
    const res = await fetch(window.API_KEY);
    const raw = await res.json();

    const rows = Array.isArray(raw) ? raw : raw.values || [];

    const currentStr = JSON.stringify(rows);
    if (currentStr === lastRawDataString) {
      return { unchanged: true };
    }
    lastRawDataString = currentStr;

    const history = rows.slice(0).reverse().map(row => {
      const timestamp = row.timestamp;

      return {
        time: formatAMPM(new Date(timestamp)),
        date: formatDate(new Date(timestamp)),
        door: row.status || 'UNKNOWN',
        light: row.light !== undefined && row.light !== null ? Number(row.light) : null,
      };
    });

    return {
      unchanged: false,
      current: history[0] || { door: 'UNKNOWN' },
      history,
      lastOpened: history.find(e => e.door === 'OPEN') || null,
    };

  } catch {
    return null;
  }
}

async function fetchServerData() {
  if (!window.API_KEY) return;

  if (!navigator.onLine) {
    const cached = localStorage.getItem('cached_logs');

    if (cached && EL.eventList)
      EL.eventList.innerHTML = cached;

    return { changed: false };
  }

  const data = await fetchSheetData();

  if (!data || data.unchanged)
    return { changed: false };

  if (EL.doorStatus.textContent !== data.current.door)
    EL.doorStatus.textContent = data.current.door;

  if (data.current.light !== null && data.current.light !== undefined) {
    updateLightUI(data.current.light);
  }

  let htmlBuilder = "";

  data.history.forEach(item => {
    const isOpen = item.door.toLowerCase() === 'open';

    htmlBuilder += `<li class="${isOpen ? 'open' : 'closed'}">
      <span class="log-icon">
        <span class="material-symbols-rounded">
          ${isOpen ? 'lock_open' : 'lock'}
        </span>
      </span>

      <span class="log-datetime">
        ${item.time} | ${item.date}
      </span>

      <span class="log-door">
        ${item.door}
      </span>
    </li>`;
  });

  EL.eventList.innerHTML = htmlBuilder;
  localStorage.setItem('cached_logs', htmlBuilder);

  const hourEl = $('lastOpenedHour');
  const minEl  = $('lastOpenedMin');

  if (data.lastOpened) {
    const [time, period] = data.lastOpened.time.split(' ');
    let [hour, min] = time.split(':');

    hour = parseInt(hour, 10);

    if (period) {
      const p = period.toLowerCase();
      if (p === 'pm' && hour !== 12) hour += 12;
      if (p === 'am' && hour === 12) hour = 0;
    }

    const newHour = String(hour).padStart(2, '0');

    const changed =
      hourEl.textContent !== newHour ||
      minEl.textContent !== min;

    hourEl.textContent = newHour;
    minEl.textContent = min;

    $('lastOpenedDate').textContent = data.lastOpened.date;

    if (changed) {
      const lo = $('LastOpened');

      lo.classList.remove('pop');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lo.classList.add('pop');
        });
      });

      navigator.vibrate(48);
    }

  } else {
    hourEl.textContent = '-';
    minEl.textContent = '';
  }

  return { changed: true };
}

const POLL_RATES = { 0: 10000, 1: 8000, 2: 5000, 3: 2000, 4: null };
let recentChanges = [];

function isHomeActive() {
  const homeEl = document.getElementById('home');
  return !!homeEl && homeEl.classList.contains('active');
}

function canPoll() {
  return !document.hidden && isHomeActive();
}

function getNextInterval(changed) {
  if (pollMode !== 4) return POLL_RATES[pollMode];
  recentChanges.push(changed);
  if (recentChanges.length > 3) recentChanges.shift();
  return recentChanges.filter(Boolean).length >= 2 ? 5000 : 10000;
}

const POLL_DESCS = {
  0: 'Checks for updates every 10 seconds. Saves battery and data.',
  1: 'Checks for updates every 8 seconds. Balanced for everyday use.',
  2: 'Checks for updates every 5 seconds. More responsive, uses more data.',
  3: 'Checks for updates every 2 seconds. Fast (Real).',
  4: 'Adapts automatically. Speeds up when door activity is detected, slows down when idle.'
};

let pollMode = parseInt(localStorage.getItem('pollMode') ?? '1');

function updateSliderFill(slider) {
  const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
  slider.style.setProperty('--fill', `${val}%`);
  document.getElementById('pollRateDesc').textContent = POLL_DESCS[slider.value];
}

const pollSlider = document.getElementById('pollRateSlider');
pollSlider.value = pollMode;
pollSlider.addEventListener('input', () => {
  pollMode = parseInt(pollSlider.value);
  navigator.vibrate(24);
  localStorage.setItem('pollMode', pollMode);
  updateSliderFill(pollSlider);
});
updateSliderFill(pollSlider);

function scheduleFetch(delay = POLL_RATES[pollMode] ?? 8000) {
  clearTimeout(fetchTimer);
  if (!canPoll()) return;
  fetchTimer = setTimeout(async () => {
    const result = await fetchServerData();
    scheduleFetch(getNextInterval(result?.changed ?? false) ?? 8000);
  }, delay);
}

EL.viewDatBtn?.addEventListener('click', () => {
  const url = getUrl('sheets_url');
  if (url) window.confirmOpenInBrowser(url, 'Google Sheets', true);
});

function showMdConfirmDialog(opts) {
  const icon = opts.icon || 'help';
  const title = opts.title;
  const body = opts.body;
  const confirmLabel = opts.confirmLabel || 'Yes';
  const cancelLabel = opts.cancelLabel || 'Cancel';
  const onConfirm = opts.onConfirm;

  const overlay = document.createElement('div');
  overlay.className = 'md-dialog-overlay';

  overlay.innerHTML = `
    <div class="md-dialog">
      <span class="material-symbols-rounded md-dialog-icon" style="color: var(--md-sys-color-primary) !important;">${icon}</span>
      <div class="md-dialog-title">${title}</div>
      <div class="md-dialog-body">${body}</div>
      <div class="md-dialog-actions">
        <button class="md-dialog-btn cancel" id="mdConfirmCancelBtn">${cancelLabel}</button>
        <button class="md-dialog-btn primary" style="background-color: var(--md-sys-color-primary) !important; color: var(--md-sys-color-on-primary) !important;" id="mdConfirmYesBtn">${confirmLabel}</button>
      </div>
    </div>
  `;

  const close = mountMdOverlay(overlay);

  overlay.querySelector('#mdConfirmYesBtn').addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });

  overlay.querySelector('#mdConfirmCancelBtn').addEventListener('click', close);

  return close;
}

async function downloadCSV(filename, limit = null) {
  if (isDownloading) return;
  isDownloading = true;

  const btn      = limit ? EL.latestDatBtn : EL.fullDatBtn;
  const otherBtn = limit ? EL.fullDatBtn   : EL.latestDatBtn;
  const origText = btn.textContent;

  btn.textContent = '';
  btn.disabled = otherBtn.disabled = true;

  const spinner = document.createElement('div');
  spinner.className = 'md-circular-progress';
  spinner.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/></svg>';
  btn.appendChild(spinner);

  try {
    const res = await fetch(window.API_KEY);
    const raw = await res.json();
    let rows = Array.isArray(raw) ? raw : raw.values || [];
    rows = rows.slice(0).reverse().map(row => ({
      time: formatAMPM(new Date(row.timestamp)),
      date: formatDate(new Date(row.timestamp)),
      door: row.status || 'UNKNOWN' 
    }));
    if (limit) rows = rows.slice(0, limit);
    const csv  = ['Time,Date,Door'].concat(rows.map(e => `${e.time},${e.date},${e.door}`)).join('\n');

    const doSave = () => {
      if (window.Android) {
        window.Android.saveFileWithConfirm(filename, csv, 'text/csv', 'Confirm Download');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    };

    showMdConfirmDialog({
      icon: 'download',
      title: 'Download CSV?',
      body: `Save ${filename} to your device.`,
      confirmLabel: 'Save',
      onConfirm: doSave
    });
  } catch(e) {
     console.error(e);
  } finally {
    spinner.remove();
    btn.textContent = origText;
    btn.disabled = otherBtn.disabled = false;
    isDownloading = false;
  }
}

EL.fullDatBtn.addEventListener('click',   () => downloadCSV('full_records.csv'));
EL.latestDatBtn.addEventListener('click', () => downloadCSV('latest_records.csv', 50));

EL.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.vibrate(32);
    EL.navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    EL.pages.forEach(p => p.classList.remove('active'));
    $(btn.dataset.page).classList.add('active');
    document.querySelector('.toast-emote')?.remove();
    if (btn.dataset.page === 'home') scheduleFetch();
    else clearTimeout(fetchTimer);
    document.querySelectorAll('#settings .settings-item .material-symbols-rounded').forEach(i => i.classList.remove('shake'));
  });
});

EL.mdBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    const circle = document.createElement('span');
    const d      = Math.max(btn.clientWidth, btn.clientHeight);
    const rect   = btn.getBoundingClientRect();
    circle.className    = 'ripple';
    circle.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`;
    btn.appendChild(circle);
    circle.classList.add('ripple-animate');
    circle.addEventListener('animationend', () => circle.remove(), { once: true });
  });
});

const getCurrentTheme = () => document.body.classList.contains('dark') ? 'dark' : 'light';

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(theme);
}

let cachedClockFontMetric = null;
function getClockFontMetric() {
  if(!cachedClockFontMetric && EL.currentTime) {
     cachedClockFontMetric = parseFloat(window.getComputedStyle(EL.currentTime).fontSize) * 4.6;
  }
  return cachedClockFontMetric || 72;
}

function applyContrast() {
  document.body.classList.remove('contrast-light', 'contrast-dark');
  if (EL.contrastSwitch.checked)
    document.body.classList.add(getCurrentTheme() === 'dark' ? 'contrast-dark' : 'contrast-light');
}

function updateThemeColor() {
  const bg = getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface').trim();
  EL.themeMeta?.setAttribute('content', bg || 'rgb(252,248,248)');

  if (window.Android) {
    const isDark = getCurrentTheme() === 'dark';
    window.Android.setStatusBarIconsLight(isDark);
    window.Android.setAppTheme(isDark);
  }
}

EL.darkModeSwitch.addEventListener('change', () => {
  applyTheme(EL.darkModeSwitch.checked ? 'dark' : 'light');
  applyContrast();
  localStorage.setItem('theme', EL.darkModeSwitch.checked ? 'dark' : 'light');
  updateThemeColor();
});

EL.contrastSwitch.addEventListener('change', () => {
  applyContrast();
  localStorage.setItem('contrast', EL.contrastSwitch.checked ? 'on' : 'off');
  updateThemeColor();
});

const notifSwitch = document.getElementById('notificationsSwitch');
let notifEnabled = localStorage.getItem('notifEnabled') === 'true';

if (notifSwitch) {
  notifSwitch.checked = notifEnabled;
  notifSwitch.addEventListener('change', () => {
    notifEnabled = notifSwitch.checked;
    localStorage.setItem('notifEnabled', notifEnabled);
    if (window.Android) {
      window.Android.setNotificationsEnabled(notifEnabled);
    }
  });
}

(function restoreSettings() {
  const t = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(t);
  EL.darkModeSwitch.checked = t === 'dark';
  if (localStorage.getItem('contrast') === 'on') {
    EL.contrastSwitch.checked = true;
    applyContrast();
  }
  if (localStorage.getItem('reduceMotion') === 'on') {
    document.body.classList.add('no-animation');
    EL.reduceMotionSwitch.checked = true;
  }
})();

updateThemeColor();

EL.reduceMotionSwitch.addEventListener('change', () => {
  document.body.classList.toggle('no-animation', EL.reduceMotionSwitch.checked);
  localStorage.setItem('reduceMotion', EL.reduceMotionSwitch.checked ? 'on' : 'off');
});

document.addEventListener('contextmenu', e => e.preventDefault());

const configArea = document.querySelector('.user-config');
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && configArea && !configArea.contains(e.target))
    e.preventDefault();
}, { passive: false });

document.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

document.querySelectorAll('.collapsible').forEach(header => {
  header.addEventListener('click', () => {
    const content = $(header.dataset.target);
    const isOpen  = content.classList.contains('open');
    if (isOpen) {
      content.style.height = content.scrollHeight + 'px';
      requestAnimationFrame(() => {
        content.style.height = '0px';
        content.classList.remove('open');
        header.classList.remove('open');
      });
    } else {
      content.classList.add('open');
      header.classList.add('open');
      content.style.height = content.scrollHeight + 'px';
      content.addEventListener('transitionend', () => {
        if (content.classList.contains('open')) {
          content.style.height = 'auto';
          content.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, { once: true });
    }
  });
});

// Shared boilerplate for opening/closing any .md-dialog-overlay: appends it, forces a reflow
// so the CSS transition reliably fires on first open, animates it in, and returns a close()
// that animates out and removes the element once the transition ends.
function mountMdOverlay(overlay) {
  document.body.appendChild(overlay);
  void overlay.offsetHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));

  const close = () => {
    overlay.classList.remove('show');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  return close;
}
window.mountMdOverlay = mountMdOverlay;

// Shared md-dialog builder, reused by backups.js (defined once here since app.js loads first)
function showDialog({ icon = 'info', title, body, actions, isPrimary = false }) {
  const overlay = document.createElement('div');
  overlay.className = 'md-dialog-overlay';

  const iconAttr = isPrimary ? 'style="color: var(--md-sys-color-primary) !important;"' : '';

  overlay.innerHTML = `
    <div class="md-dialog">
      <span class="material-symbols-rounded md-dialog-icon" ${iconAttr}>${icon}</span>
      <div class="md-dialog-title">${title}</div>
      <div class="md-dialog-body">${body}</div>
      <div class="md-dialog-actions">
        ${actions.map((a, i) => {
          if (a.isPrimary) {
            const style = 'background-color: var(--md-sys-color-primary) !important; color: var(--md-sys-color-on-primary) !important;';
            return `<button class="md-dialog-btn primary" style="${style}" data-idx="${i}">${a.label}</button>`;
          }
          const cls = a.confirm ? 'confirm' : 'cancel';
          return `<button class="md-dialog-btn ${cls}" data-idx="${i}">${a.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  const close = mountMdOverlay(overlay);

  actions.forEach((a, i) => {
    overlay.querySelector(`[data-idx="${i}"]`).addEventListener('click', () => {
      close();
      a.action?.();
    });
  });

  return close;
}
window.showDialog = showDialog;

(function () {
  let html5QrcodeLoaded = false;
  let html5QrcodePromise = null;

  function loadHtml5QrcodeLibrary() {
    if (html5QrcodeLoaded || window.Html5Qrcode) return Promise.resolve();
    if (html5QrcodePromise) return html5QrcodePromise;

    html5QrcodePromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = () => {
        html5QrcodeLoaded = true;
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });

    return html5QrcodePromise;
  }

  function executeManualSetup() {
    const pages = document.querySelectorAll('.page');
    const navBtns = document.querySelectorAll('.nav-item');
    
    pages.forEach(p => p.classList.remove('active'));
    const settingsPage = document.getElementById('settings');
    if (settingsPage) settingsPage.classList.add('active');

    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-item[data-page="settings"]')?.classList.add('active');

    const collapsible = document.querySelector('.settings-item.collapsible[data-target="apiConfig"]');
    const content = collapsible ? document.getElementById(collapsible.dataset.target) : null;

    setTimeout(() => {
      document.getElementById('configSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        if (content && !content.classList.contains('open')) {
          collapsible.classList.add('open');
          content.classList.add('open', 'animating');
          content.style.height = content.scrollHeight + 'px';
          content.addEventListener('transitionend', () => {
            content.style.height = 'auto';
            content.classList.remove('animating');
            setTimeout(() => content.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }, { once: true });
        }
      }, 600);
    }, 1000);
  }

  function parseQRData(rawContent) {
    if (typeof rawContent === 'object' && rawContent !== null) return rawContent;
    try {
      let parsed = JSON.parse(rawContent);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function applyConfigData(configObj) {
    if (typeof window.restoreConfigOnly === 'function') {
      window.restoreConfigOnly(configObj);
      return;
    }

    const parsed = parseQRData(configObj);
    if (!parsed) {
      showDialog({
        icon: 'error',
        title: 'Setup Failed',
        body: 'The scanned QR code does not contain valid JSON data.',
        actions: [{ label: 'OK', confirm: true }]
      });
      return;
    }

    showDialog({
      icon: 'error',
      title: 'Setup Failed',
      body: 'Configuration restore is unavailable right now. Please try again.',
      actions: [{ label: 'OK', confirm: true }]
    });
  }

  window.processQRImageFile = async function (file) {
    if (!file) return;

    if (window.Android && typeof window.Android.scanQRCode === 'function') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = window.Android.scanQRCode(e.target.result);
        if (result) {
          applyConfigData(result);
        } else {
          showDialog({
            icon: 'error',
            title: 'QR Scan Failed',
            body: 'No valid QR code found in selected image.',
            actions: [{ label: 'OK', confirm: true }]
          });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if ('BarcodeDetector' in window) {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(img);
        URL.revokeObjectURL(img.src);

        if (codes.length > 0) {
          applyConfigData(codes[0].rawValue);
          return;
        }
      } catch (err) {}
    }

    await loadHtml5QrcodeLibrary();
    if (window.Html5Qrcode) {
      try {
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp_qr_reader_' + Date.now();
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);

        const html5QrCode = new window.Html5Qrcode(tempContainer.id);
        const result = await html5QrCode.scanFile(file, true);
        tempContainer.remove();
        applyConfigData(result);
        return;
      } catch (err) {}
    }

    showDialog({
      icon: 'error',
      title: 'QR Scan Failed',
      body: 'No valid QR code found in selected image.',
      actions: [{ label: 'OK', confirm: true }]
    });
  };

  function openQRScanModal() {
    loadHtml5QrcodeLibrary();

    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';

    overlay.innerHTML = `
      <style>
        .qr-target-box {
          position: absolute;
          width: 140px;
          height: 140px;
          border: 3px solid var(--md-sys-color-primary, #6750a4);
          border-radius: 16px;
          box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }
        .qr-target-box::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 2px;
          background: var(--md-sys-color-primary, #6750a4);
          box-shadow: 0 0 8px var(--md-sys-color-primary, #6750a4);
          animation: qrScanLine 2s infinite ease-in-out;
        }
        @keyframes qrScanLine {
          0% { top: 5%; opacity: 0.2; }
          50% { top: 95%; opacity: 1; }
          100% { top: 5%; opacity: 0.2; }
        }
        .md-dialog-btn-centered {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
        }
        .md-dialog-btn-centered .material-symbols-rounded {
          font-size: 18px !important;
          line-height: 1 !important;
          display: inline-block !important;
        }
      </style>
      <div class="md-dialog qr-dialog">
        <span class="material-symbols-rounded md-dialog-icon" style="color: var(--md-sys-color-primary) !important;">qr_code_scanner</span>
        <div class="md-dialog-title">Scan Setup QR</div>
        <div class="md-dialog-body">
          <p id="qrHelpText" style="margin-bottom:12px; font-size:14px; opacity:0.8;">Fit QR code inside the frame to scan.</p>
          <div id="qrReaderRegion" style="width:100%; height:220px; background:var(--md-sys-color-surface-container-high, #f0f0f0); border-radius:16px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative;">
            <video id="qrVideo" playsinline muted autoplay style="width:100%; height:100%; object-fit:cover; display:none; opacity:0; transition:opacity 0.15s ease;"></video>
            
            <div id="qrTargetBox" class="qr-target-box" style="display:none;"></div>
            
            <div id="qrPlaceholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0.6;">
              <span class="material-symbols-rounded" style="font-size:48px;">photo_library</span>
              <span style="font-size:13px; margin-top:8px;">Select an image file</span>
            </div>
          </div>
          <input type="file" id="galleryFileInput" accept="image/*" style="display:none;" />
        </div>
        <div class="md-dialog-actions">
          <button class="md-dialog-btn cancel" id="closeQrBtn">Cancel</button>
          <button class="md-dialog-btn primary md-dialog-btn-centered" style="background-color: var(--md-sys-color-primary) !important; color: var(--md-sys-color-on-primary) !important;" id="switchModeBtn">
            <span class="material-symbols-rounded" id="switchBtnIcon">image</span> 
            <span id="switchBtnLabel">Gallery</span>
          </button>
        </div>
      </div>
    `;

    const closeOverlay = mountMdOverlay(overlay);

    const video = overlay.querySelector('#qrVideo');
    const placeholder = overlay.querySelector('#qrPlaceholder');
    const targetBox = overlay.querySelector('#qrTargetBox');
    const galleryInput = overlay.querySelector('#galleryFileInput');
    const helpText = overlay.querySelector('#qrHelpText');
    const switchBtn = overlay.querySelector('#switchModeBtn');
    const switchBtnIcon = overlay.querySelector('#switchBtnIcon');
    const switchBtnLabel = overlay.querySelector('#switchBtnLabel');

    let stream = null;
    let animFrameId = null;
    let isCameraActive = false;

    const stopCamera = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      isCameraActive = false;
      video.style.display = 'none';
      video.style.opacity = '0';
      targetBox.style.display = 'none';
    };

    const close = () => {
      stopCamera();
      closeOverlay();
    };

    const processQRImage = async (file) => {
      close();
      window.processQRImageFile(file);
    };

    const startCameraScan = async () => {
      if (window.Android && typeof window.Android.startQRScanner === 'function') {
        window.Android.startQRScanner();
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.style.display = 'block';
        video.style.opacity = '0';
        placeholder.style.display = 'none';
        targetBox.style.display = 'flex';
        helpText.textContent = 'Fit QR code inside the frame to scan.';

        video.addEventListener('loadeddata', () => {
          video.style.opacity = '1';
        }, { once: true });

        await video.play();

        isCameraActive = true;
        switchBtnIcon.textContent = 'image';
        switchBtnLabel.textContent = 'Gallery';

        if ('BarcodeDetector' in window) {
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const scanLoop = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              try {
                const codes = await detector.detect(video);
                if (codes.length > 0) {
                  close();
                  applyConfigData(codes[0].rawValue);
                  return;
                }
              } catch (e) {}
            }
            if (isCameraActive) {
              animFrameId = requestAnimationFrame(scanLoop);
            }
          };
          scanLoop();
        }
      } catch (err) {
        switchToGalleryMode();
      }
    };

    const switchToGalleryMode = () => {
      stopCamera();
      placeholder.style.display = 'flex';
      helpText.textContent = 'Select a QR code image from your gallery.';
      switchBtnIcon.textContent = 'photo_camera';
      switchBtnLabel.textContent = 'Camera';
    };

    switchBtn.addEventListener('click', () => {
      if (isCameraActive) {
        switchToGalleryMode();
        galleryInput.click();
      } else {
        startCameraScan();
      }
    });

    window.onNativeQRScanned = function (qrContent) {
      close();
      applyConfigData(qrContent);
    };

    galleryInput.addEventListener('change', (e) => processQRImage(e.target.files[0]));

    overlay.querySelector('#closeQrBtn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    startCameraScan();
  }

  const openSetupBtn = document.getElementById('openSetupBtn');
  openSetupBtn?.addEventListener('click', () => {
    showDialog({
      icon: 'dashboard_customize',
      title: 'Setup DormGuard',
      body: 'Choose how you would like to configure your DormGuard instance.',
      isPrimary: true,
      actions: [
        { label: 'Cancel' },
        { 
          label: 'Manual Setup', 
          action: executeManualSetup 
        },
        { 
          label: 'QR Setup', 
          isPrimary: true, 
          action: openQRScanModal 
        }
      ]
    });
  });
})();

let hideSeconds = false;
const clockContainer = EL.currentTime?.parentElement; 

if (clockContainer) {
  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      hideSeconds = entry.contentRect.width < getClockFontMetric(); 
    }
  });
  observer.observe(clockContainer);
}

let lastClockStr = "";
let clockRAF;

function tickClock() {
  if (!document.hidden) {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');

    const currentClockStr = hideSeconds ? `${h}:${m}` : `${h}:${m}:${s}`;

    if (currentClockStr !== lastClockStr) { 
        EL.currentTime.textContent = currentClockStr;
        lastClockStr = currentClockStr; 
    }
  }
  clockRAF = setTimeout(tickClock, 1000 - new Date().getMilliseconds());
}

tickClock();

function greetUser() {
  const h1 = EL.homeH1;
  if (!h1) return;
   h1.style.minHeight = h1.offsetHeight + 'px';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';
  let isBusy = false;

  const fade = (content, delay) => setTimeout(() => {
    h1.style.transition = 'opacity 0.5s ease';
    h1.style.opacity = '0';
    setTimeout(() => { h1.innerHTML = content; h1.style.opacity = '1'; }, 500);
  }, delay);

  setTimeout(() => {
    isBusy = true;
    fade(`${greeting}!`, 0);
    setTimeout(() => {
      fade('DormGuard', 2000);
      setTimeout(() => { isBusy = false; }, 3000);
    }, 500);
  }, 2000);

  const saveOriginals = () =>
    document.querySelectorAll('.home-bg .material-symbols-rounded').forEach(icon => {
      if (!icon.dataset.original) icon.dataset.original = icon.textContent.trim();
    });

  const iconsAtOriginal = () => {
    const icons = document.querySelectorAll('.home-bg .material-symbols-rounded');
    return [...icons].every(icon => !icon.dataset.original || icon.textContent.trim() === icon.dataset.original);
  };

  const swapIcons = to =>
    document.querySelectorAll('.home-bg .material-symbols-rounded').forEach((icon, i) => {
      setTimeout(() => {
        icon.style.cssText += ';transition:transform 0.3s ease,opacity 0.3s ease;transform:rotate(var(--r,0deg)) rotateY(90deg);opacity:0';
        setTimeout(() => {
          icon.textContent = to === 'original' ? icon.dataset.original : to;
          icon.style.transform = 'rotate(var(--r,0deg)) rotateY(0deg)';
          icon.style.opacity = '0.1';
        }, 300);
      }, i * 40);
    });

  const showMessage = (text, iconName) => {
    isBusy = true;
    const original = h1.innerHTML;
    h1.style.transition = 'opacity 0.3s ease';
    h1.style.opacity = '0';
    setTimeout(() => { h1.innerHTML = text; h1.style.opacity = '1'; }, 300);
    setTimeout(() => {
      h1.style.opacity = '0';
      setTimeout(() => { h1.innerHTML = original; h1.style.opacity = '1'; setTimeout(() => { isBusy = false; }, 500); }, 300);
    }, 2000);
    saveOriginals();
    swapIcons(iconName);
    setTimeout(() => swapIcons('original'), 2600);
  };

  if (hour >= 0 && hour < 4)
    setTimeout(() => { if (!isBusy) showMessage("Go sleep, its late", 'bedtime'); }, 7000);

  navigator.getBattery?.().then(battery => {
    const onCharge = () => showMessage(battery.charging ? 'Yummy!' : 'Ouch!', battery.charging ? 'bolt' : (battery.level * 100 > 20 ? 'error' : 'sentiment_very_dissatisfied'));
    battery.addEventListener('chargingchange', onCharge);
    if (battery.charging) onCharge();
  });

  let idleTimer = null;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!isBusy && iconsAtOriginal()) showMessage('Still there?', 'sentiment_calm'); }, 120000);
  };
  document.addEventListener('touchstart', resetIdle, { passive: true });
  resetIdle();

  let shakeIndex = 0, lastShake = 0, shakeCount = 0, shakeWindowTimer = null, shakeReady = false;
  setTimeout(() => { shakeReady = true; }, 5000);

  const shakeStates = [
    { message: 'Soo dizzy...',       icon: 'sentiment_stressed' },
    { message: 'Stop itt!',          icon: 'sentiment_neutral'  },
    { message: 'My "head" hurts T-T',icon: 'sick'               },
  ];

  const handleShake = force => {
    if (!shakeReady || isBusy || !iconsAtOriginal()) return;
    const isGreeting = h1.innerHTML.includes('Good ');
    if (isGreeting && force < 64) return;
    const now = Date.now();
    if (now - lastShake > 1500) shakeCount = 0;
    shakeCount++;
    lastShake = now;
    clearTimeout(shakeWindowTimer);
    shakeWindowTimer = setTimeout(() => { shakeCount = 0; }, 1500);
    if (shakeCount < 3) return;
    shakeCount = 0;
    clearTimeout(shakeWindowTimer);
    const { message, icon } = shakeStates[shakeIndex];
    shakeIndex = (shakeIndex + 1) % shakeStates.length;
    showMessage(message, icon);
    navigator.vibrate([32, 30, 48]);
  };

  const onMotion = e => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const force = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    if (force > 32) handleShake(force);
  };

  document.addEventListener('click', () => window.addEventListener('devicemotion', onMotion), { once: true });
}

greetUser();

EL.splash.addEventListener('click', () => navigator.vibrate(30));

const COLS = 16, ROWS = 8;
const emotes = [
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],[0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0],[0,0,0,0,1,1,0,1,0,1,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],[0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0],[0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0],[0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0],[0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
];

const cornerPixels = new Set(['0,0','0,15','7,0','7,15']);
const cells = [];
const matrixFragment = document.createDocumentFragment();

for (let r = 0; r < ROWS; r++) {
  cells[r] = [];
  for (let c = 0; c < COLS; c++) {
    const px = document.createElement('div');
    px.className = 'px';
    if (cornerPixels.has(`${r},${c}`)) px.classList.add('corner');
    matrixFragment.appendChild(px);
    cells[r][c] = px;
  }
}
EL.screen.appendChild(matrixFragment);

let emoteIndex = 0;
let emoteTimer = null;

const drawEmote = emote => {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells[r][c].classList.toggle('on', emote[r][c] === 1);
};

const startEmotes = () => {
  clearInterval(emoteTimer);
  emoteTimer = setInterval(() => {
    emoteIndex = (emoteIndex + 1) % emotes.length;
    drawEmote(emotes[emoteIndex]);
  }, 2500);
};

const stopEmotes = () => clearInterval(emoteTimer);

drawEmote(emotes[0]);
startEmotes();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof fetchServerData === 'function') {
    fetchServerData().then(() => scheduleFetch());
  }
  
  setTimeout(() => {
    const splash = EL.splash;
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
    }
  }, 1000);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(fetchTimer);
    stopEmotes();
  } else {
    startEmotes();
    if (canPoll()) fetchServerData().then(() => scheduleFetch());
  }
});

  const icon = document.getElementById("dormguard");

  icon.addEventListener("click", () => {
    icon.classList.remove("spin");
    void icon.offsetWidth;
    icon.classList.add("spin");
  });
  
  document.querySelectorAll("#settings .settings-item").forEach(item => {
  const checkbox = item.querySelector("input[type='checkbox']");
  const icon = item.querySelector(".material-symbols-rounded");

  if (!checkbox || !icon) return;

  const triggerShake = () => {
    icon.classList.remove("shake");
    void icon.offsetWidth;
    icon.classList.add("shake");
  };

  icon.addEventListener("animationend", () => {
    icon.classList.remove("shake");
  }, { once: false });

  checkbox.addEventListener("change", triggerShake);
});

document.querySelector('.app-version').addEventListener('click', async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  navigator.serviceWorker?.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
  location.reload(true);
});

// open in browser
const DOMAIN_LABELS = {
  'github.com': 'GitHub',
  'discord.gg': 'Discord',
  'discord.com': 'Discord',
  'tiktok.com': 'TikTok',
  'google.com': 'Google',
  'nodejs.org': 'Node.js',
  'uiverse.io': 'Uiverse'
};

function getDomainLabel(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const domain in DOMAIN_LABELS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return DOMAIN_LABELS[domain];
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

window.confirmOpenInBrowser = function (url, label, mayHaveApp) {
  const resolvedLabel = label || getDomainLabel(url);
  const destination = mayHaveApp ? 'browser or app' : 'browser';

  showMdConfirmDialog({
    icon: 'open_in_new',
    title: `Open in ${destination}?`,
    body: resolvedLabel ? `Open ${resolvedLabel} in your ${destination}.` : url,
    confirmLabel: 'Yes',
    onConfirm: () => {
      if (window.Android && typeof window.Android.openInBrowser === 'function') {
        window.Android.openInBrowser(url);
      } else {
        window.open(url, '_blank');
      }
    }
  });
};

// system info
(function () {
  const androidVersionEl = document.getElementById('sysAndroidVersion');
  const deviceEl = document.getElementById('sysDevice');
  const architectureEl = document.getElementById('sysArchitecture');

  if (!androidVersionEl || !deviceEl || !architectureEl) return;

  function renderSystemInfo(info) {
    if (info.androidVersion != null && info.sdkInt != null) {
      androidVersionEl.textContent = `${info.androidVersion} (SDK ${info.sdkInt})`;
    }
    if (info.manufacturer != null && info.model != null) {
      const manufacturer = String(info.manufacturer);
      const model = String(info.model);
      const capitalizedManufacturer = manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);
      deviceEl.textContent = model.toLowerCase().startsWith(manufacturer.toLowerCase())
        ? model
        : `${capitalizedManufacturer} ${model}`;
    }
    if (info.architecture != null) {
      architectureEl.textContent = info.architecture;
    }
  }

  if (window.Android && typeof window.Android.getSystemInfo === 'function') {
    try {
      const json = window.Android.getSystemInfo();
      const info = JSON.parse(json);
      renderSystemInfo(info);
    } catch (e) {
      androidVersionEl.textContent = 'Unavailable';
      deviceEl.textContent = 'Unavailable';
      architectureEl.textContent = 'Unavailable';
    }
  } else {
    const ua = navigator.userAgent;
    const androidMatch = ua.match(/Android\s([0-9.]+)/);
    androidVersionEl.textContent = androidMatch ? androidMatch[1] : 'Unavailable';
    deviceEl.textContent = 'Unavailable (web preview)';
    architectureEl.textContent = 'Unavailable (web preview)';
  }
})();