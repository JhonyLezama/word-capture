export class GetStatistics {
  #repository;

  constructor(repository) {
    this.#repository = repository;
  }

  async execute() {
    const allWords = await this.#repository.findAll();
    const mastered = allWords.filter(w => w.mastered);
    const dueForReview = allWords.filter(w => w.isDueForReview());

    const byLevel = {};
    for (const word of allWords) {
      byLevel[word.level] = (byLevel[word.level] || 0) + 1;
    }

    const byLevelMastered = {};
    for (const word of mastered) {
      byLevelMastered[word.level] = (byLevelMastered[word.level] || 0) + 1;
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const addedToday = allWords.filter(w => w.createdAt > oneDayAgo).length;
    const addedThisWeek = allWords.filter(w => w.createdAt > oneWeekAgo).length;
    const addedThisMonth = allWords.filter(w => w.createdAt > oneMonthAgo).length;

    return {
      total: allWords.length,
      masteredCount: mastered.length,
      dueForReviewCount: dueForReview.length,
      masteryPercentage: allWords.length > 0
        ? Math.round((mastered.length / allWords.length) * 100)
        : 0,
      byLevel,
      byLevelMastered,
      addedToday,
      addedThisWeek,
      addedThisMonth,
    };
  }
}
