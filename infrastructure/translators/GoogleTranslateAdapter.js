import { ITranslator } from '../../core/interfaces/ITranslator.js';

export class GoogleTranslateAdapter extends ITranslator {
  #defaultTarget;
  #cache;
  #cacheMaxSize;

  constructor(defaultTarget = 'es', cacheMaxSize = 500) {
    super();
    this.#defaultTarget = defaultTarget;
    this.#cache = new Map();
    this.#cacheMaxSize = cacheMaxSize;
  }

  #getCacheKey(text, from, to) {
    return `${from}|${to}|${text}`;
  }

  #getCached(key) {
    return this.#cache.get(key) || null;
  }

  #setCache(key, value) {
    if (this.#cache.size >= this.#cacheMaxSize) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(key, value);
  }

  async translate(text, from = 'auto', to = null) {
    const target = to || this.#defaultTarget;
    const cacheKey = this.#getCacheKey(text, from, target);
    const cached = this.#getCached(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.#translateGoogle(text, from, target);
      this.#setCache(cacheKey, result);
      return result;
    } catch (googleError) {
      console.warn('Google Translate failed, trying MyMemory fallback:', googleError.message);
      try {
        const result = await this.#translateMyMemory(text, from, target);
        this.#setCache(cacheKey, result);
        return result;
      } catch (fallbackError) {
        throw new Error(`Translation failed: ${googleError.message} / ${fallbackError.message}`);
      }
    }
  }

  async #translateGoogle(text, from, to) {
    const sl = from === 'auto' ? 'auto' : from;
    const params = new URLSearchParams();
    params.append('client', 'gtx');
    params.append('sl', sl);
    params.append('to', to);
    params.append('dt', 't');
    params.append('dt', 'rm');
    params.append('dt', 'bd');
    params.append('q', text);

    const endpoints = [
      'https://translate.googleapis.com/translate_a/single',
      'https://clients5.google.com/translate_a/t',
    ];

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: 'GET',
        });

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        return this.#parseGoogleResponse(data, from);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('All Google endpoints failed');
  }

  #parseGoogleResponse(data, from) {
    if (!data || !data[0]) {
      throw new Error('Empty Google response');
    }

    const translatedText = data[0].map(s => s[0]).join('');
    const detectedLang = data[2] || from;
    const pronunciation = data[0][0] ? (data[0][0][1] || data[0][0][3] || null) : null;

    if (this.#isGarbage(translatedText)) {
      throw new Error('Google returned garbage translation');
    }

    const translations = this.#parseAlternatives(data, translatedText);

    return {
      text: translatedText,
      translations,
      pronunciation: pronunciation || null,
      from: detectedLang,
    };
  }

  #isGarbage(text) {
    if (!text || typeof text !== 'string') return true;
    if (text.length < 1 || text.length > 80) return true;
    if (/%[0-9A-Fa-f]{2}/.test(text)) return true;
    if (/^[0-9\s%\-/\\]+$/.test(text)) return true;
    if (/[^\p{L}\p{M}\p{N}\s\-.,;:!¡?¿'"()]/u.test(text)) return true;
    return false;
  }

  #parseAlternatives(data, primaryText) {
    const translations = [];
    const seen = new Set();

    const primaryLower = primaryText.toLowerCase().trim();
    translations.push({ text: primaryText, pos: '' });
    seen.add(primaryLower);

    if (data[1] && Array.isArray(data[1])) {
      for (const alt of data[1]) {
        if (alt && Array.isArray(alt) && alt[0]) {
          const altText = alt[0];
          const altLower = altText.toLowerCase().trim();
          const pos = alt[1] || '';

          if (!seen.has(altLower) && altLower !== primaryLower && !this.#isGarbage(altText)) {
            translations.push({ text: altText, pos });
            seen.add(altLower);
          }
        }
      }
    }

    return translations;
  }

  async #translateMyMemory(text, from, to) {
    const sl = from === 'auto' ? 'en' : from;
    const params = new URLSearchParams({
      q: text.slice(0, 500),
      langpair: `${sl}|${to}`,
    });

    const response = await fetch(
      `https://api.mymemory.translated.net/get?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`MyMemory HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || 'MyMemory failed');
    }

    const primaryText = data.responseData.translatedText;
    if (this.#isGarbage(primaryText)) {
      throw new Error('MyMemory returned garbage');
    }

    const translations = [{ text: primaryText, pos: '' }];

    if (data.matches && Array.isArray(data.matches)) {
      for (const match of data.matches) {
        if (match.translation && match.translation !== primaryText) {
          const exists = translations.some(
            t => t.text.toLowerCase() === match.translation.toLowerCase()
          );
          if (!exists && !this.#isGarbage(match.translation)) {
            translations.push({ text: match.translation, pos: match.segment || '' });
          }
        }
      }
    }

    return {
      text: primaryText,
      translations,
      pronunciation: null,
      from: sl,
    };
  }

  async detectLanguage(text) {
    try {
      const params = new URLSearchParams();
      params.append('client', 'gtx');
      params.append('sl', 'auto');
      params.append('tl', 'en');
      params.append('dt', 't');
      params.append('q', text.substring(0, 200));

      const response = await fetch(
        `https://clients5.google.com/translate_a/t?${params.toString()}`
      );

      if (!response.ok) return 'unknown';

      const data = await response.json();
      return data?.[2] || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
