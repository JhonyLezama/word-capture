(() => {
  'use strict';

  const SELECTORS = {
    WIDGET: '#word-capture-widget',
    WORD_TEXT: '.wc-word-text',
    TRANSLATIONS: '.wc-translations',
    TRANSLATION_ITEM: '.wc-translation-item',
    PRONUNCIATION: '.wc-pronunciation',
    LEVEL_BADGE: '.wc-level-badge',
    SAVE_BTN: '.wc-save-btn',
    CLOSE_BTN: '.wc-close-btn',
    LOADING: '.wc-loading',
    SUCCESS: '.wc-success',
    AUDIO_BTN: '.wc-audio-btn',
  };

  function speakWord(text) {
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }

  function createAudioBtn(text) {
    const btn = document.createElement('button');
    btn.className = 'wc-audio-btn';
    btn.title = 'Escuchar';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(text);
    });
    return btn;
  }

  const Messages = {
    TRANSLATE_WORD: 'TRANSLATE_WORD',
    WORD_SAVED: 'WORD_SAVED',
    SAVE_WORD: 'SAVE_WORD',
  };

  const WIDGET_WIDTH = 320;
  const WIDGET_GAP = 10;
  const MIN_SPACE = 40;

  let widget = null;
  let lastHideTime = 0;
  let selectedTranslations = [];

  function createWidget() {
    if (widget) return widget;

    widget = document.createElement('div');
    widget.id = 'word-capture-widget';
    widget.innerHTML = `
      <div class="wc-container wc-animate">
        <button class="wc-close-btn" aria-label="Close">&times;</button>
        <div class="wc-header">
          <span class="wc-word-text"></span>
          <button class="wc-audio-btn wc-audio-header" title="Escuchar palabra">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 010 7.07"/>
              <path d="M19.07 4.93a10 10 0 010 14.14"/>
            </svg>
          </button>
          <span class="wc-level-badge"></span>
        </div>
        <div class="wc-body">
          <div class="wc-loading" style="display:none;">
            <div class="wc-spinner"></div>
            <span>Traduciendo...</span>
          </div>
          <div class="wc-translations" style="display:none;"></div>
          <div class="wc-pronunciation" style="display:none;"></div>
        </div>
        <div class="wc-footer">
          <button class="wc-save-btn" disabled>
            <svg class="wc-save-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span class="wc-save-text">Guardar palabra</span>
            <div class="wc-save-spinner" style="display:none;"></div>
          </button>
          <div class="wc-success" style="display:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Guardada
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    bindWidgetEvents();
    return widget;
  }

  function bindWidgetEvents() {
    widget.querySelector(SELECTORS.CLOSE_BTN).addEventListener('click', hideWidget);

    widget.querySelector('.wc-audio-header').addEventListener('click', () => {
      const wordEl = widget.querySelector(SELECTORS.WORD_TEXT);
      speakWord(wordEl.dataset.word);
    });

    widget.querySelector(SELECTORS.SAVE_BTN).addEventListener('click', () => {
      const wordEl = widget.querySelector(SELECTORS.WORD_TEXT);
      const levelEl = widget.querySelector(SELECTORS.LEVEL_BADGE);

      const word = wordEl.dataset.word;
      const level = levelEl.textContent;

      if (!word || selectedTranslations.length === 0) return;

      const btn = widget.querySelector(SELECTORS.SAVE_BTN);
      const saveIcon = btn.querySelector('.wc-save-icon');
      const saveText = btn.querySelector('.wc-save-text');
      const saveSpinner = btn.querySelector('.wc-save-spinner');

      btn.classList.add('wc-save-btn--saving');
      saveIcon.style.display = 'none';
      saveText.textContent = 'Guardando...';
      saveSpinner.style.display = 'block';

      chrome.runtime.sendMessage({
        type: Messages.SAVE_WORD,
        data: {
          word,
          translations: selectedTranslations,
          level,
          context: getContext(),
          sourceUrl: window.location.href
        }
      }, (response) => {
        saveSpinner.style.display = 'none';

        if (chrome.runtime.lastError) {
          console.error('WordCapture save error:', chrome.runtime.lastError);
          resetSaveBtn(btn, saveIcon, saveText);
          return;
        }

        if (response && response.error) {
          console.error('WordCapture save error:', response.error);
          resetSaveBtn(btn, saveIcon, saveText);
          return;
        }

        if (response && response.success) {
          btn.style.display = 'none';
          widget.querySelector(SELECTORS.SUCCESS).style.display = 'flex';
          setTimeout(hideWidget, 800);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (widget && !widget.contains(e.target)) {
        const selection = window.getSelection().toString().trim();
        if (!selection) {
          hideWidget();
        }
      }
    });
  }

  function showWidget(x, y, word) {
    const el = createWidget();
    el.style.display = 'block';

    const container = el.querySelector('.wc-container');
    container.style.visibility = 'hidden';
    container.style.position = 'fixed';

    const rect = container.getBoundingClientRect();
    const widgetW = rect.width || WIDGET_WIDTH;
    const widgetH = rect.height || 200;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const wordAbsX = x + window.scrollX;
    const wordAbsY = y + window.scrollY;

    const spaceBelow = viewportH - y;
    const spaceAbove = y;
    const spaceRight = viewportW - x;
    const spaceLeft = x;

    let left, top;

    const fitsBelow = spaceBelow >= widgetH + WIDGET_GAP;
    const fitsAbove = spaceAbove >= widgetH + WIDGET_GAP;
    const fitsRight = spaceRight >= widgetW + WIDGET_GAP;
    const fitsLeft = spaceLeft >= widgetW + WIDGET_GAP;

    if (fitsBelow && spaceBelow >= spaceAbove) {
      top = wordAbsY + WIDGET_GAP;
    } else if (fitsAbove) {
      top = wordAbsY - widgetH - WIDGET_GAP;
    } else if (fitsRight) {
      top = wordAbsY;
    } else {
      top = Math.max(MIN_SPACE, wordAbsY - widgetH / 2);
    }

    if (fitsRight && !fitsLeft) {
      left = wordAbsX;
    } else if (fitsLeft && !fitsRight) {
      left = wordAbsX - widgetW;
    } else if (fitsRight) {
      left = wordAbsX;
    } else {
      left = Math.max(MIN_SPACE, wordAbsX - widgetW / 2);
    }

    if (top + widgetH > viewportH + window.scrollY - MIN_SPACE) {
      top = viewportH + window.scrollY - widgetH - MIN_SPACE;
    }
    if (top < window.scrollY + MIN_SPACE) {
      top = window.scrollY + MIN_SPACE;
    }
    if (left + widgetW > viewportW + window.scrollX - MIN_SPACE) {
      left = viewportW + window.scrollX - widgetW - MIN_SPACE;
    }
    if (left < window.scrollX + MIN_SPACE) {
      left = window.scrollX + MIN_SPACE;
    }

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;

    container.style.visibility = '';
    container.style.position = '';

    requestAnimationFrame(() => {
      container.classList.remove('wc-animate');
    });

    widget.querySelector(SELECTORS.WORD_TEXT).textContent = word;
    widget.querySelector(SELECTORS.WORD_TEXT).dataset.word = word;
    widget.querySelector(SELECTORS.TRANSLATIONS).style.display = 'none';
    widget.querySelector(SELECTORS.PRONUNCIATION).style.display = 'none';
    widget.querySelector(SELECTORS.LOADING).style.display = 'flex';
    widget.querySelector(SELECTORS.SUCCESS).style.display = 'none';

    const btn = widget.querySelector(SELECTORS.SAVE_BTN);
    const saveIcon = btn.querySelector('.wc-save-icon');
    const saveText = btn.querySelector('.wc-save-text');
    const saveSpinner = btn.querySelector('.wc-save-spinner');
    resetSaveBtn(btn, saveIcon, saveText);
    saveSpinner.style.display = 'none';
    btn.style.display = '';
    btn.disabled = true;

    selectedTranslations = [];
    translateWord(word);
  }

  function hideWidget() {
    if (widget) {
      widget.style.display = 'none';
      const container = widget.querySelector('.wc-container');
      if (container) container.classList.add('wc-animate');
      window.getSelection().removeAllRanges();
      lastHideTime = Date.now();
    }
  }

  function resetSaveBtn(btn, icon, text) {
    btn.classList.remove('wc-save-btn--saving', 'wc-save-btn--success');
    btn.disabled = false;
    icon.style.display = '';
    text.textContent = 'Guardar palabra';
  }

  function renderTranslations(translations, level) {
    const container = widget.querySelector(SELECTORS.TRANSLATIONS);
    container.innerHTML = '';

    if (!translations || translations.length === 0) {
      container.style.display = 'none';
      return;
    }

    selectedTranslations = translations.map(t => ({ ...t }));

    translations.forEach((t, index) => {
      const item = document.createElement('div');
      item.className = 'wc-translation-item' + (index === 0 ? ' active' : '');
      item.dataset.index = index;

      const bullet = document.createElement('span');
      bullet.className = 'wc-trans-bullet';
      bullet.textContent = '●';

      const textSpan = document.createElement('span');
      textSpan.className = 'wc-trans-text';
      textSpan.textContent = t.text;

      item.appendChild(bullet);
      item.appendChild(textSpan);

      if (t.pos) {
        const posTag = document.createElement('span');
        posTag.className = 'wc-trans-pos';
        posTag.textContent = t.pos;
        item.appendChild(posTag);
      }

      item.appendChild(createAudioBtn(t.text));

      item.addEventListener('click', () => {
        container.querySelectorAll('.wc-translation-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        const idx = parseInt(item.dataset.index, 10);
        const clicked = selectedTranslations.splice(idx, 1)[0];
        selectedTranslations.unshift(clicked);
      });

      container.appendChild(item);
    });

    if (level) {
      widget.querySelector(SELECTORS.LEVEL_BADGE).textContent = level;
    }

    container.style.display = 'block';
  }

  function translateWord(word) {
    chrome.runtime.sendMessage(
      { type: Messages.TRANSLATE_WORD, data: { text: word } },
      (response) => {
        widget.querySelector(SELECTORS.LOADING).style.display = 'none';

        if (chrome.runtime.lastError || !response || response.error) {
          const transEl = widget.querySelector(SELECTORS.TRANSLATIONS);
          transEl.innerHTML = '<div class="wc-translation-item"><span class="wc-trans-text">Error al traducir</span></div>';
          transEl.style.display = 'block';
          return;
        }

        const translations = response.translations || [{ text: response.translation, pos: '' }];
        renderTranslations(translations, response.level);

        if (response.pronunciation) {
          widget.querySelector(SELECTORS.PRONUNCIATION).textContent = response.pronunciation;
          widget.querySelector(SELECTORS.PRONUNCIATION).style.display = 'block';
        }

        widget.querySelector(SELECTORS.SAVE_BTN).disabled = false;
      }
    );
  }

  function getContext() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return '';
    const range = selection.getRangeAt(0);
    const ctx = range.commonAncestorContainer;
    const parent = ctx.nodeType === 3 ? ctx.parentElement : ctx;
    return parent?.textContent?.trim().substring(0, 200) || '';
  }

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      if (Date.now() - lastHideTime < 300) return;
      if (widget && widget.contains(e.target)) return;
      const text = getSelectedText();
      if (text && /^[a-zA-Z]+(?:[- ][a-zA-Z]+)*$/.test(text) && text.length >= 2 && text.length <= 60) {
        showWidget(e.clientX, e.clientY, text);
      }
    }, 10);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && widget) {
      hideWidget();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_TRANSLATION') {
      showWidget(message.x || 100, message.y || 100, message.word);
      sendResponse({ success: true });
    }
    return true;
  });
})();
