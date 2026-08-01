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

  // Command palette blur overlay — layered so no single mechanism has to be
  // perfectly correct on its own:
  //  - Ctrl/Cmd+P (open) and Escape/Enter (close) are keys we own directly,
  //    so those paths are instant and can't misfire.
  //  - Clicking the backdrop itself is handled by its own listener (set up
  //    in showCommandBlur below), also instant.
  //  - Everything else — clicking an item inside the palette, or any other
  //    path VS Code uses internally to close it — is caught by the poll
  //    below, which re-checks the widget's actual visibility and can't stay
  //    wrong for more than ~200ms regardless of mechanism.
  //  - That poll runs unconditionally from startup, NOT gated behind waiting
  //    for .quick-input-widget to exist first: VS Code doesn't create that
  //    element until the palette opens for the first time, so an earlier
  //    version of this that set the poll up inside a wait for it silently
  //    never activated unless the palette happened to open within that
  //    wait's timeout window — which is why only Escape (wired directly,
  //    independent of all this) ever actually worked.
  function isPaletteOpen() {
    const el = document.querySelector('.quick-input-widget');
    return !!el && getComputedStyle(el).display !== 'none';
  }

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
      event.preventDefault();
      showCommandBlur();
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      hideCommandBlur();
    }
  });

  let paletteWasOpen = false;
  setInterval(() => {
    const open = isPaletteOpen();
    if (open === paletteWasOpen) return;
    paletteWasOpen = open;
    if (open) {
      showCommandBlur();
    } else {
      hideCommandBlur();
    }
  }, 200);

  // Both functions are idempotent and safe to call redundantly — multiple
  // independent triggers (direct keydown, the visibility poll, backdrop
  // click) can each call these within the same ~200ms window, and neither
  // tearing down an in-progress fade-in nor skipping the fade-out entirely
  // reads as "smooth."
  function showCommandBlur() {
    let overlay = document.getElementById('command-blur');
    if (overlay) {
      // Already showing, or mid fade-out from a very quick close+reopen —
      // reuse it instead of destroying and rebuilding, which is what
      // caused the flicker: each rebuild reset opacity to 0 and restarted
      // the animation from scratch, even if one was already mid-transition.
      delete overlay.dataset.closing;
      overlay.style.opacity = '1';
      return;
    }

    const workbench = document.querySelector('.monaco-workbench');
    if (!workbench) return;

    overlay = document.createElement('div');
    overlay.setAttribute('id', 'command-blur');
    overlay.addEventListener('click', hideCommandBlur);
    overlay.style.opacity = '0';
    workbench.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  }

  function hideCommandBlur() {
    const overlay = document.getElementById('command-blur');
    if (!overlay || overlay.dataset.closing) return;

    overlay.dataset.closing = 'true';
    overlay.style.opacity = '0';
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    // Safety net in case transitionend doesn't fire for some reason (e.g.
    // reduced-motion settings that skip the transition) — remove() on an
    // already-detached node is a harmless no-op, so this can't double-fire.
    setTimeout(() => overlay.remove(), 250);
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
