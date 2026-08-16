export class Word {
  #id;
  #text;
  #translations;
  #pronunciation;
  #level;
  #context;
  #sourceUrl;
  #createdAt;
  #reviewData;
  #timesReviewed;
  #mastered;

  constructor({ id, text, translation, translations, pronunciation, level, context, sourceUrl, createdAt, reviewData, timesReviewed, mastered }) {
    this.#id = id;
    this.#text = text;
    this.#translations = this.#normalizeTranslations(translations, translation);
    this.#pronunciation = pronunciation || null;
    this.#level = level || 'A1';
    this.#context = context || '';
    this.#sourceUrl = sourceUrl || '';
    this.#createdAt = createdAt || Date.now();
    this.#reviewData = reviewData || { interval: 1, easeFactor: 2.5, nextReview: null };
    this.#timesReviewed = timesReviewed || 0;
    this.#mastered = mastered || false;
  }

  #normalizeTranslations(translations, legacyTranslation) {
    if (Array.isArray(translations) && translations.length > 0) {
      return translations.map(t =>
        typeof t === 'string' ? { text: t, pos: '' } : t
      );
    }
    if (legacyTranslation) {
      return [{ text: legacyTranslation, pos: '' }];
    }
    return [];
  }

  get id() { return this.#id; }
  get text() { return this.#text; }
  get translations() { return this.#translations; }
  get pronunciation() { return this.#pronunciation; }
  get level() { return this.#level; }
  get context() { return this.#context; }
  get sourceUrl() { return this.#sourceUrl; }
  get createdAt() { return this.#createdAt; }
  get reviewData() { return this.#reviewData; }
  get timesReviewed() { return this.#timesReviewed; }
  get mastered() { return this.#mastered; }

  get translation() {
    return this.#translations.length > 0 ? this.#translations[0].text : '';
  }

  get primaryTranslation() {
    return this.#translations.length > 0 ? this.#translations[0] : null;
  }

  get translationTexts() {
    return this.#translations.map(t => t.text);
  }

  addTranslation(text, pos = '') {
    const exists = this.#translations.some(
      t => t.text.toLowerCase() === text.toLowerCase()
    );
    if (!exists && text) {
      this.#translations.push({ text, pos: pos || '' });
    }
  }

  removeTranslation(text) {
    this.#translations = this.#translations.filter(
      t => t.text.toLowerCase() !== text.toLowerCase()
    );
  }

  isDueForReview() {
    if (!this.#reviewData.nextReview) return true;
    return Date.now() >= this.#reviewData.nextReview;
  }

  updateReview(quality) {
    const { interval, easeFactor } = this.#calculateSR(this.#reviewData, quality);
    this.#reviewData = {
      interval,
      easeFactor,
      nextReview: Date.now() + interval * 24 * 60 * 60 * 1000
    };
    this.#timesReviewed++;
    if (this.#timesReviewed >= 5 && quality >= 4) {
      this.#mastered = true;
    }
  }

  #calculateSR(data, quality) {
    let { interval, easeFactor } = data;
    if (quality < 3) {
      interval = 1;
    } else {
      if (interval === 0) {
        interval = 1;
      } else if (interval === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    return { interval, easeFactor };
  }

  toJSON() {
    return {
      id: this.#id,
      text: this.#text,
      translations: this.#translations,
      translation: this.translation,
      pronunciation: this.#pronunciation,
      level: this.#level,
      context: this.#context,
      sourceUrl: this.#sourceUrl,
      createdAt: this.#createdAt,
      reviewData: this.#reviewData,
      timesReviewed: this.#timesReviewed,
      mastered: this.#mastered
    };
  }

  static fromJSON(data) {
    return new Word(data);
  }
}
