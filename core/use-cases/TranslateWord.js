import { Word } from '../entities/Word.js';

export class TranslateWord {
  #translator;
  #repository;
  #levelClassifier;
  #eventBus;

  constructor(translator, repository, levelClassifier, eventBus = null) {
    this.#translator = translator;
    this.#repository = repository;
    this.#levelClassifier = levelClassifier;
    this.#eventBus = eventBus;
  }

  async execute(text, context = '', sourceUrl = '') {
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    const trimmed = text.trim().toLowerCase();

    const existing = await this.#repository.findByText(trimmed);
    if (existing) return existing;

    const translation = await this.#translator.translate(trimmed, 'en', 'es');
    const level = this.#levelClassifier.classify(trimmed);

    const word = new Word({
      id: this.#generateId(),
      text: trimmed,
      translations: translation.translations || [{ text: translation.text, pos: '' }],
      pronunciation: translation.pronunciation,
      level,
      context,
      sourceUrl,
      createdAt: Date.now(),
    });

    await this.#repository.save(word);

    if (this.#eventBus) {
      this.#eventBus.emit('word:saved', word);
    }

    return word;
  }

  #generateId() {
    return `w_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
