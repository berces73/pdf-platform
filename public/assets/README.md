# Assets Klasörü

Bu klasöre aşağıdaki dosyaları eklemeniz gerekiyor:

## Gerekli Görseller:

1. **og-image.jpg** (1200x630 px)
   - Open Graph için sosyal medya paylaşım görseli
   - Facebook, Twitter, LinkedIn'de görünecek
   - PDF Platform logosu ve slogan içermeli

2. **logo.png** (512x512 px veya SVG)
   - Sitenizin logosu
   - Şu an inline SVG kullanılıyor, isteğe bağlı

3. **favicon.ico** (32x32 px)
   - Tarayıcı sekmesinde görünen ikon
   - Şu an inline SVG kullanılıyor, isteğe bağlı

4. **icon-192.png** (192x192 px)
   - PWA için küçük ikon

5. **icon-512.png** (512x512 px)
   - PWA için büyük ikon

## Opsiyonel:

- **screenshots/** - PWA için ekran görüntüleri
- **blog-images/** - Makale görselleri

## Not:

Şu an tüm ikonlar inline SVG olarak kodda gömülü durumda.
Gerçek PNG/JPG dosyalar eklemek isterseniz:

1. Bu klasöre dosyaları yükleyin
2. HTML dosyalarındaki data:image/svg+xml kısımlarını değiştirin
3. manifest.json'daki icon yollarını güncelleyin

## Örnek Komut:

```bash
# OG Image oluşturmak için Canva veya Figma kullanabilirsiniz
# Boyut: 1200x630 px
# Format: JPG veya PNG
# Optimize edin: https://tinypng.com/
```
