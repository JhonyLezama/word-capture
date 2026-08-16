export class ITranslator {
  async translate(text, from, to) {
    throw new Error('translate() must be implemented');
  }

  async detectLanguage(text) {
    throw new Error('detectLanguage() must be implemented');
  }
}
