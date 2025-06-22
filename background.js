// background.js

// 拡張機能のコマンドが入力されたときのリスナー
chrome.commands.onCommand.addListener((command, tab) => {
  // Geminiのページでのみ動作させる
  if (tab.url && tab.url.startsWith("https://gemini.google.com")) {
    
    let functionToExecute;
    switch (command) {
      case "toggle-model":
        functionToExecute = "toggleModel";
        break;
      case "new-chat":
        functionToExecute = "newChat";
        break;
      case "show-search":
        functionToExecute = "showSearch";
        break;
      default:
        // 不明なコマンドの場合は何もしない
        return;
    }

    // content.js内の関数を実行する
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (funcName) => {
        // content.js側で定義したグローバルオブジェクト経由で関数を呼び出す
        if (window.geminiShortcuts && typeof window.geminiShortcuts[funcName] === 'function') {
          window.geminiShortcuts[funcName]();
        } else {
          // content.jsが読み込まれていないか、関数が存在しない場合
          // エラーメッセージを出すか、content.jsを注入する処理をここに追加することも可能
          console.error(`'${funcName}' is not available in content script.`);
        }
      },
      args: [functionToExecute]
    });
  }
});

// アイコンクリック時の動作（オプション）
// 今回は特に何もしないが、将来的にポップアップなどを追加する場合はここに記述
chrome.action.onClicked.addListener((tab) => {
  // Geminiのページでアイコンがクリックされたら、検索ウィンドウを開くなど、
  // デフォルトのアクションを設定することもできる
  if (tab.url && tab.url.startsWith("https://gemini.google.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.geminiShortcuts && typeof window.geminiShortcuts.showSearch === 'function') {
          window.geminiShortcuts.showSearch();
        }
      }
    });
  }
});
  