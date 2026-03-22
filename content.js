window.__startScreenshotSelection = function () {
  // Не запускать дважды
  if (document.getElementById('__screenshot-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = '__screenshot-overlay';
  document.body.appendChild(overlay);

  const selBox = document.createElement('div');
  selBox.id = '__screenshot-selection';
  selBox.style.display = 'none';
  document.body.appendChild(selBox);

  const coords = document.createElement('div');
  coords.id = '__screenshot-coords';
  coords.style.display = 'none';
  document.body.appendChild(coords);

  let startX = 0, startY = 0;
  let isDragging = false;

  function cleanup() {
    overlay.remove();
    selBox.remove();
    coords.remove();
  }

  function updateSelection(x1, y1, x2, y2) {
    const left   = Math.min(x1, x2);
    const top    = Math.min(y1, y2);
    const width  = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    selBox.style.display = 'block';
    selBox.style.left    = left + 'px';
    selBox.style.top     = top + 'px';
    selBox.style.width   = width + 'px';
    selBox.style.height  = height + 'px';

    // Координаты рядом с курсором
    coords.style.display = 'block';
    coords.textContent   = `${width} × ${height}`;
    coords.style.left    = (x2 + 12) + 'px';
    coords.style.top     = (y2 + 8) + 'px';

    // Не выходить за край экрана
    const cw = coords.offsetWidth;
    const ch = coords.offsetHeight;
    if (x2 + 12 + cw > window.innerWidth)  coords.style.left = (x2 - cw - 8) + 'px';
    if (y2 + 8  + ch > window.innerHeight) coords.style.top  = (y2 - ch - 8) + 'px';
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    e.preventDefault();
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSelection(startX, startY, e.clientX, e.clientY);
  });

  overlay.addEventListener('mouseup', async (e) => {
    if (!isDragging) return;
    isDragging = false;

    const endX = e.clientX;
    const endY = e.clientY;

    const left   = Math.min(startX, endX);
    const top    = Math.min(startY, endY);
    const width  = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    cleanup();

    if (width < 5 || height < 5) return; // слишком маленькое — игнорируем

    // Запросить снимок всей вкладки у background
    chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, async (response) => {
      if (!response?.dataUrl) return;

      const dpr = window.devicePixelRatio || 1;

      const img = new Image();
      img.src = response.dataUrl;
      await new Promise(r => img.onload = r);

      // Кроп
      const canvas = document.createElement('canvas');
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        left * dpr, top * dpr, width * dpr, height * dpr,
        0, 0, width * dpr, height * dpr
      );

      // Копировать в буфер
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('✓  Скопировано в буфер — вставьте Ctrl+V');
        } catch {
          showToast('⚠  Не удалось записать в буфер обмена');
        }
      }, 'image/png');
    });
  });

  // Отмена по ESC
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);
};

function showToast(text) {
  const t = document.createElement('div');
  t.id = '__screenshot-toast';
  t.textContent = text;
  document.body.appendChild(t);

  requestAnimationFrame(() => {
    t.classList.add('visible');
  });

  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}
