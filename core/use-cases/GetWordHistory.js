export class GetWordHistory {
  #repository;

  constructor(repository) {
    this.#repository = repository;
  }

  async execute(filter = {}) {
    return this.#repository.findAll(filter);
  }

  async getByLevel(level) {
    return this.#repository.findAll({ level });
  }

  async getDueForReview() {
    return this.#repository.findAll({ dueForReview: true });
  }

  async getMastered() {
    return this.#repository.findAll({ mastered: true });
  }

  async getNotMastered() {
    return this.#repository.findAll({ mastered: false });
  }

  async search(query) {
    return this.#repository.findAll({ search: query });
  }
}
