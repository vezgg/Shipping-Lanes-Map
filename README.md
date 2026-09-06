# Shipping Lanes — 3D Globe

Browser'da çalışan döndürülebilir 3D Shipping Lanes küresi.

## Çalıştırma

Projeyi GitHub'a yükleyip GitHub Pages açabilirsin.

GitHub:
1. Yeni bir repository oluştur (ör. `shipping-lanes-globe`).
2. Bu klasördeki dosyaları repo köküne yükle.
3. `Settings > Pages`
4. `Deploy from a branch`
5. Branch: `main`, Folder: `/ (root)`
6. Save

Birkaç dakika sonra site:
`https://KULLANICIADIN.github.io/shipping-lanes-globe/`

## Kontroller

- Mouse/touch sürükle: döndür
- Scroll/pinch: zoom
- "Görünümü sıfırla": başlangıç kamerası

## Not

`assets/shipping-lanes-world.jpg`, gönderilen tam haritadan otomatik olarak 2:1 küre texture'ına
dönüştürülmüş ilk prototiptir. Bu yüzden dünya üzerindeki coğrafi konumların/projeksiyonun
tam doğru olması için sonraki adımda adaları ayrı katmanlara ayırıp koordinatlarını manuel
olarak yerleştirmek daha iyi sonuç verir.
