const Messages = {
  TRANSLATE_WORD: 'TRANSLATE_WORD',
  SAVE_WORD: 'SAVE_WORD',
  GET_HISTORY: 'GET_HISTORY',
  DELETE_WORD: 'DELETE_WORD',
  GET_STATS: 'GET_STATS',
  GET_DUE_REVIEW: 'GET_DUE_REVIEW',
  REVIEW_WORD: 'REVIEW_WORD',
};

function speakWord(text) {
  if (!text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

function createAudioBtn(text, className = 'audio-btn') {
  return `<button class="${className}" data-word="${text}" title="Escuchar">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 010 7.07"/>
      <path d="M19.07 4.93a10 10 0 010 14.14"/>
    </svg>
  </button>`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class PopupController {
  constructor() {
    this.currentTab = 'history';
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadHistory();
  }

  bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    document.getElementById('searchInput').addEventListener('input',
      this.debounce(() => this.loadHistory(), 300)
    );

    document.getElementById('levelFilter').addEventListener('change', () => {
      this.loadHistory();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportWords();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importWords(e.target.files[0]);
    });

    this.initTheme();
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'history') this.loadHistory();
    else if (tab === 'review') this.loadReview();
    else if (tab === 'stats') this.loadStats();
  }

  #renderTranslations(translations) {
    if (!translations || translations.length === 0) return '';
    if (translations.length === 1) {
      return `<span class="word-translation-single">${translations[0].text}</span>`;
    }
    return translations.map((t, _i) => {
      const cls = _i === 0 ? 'word-trans primary' : 'word-trans';
      const pos = t.pos ? `<span class="word-trans-pos">${t.pos}</span>` : '';
      return `<span class="${cls}">${t.text}${pos}</span>`;
    }).join('');
  }

  async loadHistory() {
    const search = document.getElementById('searchInput').value;
    const level = document.getElementById('levelFilter').value;

    const response = await this.sendMessage({
      type: Messages.GET_HISTORY,
      data: { search, level }
    });

    const wordList = document.getElementById('wordList');

    if (!response || !response.words || response.words.length === 0) {
      wordList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <p>Selecciona una palabra en cualquier pagina para guardarla</p>
        </div>
      `;
      return;
    }

    wordList.innerHTML = response.words.map(word => {
      const translations = word.translations || (word.translation ? [{ text: word.translation, pos: '' }] : []);
      const contextHtml = word.context ? `<div class="word-context">"${word.context}"</div>` : '';
      return `
        <div class="word-item" data-id="${word.id}">
          <div class="word-info">
            <div class="word-text">${word.text}</div>
            <div class="word-translations">${this.#renderTranslations(translations)}</div>
            ${contextHtml}
          </div>
          <div class="word-meta">
            ${createAudioBtn(word.text)}
            <span class="level-badge ${word.level}">${word.level}</span>
            <button class="delete-btn" data-id="${word.id}" title="Eliminar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    wordList.querySelectorAll('.audio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakWord(btn.dataset.word);
      });
    });

    wordList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await this.sendMessage({ type: Messages.DELETE_WORD, data: { id } });
        this.loadHistory();
      });
    });
  }

  async loadReview() {
    const response = await this.sendMessage({ type: Messages.GET_DUE_REVIEW });
    const container = document.getElementById('reviewContainer');

    if (!response || !response.words || response.words.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>No hay palabras para repasar</p>
        </div>
      `;
      return;
    }

    this.reviewWords = shuffleArray(response.words);
    this.currentReviewIndex = 0;
    this.showReviewCard();
  }

  #renderReviewTranslations(translations) {
    if (!translations || translations.length === 0) return '';
    return translations.map((t) => {
      const pos = t.pos ? ` <span class="review-trans-pos">${t.pos}</span>` : '';
      return `<div class="review-trans-item">${t.text}${pos}</div>`;
    }).join('');
  }

  showReviewCard() {
    const container = document.getElementById('reviewContainer');
    const word = this.reviewWords[this.currentReviewIndex];
    const total = this.reviewWords.length;
    const current = this.currentReviewIndex + 1;

    container.innerHTML = `
      <div class="review-progress">${current} de ${total}</div>
      <div class="review-card">
        <div class="review-word">${word.text}</div>
        <div class="review-hint">Nivel ${word.level}</div>
        ${createAudioBtn(word.text, 'audio-btn review-audio')}
        <button class="review-btn good" id="showAnswer">Mostrar respuesta</button>
        <button class="review-skip" id="skipWord" title="Saltar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
          </svg>
        </button>
      </div>
    `;

    container.querySelector('.review-audio').addEventListener('click', () => {
      speakWord(word.text);
    });

    document.getElementById('skipWord').addEventListener('click', () => {
      this.currentReviewIndex++;
      if (this.currentReviewIndex < this.reviewWords.length) {
        this.showReviewCard();
      } else {
        this.loadReview();
      }
    });

    document.getElementById('showAnswer').addEventListener('click', () => {
      const translations = word.translations || (word.translation ? [{ text: word.translation, pos: '' }] : []);
      container.innerHTML = `
        <div class="review-progress">${current} de ${total}</div>
        <div class="review-card">
          <div class="review-word">${word.text}</div>
          <div class="review-translations">${this.#renderReviewTranslations(translations)}</div>
          <div class="review-actions">
            <button class="review-btn again" data-quality="0">Otra vez</button>
            <button class="review-btn hard" data-quality="2">Dificil</button>
            <button class="review-btn good" data-quality="4">Buena</button>
            <button class="review-btn easy" data-quality="5">Facil</button>
          </div>
        </div>
      `;

      container.querySelectorAll('.review-btn[data-quality]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const quality = parseInt(btn.dataset.quality);
          await this.sendMessage({
            type: Messages.REVIEW_WORD,
            data: { wordId: word.id, quality }
          });

          this.currentReviewIndex++;
          if (this.currentReviewIndex < this.reviewWords.length) {
            this.showReviewCard();
          } else {
            this.loadReview();
          }
        });
      });
    });
  }

  async loadStats() {
    const response = await this.sendMessage({ type: Messages.GET_STATS });

    if (!response) return;

    document.getElementById('totalWords').textContent = response.total || 0;
    document.getElementById('masteredWords').textContent = response.masteredCount || 0;
    document.getElementById('dueReview').textContent = response.dueForReviewCount || 0;
    document.getElementById('masteryPercent').textContent = `${response.masteryPercentage || 0}%`;

    const levelBreakdown = document.getElementById('levelBreakdown');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const colors = { A1: '#4CAF50', A2: '#8BC34A', B1: '#FFC107', B2: '#FF9800', C1: '#F44336', C2: '#9C27B0' };
    const maxCount = Math.max(...levels.map(l => (response.byLevel || {})[l] || 0), 1);

    levelBreakdown.innerHTML = `
      <h3 class="level-breakdown-title">Palabras por nivel</h3>
      ${levels.map(level => {
        const count = (response.byLevel || {})[level] || 0;
        const percentage = (count / maxCount) * 100;
        return `
          <div class="level-row">
            <span class="level-label" style="color:${colors[level]}">${level}</span>
            <div class="level-bar-bg">
              <div class="level-bar-fill" style="width:${percentage}%;background:${colors[level]}"></div>
            </div>
            <span class="level-count">${count}</span>
          </div>
        `;
      }).join('')}
    `;
  }

  initTheme() {
    const saved = localStorage.getItem('wc-theme');
    if (saved === 'dark') {
      document.body.classList.add('dark');
    } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark');
    }
  }

  toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('wc-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  }

  async exportWords() {
    const response = await this.sendMessage({ type: Messages.EXPORT_WORDS });
    if (!response || !response.words) return;

    const blob = new Blob([JSON.stringify(response.words, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordcapture-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importWords(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const words = JSON.parse(text);
      const response = await this.sendMessage({ type: Messages.IMPORT_WORDS, data: { words } });

      if (response && response.success) {
        alert(`Importadas: ${response.imported} | Omitidas: ${response.skipped}`);
        this.loadHistory();
      }
    } catch {
      alert('Error al importar: archivo inválido');
    }
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
