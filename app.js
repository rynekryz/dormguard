const { StatusBar } = window.Capacitor?.Plugins || {};
const { Filesystem, Share } = window.Capacitor?.Plugins || {};
const isCapacitor = !!(window.Capacitor?.isNativePlatform?.());
const getUrl = (key) => { const v = localStorage.getItem(key); if (!v) return ''; try { atob(v); return decodeURIComponent(escape(atob(v))); } catch { return v; } };

const vibrationSwitch     = document.getElementById('vibrationSwitch');
const pages               = document.querySelectorAll('.page');
const buttons             = document.querySelectorAll('.nav-item');
const mdButtons           = document.querySelectorAll('.md-btn');
const doorStatusEl        = document.getElementById('doorStatus');
const currentTimeEl       = document.getElementById('currentTime');
const eventListEl         = document.getElementById('eventList');
const lastOpenedEl        = document.getElementById('LastOpened');
const fullDatBtn          = document.getElementById('fulldat');
const latestDatBtn        = document.getElementById('latestdat');
const viewDatBtn          = document.getElementById('viewdat');
const alertToggle         = document.getElementById('alertToggle');
const alertSwitch         = document.getElementById('alertSwitch');
const darkModeSwitch      = document.getElementById('darkModeSwitch');
const contrastSwitch      = document.getElementById('contrastSwitch');
const reduceMotionSwitch  = document.getElementById('reduceMotionSwitch');
const themeMeta           = document.querySelector('meta[name="theme-color"]');
const defaultMetaColor    = 'rgb(252, 248, 248)';

window.API_KEY = getUrl('api_url');

let vibrationEnabled = localStorage.getItem('vibration') !== 'off';
if (vibrationSwitch) vibrationSwitch.checked = !vibrationEnabled;

const _vibrate = navigator.vibrate.bind(navigator);
navigator.vibrate = (pattern) => {
  if (vibrationEnabled) return _vibrate(pattern);
  return false;
};

if (vibrationSwitch) {
  vibrationSwitch.addEventListener('change', () => {
    vibrationEnabled = !vibrationSwitch.checked;
    localStorage.setItem('vibration', vibrationEnabled ? 'on' : 'off');
  });
}

let doorOpenTimer    = null;
let doorOpenInterval = null;
let alertDisabled    = false;
let alertEnabled     = true;
let isDownloading    = false;

function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  currentTimeEl.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

if (alertSwitch) {
  alertEnabled = localStorage.getItem('alert') === 'on';
  alertSwitch.checked = alertEnabled;

  alertSwitch.addEventListener('change', () => {
    alertEnabled = alertSwitch.checked;
    localStorage.setItem('alert', alertEnabled ? 'on' : 'off');

    if (!alertEnabled && doorOpenInterval) {
      clearInterval(doorOpenInterval);
      doorOpenInterval = null;
      alertToggle.textContent = 'No Alert';
      doorStatusEl.style.color = '';
      alertDisabled = false;
    }
  });
}

function addEvent(text, time = null) {
  const li = document.createElement('li');
  li.textContent = `${time || new Date().toLocaleTimeString()} — ${text}`;
  eventListEl.prepend(li);
}

function formatAMPM(date) {
  if (!(date instanceof Date) || isNaN(date)) return '-';
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return '-';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function fetchSheetData() {
  try {
    const res = await fetch(window.API_KEY);
    const raw = await res.json();
    const rows = raw.values || raw || [];

    const history = rows.slice(0).reverse().map(row => {
      let door    = row.door || row[2] || 'UNKNOWN';
      let rawTime = row.time || row[0];
      let rawDate = row.date || row[1];

      let time = '-', date = '-';
      if (rawTime) { const d = new Date(rawTime); if (!isNaN(d)) time = formatAMPM(d); }
      if (rawDate) { const d = new Date(rawDate); if (!isNaN(d)) date = formatDate(d); }
      return { time, date, door };
    });

    const lastRow    = history[0] || { door: 'UNKNOWN' };
    const lastOpened = history.find(e => e.door === 'OPEN');
    return { current: { door: lastRow.door }, history, lastOpened: lastOpened || null };
  } catch (err) {
    console.error('fetch failed', err);
    return null;
  }
}

async function fetchServerData() {
  try {
    const data = await fetchSheetData();
    if (!data) return;

    doorStatusEl.textContent = data.current.door;

    eventListEl.innerHTML = '';
data.history.forEach(item => {
  const li = document.createElement('li');
  const isOpen = item.door.toLowerCase() === 'open';
li.classList.add(isOpen ? 'open' : 'closed');
li.innerHTML = `
  <span class="log-icon">
    <span class="material-symbols-rounded">${isOpen ? 'lock_open' : 'lock'}</span>
  </span>
  <span class="log-datetime">${item.time} | ${item.date}</span>
  <span class="log-door">${item.door}</span>
`;
  eventListEl.append(li);
});

if (data.lastOpened) {
  const [time, period] = data.lastOpened.time.split(' ');
  const [hour, min] = time.split(':');

  const newHour = hour.padStart(2, '0');
  const newMin = min;

  const hourEl = document.getElementById('lastOpenedHour');
  const minEl = document.getElementById('lastOpenedMin');

  const changed = hourEl.textContent !== newHour || minEl.textContent !== newMin;

  hourEl.textContent = newHour;
  minEl.textContent = newMin;
  document.getElementById('lastOpenedDate').textContent = data.lastOpened.date;

  if (changed) {
    const lastOpened = document.getElementById('LastOpened');
    lastOpened.classList.remove('pop');
    void lastOpened.offsetWidth;
    lastOpened.classList.add('pop');
    if (navigator.vibrate) navigator.vibrate(48);
  }
} else {
  document.getElementById('lastOpenedHour').textContent = '-';
  document.getElementById('lastOpenedMin').textContent = '';
}
  } catch (err) {
    console.error('UI update failed', err);
  }
}

viewDatBtn?.addEventListener('click', () => {
  const url = getUrl('sheets_url');
  if (!url) return;
  window.open(url, '_blank');
});

async function downloadCSV(filename, limit = null) {
  if (isDownloading) return;
  isDownloading = true;

  const btn      = limit ? latestDatBtn : fullDatBtn;
  const otherBtn = limit ? fullDatBtn : latestDatBtn;
  const origText = btn.textContent;

  btn.textContent   = '';
  btn.disabled      = true;
  otherBtn.disabled = true;

  const spinner = document.createElement('md-circular-progress');
  spinner.setAttribute('indeterminate', '');
  btn.appendChild(spinner);

  try {
    const data = await fetchSheetData();
    if (!data) return;

    const rows = limit ? data.history.slice(0, limit) : data.history;
    const csv  = ['Time,Date,Door']
      .concat(rows.map(e => `${e.time},${e.date},${e.door}`))
      .join('\n');

    if (isCapacitor && Filesystem) {
      await Filesystem.writeFile({
        path: filename,
        data: btoa(unescape(encodeURIComponent(csv))),
        directory: 'CACHE',
        encoding: 'BASE64'
      });
      const fileResult = await Filesystem.getUri({
        path: filename,
        directory: 'CACHE'
      });
      await Share?.share({
        title: filename,
        url: fileResult.uri,
        dialogTitle: 'Save CSV'
      });
    } else {
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href     = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  } finally {
    spinner.remove();
    btn.textContent   = origText;
    btn.disabled      = false;
    otherBtn.disabled = false;
    isDownloading     = false;
  }
}

fullDatBtn.addEventListener('click',   () => downloadCSV('full_records.csv'));
latestDatBtn.addEventListener('click', () => downloadCSV('latest_records.csv', 50));

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(32);
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.page).classList.add('active');
    document.querySelector('.toast-emote')?.remove();
  });
});

mdButtons.forEach(btn => {
  btn.addEventListener('click', e => {
    const circle = document.createElement('span');
    circle.classList.add('ripple');
    btn.appendChild(circle);
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    circle.style.width  = circle.style.height = d + 'px';
    circle.style.left   = e.clientX - btn.getBoundingClientRect().left - d / 2 + 'px';
    circle.style.top    = e.clientY - btn.getBoundingClientRect().top  - d / 2 + 'px';
    circle.classList.add('ripple-animate');
    circle.addEventListener('animationend', () => circle.remove());
  });
});

function getCurrentTheme() {
  return document.body.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(theme);
}

function applyContrastForCurrentTheme() {
  document.body.classList.remove('contrast-light', 'contrast-dark');
  if (!contrastSwitch.checked) return;
  document.body.classList.add(getCurrentTheme() === 'dark' ? 'contrast-dark' : 'contrast-light');
}

function updateThemeColor() {
  const bg = getComputedStyle(document.body)
    .getPropertyValue('--md-sys-color-surface')
    .trim();
  themeMeta?.setAttribute('content', bg || defaultMetaColor);

  const isDark = document.body.classList.contains('dark');
  if (StatusBar) {
    try {
      StatusBar.setBackgroundColor({ color: isDark ? '#121212' : '#fcf8f8' });
      StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
    } catch(e) {}
  }
}

darkModeSwitch.addEventListener('change', () => {
  const theme = darkModeSwitch.checked ? 'dark' : 'light';
  applyTheme(theme);
  applyContrastForCurrentTheme();
  localStorage.setItem('theme', theme);
  updateThemeColor();
});

contrastSwitch.addEventListener('change', () => {
  applyContrastForCurrentTheme();
  localStorage.setItem('contrast', contrastSwitch.checked ? 'on' : 'off');
  updateThemeColor();
});

(function restoreSettings() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  darkModeSwitch.checked = savedTheme === 'dark';

  if (localStorage.getItem('contrast') === 'on') {
    contrastSwitch.checked = true;
    applyContrastForCurrentTheme();
  }
})();

if (window.Capacitor) {
  document.addEventListener('deviceready', updateThemeColor);
  setTimeout(updateThemeColor, 500);
} else {
  updateThemeColor();
}

reduceMotionSwitch.addEventListener('change', () => {
  document.body.classList.toggle('no-animation', reduceMotionSwitch.checked);
  localStorage.setItem('reduceMotion', reduceMotionSwitch.checked ? 'on' : 'off');
});

if (localStorage.getItem('reduceMotion') === 'on') {
  document.body.classList.add('no-animation');
  reduceMotionSwitch.checked = true;
}

document.addEventListener('contextmenu', e => e.preventDefault());
const configArea = document.querySelector('.user-config');

document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && configArea && !configArea.contains(e.target)) {
    e.preventDefault();
  }
});

document.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/dormguard-app/sw.js');
}

document.querySelectorAll('.collapsible').forEach(header => {
  header.addEventListener('click', () => {
    const content = document.getElementById(header.dataset.target);
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

document.getElementById('openSetupBtn').addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const settingsPage = document.getElementById('settings');
  settingsPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-item[data-page="settings"]').classList.add('active');

  const collapsible = document.querySelector('.settings-item.collapsible[data-target="apiConfig"]');
  const content     = document.getElementById(collapsible.dataset.target);

  setTimeout(() => {
    const targetSection = document.getElementById('configSection');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        if (!content.classList.contains('open')) {
          collapsible.classList.add('open');
          content.classList.add('open', 'animating');
          content.style.height = content.scrollHeight + 'px';

          content.addEventListener('transitionend', () => {
            content.style.height = 'auto';
            content.classList.remove('animating');
            setTimeout(() => {
              content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }, { once: true });
        }
      }, 600);
    }
  }, 1000);
});

setInterval(fetchServerData, 5000);
fetchServerData();

// greetings

let shakeReady = false;
setTimeout(() => { shakeReady = true; }, 5000);

function greetUser() {
  const h1 = document.querySelector('#home h1');
  if (!h1) return;

  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? 'Good Morning' :
    hour < 17 ? 'Good Afternoon' :
    hour < 21 ? 'Good Evening' :
    'Good Night';

  const greetText = `${greeting}!`;

  let isBusy = false;

  const fade = (content, delay) => setTimeout(() => {
    h1.style.transition = 'opacity 0.5s ease';
    h1.style.opacity = '0';
    setTimeout(() => { h1.innerHTML = content; h1.style.opacity = '1'; }, 500);
  }, delay);

  setTimeout(() => {
    isBusy = true;
    fade(greetText, 0);
    setTimeout(() => {
      fade('DormGuard', 2000);
      setTimeout(() => { isBusy = false; }, 3000);
    }, 500);
  }, 2000);

  const saveOriginals = () => {
    document.querySelectorAll('.home-bg .material-symbols-rounded').forEach(icon => {
      if (!icon.dataset.original) icon.dataset.original = icon.textContent.trim();
    });
  };

  const iconsAtOriginal = () => {
    const icons = document.querySelectorAll('.home-bg .material-symbols-rounded');
    return [...icons].every(icon => !icon.dataset.original || icon.textContent.trim() === icon.dataset.original);
  };

  const swapIcons = (to) => {
    document.querySelectorAll('.home-bg .material-symbols-rounded').forEach((icon, i) => {
      setTimeout(() => {
        icon.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        icon.style.transform = `rotate(var(--r, 0deg)) rotateY(90deg)`;
        icon.style.opacity = '0';
        setTimeout(() => {
          icon.textContent = to === 'original' ? icon.dataset.original : to;
          icon.style.transform = `rotate(var(--r, 0deg)) rotateY(0deg)`;
          icon.style.opacity = '0.1';
        }, 300);
      }, i * 40);
    });
  };

  const showMessage = (text, iconName) => {
    isBusy = true;
    const original = h1.innerHTML;
    h1.style.transition = 'opacity 0.3s ease';
    h1.style.opacity = '0';
    setTimeout(() => { h1.innerHTML = text; h1.style.opacity = '1'; }, 300);
    setTimeout(() => {
      h1.style.opacity = '0';
      setTimeout(() => {
        h1.innerHTML = original;
        h1.style.opacity = '1';
        setTimeout(() => { isBusy = false; }, 500);
      }, 300);
    }, 2000);

    saveOriginals();
    swapIcons(iconName);
    setTimeout(() => swapIcons('original'), 2600);
  };

  const isGreeting = () => {
    const current = h1.innerHTML;
    return current.includes('Good Morning') || current.includes('Good Afternoon') ||
           current.includes('Good Evening') || current.includes('Good Night');
  };

  if (hour >= 0 && hour < 4) {
    setTimeout(() => {
      if (!isBusy) showMessage("Go sleep, its late", 'bedtime');
    }, 7000);
  }

if (navigator.getBattery) {
  navigator.getBattery().then(battery => {
    battery.addEventListener('chargingchange', () => {
      showMessage(battery.charging ? 'Yummy!' : 'Ouch!',
        battery.charging ? 'bolt' : (battery.level * 100 > 20 ? 'error' : 'sentiment_very_dissatisfied'));
      showEmoteToast('Bzzzt!');
    });
    if (battery.charging) {
      showMessage('Yummy!', 'bolt');
      showEmoteToast('Bzzzt!');
    }
  });
}

  let idleTimer = null;

  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!isBusy && iconsAtOriginal()) showMessage('Still there?', 'sentiment_calm');
    }, 120000);
  };

  document.addEventListener('touchstart', resetIdle);
  resetIdle();

  let shakeIndex = 0;
  let lastShake = 0;
  let shakeCount = 0;
  let shakeWindowTimer = null;

  const shakeStates = [
    { message: 'Soo dizzy...', icon: 'sentiment_stressed' },
    { message: 'Stop itt!',                  icon: 'sentiment_neutral' },
    { message: 'My "head" hurts T-T',     icon: 'sick' },
  ];

  const handleShake = (force) => {
    if (!shakeReady || isBusy || !iconsAtOriginal()) return;
    if (isGreeting() && force < 64) return;

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
    if (navigator.vibrate) navigator.vibrate([32, 30, 48]);
  };

  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const force = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    if (force > 32) handleShake(force);
  }

  document.addEventListener('click', function initMotion() {
    document.removeEventListener('click', initMotion);
    window.addEventListener('devicemotion', onMotion);
  }, { once: true });
}

greetUser();

window.addEventListener('load', () => {
  const splash = document.getElementById('splash');
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 400);
});

document.getElementById('splash').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate(30);
});


         const COLS = 16;
         const ROWS = 8;
         
         const emotes = [
           // ^_^ (Hi)
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
             [0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],
             [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         
           // >_<
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
             [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
             [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
             [0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         
           // ^w^
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0],
             [0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0],
             [0,0,0,0,1,1,0,1,0,1,1,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         
           // o_o
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
             [0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0],
             [0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0],
             [0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         
           // -_- 
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         
           // z_z 
           [
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
             [0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0],
             [0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
             [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
           ],
         ];
         
         const screen = document.getElementById('screen');
         const cells = [];
         
         const cornerPixels = new Set([
           '0,0',   
           '0,15',  
           '7,0',   
           '7,15',  
         ]);
         
         for (let r = 0; r < ROWS; r++) {
           cells[r] = [];
           for (let c = 0; c < COLS; c++) {
             const px = document.createElement('div');
             px.className = 'px';
             if (cornerPixels.has(`${r},${c}`)) px.classList.add('corner');
             screen.appendChild(px);
             cells[r][c] = px;
           }
         }
         
         function drawEmote(emote) {
           for (let r = 0; r < ROWS; r++) {
             for (let c = 0; c < COLS; c++) {
               cells[r][c].classList.toggle('on', emote[r][c] === 1);
             }
           }
         }
         
         let i = 0;
         drawEmote(emotes[i]);
         
         setInterval(() => {
           i = (i + 1) % emotes.length;
           drawEmote(emotes[i]);
         }, 2500);