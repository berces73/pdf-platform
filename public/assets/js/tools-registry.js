// public/assets/js/tools-registry.js
import "./toast.js";
import { consumeCredit } from "./consume-credit.js";

console.log("[tools-registry] loaded");

function parseCost(el) {
  const raw = el.getAttribute("data-credit-cost");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Buton durumunu gÃ¼ncelle
function setButtonState(el, loading = false) {
  const originalText = el.getAttribute("data-original-text") || el.textContent;
  
  if (loading) {
    if (!el.hasAttribute("data-original-text")) {
      el.setAttribute("data-original-text", el.textContent);
    }
    el.disabled = true;
    el.textContent = "Ä°ÅŸleniyor...";
    el.classList.add("loading");
  } else {
    el.disabled = false;
    el.textContent = originalText;
    el.classList.remove("loading");
  }
}

// Hata mesajÄ± gÃ¶ster
function showError(message) {
  // Toast bildirimi veya modal gÃ¶ster
  const toast = document.createElement("div");
  toast.className = "credit-toast error";
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 10);
}

async function handleClick(e) {
  const el = e.target.closest("[data-consume-credit]");
  if (!el) return;

  // Zaten iÅŸlem yapÄ±lÄ±yorsa tekrar tÄ±klamayÄ± engelle
  if (el.disabled) return;

  const tool = el.getAttribute("data-consume-credit");
  const cost = parseCost(el);

  // Form submit'i engelle
  if (el.tagName === "BUTTON") {
    const type = (el.getAttribute("type") || "").toLowerCase();
    if (!type || type === "submit") {
      e.preventDefault();
    }
  }

  setButtonState(el, true);

  try {
    const result = await consumeCredit(tool, cost);
    
    if (!result) {
      showError("Yetersiz kredi veya iÅŸlem baÅŸarÄ±sÄ±z!");
      return;
    }

    // BaÅŸarÄ±lÄ± â†’ Aksiyonu tetikle
    const targetSel = el.getAttribute("data-run-target");
    if (targetSel) {
      const target = document.querySelector(targetSel);
      if (target) {
        target.click();
      } else {
        console.warn(`[tools-registry] Target not found: ${targetSel}`);
      }
      return;
    }

    // Custom event gÃ¶nder
    window.dispatchEvent(
      new CustomEvent("pdfplatform:credit-ok", { 
        detail: { tool, cost, element: el } 
      })
    );

  } catch (error) {
    console.error("[tools-registry] Error:", error);
    showError("Bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.");
  } finally {
    setButtonState(el, false);
  }
}

document.addEventListener("click", handleClick);

// Sayfa yÃ¼klendiÄŸinde tÃ¼m kredi butonlarÄ±nÄ± bul ve validate et
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("[data-consume-credit]");
  buttons.forEach(btn => {
    const tool = btn.getAttribute("data-consume-credit");
    if (!tool) {
      console.warn("[tools-registry] Button missing tool name:", btn);
    }
  });
});
