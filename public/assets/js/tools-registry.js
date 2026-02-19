import { consumeCredit, refreshCreditInfo } from "./consume-credit.js";

const SOFT_MODE = true; // false yaparsan click'ten önce kredi keser (hard mode)

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

ready(async () => {
  // 1) credit ui initial refresh (tek sefer)
  refreshCreditInfo?.().catch(() => {});

  // 2) tool cards
  const cards = Array.from(document.querySelectorAll(".tool-card[data-tool]"));

  // title/tooltip
  for (const a of cards) {
    const tool = a.getAttribute("data-tool");
    if (tool && !a.title) a.title = `Aracı aç: ${tool}`;
  }

  if (SOFT_MODE) return;

  // Hard mode: click capture
  const handlers = new WeakMap();

  for (const a of cards) {
    const handler = async (e) => {
      const tool = a.getAttribute("data-tool") || "unknown";
      try {
        const ok = await consumeCredit(tool, 1);
        if (!ok) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        console.error("[tools-registry] consume error", err);
        e.preventDefault();
        e.stopPropagation();
        window.toast?.("Bir hata oluştu.", "error", 5000);
      }
    };

    handlers.set(a, handler);
    a.addEventListener("click", handler, { capture: true });
  }

  // cleanup (non-SPA için şart değil ama temiz)
  window.addEventListener("beforeunload", () => {
    for (const a of cards) {
      const handler = handlers.get(a);
      if (handler) a.removeEventListener("click", handler, { capture: true });
    }
  });
});
