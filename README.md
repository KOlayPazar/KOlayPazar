# KOlayPazar

Knight Online Pazar Takip Sistemi.

## Netlify ayarları

- Build command: boş bırak
- Publish directory: `.`
- Functions directory: `netlify/functions`

Canlı GB function test adresi:

`/.netlify/functions/gb-fiyatlari?server=zero`


## v5.2 Netlify + Firebase Canlı GB

Function:
`netlify/functions/gb-fiyatlari.js`

Test:
`https://kolaypazar.netlify.app/.netlify/functions/gb-fiyatlari?server=zero`

Firestore:
- Koleksiyon: `gbFiyatlari`
- Örnek belge: `bynogame`
- Alanlar:
  - `site`: string
  - `price`: number
  - İsteğe bağlı `server`: string (`zero`)


## v5.3 Admin GB Fiyat Güncelleme

Admin sayfası: `/admin.html`

Varsayılan PIN: `1453`

Netlify ortam değişkeni ile değiştirmek istersen:
`KP_ADMIN_PIN`


## v5.4 Görsel Efekt Paketi

Eklenenler:
- En kârlı item altın parıltı efekti
- Yeni kayıt ekleme animasyonu
- Sağ üst bildirim animasyonu
- Kart hover/parlama efekti
- Knight Online tarzı altın aura ve item rarity hissi


## v5.5.1 Knight Görsel Pro

Daha belirgin görsel değişiklikler:
- Güçlendirilmiş Knight Online aura + yıldız arka planı
- Görünür rarity etiketleri: RARE / UNIQUE / LEGENDARY
- Sabit modern ikonlu alt menü
- Mobilde alt menü desteği
