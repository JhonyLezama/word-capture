export class IWordRepository {
  async save(word) {
    throw new Error('save() must be implemented');
  }

  async findById(id) {
    throw new Error('findById() must be implemented');
  }

  async findByText(text) {
    throw new Error('findByText() must be implemented');
  }

  async findAll(filter) {
    throw new Error('findAll() must be implemented');
  }

  async deleteById(id) {
    throw new Error('deleteById() must be implemented');
  }

  async count(filter) {
    throw new Error('count() must be implemented');
  }
}
