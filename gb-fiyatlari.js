// KOlayPazar - Canlı GB Fiyat Function
// Netlify Function: /.netlify/functions/gb-fiyatlari?server=zero

const SOURCES = [
  "https://enucuzgb.com.tr/",
  "https://www.enucuzgb.com/"
];

function cleanText(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8378;|₺|TL/gi, " TL ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).replace(/\s/g, "").replace(/TL|₺/gi, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const m = s.match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function collectFromObject(obj, out) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(x => collectFromObject(x, out));
    return;
  }

  const keys = Object.keys(obj);
  const lower = Object.fromEntries(keys.map(k => [k.toLowerCase(), k]));
  const siteKey = lower.site || lower.sitename || lower.name || lower.title || lower.market || lower.satici || lower.firma;
  const zeroKey = lower.zero || lower.zero_satis || lower.zerosatis || lower.zeroprice;
  const priceKey = lower.price || lower.fiyat || lower.satis || lower.sell || lower.sale;

  if (siteKey && (zeroKey || priceKey)) {
    const price = toNumber(obj[zeroKey] ?? obj[priceKey]);
    const site = String(obj[siteKey] || "").trim();
    if (site && price) out.push({ site, price });
  }

  keys.forEach(k => collectFromObject(obj[k], out));
}

function parseJsonData(html) {
  const out = [];
  const next = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) {
    try { collectFromObject(JSON.parse(next[1]), out); } catch {}
  }

  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const tag of scripts) {
    const text = tag.replace(/<script[^>]*>|<\/script>/gi, "");
    if (!/zero|ZERO|fiyat|price|gb/i.test(text)) continue;
    const jsonish = text.match(/(\[[\s\S]{50,}\]|\{[\s\S]{50,}\})/);
    if (jsonish) {
      try { collectFromObject(JSON.parse(jsonish[1]), out); } catch {}
    }
  }
  return out;
}

function parseRows(html) {
  const out = [];
  const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(m => cleanText(m[1]))
      .filter(Boolean);
    if (cells.length < 2) continue;
    if (cells.join(" ").match(/ZERO|AGARTHA|FELIS|PANDORA|DESTAN|OREADS|MINARK|DRYADS/i)) continue;
    const site = cells[0];
    const nums = cells.map(toNumber).filter(n => n !== null);
    if (site && nums.length) out.push({ site, price: nums[0] });
  }
  return out;
}

function parseTextFallback(html) {
  const text = cleanText(html);
  const out = [];
  const knownSites = /ByNoGame|Oyunfor|OyunFor|ItemSatış|Itemsatis|Kabasakal|Oyuneks|Kopazar|Gamesatis|GameSatış/ig;
  let m;
  while ((m = knownSites.exec(text)) !== null) {
    const site = m[0];
    const part = text.slice(m.index, m.index + 180);
    const nums = [...part.matchAll(/(\d{2,6}(?:[.,]\d{1,2})?)\s*(?:TL|₺)?/gi)]
      .map(x => toNumber(x[1]))
      .filter(Boolean);
    if (nums.length) out.push({ site, price: nums[0] });
  }
  return out;
}

function unique(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r || !r.site || !Number.isFinite(Number(r.price))) continue;
    const site = String(r.site).trim();
    if (!site || site.length > 40) continue;
    const key = site.toLowerCase();
    const old = map.get(key);
    if (!old || Number(r.price) < Number(old.price)) map.set(key, { site, price: Number(r.price) });
  }
  return [...map.values()].filter(x => x.price > 0).sort((a, b) => a.price - b.price).slice(0, 20);
}

exports.handler = async function () {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; KOlayPazar/5.0)",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      const html = await res.text();
      const rows = unique([
        ...parseJsonData(html),
        ...parseRows(html),
        ...parseTextFallback(html)
      ]);

      if (rows.length) {
        return {
          statusCode: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public,max-age=60"
          },
          body: JSON.stringify({
            ok: true,
            server: "ZERO",
            source: url,
            updatedAt: new Date().toISOString(),
            items: rows
          })
        };
      }
    } catch (e) {}
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      ok: false,
      server: "ZERO",
      updatedAt: new Date().toISOString(),
      items: [],
      message: "Gerçek kaynak okunamadı; Firebase yedek verisi kullanılacak."
    })
  };
};
