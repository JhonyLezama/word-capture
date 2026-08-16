export class ILevelClassifier {
  classify(word) {
    throw new Error('classify() must be implemented');
  }

  getLevelDescription(level) {
    throw new Error('getLevelDescription() must be implemented');
  }
}
