// content.js

(() => {
    // スクリプトが複数回注入されるのを防ぐ
    if (window.geminiShortcuts) {
      const existingModal = document.getElementById('gemini-search-modal-container');
      if (existingModal) existingModal.remove();
      return;
    }
  
    // Geminiの画面上に一時的なメッセージを表示する関数
    const showMessage = (message, duration = 3000) => {
      let container = document.getElementById('gemini-shortcut-notifier');
      if (!container) {
        container = document.createElement('div');
        container.id = 'gemini-shortcut-notifier';
        Object.assign(container.style, {
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3c4043',
          color: '#e8eaed',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: '10000',
          opacity: '0',
          transition: 'opacity 0.5s ease-in-out, bottom 0.5s ease-in-out',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          fontSize: '14px',
          fontFamily: 'Google Sans, sans-serif'
        });
        document.body.appendChild(container);
      }
      container.textContent = message;
      container.style.opacity = '1';
      
      if (container.timer) clearTimeout(container.timer);
      
      container.timer = setTimeout(() => {
        if(container) container.style.opacity = '0';
      }, duration);
    };
  
    // モデルを切り替える関数（エラー修正版）
    const toggleModel = () => {
      // モデル名に含まれる可能性のある文字列
      const modelKeywords = ["Pro", "Flash", "Advanced"];
  
      // 1. ヘッダー内にあるモデルスイッチャーボタンを探す
      // :has() は使えないため、全ボタンからJavaScriptで探す、より確実な方法
      let modelSwitcher = null;
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
          const btnText = btn.textContent || "";
          // "Pro" や "Flash" を含み、メニューを開く機能(aria-haspopup)を持つボタンを候補とする
          if (modelKeywords.some(keyword => btnText.includes(keyword)) && btn.hasAttribute('aria-haspopup')) {
              modelSwitcher = btn;
              break; // 最初に見つかったものを採用
          }
      }
  
      if (!modelSwitcher) {
        showMessage("モデルスイッチャーが見つかりません。UIが変更された可能性があります。");
        console.error("Model switcher button not found. The UI might have changed.");
        return;
      }
  
      const currentModelText = modelSwitcher.textContent || "";
      // 現在のモデルが "Pro" を含むかどうかで判断
      const isPro = currentModelText.includes("Pro");
  
      // 2. メニューを開く
      modelSwitcher.click();
  
      // 3. メニューが表示されるのを待つ
      setTimeout(() => {
        // role="menu"を持つメニューを探す
        const menu = document.querySelector('div[role="menu"]');
        if (!menu) {
          showMessage("モデル選択メニューが見つかりません。");
          console.error("Model selection menu not found.");
          // 開いたボタンをもう一度クリックしてメニューを閉じる試み
          if (document.body.contains(modelSwitcher)) modelSwitcher.click();
          return;
        }
        const menuItems = menu.querySelectorAll('button[role="menuitem"]');
        if (menuItems.length === 0) {
          showMessage("モデル選択肢が見つかりません。");
          console.error("Model selection menu items not found in menu.");
          if (document.body.contains(modelSwitcher)) modelSwitcher.click();
          return;
        }
  
        // 4. 切り替え先のモデルを決定 (ProならFlashへ、それ以外ならProへ)
        const targetModelKeyword = isPro ? "Flash" : "Pro";
        
        // 5. 切り替え先のボタンを探してクリック
        const targetButton = Array.from(menuItems).find(item => item.textContent && item.textContent.includes(targetModelKeyword));
  
        if (targetButton) {
          targetButton.click();
          showMessage(`モデルを ${targetButton.textContent.trim()} に切り替えました。`);
        } else {
           showMessage(`${targetModelKeyword} を含むモデルのボタンが見つかりません。`);
           console.error(`Button for model including '${targetModelKeyword}' not found.`);
           if (document.body.contains(modelSwitcher)) modelSwitcher.click();
        }
      }, 250); // メニュー表示のための待機時間を少し延長
    };
  
    // 新規チャットを開始する関数
    const newChat = () => {
      // 「New chat」またはそれに類するリンクを探す
      const newChatButton = document.querySelector('a[href="/gemini"]');
      if (newChatButton) {
        newChatButton.click();
      } else {
        showMessage("「新しいチャット」ボタンが見つかりません。");
        console.error("New chat button not found.");
      }
    };
  
    // 履歴検索ウィンドウを表示する関数
    const showSearch = () => {
      const existingModal = document.getElementById('gemini-search-modal-container');
      if (existingModal) {
        existingModal.remove();
        return;
      }
  
      const historyItems = [];
      document.querySelectorAll('a[href^="/gemini/chat/"]').forEach(item => {
        const titleEl = item.querySelector('div, span');
        if (titleEl && titleEl.textContent) {
          historyItems.push({ title: titleEl.textContent.trim(), href: item.href });
        }
      });
  
      if (historyItems.length === 0) {
        showMessage("チャット履歴がサイドバーに見つかりません。");
        return;
      }
  
      const modalContainer = document.createElement('div');
      modalContainer.id = 'gemini-search-modal-container';
      modalContainer.innerHTML = `
        <div id="gemini-search-modal">
          <div id="gemini-search-header">
            <h3>チャット履歴を検索</h3>
            <button id="gemini-search-close" title="閉じる">&times;</button>
          </div>
          <input type="text" id="gemini-search-input" placeholder="キーワードを入力..." autocomplete="off">
          <ul id="gemini-search-results"></ul>
        </div>
      `;
      document.body.appendChild(modalContainer);
  
      const input = document.getElementById('gemini-search-input');
      const resultsList = document.getElementById('gemini-search-results');
      const closeModal = () => {
          if(document.getElementById('gemini-search-modal-container')) {
              document.getElementById('gemini-search-modal-container').remove();
          }
          document.removeEventListener('keydown', handleEsc);
      };
  
      const handleEsc = (e) => {
          if (e.key === "Escape") closeModal();
      };
  
      document.getElementById('gemini-search-close').addEventListener('click', closeModal);
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) closeModal();
      });
      document.addEventListener('keydown', handleEsc);
  
      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        resultsList.innerHTML = '';
        if (!query) return;
  
        const filtered = historyItems.filter(item => item.title.toLowerCase().includes(query));
  
        if (filtered.length === 0) {
          resultsList.innerHTML = '<li class="gemini-search-no-results">一致する結果はありません。</li>';
        } else {
          filtered.slice(0, 100).forEach(item => {
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
        }
      });
      input.focus();
    };
  
    // background.jsから呼び出せるように、各関数をwindowオブジェクトに登録
    window.geminiShortcuts = {
      toggleModel,
      newChat,
      showSearch,
    };
  })();
  