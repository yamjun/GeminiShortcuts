(() => {
  // スクリプトが既に実行済みの場合は、何もしない（二重実行を防止）
  if (window.geminiShortcutsLoaded) {
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
        transition: 'opacity 0.3s ease-in-out',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      });
      document.body.appendChild(container);
    }
    container.textContent = message;
    container.style.opacity = '1';
    setTimeout(() => {
      container.style.opacity = '0';
    }, duration);
  };

  const geminiShortcuts = {
    /**
     * モデルを自動で切り替えます。
     * メニューを開き、現在のモデルとは別のモデルを選択してクリックします。
     */
    toggleModel: () => {
      // 1. 現在のモデルと切り替えボタンを特定
      const modelPill = document.querySelector('.logo-pill-label-container');
      if (!modelPill) {
        showMessage('モデル表示エリアが見つかりません。', 3000);
        return;
      }
      
      const clickableButton = modelPill.closest('button');
      if (!clickableButton) {
        showMessage('クリック可能なモデル切り替えボタンが見つかりません。', 3000);
        return;
      }

      // 2. 現在のモデルからターゲットモデルを決定
      const currentModelText = modelPill.textContent || "";
      const isPro = currentModelText.includes('Pro');
      const targetModelKeyword = isPro ? 'Flash' : 'Pro';

      // 3. メニューを開く
      clickableButton.click();

      // 4. メニューが表示されるのを待ってから、ターゲットモデルをクリック
      setTimeout(() => {
        // 提供されたHTML構造に基づき、メニュー項目をすべて取得
        const menuItems = document.querySelectorAll('.title-and-description');
        let targetItemContainer = null;

        for (const item of menuItems) {
          const titleElement = item.querySelector('.mode-title');
          if (titleElement && titleElement.textContent.includes(targetModelKeyword)) {
            targetItemContainer = item.closest('button, [role="menuitem"]');
            break;
          }
        }

        if (targetItemContainer) {
          targetItemContainer.click();
          showMessage(`モデルを ${targetModelKeyword} に切り替えました。`, 2500);
        } else {
          showMessage(`${targetModelKeyword} モデルがメニューに見つかりませんでした。`, 3000);
          // 見つからなかった場合、開いたメニューを閉じる試み
          clickableButton.click();
        }
      }, 150); // メニューのアニメーションを待つための少しの遅延
    },

    /**
     * 新しいチャットを開始します。
     */
    newChat: () => {
      const newChatButton = document.querySelector('a[href="/gemini"]');
      if (newChatButton) {
        newChatButton.click();
      } else {
        // Fallback for different UIs
        const altButton = document.querySelector('a.history-nav-button[aria-label="新しいチャット"]');
         if(altButton) altButton.click();
         else showMessage('新規チャットボタンが見つかりません', 3000);
      }
    },

    /**
     * Deep Researchボタンをトグルします。
     */
    deepResearch: () => {
      // Deep Researchボタンを特定
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const label = b.querySelector('.toolbox-drawer-button-label');
        return label && label.textContent.trim() === 'Deep Research';
      });
      if (!btn) {
        showMessage('Deep Researchボタンが見つかりません', 3000);
        return;
      }
      // aria-pressed属性とis-selectedクラスでON/OFFをトグル
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      btn.classList.toggle('is-selected', !pressed);
      showMessage(`Deep Research: ${pressed ? 'DISABLED' : 'ENABLED'}`, 2000);
    }
  };

  // グローバルスコープに関数を公開
  window.geminiShortcuts = geminiShortcuts;

})(); 