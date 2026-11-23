# Siteyi güncelleme rehberi

Sayfaları çevrilebilen dijital katalog. Adresi: **https://zeynepoyt.github.io/2026-katalog/**

Repo ana sayfasındaki `README.md` bilerek kısa tutulmuştur: yalnızca tanıtım ve QR kod içerir. Teknik bilgiler bu dosyadadır.

Site sade HTML, CSS ve JavaScript'ten oluşur; derleme (build) adımı yoktur. Sayfa çevirme için [StPageFlip](https://github.com/Nodlik/StPageFlip) (MIT) kullanılır. Kütüphane `assets/vendor/` klasöründe, projenin içinde durur.

## Klasör yapısı

```
index.html                  Sayfa (başlık, WhatsApp önizleme bilgileri, arayüz)
assets/css/style.css        Görünüm, renkler, kağıt efekti
assets/js/app.js            Kitap, kontroller, ses, büyüteç
assets/vendor/              page-flip kütüphanesi (yamalı, ayrıntısı aşağıda)
img/pages/page-01..16.webp  Kitapta görünen sayfalar (uzun kenar 1600 px)
img/zoom/page-01..16.webp   Büyüteç için yüksek çözünürlüklü sayfalar (uzun kenar 2400 px)
img/og.jpg                  WhatsApp / sosyal medya önizleme görseli (1200×630)
img/paper.png               Kağıt dokusu
img/favicon.svg             Sekme simgesi
```

Kaynak PDF'ler, `work/` ve `qr/` klasörleri `.gitignore` ile repo dışında tutulur.

## Siteyi güncelleme

### Bir sayfanın tasarımı değiştiyse

1. Illustrator'da değişikliği yap ve tabakayı yine PDF olarak dışa aktar.
2. Değişen sayfayı tek başına, düz durur halde PNG olarak al. Boyutu 230×320 mm, çözünürlüğü 300 dpi olmalı ve taşma payı (bleed) olmamalı.
3. PNG'yi iki boyutta WebP'ye çevir. Python ve Pillow ile:

   ```
   python -c "from PIL import Image; im=Image.open('page-07.png').convert('RGB'); im.resize((1150,1600),Image.LANCZOS).save('img/pages/page-07.webp',quality=90,method=6); im.resize((1725,2400),Image.LANCZOS).save('img/zoom/page-07.webp',quality=78,method=6)"
   ```

   Dosya adındaki numara, sayfanın katalogdaki sırasıdır: `01` ön kapak, `16` arka kapak.
   `img/pages` içindeki dosya yaklaşık 300 KB'ı geçerse kaliteyi (`quality`) biraz düşür.
4. Ön kapak değiştiyse `img/og.jpg` önizleme görselini de yenile (1200×630).

### Değişiklikleri yayına alma

```
git add -A
git commit -m "Sayfa 7 güncellendi"
git push
```

GitHub Pages siteyi 1–2 dakika içinde yeniden yayınlar. Durumu repodaki **Actions** sekmesinden takip edebilirsin.

Telefonda eski sayfa görünmeye devam ederse tarayıcı önbelleği yüzündendir. Sayfayı yenile ya da adresin sonuna `?v=2` ekleyerek aç.

`assets/css/style.css` veya `assets/js/*.js` değiştiğinde, `index.html` içindeki bu dosyaların adreslerinin sonundaki sürüm numarasını bir artır (örneğin `app.js?v=5` → `app.js?v=6`). Böylece telefonlar eski dosyayı önbellekten kullanmaz.

### WhatsApp önizlemesi güncellenmiyorsa

WhatsApp önizlemeleri bir süre önbellekte tutar. Başlık veya görsel değiştiyse linki `https://zeynepoyt.github.io/2026-katalog/?v=2` şeklinde paylaş. Başlık ve açıklama `index.html` içindeki `og:` satırlarındadır.

## Sayfa sayısı değişirse

`assets/js/app.js` dosyasının başındaki `TOTAL` değerini yeni sayfa sayısına göre güncelle. Sayfa sayısı çift olmalı. İçindekiler sayfası başka bir yere taşındıysa `TOC_PAGE` değerini de değiştir. Sayfa başlıkları (`TITLES`) ekran okuyucular ve içindekiler bağlantılarının ipuçları için kullanılır.

## İçindekiler bağlantıları

İçindekiler sayfasındaki her satır, ilgili sayfaya götüren görünmez bir butondur. Konumlar `assets/js/app.js` içindeki `TOC_LINKS` listesindedir:

- `page`: gidilecek sayfa
- `top`: satırın sayfanın üstünden uzaklığı (yüzde)
- `w`: satırın genişliği (yüzde)

İçindekiler tasarımı değişirse bu değerleri güncelle. Doğru yerde olup olmadıklarını, satırın üzerine fareyle gelince çıkan vurgudan görebilirsin.

## QR kod

QR kod doğrudan siteye bağlıdır, sayfalar değişse de yeniden basmak gerekmez. Repo ana sayfasındaki README'de `img/qr.png` görünür. Baskı dosyaları ise repoda değil, proje klasöründeki `qr/` altındadır:

- `qr/katalog-qr.png`: baskı için, 2400 px
- `qr/katalog-qr.svg`: Illustrator için vektörel

İkisinde de hata düzeltme seviyesi H'dir.

## Ses

Ses varsayılan olarak kapalıdır. Dosyalar yalnızca kullanıcı sesi açınca yüklenir; bulunamazlarsa tarayıcıda üretilen yedek ses çalar.

| Dosya | Kullanım | Kaynak (Wikimedia Commons, kamu malı) |
|---|---|---|
| `assets/audio/page-a.mp3` | İç sayfa çevirme (ana) | [Turning a page.ogg](https://commons.wikimedia.org/wiki/File:Turning_a_page.ogg), 1,40–2,55 sn |
| `assets/audio/page-b.mp3` | İç sayfa çevirme (çeşitlilik) | [Old book.ogg](https://commons.wikimedia.org/wiki/File:Old_book.ogg), 69,62–70,90 sn |
| `assets/audio/thud-a.mp3` | Kapağın yere oturması | Old book.ogg, 71,08–71,48 sn |
| `assets/audio/thud-b.mp3` | Kapağın yere oturması (yedek) | Old book.ogg, 58,10–58,50 sn |

Kapak sesi iki parçadan oluşur. Dönüş başlarken `page-a` yavaşlatılmış ve boğuk çalar; kalın kartonun havayı itmesi gibi duyulur. Kapak yerine oturduğu anda da `thud` çalar. Kapak kitabın üstüne kapanırken bu ses daha dolgundur. Kliplerin hepsi 110 Hz altı kesilmiş, uçları yumuşatılmış ve −1 dB'e normalize edilmiştir.

## Kütüphane yaması

`assets/vendor/page-flip.browser.js`, page-flip 2.0.7'ye aşağıdaki değişiklikler eklenmiş halidir. Kütüphaneyi güncellersen bunları yeniden uygula:

1. Sert kapak çevrilirken kitabın ekrandaki konumu (`left`/`top`) hesaba katılır. Düzeltme olmadan, kitap ortalandığında kapak sırttan kopuyor ve telefonda yukarı kayıyor.
2. Tek sayfa (telefon) görünümünde sayfa yarıdan fazla çekilip bırakılınca çevirme tamamlanır.
3. Çevirme animasyonu yumuşak hızlanıp yavaşlar. Kapaklar daha uzun sürede döner. Animasyon başlarken `flipStart` olayı tetiklenir; kitabın ortaya kayması ve ses buna bağlıdır.
4. Sert sayfa, dönüş açısını `--shade` CSS değişkeniyle bildirir. Kapak dönerken kararma ve parlama efekti bu değişkene bağlıdır.
5. Sert kapak animasyonu sayfa kenarından (0°) başlar, başta ani bir sıçrama olmaz.

Ayrıca `style.css` içinde kütüphanenin `stf__hardShadow` gölgesi kapatılmıştır. Bu gölge, kapak açılıp kapanırken boş masada keskin bir iz bırakıyordu.
