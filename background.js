import { DIContainer } from './shared/DIContainer.js';
import { Word } from './core/entities/Word.js';
import { generateId } from './shared/utils/helpers.js';

const Messages = {
  TRANSLATE_WORD: 'TRANSLATE_WORD',
  SAVE_WORD: 'SAVE_WORD',
  GET_HISTORY: 'GET_HISTORY',
  DELETE_WORD: 'DELETE_WORD',
  GET_STATS: 'GET_STATS',
  GET_DUE_REVIEW: 'GET_DUE_REVIEW',
  REVIEW_WORD: 'REVIEW_WORD',
  EXPORT_WORDS: 'EXPORT_WORDS',
  IMPORT_WORDS: 'IMPORT_WORDS',
};

let container = null;
let initFailed = false;

async function getContainer() {
  if (initFailed) {
    container = null;
    initFailed = false;
  }
  if (!container) {
    container = new DIContainer();
    try {
      await container.init();
    } catch (e) {
      container = null;
      initFailed = true;
      throw e;
    }
  }
  return container;
}

chrome.runtime.onInstalled.addListener(async () => {
  await getContainer();
  console.log('WordCapture installed');

  chrome.contextMenus.create({
    id: 'translate-word',
    title: 'Traducir y guardar "%s"',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-word' && info.selectionText) {
    const word = info.selectionText.trim();
    if (!/^[a-zA-Z]+(?:[- '][a-zA-Z]+)*$/.test(word) || word.length < 2 || word.length > 60) return;
    if (!tab || !tab.id) return;

    try {
      const di = await getContainer();
      const result = await di.translateWord.execute(
        word,
        '',
        tab.url
      );

      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TRANSLATION',
        word: result.text,
        x: info.clientX || 100,
        y: info.clientY || 100,
      }, (_response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to show widget:', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      console.error('Translation error:', error);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });
  return true;
});

async function handleMessage(message, _sender) {
  const di = await getContainer();

  switch (message.type) {
    case Messages.TRANSLATE_WORD:
      return handleTranslate(di, message.data);

    case Messages.SAVE_WORD:
      return handleSave(di, message.data);

    case Messages.GET_HISTORY:
      return handleGetHistory(di, message.data);

    case Messages.DELETE_WORD:
      return handleDelete(di, message.data);

    case Messages.GET_STATS:
      return handleGetStats(di);

    case Messages.GET_DUE_REVIEW:
      return handleGetDueReview(di);

    case Messages.REVIEW_WORD:
      return handleReviewWord(di, message.data);

    case Messages.EXPORT_WORDS:
      return handleExportWords(di);

    case Messages.IMPORT_WORDS:
      return handleImportWords(di, message.data);

    default:
      return { error: 'Unknown message type' };
  }
}

async function handleTranslate(di, data) {
  const { text } = data;
  if (!text) return { error: 'No text provided' };

  const result = await di.translator.translate(text, 'en', 'es');
  const level = di.levelClassifier.classify(text);

  return {
    translation: result.text,
    translations: result.translations,
    pronunciation: result.pronunciation,
    level,
  };
}

async function handleSave(di, data) {
  const { word, translation, translations, level, context, sourceUrl } = data;

  const existing = await di.repository.findByText(word);
  if (existing) return { success: true, word: existing.toJSON() };

  const translationsArray = translations
    || (translation ? [{ text: translation, pos: '' }] : []);

  const newWord = new Word({
    id: generateId(),
    text: word.toLowerCase(),
    translations: translationsArray,
    level: level || di.levelClassifier.classify(word),
    context: context || '',
    sourceUrl: sourceUrl || '',
    createdAt: Date.now(),
  });

  await di.repository.save(newWord);
  return { success: true, word: newWord.toJSON() };
}

async function handleGetHistory(di, data) {
  const { search, level } = data || {};
  const filter = {};
  if (search) filter.search = search;
  if (level) filter.level = level;

  const words = await di.getWordHistory.execute(filter);
  return { words: words.map(w => w.toJSON()) };
}

async function handleDelete(di, data) {
  const { id } = data;
  if (!id) return { error: 'No id provided' };

  await di.repository.deleteById(id);
  return { success: true };
}

async function handleGetStats(di) {
  const stats = await di.getStatistics.execute();
  return stats;
}

async function handleGetDueReview(di) {
  const words = await di.getWordHistory.getDueForReview();
  return { words: words.map(w => w.toJSON()) };
}

async function handleReviewWord(di, data) {
  const { wordId, quality } = data;
  if (!wordId || quality === undefined) return { error: 'Missing wordId or quality' };

  const result = await di.calculateNextReview.execute(wordId, quality);
  return {
    success: true,
    word: result.word.toJSON(),
    nextReview: result.nextReview,
    mastered: result.mastered,
  };
}

async function handleExportWords(di) {
  const words = await di.repository.findAll();
  const data = words.map(w => w.toJSON());
  return { words: data, count: data.length };
}

async function handleImportWords(di, data) {
  const { words } = data;
  if (!Array.isArray(words)) return { error: 'Invalid data' };

  let imported = 0;
  let skipped = 0;

  for (const wordData of words) {
    const existing = await di.repository.findByText(wordData.text);
    if (existing) {
      skipped++;
      continue;
    }

    const word = new Word({
      id: wordData.id || generateId(),
      text: wordData.text.toLowerCase(),
      translations: wordData.translations || (wordData.translation ? [{ text: wordData.translation, pos: '' }] : []),
      level: wordData.level || 'A1',
      context: wordData.context || '',
      sourceUrl: wordData.sourceUrl || '',
      createdAt: wordData.createdAt || Date.now(),
      reviewData: wordData.reviewData,
      timesReviewed: wordData.timesReviewed || 0,
      mastered: wordData.mastered || false,
    });

    await di.repository.save(word);
    imported++;
  }

  return { success: true, imported, skipped };
}
