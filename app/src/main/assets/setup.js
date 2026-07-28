document.addEventListener("DOMContentLoaded", () => {
  const stpPages = document.querySelector(".stp-pages");
  const dots = document.querySelectorAll(".stp-dot");

  const enc = (str) => btoa(unescape(encodeURIComponent(str)));
  const dec = (str) => { try { return decodeURIComponent(escape(atob(str))); } catch { return str; } };
  const getUrl = (key) => { const v = localStorage.getItem(key); if (!v) return ''; try { atob(v); return dec(v); } catch { return v; } };
  const setUrl = (key, val) => localStorage.setItem(key, enc(val));

  const haptic = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  const GAS_BASE = "https://script.google.com/macros/s/";
  const GAS_SUFFIX = "/exec";

  const isFullUrl = (val) => /^https?:\/\//i.test((val || "").trim());

  const buildGasUrl = (idOrUrl) => {
    const val = (idOrUrl || "").trim();
    if (!val) return "";
    if (isFullUrl(val)) return val.replace(/\/+$/, "");
    return GAS_BASE + val.replace(/^\/+|\/+$/g, "") + GAS_SUFFIX;
  };

  const extractGasId = (url) => {
    const match = (url || "").match(/\/macros\/s\/([^/]+)\/exec/i);
    return match ? match[1] : (url || "");
  };

  const saveUrlSafely = (key, idOrUrl) => {
    const fullUrl = buildGasUrl(idOrUrl);
    if (!isFullUrl(fullUrl)) return false;
    setUrl(key, fullUrl);
    return true;
  };

  if (stpPages && dots.length) {
    const totalPages = dots.length;

    let scrollTicking = false;
    const updateDots = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const width = stpPages.clientWidth || 1;
          const index = Math.round(stpPages.scrollLeft / width);
          dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };

    stpPages.addEventListener("scroll", updateDots, { passive: true });
    window.addEventListener("resize", updateDots, { passive: true });

    const scrollToPage = (index) => {
      stpPages.scrollTo({ left: stpPages.clientWidth * index, behavior: "smooth" });
    };

    const nextPage = () => {
      const width = stpPages.clientWidth || 1;
      const current = Math.round(stpPages.scrollLeft / width);
      scrollToPage((current + 1) % totalPages);
    };

    const firstPage = document.querySelector(".stp-page");
    if (firstPage) {
      const mainCard = firstPage.querySelector(".stp-alone .stp-card");
      const gridCards = firstPage.querySelectorAll(".stp-grid .stp-card");

      if (mainCard)     mainCard.addEventListener("click", () => scrollToPage(1));
      if (gridCards[0]) gridCards[0].addEventListener("click", () => scrollToPage(2));
      if (gridCards[1]) gridCards[1].addEventListener("click", () => scrollToPage(3));
    }

    document.querySelectorAll(".stp-next").forEach(btn => {
      btn.addEventListener("click", nextPage);
    });
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';

  function scrambleDecode(textarea, finalText, duration = 1500, delay = 300, onDone) {
    let cancelled = false;
    const cancel = () => { cancelled = true; };

    setTimeout(() => {
      if (cancelled) return;
      textarea.classList.add('decoding');

      const hapticInterval = setInterval(() => {
        if (cancelled) { clearInterval(hapticInterval); return; }
        haptic([22, 20]);
      }, 90);

      const len = finalText.length;
      const start = Date.now();
      const resolved = new Array(len).fill(false);

      const frame = () => {
        if (cancelled) {
          clearInterval(hapticInterval);
          textarea.value = finalText;
          textarea.classList.remove('decoding');
          if (onDone) onDone();
          return;
        }

        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const resolveCount = Math.floor(progress * len);

        for (let i = 0; i < resolveCount; i++) resolved[i] = true;

        let display = '';
        for (let i = 0; i < len; i++) {
          if (resolved[i]) {
            display += finalText[i];
          } else {
            display += chars[Math.floor(Math.random() * chars.length)];
          }
        }

        textarea.value = display;

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          textarea.value = finalText;
          textarea.classList.remove('decoding');
          clearInterval(hapticInterval);
          if (onDone) onDone();
        }
      };

      requestAnimationFrame(frame);
    }, delay);

    return cancel;
  }

  let toastQueue = [];
  let toastRunning = false;

  function showToast(icon, message) {
    toastQueue.push({ icon, message });
    if (!toastRunning) runToastQueue();
  }

  function runToastQueue() {
    if (!toastQueue.length) { toastRunning = false; return; }
    toastRunning = true;
    const { icon, message } = toastQueue.shift();

    haptic(30);

    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="material-symbols-rounded">${icon}</span>${message}`;
    document.body.appendChild(toast);
    void toast.offsetHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add("show"));
    });

    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => {
        toast.remove();
        runToastQueue();
      }, { once: true });
    }, 2500);
  }

  const emoteToastMessages = [
    'W-what?', "Don't touch me!!", 'Stop being annoying!!', 
    'Leave me alone!', 'I said NO!', 'Heyyyy!!', 'Quit it!!', 
    'Go away!!', 'Not now!!'
  ];

  function showEmoteToast(message) {
    haptic(30);
    const existing = document.querySelector('.toast-emote');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-emote';
    toast.innerHTML = `<span class="material-symbols-rounded">sentiment_stressed</span>${message}`;
    document.body.appendChild(toast);
    void toast.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2500);
  }

  const screenEl = document.getElementById('screen');
  if (screenEl) {
    screenEl.addEventListener('click', () => {
      const msg = emoteToastMessages[Math.floor(Math.random() * emoteToastMessages.length)];
      showEmoteToast(msg);
    });
  }

  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      battery.addEventListener('chargingchange', () => {
        const homePage = document.getElementById('home');
        if (homePage && homePage.classList.contains('active')) {
          showEmoteToast('Bzzzt!');
        }
      });
    });
  }

  document.querySelectorAll(".md-input, .md-input2").forEach(textarea => {
    const page = textarea.closest(".stp-page");
    if (!page) return;

    textarea.dataset.origPlaceholder = textarea.getAttribute("placeholder") || "";

    if (textarea.id === 'doorApiInput') {
      const saved = getUrl('api_url');
      if (saved) {
        textarea.dataset.realValue = extractGasId(saved);
        textarea.value = '';
        textarea.setAttribute('placeholder', 'Edit?');
        textarea.classList.add('stp-has-value');
      }
    } else if (textarea.classList.contains('md-input2')) {
      const saved = getUrl('sheets_url');
      if (saved) {
        textarea.dataset.realValue = saved;
        textarea.value = '';
        textarea.setAttribute('placeholder', 'Edit?');
        textarea.classList.add('stp-has-value');
      }
    } else if (textarea.id === 'ctrlsApiInput') {
      const saved = getUrl('ctrls_url');
      if (saved) {
        textarea.dataset.realValue = extractGasId(saved);
        textarea.value = '';
        textarea.setAttribute('placeholder', 'Edit?');
        textarea.classList.add('stp-has-value');
      }
    }

    const updateMask = (ta) => {
      const hasVal = (ta.dataset.realValue || ta.value).trim().length > 0;
      ta.classList.toggle("stp-has-value", hasVal);
    };

    let doneBtn = page.querySelector(".stp-done-btn");
    if (!doneBtn) {
      doneBtn = document.createElement("button");
      doneBtn.className = "stp-done-btn md-btn";
      doneBtn.innerHTML = `<span class="material-symbols-rounded">check</span>`;
      doneBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        textarea.blur();
      });
    }

    let expandTimer   = null;
    let collapseTimer = null;
    let cancelDecode  = null;

    const expand = () => {
      clearTimeout(collapseTimer);
      clearTimeout(expandTimer);
      if (cancelDecode) { cancelDecode(); cancelDecode = null; }

      const savedValue = textarea.dataset.realValue;
      if (savedValue !== undefined) {
        textarea.value = '';
        delete textarea.dataset.realValue;
      }

      textarea.setAttribute("placeholder", textarea.dataset.origPlaceholder);
      textarea.classList.remove("stp-has-value");

      if (!page.contains(doneBtn)) page.appendChild(doneBtn);

      haptic([30, 80, 30, 80, 30]);

      expandTimer = setTimeout(() => {
        page.classList.add("stp-expanded");
        textarea.classList.add("stp-textarea-active");
        if (stpPages) stpPages.style.overflowX = "hidden";
        requestAnimationFrame(() => doneBtn.classList.add("show"));

        if (savedValue) {
          cancelDecode = scrambleDecode(textarea, savedValue, 1500, 300, () => {
            cancelDecode = null;
            showToast('lock_open', 'Decrypted');
          });
        }
      }, 300);
    };

    const collapse = () => {
      clearTimeout(expandTimer);
      if (cancelDecode) { cancelDecode(); cancelDecode = null; }

      doneBtn.classList.remove("show");
      
      collapseTimer = setTimeout(() => {
        page.classList.remove("stp-expanded");
        textarea.classList.remove("stp-textarea-active");
        if (stpPages) stpPages.style.overflowX = "auto";
        if (textarea.value.trim().length > 0) {
          textarea.dataset.realValue = textarea.value;
          textarea.value = "";
          textarea.setAttribute("placeholder", "Edit?");
          textarea.classList.add("stp-has-value");
          haptic([30, 40, 30, 40, 30]);
          showToast('lock', 'Encrypted');
        } else {
          haptic(30);
        }
        if (doneBtn.parentNode) doneBtn.remove();
      }, 300);
    };

    textarea.addEventListener("focus", expand);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); textarea.blur(); }
    });
    textarea.addEventListener("blur", collapse);
    textarea.addEventListener("input", () => updateMask(textarea));
    updateMask(textarea);
  });

  const doorApiInput   = document.getElementById("doorApiInput");
  const sheetsInput    = document.querySelector(".md-input2");
  const ctrlsApiInput  = document.getElementById("ctrlsApiInput");
  const saveConfigBtn  = document.getElementById("saveConfig");
  const resetConfigBtn = document.getElementById("resetConfig");

  function showResetConfirm(onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "md-dialog-overlay";

    overlay.innerHTML = `
      <div class="md-dialog">
        <span class="material-symbols-rounded md-dialog-icon">warning</span>
        <div class="md-dialog-title">Reset Config?</div>
        <div class="md-dialog-body">All saved URLs will be cleared. This cannot be undone.</div>
        <div class="md-dialog-actions">
          <button class="md-dialog-btn cancel">Nope</button>
          <button class="md-dialog-btn confirm">Reset</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    void overlay.offsetHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("show"));
    });

    const close = () => {
      overlay.classList.remove("show");
      overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
    };

    overlay.querySelector(".cancel").addEventListener("click", close);
    overlay.querySelector(".confirm").addEventListener("click", () => {
      close();
      onConfirm();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  saveConfigBtn?.addEventListener("click", () => {
    const doorRaw = (doorApiInput?.dataset.realValue || doorApiInput?.value || "").trim();
    const ctrlsRaw = (ctrlsApiInput?.dataset.realValue || ctrlsApiInput?.value || "").trim();
    const sheetsRaw = (sheetsInput?.dataset.realValue || sheetsInput?.value || "").trim();

    let savedAny = false;
    let failedAny = false;

    if (doorRaw) {
      const doorUrl = buildGasUrl(doorRaw);
      if (isFullUrl(doorUrl)) {
        window.API_KEY = doorUrl;
        setUrl("api_url", window.API_KEY);
        savedAny = true;
      } else {
        failedAny = true;
      }
    }

    if (ctrlsRaw) {
      if (saveUrlSafely("ctrls_url", ctrlsRaw)) {
        savedAny = true;
      } else {
        failedAny = true;
      }
    }

    if (sheetsRaw) {
      if (isFullUrl(sheetsRaw)) {
        setUrl("sheets_url", sheetsRaw);
        savedAny = true;
      } else {
        failedAny = true;
      }
    }

    if (navigator.vibrate) navigator.vibrate(30);

    if (failedAny) {
      showToast("error", "Invalid ID/URL, not saved");
    } else if (savedAny) {
      showToast("check_circle", "Config saved");
      setTimeout(() => {
        if (window.Android) {
          const doorUrl = getUrl("api_url");
          if (doorUrl) {
            window.Android.saveDoorLogsUrl(doorUrl);
          }
        }
      }, 500);
    } else {
      showToast("info", "Nothing to save");
    }
  });

  resetConfigBtn?.addEventListener("click", () => {
    showResetConfirm(() => {
      [doorApiInput, ctrlsApiInput, sheetsInput].forEach(ta => {
        if (!ta) return;
        ta.value = "";
        delete ta.dataset.realValue;
        ta.classList.remove("stp-has-value");
        ta.setAttribute("placeholder", ta.dataset.origPlaceholder || "");
      });

      localStorage.removeItem("api_url");
      localStorage.removeItem("sheets_url");
      localStorage.removeItem("ctrls_url");

      window.API_KEY = "";
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
      showToast("restart_alt", "Config reset");

      if (stpPages) stpPages.scrollTo({ left: 0, behavior: "smooth" });
    });
  });
});