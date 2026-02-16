/**
 * PDF Platform - Schema.org JSON-LD Templates
 * Bu dosyayı her sayfaya <script type="application/ld+json"> olarak ekleyin
 */

// ============================================
// 1. ORGANIZATION SCHEMA (Tüm sayfalarda)
// ============================================
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PDF Platform",
  "url": "https://siteniz.com",
  "logo": "https://siteniz.com/assets/logo.svg",
  "sameAs": [
    "https://twitter.com/pdfplatform",
    "https://facebook.com/pdfplatform",
    "https://linkedin.com/company/pdfplatform",
    "https://github.com/pdf-platform"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+90-XXX-XXX-XXXX",
    "contactType": "Customer Support",
    "areaServed": "TR",
    "availableLanguage": ["Turkish", "English"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Istanbul",
    "addressCountry": "TR"
  }
};

// ============================================
// 2. WEBSITE SCHEMA (Ana sayfada)
// ============================================
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PDF Platform",
  "url": "https://siteniz.com",
  "description": "PDF dosyalarınızı ücretsiz ve güvenli şekilde işleyin. Birleştir, sıkıştır, böl, düzenle ve daha fazlası.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://siteniz.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PDF Platform",
    "logo": {
      "@type": "ImageObject",
      "url": "https://siteniz.com/assets/logo.svg"
    }
  }
};

// ============================================
// 3. WEB APPLICATION SCHEMA (Ana sayfada)
// ============================================
const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "PDF Platform",
  "url": "https://siteniz.com",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TRY"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "2547",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "PDF Birleştir",
    "PDF Sıkıştır",
    "PDF Böl",
    "PDF'den JPG",
    "JPG'den PDF",
    "PDF Düzenle",
    "PDF İmzala",
    "PDF Kilitle",
    "Çevrimdışı Çalışma",
    "Gizlilik Odaklı"
  ]
};

// ============================================
// 4. BREADCRUMB SCHEMA (İç sayfalarda)
// ============================================
// Örnek: PDF Birleştir sayfası için
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Ana Sayfa",
      "item": "https://siteniz.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Araçlar",
      "item": "https://siteniz.com/tools"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "PDF Birleştir",
      "item": "https://siteniz.com/pdf-birlestir"
    }
  ]
};

// ============================================
// 5. HOW-TO SCHEMA (Araç sayfalarında)
// ============================================
// Örnek: PDF Birleştir için
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "PDF Dosyalarını Nasıl Birleştiririm?",
  "description": "PDF dosyalarınızı ücretsiz ve güvenli şekilde birleştirin. Adım adım rehber.",
  "image": "https://siteniz.com/assets/tools/merge-pdf-tutorial.jpg",
  "totalTime": "PT2M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "TRY",
    "value": "0"
  },
  "tool": [
    {
      "@type": "HowToTool",
      "name": "PDF Platform"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "PDF Dosyalarını Seçin",
      "text": "Birleştirmek istediğiniz PDF dosyalarını sürükleyip bırakın veya 'Dosya Seç' butonuna tıklayın.",
      "image": "https://siteniz.com/assets/tutorials/step1-select-files.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Sıralamayı Düzenleyin",
      "text": "PDF dosyalarınızı istediğiniz sıraya göre sürükleyerek düzenleyin.",
      "image": "https://siteniz.com/assets/tutorials/step2-arrange.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Birleştir",
      "text": "'Birleştir' butonuna tıklayın ve işlemin tamamlanmasını bekleyin.",
      "image": "https://siteniz.com/assets/tutorials/step3-merge.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "İndir",
      "text": "Birleştirilmiş PDF dosyanızı indirin.",
      "image": "https://siteniz.com/assets/tutorials/step4-download.jpg"
    }
  ]
};

// ============================================
// 6. SOFTWARE APPLICATION SCHEMA (Araç sayfalarında)
// ============================================
const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PDF Birleştir - PDF Platform",
  "operatingSystem": "Web",
  "applicationCategory": "UtilitiesApplication",
  "url": "https://siteniz.com/pdf-birlestir",
  "screenshot": "https://siteniz.com/assets/screenshots/merge-pdf-tool.jpg",
  "description": "Birden fazla PDF dosyasını tek bir PDF'te ücretsiz ve güvenli şekilde birleştirin.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TRY"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "1842"
  },
  "featureList": [
    "Sınırsız dosya birleştirme",
    "Şifre korumalı PDF desteği",
    "Dosyalar sunucuya yüklenmez",
    "Hızlı işlem",
    "Mobil uyumlu"
  ]
};

// ============================================
// 7. FAQ SCHEMA (SSS sayfasında)
// ============================================
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "PDF birleştirme ücretsiz mi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evet, PDF Platform tamamen ücretsizdir. Hiçbir ücret veya kayıt gerektirmez. Sınırsız sayıda PDF dosyasını birleştirebilirsiniz."
      }
    },
    {
      "@type": "Question",
      "name": "Dosyalarım güvende mi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Kesinlikle! Tüm PDF işlemleri tarayıcınızda gerçekleşir. Dosyalarınız hiçbir zaman sunucumuza yüklenmez. İşlem tamamlandıktan sonra dosyalar tarayıcınızdan silinir."
      }
    },
    {
      "@type": "Question",
      "name": "Kaç tane PDF dosyası birleştirebilirim?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sınırsız! İstediğiniz kadar PDF dosyasını birleştirebilirsiniz. Tek sınırlama tarayıcınızın bellek kapasitesidir."
      }
    },
    {
      "@type": "Question",
      "name": "Mobil cihazlarda çalışır mı?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evet, PDF Platform hem masaüstü hem de mobil cihazlarda (iOS ve Android) mükemmel çalışır. Responsive tasarımı sayesinde her cihazda kullanabilirsiniz."
      }
    },
    {
      "@type": "Question",
      "name": "Şifre korumalı PDF'leri birleştirebilir miyim?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evet, şifresini bildiğiniz PDF dosyalarını birleştirebilirsiniz. İşlem sırasında şifreyi girmeniz yeterlidir."
      }
    }
  ]
};

// ============================================
// 8. ARTICLE SCHEMA (Blog yazıları için)
// ============================================
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "PDF Birleştirme Rehberi: 2026'nın En Güncel Yöntemleri",
  "description": "PDF dosyalarını birleştirmenin tüm yollarını öğrenin. Ücretsiz araçlar, adım adım rehber ve ipuçları.",
  "image": "https://siteniz.com/assets/blog/pdf-merge-guide-featured.jpg",
  "author": {
    "@type": "Person",
    "name": "PDF Platform Ekibi"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PDF Platform",
    "logo": {
      "@type": "ImageObject",
      "url": "https://siteniz.com/assets/logo.svg"
    }
  },
  "datePublished": "2026-02-15T08:00:00+03:00",
  "dateModified": "2026-02-15T10:30:00+03:00",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://siteniz.com/blog/pdf-birlestirme-rehberi"
  },
  "articleSection": "PDF Rehberleri",
  "keywords": "pdf birleştir, pdf merge, pdf birleştirme, ücretsiz pdf araçları",
  "wordCount": 2500,
  "articleBody": "Makale içeriği buraya..."
};

// ============================================
// 9. VIDEO SCHEMA (Eğer video içeriğiniz varsa)
// ============================================
const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "PDF Dosyalarını Nasıl Birleştiririm? (Video Rehber)",
  "description": "PDF birleştirme işlemini adım adım anlatan video rehber.",
  "thumbnailUrl": "https://siteniz.com/assets/videos/merge-pdf-thumbnail.jpg",
  "uploadDate": "2026-02-15T08:00:00+03:00",
  "duration": "PT3M24S",
  "contentUrl": "https://siteniz.com/assets/videos/merge-pdf-tutorial.mp4",
  "embedUrl": "https://siteniz.com/embed/merge-pdf-tutorial",
  "publisher": {
    "@type": "Organization",
    "name": "PDF Platform",
    "logo": {
      "@type": "ImageObject",
      "url": "https://siteniz.com/assets/logo.svg"
    }
  }
};

// ============================================
// 10. PRODUCT SCHEMA (Eğer premium özellik eklerseniz)
// ============================================
const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "PDF Platform Pro",
  "description": "Gelişmiş PDF araçları ve özellikleri",
  "image": "https://siteniz.com/assets/pro/product-image.jpg",
  "brand": {
    "@type": "Brand",
    "name": "PDF Platform"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://siteniz.com/pro",
    "priceCurrency": "TRY",
    "price": "49.90",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "287"
  }
};

// ============================================
// KULLANIM ÖRNEĞİ
// ============================================
/*
<!-- Ana sayfaya eklenecek schema'lar -->
<script type="application/ld+json">
{JSON.stringify(organizationSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(websiteSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(webApplicationSchema)}
</script>

<!-- PDF Birleştir sayfasına eklenecek -->
<script type="application/ld+json">
{JSON.stringify(organizationSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(breadcrumbSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(howToSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(softwareApplicationSchema)}
</script>

<!-- Blog yazısına eklenecek -->
<script type="application/ld+json">
{JSON.stringify(organizationSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(articleSchema)}
</script>

<!-- SSS sayfasına eklenecek -->
<script type="application/ld+json">
{JSON.stringify(organizationSchema)}
</script>
<script type="application/ld+json">
{JSON.stringify(faqSchema)}
</script>
*/

export {
  organizationSchema,
  websiteSchema,
  webApplicationSchema,
  breadcrumbSchema,
  howToSchema,
  softwareApplicationSchema,
  faqSchema,
  articleSchema,
  videoSchema,
  productSchema
};
