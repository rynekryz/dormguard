(function () {
  const QR_CONFIG_KEYS = ['ctrls_url', 'sheets_url', 'api_url'];

  const QRCodeEngine = (function () {
    let scriptLoaded = false;
    let loadPromise = null;

    function loadLibrary() {
      if (scriptLoaded || window.qrcode) return Promise.resolve();
      if (loadPromise) return loadPromise;

      loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
        script.onload = () => {
          scriptLoaded = true;
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load QR code library script.'));
        document.head.appendChild(script);
      });

      return loadPromise;
    }

    function encode(text) {
      if (!window.qrcode) {
        throw new Error('QR Engine not loaded yet. Call loadLibrary() first.');
      }

      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();

      const count = qr.getModuleCount();
      const matrix = Array.from({ length: count }, () => new Array(count).fill(0));

      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          matrix[r][c] = qr.isDark(r, c) ? 1 : 0;
        }
      }

      return { matrix, size: count };
    }

    loadLibrary().catch(() => {});

    return { encode, loadLibrary };
  })();

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

    document.body.appendChild(overlay);
    void overlay.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));

    const close = () => {
      overlay.classList.remove('show');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    actions.forEach((a, i) => {
      overlay.querySelector(`[data-idx="${i}"]`).addEventListener('click', () => {
        close();
        a.action?.();
      });
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return close;
  }

  function stampNow() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  function getFullStoragePayload() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('dormguard_backup_') && key !== 'cached_logs' && key !== 'feedCache_v1') {
        const val = localStorage.getItem(key);
        try {
          data[key] = JSON.parse(val);
        } catch (e) {
          data[key] = val;
        }
      }
    }
    return JSON.stringify({ v: 1, data: data });
  }

  function getConfigOnlyPayload() {
    const data = {};
    QR_CONFIG_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val !== null && val !== undefined) {
        try {
          data[key] = JSON.parse(val);
        } catch (e) {
          data[key] = val;
        }
      }
    });
    return JSON.stringify({ v: 1, data: data });
  }

  function backupData() {
    const payload = JSON.stringify(JSON.parse(getFullStoragePayload()), null, 2);
    const filename = `dormguard_backup_${stampNow()}.dormguard`;

    if (window.Android && typeof window.Android.saveFile === 'function') {
      window.Android.saveFile(filename, payload, 'application/octet-stream');
    } else {
      const blob = new Blob([payload], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    showDialog({
      icon: 'check_circle',
      title: 'Backup Downloaded',
      body: 'Your complete configuration backup file has been saved.',
      isPrimary: true,
      actions: [{ label: 'OK', isPrimary: true }]
    });
  }

  async function exportAsQR() {
    try {
      await QRCodeEngine.loadLibrary();
    } catch (err) {
      showDialog({
        icon: 'error',
        title: 'Error',
        body: 'Failed to load QR code generator library. Please check your network connection.',
        actions: [{ label: 'OK', confirm: true }]
      });
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';

    overlay.innerHTML = `
      <style>
        .qr-export-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 12px;
        }
        .qr-canvas-wrapper {
          position: relative;
          padding: 16px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
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
      <div class="md-dialog">
        <span class="material-symbols-rounded md-dialog-icon" style="color: var(--md-sys-color-primary) !important;">qr_code_2</span>
        <div class="md-dialog-title">Backup QR Code</div>
        <div class="md-dialog-body">
          <p style="font-size:14px; opacity:0.8; margin-bottom:8px;">Scan this QR code from another device to transfer your connection settings.</p>
          <div class="qr-export-container">
            <div class="qr-canvas-wrapper" id="qrCanvasWrapper">
              <canvas id="exportQrCanvas" style="width:220px; height:220px; max-width:100%; image-rendering: pixelated;"></canvas>
            </div>
          </div>
        </div>
        <div class="md-dialog-actions">
          <button class="md-dialog-btn cancel" id="closeExportQrBtn">Close</button>
          <button class="md-dialog-btn primary md-dialog-btn-centered" style="background-color: var(--md-sys-color-primary) !important; color: var(--md-sys-color-on-primary) !important;" id="downloadQrBtn">
            <span class="material-symbols-rounded">download</span>
            <span>Save Image</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    void overlay.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));

    const close = () => {
      overlay.classList.remove('show');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    const canvas = overlay.querySelector('#exportQrCanvas');
    const qrData = getConfigOnlyPayload();

    const renderQR = () => {
      const { matrix, size } = QRCodeEngine.encode(qrData);

      const pxPerModule = 10;
      const margin = 4;
      const canvasSize = (size + margin * 2) * pxPerModule;

      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      ctx.fillStyle = '#000000';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c] === 1) {
            ctx.fillRect((c + margin) * pxPerModule, (r + margin) * pxPerModule, pxPerModule, pxPerModule);
          }
        }
      }
    };

    renderQR();

    overlay.querySelector('#downloadQrBtn').addEventListener('click', () => {
      const border = 20;
      const exportSize = canvas.width + border * 2;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportSize, exportSize);
      ctx.drawImage(canvas, border, border);

      const filename = `dormguard_qr_${stampNow()}.png`;
      const dataUrl = exportCanvas.toDataURL('image/png');

      if (window.Android && typeof window.Android.saveFile === 'function') {
        window.Android.saveFile(filename, dataUrl.split(',')[1], 'image/png');
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });

    overlay.querySelector('#closeExportQrBtn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  function syncNativeDynamicColor() {
    if (window.Android && typeof window.Android.setDynamicColorEnabled === 'function') {
      const restoredValue = localStorage.getItem('dynamicColorEnabled') === 'true';
      window.Android.setDynamicColorEnabled(restoredValue);
    }
  }

  window.restoreData = function (jsonContent) {
    try {
      let parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);

      const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      let count = 0;

      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('dormguard_backup_') && key !== 'cached_logs' && key !== 'feedCache_v1' && key !== 'v') {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            count++;
          }
        }
      }

      if (count === 0) throw new Error('No valid properties restored.');

      syncNativeDynamicColor();

      showDialog({
        icon: 'check_circle',
        title: 'Restore Complete',
        body: `Successfully restored ${count} settings. The app will now reload.`,
        isPrimary: true,
        actions: [{
          label: 'OK',
          isPrimary: true,
          action: () => location.reload()
        }]
      });
    } catch (err) {
      showDialog({
        icon: 'error',
        title: 'Invalid File',
        body: 'Could not restore configuration. The data appears to be corrupted or formatted incorrectly.',
        actions: [{ label: 'OK', confirm: true }]
      });
    }
  };

  window.restoreConfigOnly = function (jsonContent) {
    try {
      let parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);

      const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      let count = 0;

      QR_CONFIG_KEYS.forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          count++;
        }
      });

      if (count === 0) throw new Error('No valid configuration keys found in QR data.');

      showDialog({
        icon: 'check_circle',
        title: 'Setup Complete',
        body: `Successfully imported ${count} configuration setting(s). The app will now reload.`,
        isPrimary: true,
        actions: [{
          label: 'OK',
          isPrimary: true,
          action: () => location.reload()
        }]
      });
    } catch (err) {
      showDialog({
        icon: 'error',
        title: 'Invalid QR Code',
        body: 'The scanned QR code does not contain valid DormGuard configuration data.',
        actions: [{ label: 'OK', confirm: true }]
      });
    }
  };

  function processFileInput(file) {
    if (!file) return;

    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
      if (typeof window.processQRImageFile === 'function') {
        window.processQRImageFile(file);
      } else {
        showDialog({
          icon: 'error',
          title: 'QR Engine Unavailable',
          body: 'The QR scanner library is not loaded. Please try scanning via Setup QR mode.',
          actions: [{ label: 'OK', confirm: true }]
        });
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      window.restoreData(e.target.result);
    };
    reader.readAsText(file);
  }

  function triggerFilePicker() {
    if (window.Android && typeof window.Android.restoreData === 'function') {
      window.Android.restoreData();
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.dormguard,image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) processFileInput(file);
      };
      input.click();
    }
  }

  function confirmRestorePrompt() {
    showDialog({
      icon: 'history',
      title: 'Restore Backup?',
      body: 'Select a .dormguard file to restore all your settings, or a QR code image to restore your connection config only.',
      isPrimary: true,
      actions: [
        { label: 'Cancel' },
        { label: 'Choose File', isPrimary: true, action: triggerFilePicker }
      ]
    });
  }

  document.getElementById('backupBtn')?.addEventListener('click', () => {
    showDialog({
      icon: 'backup',
      title: 'Backup Data',
      body: 'Export a local backup of everything, or generate a QR code containing just your connection settings.',
      isPrimary: true,
      actions: [
        { label: 'Cancel' },
        { label: 'Export as QR', action: exportAsQR },
        { label: 'Backup File', isPrimary: true, action: backupData }
      ]
    });
  });

  document.getElementById('restoreBtn')?.addEventListener('click', confirmRestorePrompt);

  window.confirmReset = function () {
    showDialog({
      icon: 'warning',
      title: 'Reset All Data?',
      body: 'This will permanently erase all app data. This cannot be undone.',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Reset',
          confirm: true,
          action: () => {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (!k.startsWith('dormguard_backup_')) keysToRemove.push(k);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            if (window.Android && typeof window.Android.setDynamicColorEnabled === 'function') {
              window.Android.setDynamicColorEnabled(false);
            }

            location.reload();
          }
        }
      ]
    });
  };
})();