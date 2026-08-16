export class CalculateNextReview {
  #repository;
  #eventBus;

  constructor(repository, eventBus = null) {
    this.#repository = repository;
    this.#eventBus = eventBus;
  }

  async execute(wordId, quality) {
    if (quality < 0 || quality > 5) {
      throw new Error('Quality must be between 0 and 5');
    }

    const word = await this.#repository.findById(wordId);
    if (!word) throw new Error(`Word not found: ${wordId}`);

    word.updateReview(quality);
    await this.#repository.save(word);

    if (this.#eventBus) {
      this.#eventBus.emit('word:reviewed', { word, quality });
    }

    return {
      word,
      nextReview: word.reviewData.nextReview,
      interval: word.reviewData.interval,
      mastered: word.mastered,
    };
  }
}
