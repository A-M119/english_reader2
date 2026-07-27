// localStorageへの読み書きをまとめた薄いラッパー群
// キー: reader:books = { [title]: { lastIndex, totalSentences, lastOpenedAt } }
// キー: reader:vocab = [ { word, meaning, sentence, bookTitle, addedAt } ]

const BOOKS_KEY = "reader:books";
const VOCAB_KEY = "reader:vocab";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("localStorageの読み込みに失敗しました:", key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorageへの書き込みに失敗しました:", key, e);
  }
}

function getAllBooks() {
  return readJSON(BOOKS_KEY, {});
}

function getBookProgress(title) {
  const books = getAllBooks();
  return books[title] || null;
}

function saveBookProgress(title, lastIndex, totalSentences) {
  const books = getAllBooks();
  books[title] = {
    lastIndex,
    totalSentences,
    lastOpenedAt: new Date().toISOString(),
  };
  writeJSON(BOOKS_KEY, books);
}

function resetBookProgress(title) {
  const books = getAllBooks();
  if (books[title]) {
    books[title].lastIndex = 0;
    books[title].lastOpenedAt = new Date().toISOString();
    writeJSON(BOOKS_KEY, books);
  }
}

function getVocab() {
  return readJSON(VOCAB_KEY, []);
}

function addVocab(entry) {
  const vocab = getVocab();
  vocab.push({
    word: entry.word,
    meaning: entry.meaning,
    sentence: entry.sentence,
    bookTitle: entry.bookTitle,
    addedAt: new Date().toISOString(),
  });
  writeJSON(VOCAB_KEY, vocab);
}

function removeVocab(index) {
  const vocab = getVocab();
  vocab.splice(index, 1);
  writeJSON(VOCAB_KEY, vocab);
}

const Storage = {
  getAllBooks,
  getBookProgress,
  saveBookProgress,
  resetBookProgress,
  getVocab,
  addVocab,
  removeVocab,
};
