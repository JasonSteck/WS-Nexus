class IndexedList {
  constructor() {
    this.hash = {};
    this.array = [];
  }

  add(id, element) {
    if(id == null) throw new Error('Need and id to add element to the IndexedList')
    this.hash[id] = element;
    this.array.push(element);
  }

  remove(id) {
    const element = this.hash[id];
    const index = this.array.indexOf(element);

    this.array.splice(index, 1);
    delete this.hash[id];
  }

  clear() {
    this.hash = {};
    this.array = [];
  }
}

module.exports = IndexedList;
