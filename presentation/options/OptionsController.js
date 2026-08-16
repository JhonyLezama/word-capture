class OptionsController {
  constructor() {
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadSettings();
  }

  bindEvents() {
    document.getElementById('targetLang').addEventListener('change', (e) => {
      this.saveSetting('targetLang', e.target.value);
    });

    document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
    document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get(['settings']);
    const settings = result.settings || { targetLang: 'es' };
    document.getElementById('targetLang').value = settings.targetLang;
  }

  async saveSetting(key, value) {
    const result = await chrome.storage.sync.get(['settings']);
    const settings = result.settings || {};
    settings[key] = value;
    await chrome.storage.sync.set({ settings });
    this.showToast('Configuración guardada');
  }

  async exportData() {
    const response = await this.sendMessage({ type: 'GET_HISTORY', data: {} });
    if (!response || !response.words) {
      this.showToast('No hay datos para exportar');
      return;
    }

    const blob = new Blob([JSON.stringify(response.words, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordcapture-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Datos exportados');
  }

  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const words = JSON.parse(text);

      if (!Array.isArray(words)) {
        this.showToast('Formato de archivo inválido');
        return;
      }

      for (const word of words) {
        await this.sendMessage({
          type: 'SAVE_WORD',
          data: {
            word: word.text,
            translation: word.translation,
            level: word.level,
            context: word.context || '',
            sourceUrl: word.sourceUrl || '',
          }
        });
      }

      this.showToast(`${words.length} palabras importadas`);
    } catch (error) {
      this.showToast('Error al importar: ' + error.message);
    }

    event.target.value = '';
  }

  async clearData() {
    if (!confirm('¿Estás seguro de que quieres borrar todas las palabras? Esta acción no se puede deshacer.')) {
      return;
    }

    const response = await this.sendMessage({ type: 'GET_HISTORY', data: {} });
    if (response && response.words) {
      for (const word of response.words) {
        await this.sendMessage({ type: 'DELETE_WORD', data: { id: word.id } });
      }
    }

    this.showToast('Todas las palabras han sido eliminadas');
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

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
