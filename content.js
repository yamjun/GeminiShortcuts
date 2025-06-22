(() => {
  // スクリプトが既に実行済みの場合は、何もしない（二重実行を防止）
  if (window.geminiShortcutsLoaded) {
    // ただし、検索モーダルは再実行でトグル（表示/非表示）させたい場合がある
    if (window.geminiShortcuts && typeof window.geminiShortcuts.showSearch === 'function') {
       // showSearch関数は内部で表示/非表示を切り替える
       window.geminiShortcuts.showSearch();
    }
    return;
  }
  window.geminiShortcutsLoaded = true;

  // 画面にメッセージを表示するヘルパー関数
  const showMessage = (message, duration = 3000) => {
    let container = document.getElementById('gemini-shortcut-notifier');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gemini-shortcut-notifier';
      Object.assign(container.style, {
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: '#333', color: 'white', padding: '12px 24px',
        borderRadius: '8px', zIndex: '10001', opacity: '0',
        transition: 'opacity 0.3s ease, bottom 0.3s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: '14px', fontFamily: 'sans-serif'
      });
      document.body.appendChild(container);
    }
    container.textContent = message;
    container.style.opacity = '1';
    container.style.bottom = '30px';
    if (container.timer) clearTimeout(container.timer);
    container.timer = setTimeout(() => {
      container.style.opacity = '0';
      container.style.bottom = '20px';
    }, duration);
  };

  // --- 機能の実装 ---

  // 1. モデルを切り替える関数
  const toggleModel = () => {
    // モデル名が含まれるボタンを探す (例: "Gemini Pro", "Gemini Flash")
    const modelSwitcher = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.includes('Gemini') && (btn.textContent.includes('Pro') || btn.textContent.includes('Flash')));

    if (!modelSwitcher) {
      showMessage("モデル切り替えボタンが見つかりません。");
      return;
    }

    const currentModel = modelSwitcher.textContent;
    modelSwitcher.click();

    setTimeout(() => {
      const menu = document.querySelector('div[role="menu"]');
      if (!menu) {
        showMessage("モデル選択メニューが見つかりません。");
        modelSwitcher.click(); // メニューを閉じる試み
        return;
      }

      const isPro = currentModel.includes('Pro');
      const targetModelKeyword = isPro ? "Flash" : "Pro";
      
      const targetButton = Array.from(menu.querySelectorAll('button[role="menuitem"]'))
        .find(item => item.textContent.includes(targetModelKeyword));

      if (targetButton) {
        targetButton.click();
        showMessage(`モデルを ${targetButton.textContent.trim()} に切り替えました。`);
      } else {
        showMessage(`${targetModelKeyword}モデルが見つかりませんでした。`);
        modelSwitcher.click(); // メニューを閉じる試み
      }
    }, 100); // メニューが表示されるまでの待機時間
  };

  // 2. 新しいチャットを開始する関数
  const newChat = () => {
    // 「新しいチャット」のaria-labelを持つ要素を探すのが確実
    const newChatButton = document.querySelector('[aria-label="新しいチャット"]') || document.querySelector('[aria-label="New chat"]');
    if (newChatButton) {
      newChatButton.click();
      showMessage("新しいチャットを開始しました。");
    } else {
       // aタグでフォールバック
       const fallbackButton = document.querySelector('a[href="/gemini"]');
       if (fallbackButton) {
           fallbackButton.click();
           showMessage("新しいチャットを開始しました。");
       } else {
           showMessage("新しいチャットボタンが見つかりません。");
       }
    }
  };

  // 3. 履歴検索ウィンドウを表示/非表示する関数
  const showSearch = () => {
    const existingModal = document.getElementById('gemini-search-modal-container');
    if (existingModal) {
      existingModal.remove();
      // もう一度スクリプトが呼ばれた時のためにフラグをリセット
      window.geminiShortcutsLoaded = false;
      return;
    }

    const historyLinks = Array.from(document.querySelectorAll('a[href^="/gemini/chat/"]'));
    const historyItems = historyLinks.map(link => {
        const titleEl = link.querySelector('.truncate'); // タイトルは truncate クラス内にあることが多い
        return {
          title: titleEl ? titleEl.textContent.trim() : link.textContent.trim(),
          href: link.href
        };
    }).filter(item => item.title); // タイトルが空でないものだけ

    if (historyItems.length === 0) {
      showMessage("チャット履歴が見つかりません。");
      return;
    }
    
    // --- モーダルウィンドウのHTMLを生成 ---
    const modalContainer = document.createElement('div');
    modalContainer.id = 'gemini-search-modal-container';
    document.body.appendChild(modalContainer);

    modalContainer.innerHTML = `
      <div id="gemini-search-modal">
        <div id="gemini-search-header">
          <h3>チャット履歴を検索</h3>
          <button id="gemini-search-close" title="閉じる">&times;</button>
        </div>
        <input type="text" id="gemini-search-input" placeholder="キーワードで絞り込み..." autocomplete="off">
        <ul id="gemini-search-results"></ul>
      </div>
    `;
    
    // --- イベントリスナーを設定 ---
    const input = document.getElementById('gemini-search-input');
    const resultsList = document.getElementById('gemini-search-results');

    const closeModal = () => {
      const modal = document.getElementById('gemini-search-modal-container');
      if (modal) {
        modal.remove();
      }
      window.geminiShortcutsLoaded = false; // 次回実行できるようにフラグをリセット
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.getElementById('gemini-search-close').addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        closeModal();
      }
    });
    document.addEventListener('keydown', handleEsc);

    // --- 検索ロジック ---
    const renderResults = (items) => {
      resultsList.innerHTML = '';
      if (items.length === 0) {
        resultsList.innerHTML = '<li class="gemini-search-no-results">一致する結果はありません。</li>';
        return;
      }
      items.slice(0, 100).forEach(item => { // 最大100件表示
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = item.title;
        a.href = item.href;
        a.title = item.title;
        a.onclick = (e) => {
          e.preventDefault();
          window.location.href = item.href;
          closeModal();
        };
        li.appendChild(a);
        resultsList.appendChild(li);
      });
    };

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      if (!query) {
        renderResults(historyItems); // 入力が空なら全件表示
        return;
      }
      const filtered = historyItems.filter(item => item.title.toLowerCase().includes(query));
      renderResults(filtered);
    });

    renderResults(historyItems); // 初期表示
    input.focus();
  };

  // background.jsから呼び出せるように、各関数をグローバルオブジェクトに登録
  window.geminiShortcuts = {
    toggleModel,
    newChat,
    showSearch,
  };
})(); 