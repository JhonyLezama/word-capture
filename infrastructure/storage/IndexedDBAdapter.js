import { IWordRepository } from '../../core/interfaces/IWordRepository.js';
import { Word } from '../../core/entities/Word.js';

export class IndexedDBAdapter extends IWordRepository {
  #db;
  #storeName = 'words';
  #dbName = 'WordCaptureDB';
  #version = 2;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(this.#storeName)) {
            const store = db.createObjectStore(this.#storeName, { keyPath: 'id' });
            store.createIndex('text', 'text', { unique: true });
            store.createIndex('level', 'level', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('nextReview', 'reviewData.nextReview', { unique: false });
            store.createIndex('mastered', 'mastered', { unique: false });
          }
        }
      };

      request.onsuccess = async (event) => {
        this.#db = event.target.result;

        const currentVersion = this.#db.version;
        if (currentVersion < 2) {
          await this.#migrateV1toV2();
        }

        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`IndexedDB open failed: ${event.target.error}`));
      };
    });
  }

  async #migrateV1toV2() {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(this.#storeName, 'readwrite');
      const store = tx.objectStore(this.#storeName);
      const request = store.openCursor();
      let migrated = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const data = cursor.value;
          if (typeof data.translation === 'string' && !Array.isArray(data.translations)) {
            data.translations = [{ text: data.translation, pos: '' }];
            delete data.translation;
            cursor.update(data);
            migrated++;
          }
          cursor.continue();
        } else {
          if (migrated > 0) {
            console.log(`Migrated ${migrated} words from v1 to v2`);
          }
          resolve();
        }
      };

      request.onerror = (event) => {
        console.error('Migration failed:', event.target.error);
        resolve();
      };
    });
  }

  async save(word) {
    const data = word instanceof Word ? word.toJSON() : word;
    if (data.translation && !data.translations) {
      data.translations = [{ text: data.translation, pos: '' }];
    }
    delete data.translation;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(this.#storeName, 'readwrite');
        const store = tx.objectStore(this.#storeName);
        store.put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(new Error(`Save failed: ${event.target.error}`));
      } catch (error) {
        reject(new Error(`DB transaction failed: ${error.message}`));
      }
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(this.#storeName, 'readonly');
        const store = tx.objectStore(this.#storeName);
        const request = store.get(id);
        request.onsuccess = () => {
          resolve(request.result ? Word.fromJSON(request.result) : null);
        };
        request.onerror = (event) => reject(new Error(`FindById failed: ${event.target.error}`));
      } catch (error) {
        reject(new Error(`DB transaction failed: ${error.message}`));
      }
    });
  }

  async findByText(text) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(this.#storeName, 'readonly');
        const store = tx.objectStore(this.#storeName);
        const index = store.index('text');
        const request = index.get(text.toLowerCase().trim());
        request.onsuccess = () => {
          resolve(request.result ? Word.fromJSON(request.result) : null);
        };
        request.onerror = (event) => reject(new Error(`FindByText failed: ${event.target.error}`));
      } catch (error) {
        reject(new Error(`DB transaction failed: ${error.message}`));
      }
    });
  }

  async findAll(filter = {}) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(this.#storeName, 'readonly');
        const store = tx.objectStore(this.#storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          let words = request.result.map(Word.fromJSON);

          if (filter.level) {
            words = words.filter(w => w.level === filter.level);
          }
          if (filter.mastered !== undefined) {
            words = words.filter(w => w.mastered === filter.mastered);
          }
          if (filter.dueForReview) {
            words = words.filter(w => w.isDueForReview());
          }
          if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            words = words.filter(w =>
              w.text.includes(searchLower) ||
              w.translationTexts.some(t => t.toLowerCase().includes(searchLower))
            );
          }

          words.sort((a, b) => {
            if (filter.sortBy === 'level') return a.level.localeCompare(b.level);
            if (filter.sortBy === 'text') return a.text.localeCompare(b.text);
            return b.createdAt - a.createdAt;
          });

          resolve(words);
        };
        request.onerror = (event) => reject(new Error(`FindAll failed: ${event.target.error}`));
      } catch (error) {
        reject(new Error(`DB transaction failed: ${error.message}`));
      }
    });
  }

  async deleteById(id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(this.#storeName, 'readwrite');
        const store = tx.objectStore(this.#storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(new Error(`Delete failed: ${event.target.error}`));
      } catch (error) {
        reject(new Error(`DB transaction failed: ${error.message}`));
      }
    });
  }

  async count(filter = {}) {
    const words = await this.findAll(filter);
    return words.length;
  }
}
