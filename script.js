const EXPLORER_WIDTH = 240;

document.addEventListener('DOMContentLoaded', function () {
  // Inject CSS custom property for use in dynamic styling
  document.documentElement.style.setProperty('--jb-font', "'JetBrains Mono'");

  // Poll for an element to mount, then hand it to callback. Gives up after
  // timeoutMs so a renamed/removed selector can't spin forever in the background.
  function waitForElement(selector, callback, intervalMs = 200, timeoutMs = 15000) {
    const start = Date.now();
    const intervalId = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(intervalId);
        callback(el);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(intervalId);
        console.warn(`[vscode-modifiers] waitForElement: gave up waiting for "${selector}" after ${timeoutMs}ms`);
      }
    }, intervalMs);
  }

  // Set default explorer width — intercepts VSCode's first layout pass, then steps aside
  // so drag-resizing works normally afterward
  waitForElement('.part.sidebar', (sidebar) => {
    const sidebarObserver = new MutationObserver(() => {
      sidebar.style.width = EXPLORER_WIDTH + 'px';
      sidebarObserver.disconnect();
    });
    sidebarObserver.observe(sidebar, { attributes: true, attributeFilter: ['style'] });
  }, 200);

  // Watch for the command palette and set up its observer
  waitForElement('.quick-input-widget', (commandDialog) => {
    if (commandDialog.style.display !== 'none') {
      showCommandBlur();
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (commandDialog.style.display === 'none') {
            hideCommandBlur();
          } else {
            showCommandBlur();
          }
        }
      });
    });

    observer.observe(commandDialog, { attributes: true });
  }, 500);

  // Single keydown handler for both Ctrl+P and Escape
  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
      event.preventDefault();
      showCommandBlur();
    } else if (event.key === 'Escape') {
      hideCommandBlur();
    }
  });

  function showCommandBlur() {
    const workbench = document.querySelector('.monaco-workbench');
    if (!workbench) return;

    const existing = document.getElementById('command-blur');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.setAttribute('id', 'command-blur');
    overlay.addEventListener('click', hideCommandBlur);
    workbench.appendChild(overlay);

    // Animate in
    overlay.style.opacity = '0';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

  }

  function hideCommandBlur() {
    const overlay = document.getElementById('command-blur');
    if (overlay) overlay.remove();

  }

  // Sync command center text with the current filename from document.title
  function getFilenameFromTitle() {
    const raw = document.title.replace(/^[●•◉] /, '').trim();
    return raw.split(/\s[-—–]\s/)[0] || raw;
  }

  function syncCommandCenterFilename() {
    const label = document.querySelector('.titlebar-center .window-title');
    if (label) label.textContent = getFilenameFromTitle();
  }

  waitForElement('.titlebar-center .window-title', () => {
    syncCommandCenterFilename();

    const titleEl = document.querySelector('title');
    if (titleEl) {
      new MutationObserver(syncCommandCenterFilename)
        .observe(titleEl, { childList: true, subtree: true, characterData: true });
    }
  }, 500);

  // Animate context menus and notifications as they enter the DOM
  const workbenchObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        // Context menu fade-in
        if (node.classList.contains('context-view') || node.querySelector?.('.context-view')) {
          const target = node.classList.contains('context-view')
            ? node
            : node.querySelector('.context-view');
          if (target) animateFadeIn(target, 120);
        }

        // Notification toast slide-in
        if (node.classList.contains('notification-toast')) {
          animateSlideIn(node, 200);
        }

        // Also catch toasts appended inside a container
        const toast = node.querySelector?.('.notification-toast');
        if (toast) animateSlideIn(toast, 200);
      });
    });
  });

  const workbench = document.querySelector('.monaco-workbench');
  if (workbench) {
    workbenchObserver.observe(workbench, { childList: true, subtree: true });
  }

  function animateFadeIn(el, durationMs) {
    el.style.transition = `opacity ${durationMs}ms ease`;
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });
    });
  }

  function animateSlideIn(el, durationMs) {
    el.style.transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }
});
