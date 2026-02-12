// ========== MEVCUT SCRIPT.JS'İNİZİN SONUNA EKLEYİN ==========

// Cookie Banner Handler
(function() {
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieAccept = document.getElementById('cookieAccept');
    const cookieDecline = document.getElementById('cookieDecline');
    
    if (cookieBanner && cookieAccept && cookieDecline) {
        const cookieConsent = localStorage.getItem('cookie_consent');
        
        if (!cookieConsent) {
            setTimeout(() => {
                cookieBanner.classList.add('show');
            }, 1000);
        }
        
        cookieAccept.addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'accepted');
            cookieBanner.classList.remove('show');
        });
        
        cookieDecline.addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'declined');
            cookieBanner.classList.remove('show');
        });
    }
})();

// Mobile Menu Toggle
(function() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('show');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
})();

// Smooth Scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// --- LINK DUZELTICI (404 HATALARINI ONLEME) ---
document.addEventListener('DOMContentLoaded', () => {
    // Tum linkleri bul
    const tumLinkler = document.querySelectorAll('a');

    tumLinkler.forEach(link => {
        const adres = link.getAttribute('href');

        // Link null veya boşsa atla
        if (!adres) return;

        // 1. "Blog" sayfasina gidenleri Ana Sayfadaki Blog bolumune yonlendir
        if (adres === '/blog' || adres === '/articles') {
            link.href = '/#articles';
        }

        // 2. "PDF Editor", "OCR" vb. arac linklerini Ana Sayfadaki Araclar bolumune yonlendir
        // Cunku bu araclar ayri sayfa degil, ana sayfada birer kutucuk.
        if (adres.includes('/pdf-') || adres.includes('/ocr-') || adres.includes('tool')) {
            // Eger link zaten bir makale dosyasi degilse (.html yoksa) araclara yonlendir
            if (!adres.includes('.html')) {
                link.href = '/#tools';
            }
        }
    });
});