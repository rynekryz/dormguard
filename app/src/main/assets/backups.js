(function () {
  const QR_CONFIG_KEYS = ['ctrls_url', 'sheets_url', 'api_url'];
  const ENC_PREFIX = 'DGENC1:';
  const PBKDF2_ITERATIONS = 250000;

  const CryptoEngine = (function () {
    function toBase64(bytes) {
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      return btoa(binary);
    }

    function fromBase64(str) {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }

    async function deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    async function encrypt(plaintext, password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const enc = new TextEncoder();
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext)));
      const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(ciphertext, salt.length + iv.length);
      return ENC_PREFIX + toBase64(combined);
    }

    async function decrypt(encoded, password) {
      const combined = fromBase64(encoded.slice(ENC_PREFIX.length));
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);
      const key = await deriveKey(password, salt);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return new TextDecoder().decode(plaintext);
    }

    function isEncrypted(text) {
      return typeof text === 'string' && text.startsWith(ENC_PREFIX);
    }

    return { encrypt, decrypt, isEncrypted };
  })();

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

      const qr = window.qrcode(0, 'L');
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

  function promptPassword({ title, body, confirmLabel }) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'md-dialog-overlay';

      overlay.innerHTML = `
        <style>
          .pw-input-wrapper {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .pw-input {
            flex: 1;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--md-sys-color-outline, #ccc);
            background: var(--md-sys-color-surface, #fff);
            color: var(--md-sys-color-on-surface, #000);
            font-size: 14px;
            outline: none;
          }
          .pw-input:focus {
            border-color: var(--md-sys-color-primary, #ccc);
          }
          .pw-toggle-visibility {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            color: var(--md-sys-color-on-surface-variant, #666);
          }
        </style>
        <div class="md-dialog">
          <span class="material-symbols-rounded md-dialog-icon" style="color: var(--md-sys-color-primary) !important;">lock</span>
          <div class="md-dialog-title">${title}</div>
          <div class="md-dialog-body">
            <p style="font-size:14px; opacity:0.8; margin-bottom:4px;">${body}</p>
            <div class="pw-input-wrapper">
              <input type="password" class="pw-input" id="pwPromptInput" placeholder="Password" autocomplete="off">
              <button class="pw-toggle-visibility" id="pwPromptToggle" type="button">
                <span class="material-symbols-rounded">visibility</span>
              </button>
            </div>
          </div>
          <div class="md-dialog-actions">
            <button class="md-dialog-btn cancel" id="pwPromptCancel">Cancel</button>
            <button class="md-dialog-btn primary" id="pwPromptConfirm">${confirmLabel}</button>
          </div>
        </div>
      `;

      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        close();
        resolve(value);
      };

      const close = mountMdOverlay(overlay);

      const input = overlay.querySelector('#pwPromptInput');
      const toggleBtn = overlay.querySelector('#pwPromptToggle');
      const confirmBtn = overlay.querySelector('#pwPromptConfirm');

      toggleBtn.addEventListener('click', () => {
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        toggleBtn.querySelector('.material-symbols-rounded').textContent = isText ? 'visibility' : 'visibility_off';
      });

      confirmBtn.addEventListener('click', () => finish(input.value));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') finish(input.value);
      });
      overlay.querySelector('#pwPromptCancel').addEventListener('click', () => finish(null));
      overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });

      setTimeout(() => input.focus(), 50);
    });
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

  // backup
  function isEncryptionEnabled() {
    return localStorage.getItem('backupEncryptionEnabled') === 'true';
  }

  async function backupData() {
    let payload = JSON.stringify(JSON.parse(getFullStoragePayload()), null, 2);

    if (isEncryptionEnabled()) {
      const password = await promptPassword({
        title: 'Encrypt Backup',
        body: 'Enter a password to encrypt this backup. You will need it to restore.',
        confirmLabel: 'Encrypt'
      });
      if (!password) return;
      payload = await CryptoEngine.encrypt(payload, password);
    }

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

    let qrData = getConfigOnlyPayload();

    if (isEncryptionEnabled()) {
      const password = await promptPassword({
        title: 'Encrypt Backup',
        body: 'Enter a password to encrypt this QR code. You will need it to restore.',
        confirmLabel: 'Encrypt'
      });
      if (!password) return;
      qrData = await CryptoEngine.encrypt(qrData, password);
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
          width: 260px;
          height: 260px;
          max-width: 100%;
          box-sizing: border-box;
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
              <canvas id="exportQrCanvas" style="width:100%; height:100%; image-rendering: pixelated;"></canvas>
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

    const close = mountMdOverlay(overlay);

    const canvas = overlay.querySelector('#exportQrCanvas');

    const renderQR = () => {
      const { matrix, size } = QRCodeEngine.encode(qrData);

      const margin = 4;
      const pxPerModule = 8;
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

  // restore
  async function resolveContent(rawContent) {
    const content = rawContent;

    if (CryptoEngine.isEncrypted(content)) {
      while (true) {
        const password = await promptPassword({
          title: 'Encrypted Backup',
          body: 'This backup is encrypted. Enter the password to restore it.',
          confirmLabel: 'Decrypt'
        });

        if (!password) return null;

        try {
          return await CryptoEngine.decrypt(content, password);
        } catch (err) {
          const retry = await new Promise(resolve => {
            showDialog({
              icon: 'error',
              title: 'Wrong Password',
              body: 'Could not decrypt the backup with that password. Try again?',
              actions: [
                { label: 'Cancel', action: () => resolve(false) },
                { label: 'Retry', isPrimary: true, action: () => resolve(true) }
              ]
            });
          });
          if (!retry) return null;
        }
      }
    }

    return content;
  }

  window.restoreData = async function (jsonContent) {
    try {
      const resolved = await resolveContent(jsonContent);
      if (resolved === null) return;

      let parsed = typeof resolved === 'string' ? JSON.parse(resolved) : resolved;
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

  window.restoreConfigOnly = async function (jsonContent) {
    try {
      const resolved = await resolveContent(jsonContent);
      if (resolved === null) return;

      let parsed = typeof resolved === 'string' ? JSON.parse(resolved) : resolved;
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

  const encryptSwitch = document.getElementById('encryptBackupSwitch');
  if (encryptSwitch) {
    encryptSwitch.checked = isEncryptionEnabled();

    encryptSwitch.addEventListener('change', () => {
      localStorage.setItem('backupEncryptionEnabled', encryptSwitch.checked ? 'true' : 'false');
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