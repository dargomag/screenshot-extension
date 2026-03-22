document.getElementById('startBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Системные страницы Chrome недоступны для расширений
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('https://chrome.google.com/webstore')) {
    showError('Недоступно на системных страницах Chrome.\nПерейдите на обычный сайт.');
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.__startScreenshotSelection?.();
      }
    });
    window.close();
  } catch (e) {
    showError('Не удалось запустить на этой странице.');
  }
});

function showError(text) {
  const btn = document.getElementById('startBtn');
  btn.textContent = text;
  btn.style.background = '#ff4444';
  btn.style.color = '#fff';
  btn.style.whiteSpace = 'pre-line';
  btn.style.fontSize = '10px';
  btn.style.padding = '8px';
}
