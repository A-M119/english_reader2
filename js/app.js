// アプリ全体の状態管理とイベント配線

const state = {
  book: null, // { title, sentences }
  currentIndex: 0,
  translationVisible: false,
};

function renderCurrentSentence() {
  const sentence = state.book.sentences[state.currentIndex];
  Render.renderSentence(sentence);
  Render.renderProgress(state.currentIndex, state.book.sentences.length, state.book.title);
  state.translationVisible = false;
  Render.setTranslationPanelVisible(false);
  Storage.saveBookProgress(state.book.title, state.currentIndex, state.book.sentences.length);
  updateNavButtons();
}

function updateNavButtons() {
  document.getElementById("btn-prev").disabled = state.currentIndex === 0;
  document.getElementById("btn-next").disabled = state.currentIndex === state.book.sentences.length - 1;
}

function startBook(book) {
  const saved = Storage.getBookProgress(book.title);
  let startIndex = 0;
  if (saved && typeof saved.lastIndex === "number") {
    startIndex = Math.min(saved.lastIndex, book.sentences.length - 1);
  }
  state.book = book;
  state.currentIndex = startIndex;
  Render.showView("reader");
  renderCurrentSentence();
}

function handleAddVocab(entry) {
  Storage.addVocab(entry);
}

function handleFileSelected(file) {
  Render.showUploadError("");
  FileLoader.loadBookFile(file)
    .then((book) => {
      startBook(book);
    })
    .catch((err) => {
      Render.showUploadError(err.message);
    });
}

function refreshSavedBooksList() {
  const books = Storage.getAllBooks();
  Render.renderSavedBooksList(books, () => {
    document.getElementById("file-input").click();
  });
}

function goToUploadView() {
  document.getElementById("file-input").value = "";
  Render.showUploadError("");
  refreshSavedBooksList();
  Render.showView("upload");
}

function refreshVocabView() {
  const vocab = Storage.getVocab();
  Render.renderVocabList(vocab, (index) => {
    Storage.removeVocab(index);
    refreshVocabView();
  });
}

function wireEvents() {
  document.getElementById("file-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelected(file);
  });

  document.getElementById("btn-translate").addEventListener("click", () => {
    const sentence = state.book.sentences[state.currentIndex];
    state.translationVisible = !state.translationVisible;
    if (state.translationVisible) {
      Render.renderTranslationPanel(sentence, state.book.title, handleAddVocab);
    }
    Render.setTranslationPanelVisible(state.translationVisible);
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    if (state.currentIndex < state.book.sentences.length - 1) {
      state.currentIndex++;
      renderCurrentSentence();
    }
  });

  document.getElementById("btn-prev").addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentSentence();
    }
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    if (!confirm("最初の文から読み直しますか？")) return;
    state.currentIndex = 0;
    Storage.resetBookProgress(state.book.title);
    renderCurrentSentence();
  });

  document.getElementById("btn-change-file").addEventListener("click", () => {
    goToUploadView();
  });

  document.getElementById("tab-reader").addEventListener("click", () => {
    if (state.book) {
      Render.showView("reader");
    } else {
      goToUploadView();
    }
  });

  document.getElementById("tab-vocab").addEventListener("click", () => {
    refreshVocabView();
    Render.showView("vocab");
  });
}

function init() {
  wireEvents();
  goToUploadView();
}

document.addEventListener("DOMContentLoaded", init);
