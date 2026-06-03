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
