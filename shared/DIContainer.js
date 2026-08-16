import { EventBus } from './EventBus.js';
import { GoogleTranslateAdapter } from '../infrastructure/translators/GoogleTranslateAdapter.js';
import { IndexedDBAdapter } from '../infrastructure/storage/IndexedDBAdapter.js';
import { LevelClassifier } from '../infrastructure/LevelClassifier.js';
import { TranslateWord } from '../core/use-cases/TranslateWord.js';
import { GetWordHistory } from '../core/use-cases/GetWordHistory.js';
import { CalculateNextReview } from '../core/use-cases/CalculateNextReview.js';
import { GetStatistics } from '../core/use-cases/GetStatistics.js';

let instance = null;

export class DIContainer {
  constructor() {
    this.eventBus = new EventBus();
    this.translator = new GoogleTranslateAdapter('es');
    this.repository = new IndexedDBAdapter();
    this.levelClassifier = new LevelClassifier();

    this.translateWord = new TranslateWord(
      this.translator,
      this.repository,
      this.levelClassifier,
      this.eventBus
    );
    this.getWordHistory = new GetWordHistory(this.repository);
    this.calculateNextReview = new CalculateNextReview(this.repository, this.eventBus);
    this.getStatistics = new GetStatistics(this.repository);
  }

  static getInstance() {
    if (!instance) {
      instance = new DIContainer();
    }
    return instance;
  }

  async init() {
    await this.repository.init();
    return this;
  }
}
