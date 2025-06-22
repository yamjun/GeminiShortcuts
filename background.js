// background.js

chrome.commands.onCommand.addListener((command, tab) => {
  // 「検索」コマンドはどのページからでも実行できるように、特別に処理する
  if (command === "show-search") {
    // 現在のタブのURLを更新する
    chrome.tabs.update(tab.id, { url: 'https://gemini.google.com/search' });
    return;
  }

  // --- 以下はGeminiページ内でのみ動作するコマンド ---

  // Geminiのページ以外では動作させない
  if (!tab.url || !tab.url.startsWith("https://gemini.google.com/")) {
    return;
  }

  // 実行すべき関数名をコマンドから決定
  let functionToExecute;
  switch (command) {
    case "toggle-model":
      functionToExecute = "toggleModel";
      break;
    case "new-chat":
      // 新しいチャットは同じタブで https://gemini.google.com/app に遷移
      chrome.tabs.update(tab.id, { url: 'https://gemini.google.com/app' });
      return;
    case "deep-research":
      functionToExecute = "deepResearch";
      break;
    case "canvas":
      functionToExecute = "canvas";
      break;
    // show-search は上で処理済み
    default:
      return; // 不明なコマンドは無視
  }

  // content.js を注入し、指定された関数を実行する
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  }, () => {
    // content.jsの読み込み後に、その中の関数を実行
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (funcName) => {
        // content.js内で定義されているはずのグローバルオブジェクトを確認
        if (window.geminiShortcuts && typeof window.geminiShortcuts[funcName] === 'function') {
          window.geminiShortcuts[funcName]();
        }
      },
      args: [functionToExecute]
    });
  });
});

// 拡張機能のアイコンをクリックしたときの動作
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.startsWith("https://gemini.google.com/")) {
    // アイコンクリック時は履歴検索機能を呼び出す
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.geminiShortcuts && typeof window.geminiShortcuts.showSearch === 'function') {
            window.geminiShortcuts.showSearch();
          }
        }
      });
    });
  }
}); 