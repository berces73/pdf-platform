/**
 * Accessibility (A11y) Implementation
 * WCAG 2.1 AA Compliance
 * Version: 1.0.0
 */

/**
 * ============================================
 * 1. SKIP NAVIGATION LINK
 * ============================================
 */

/* Add to HTML before <header> */
/*
<a href="#main-content" class="skip-to-content">
  İçeriğe atla
</a>
*/

/* CSS for skip link */
const skipLinkCSS = `
.skip-to-content {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 1rem 1.5rem;
  background: #000;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 4px 0;
}

.skip-to-content:focus {
  left: 0;
  top: 0;
}
`;

/**
 * ============================================
 * 2. ARIA LABELS FOR TOOLS
 * ============================================
 */

const ariaLabels = {
  // PDF Birleştir
  mergePDF: {
    container: 'aria-label="PDF Birleştirme Aracı"',
    fileInput: 'aria-label="PDF dosyaları seçin" aria-describedby="file-help"',
    fileHelp: 'id="file-help" Birden fazla PDF dosyası seçebilirsiniz',
    dropzone: 'aria-label="PDF dosyalarını sürükleyip bırakın" role="region" aria-dropeffect="copy"',
    mergeButton: 'aria-label="Seçilen PDF dosyalarını birleştir"',
    downloadButton: 'aria-label="Birleştirilmiş PDF dosyasını indir"',
    removeFile: 'aria-label="Bu dosyayı kaldır"',
    reorderUp: 'aria-label="Dosyayı yukarı taşı"',
    reorderDown: 'aria-label="Dosyayı aşağı taşı"'
  },
  
  // PDF Sıkıştır
  compressPDF: {
    container: 'aria-label="PDF Sıkıştırma Aracı"',
    fileInput: 'aria-label="Sıkıştırılacak PDF dosyasını seçin"',
    qualitySlider: 'aria-label="Sıkıştırma kalitesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75" role="slider"',
    compressButton: 'aria-label="PDF dosyasını sıkıştır"',
    progressBar: 'role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-live="polite"'
  },
  
  // Navigation
  navigation: {
    header: 'role="banner"',
    nav: 'role="navigation" aria-label="Ana menü"',
    main: 'role="main" id="main-content"',
    footer: 'role="contentinfo"',
    search: 'role="search" aria-label="Site içinde ara"',
    breadcrumb: 'role="navigation" aria-label="Breadcrumb"'
  },
  
  // Buttons
  buttons: {
    close: 'aria-label="Kapat"',
    menu: 'aria-label="Menüyü aç" aria-expanded="false" aria-controls="mobile-menu"',
    back: 'aria-label="Geri git"',
    next: 'aria-label="İleri git"',
    submit: 'aria-label="Formu gönder"'
  },
  
  // Alerts
  alerts: {
    success: 'role="alert" aria-live="polite" aria-atomic="true"',
    error: 'role="alert" aria-live="assertive" aria-atomic="true"',
    info: 'role="status" aria-live="polite" aria-atomic="true"',
    warning: 'role="alert" aria-live="polite" aria-atomic="true"'
  }
};

/**
 * ============================================
 * 3. KEYBOARD NAVIGATION
 * ============================================
 */

function initKeyboardNavigation() {
  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('[role="dialog"][aria-hidden="false"]');
      modals.forEach(modal => {
        closeModal(modal);
      });
    }
  });
  
  // Tab trap in modals
  document.querySelectorAll('[role="dialog"]').forEach(modal => {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  });
  
  // Arrow key navigation for lists
  document.querySelectorAll('[role="listbox"], [role="menu"]').forEach(list => {
    const items = list.querySelectorAll('[role="option"], [role="menuitem"]');
    let currentIndex = 0;
    
    list.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          currentIndex = Math.min(currentIndex + 1, items.length - 1);
          items[currentIndex].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          currentIndex = Math.max(currentIndex - 1, 0);
          items[currentIndex].focus();
          break;
        case 'Home':
          e.preventDefault();
          currentIndex = 0;
          items[currentIndex].focus();
          break;
        case 'End':
          e.preventDefault();
          currentIndex = items.length - 1;
          items[currentIndex].focus();
          break;
      }
    });
  });
}

/**
 * ============================================
 * 4. FOCUS MANAGEMENT
 * ============================================
 */

function manageFocus() {
  // Add focus-visible polyfill behavior
  let hadKeyboardEvent = false;
  
  document.addEventListener('keydown', () => {
    hadKeyboardEvent = true;
  });
  
  document.addEventListener('mousedown', () => {
    hadKeyboardEvent = false;
  });
  
  document.addEventListener('focusin', (e) => {
    if (hadKeyboardEvent) {
      e.target.classList.add('focus-visible');
    }
  });
  
  document.addEventListener('focusout', (e) => {
    e.target.classList.remove('focus-visible');
  });
  
  // Focus indicator CSS
  const focusCSS = `
    /* Hide default outline */
    *:focus {
      outline: none;
    }
    
    /* Custom focus indicator */
    .focus-visible,
    *:focus-visible {
      outline: 3px solid #4f46e5;
      outline-offset: 2px;
      border-radius: 4px;
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .focus-visible,
      *:focus-visible {
        outline: 5px solid currentColor;
        outline-offset: 3px;
      }
    }
  `;
  
  // Add to document
  const style = document.createElement('style');
  style.textContent = focusCSS;
  document.head.appendChild(style);
}

/**
 * ============================================
 * 5. COLOR CONTRAST CHECKER
 * ============================================
 */

function checkColorContrast(foreground, background) {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // Calculate relative luminance
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  
  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return {
    ratio: ratio.toFixed(2),
    AA_normal: ratio >= 4.5,        // Normal text
    AA_large: ratio >= 3,            // Large text (18pt+ or 14pt+ bold)
    AAA_normal: ratio >= 7,
    AAA_large: ratio >= 4.5
  };
}

// Example usage
// console.log(checkColorContrast('#000000', '#ffffff')); // 21:1 (Perfect)
// console.log(checkColorContrast('#6366f1', '#ffffff')); // Check your brand colors

/**
 * ============================================
 * 6. SCREEN READER ANNOUNCEMENTS
 * ============================================
 */

function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority); // 'polite' or 'assertive'
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Screen reader only CSS
const srOnlyCSS = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`;

/**
 * ============================================
 * 7. ACCESSIBLE FORM VALIDATION
 * ============================================
 */

function validateFormAccessibly(form) {
  form.addEventListener('submit', (e) => {
    const errors = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (!input.validity.valid) {
        // Add aria-invalid
        input.setAttribute('aria-invalid', 'true');
        
        // Add error message
        const errorId = `${input.id}-error`;
        const existingError = document.getElementById(errorId);
        
        if (!existingError) {
          const error = document.createElement('span');
          error.id = errorId;
          error.className = 'error-message';
          error.setAttribute('role', 'alert');
          error.textContent = input.validationMessage;
          input.parentNode.appendChild(error);
          
          // Link input to error
          input.setAttribute('aria-describedby', errorId);
        }
        
        errors.push(input.validationMessage);
      } else {
        // Remove error state
        input.removeAttribute('aria-invalid');
        const errorId = `${input.id}-error`;
        const error = document.getElementById(errorId);
        if (error) error.remove();
      }
    });
    
    if (errors.length > 0) {
      e.preventDefault();
      
      // Announce errors to screen reader
      announceToScreenReader(
        `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}`,
        'assertive'
      );
      
      // Focus first error
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
  });
}

/**
 * ============================================
 * 8. ACCESSIBLE MODALS
 * ============================================
 */

function createAccessibleModal(content, title) {
  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-hidden', 'true');
  modal.className = 'modal';
  
  modal.innerHTML = `
    <div class="modal-overlay" aria-hidden="true"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title">${title}</h2>
        <button 
          type="button" 
          class="modal-close" 
          aria-label="Modalı kapat"
        >
          ×
        </button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Save last focused element
  const lastFocused = document.activeElement;
  
  // Open modal
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-close').focus();
  
  // Close handlers
  const closeModal = () => {
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      document.body.removeChild(modal);
      lastFocused.focus(); // Restore focus
    }, 300);
  };
  
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
  
  return modal;
}

/**
 * ============================================
 * 9. INITIALIZATION
 * ============================================
 */

function initAccessibility() {
  // Add skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-to-content';
  skipLink.textContent = 'İçeriğe atla';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Initialize keyboard navigation
  initKeyboardNavigation();
  
  // Initialize focus management
  manageFocus();
  
  // Add screen reader styles
  const style = document.createElement('style');
  style.textContent = skipLinkCSS + srOnlyCSS;
  document.head.appendChild(style);
  
  // Validate all forms
  document.querySelectorAll('form').forEach(validateFormAccessibly);
  
  // Add lang attribute if missing
  if (!document.documentElement.lang) {
    document.documentElement.lang = 'tr';
  }
  
  console.log('[Accessibility] Initialized ✅');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}

/**
 * ============================================
 * 10. ACCESSIBILITY AUDIT
 * ============================================
 */

function runAccessibilityAudit() {
  const issues = [];
  
  // Check for alt text on images
  document.querySelectorAll('img').forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image #${index + 1} missing alt text`);
    }
  });
  
  // Check for form labels
  document.querySelectorAll('input, select, textarea').forEach((input, index) => {
    const id = input.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push(`Input #${index + 1} missing label`);
    }
  });
  
  // Check for heading hierarchy
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let lastLevel = 0;
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName[1]);
    if (level - lastLevel > 1) {
      issues.push(`Heading hierarchy skip at ${heading.textContent}`);
    }
    lastLevel = level;
  });
  
  // Check for color contrast (basic check)
  // Note: This is simplified - use axe-core for comprehensive checks
  
  console.log('[A11y Audit]', issues.length === 0 ? '✅ No issues' : `⚠️ ${issues.length} issues`, issues);
  
  return issues;
}

// Run audit in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev.')) {
  setTimeout(runAccessibilityAudit, 2000);
}

export {
  ariaLabels,
  initAccessibility,
  announceToScreenReader,
  checkColorContrast,
  createAccessibleModal,
  validateFormAccessibly,
  runAccessibilityAudit
};
