// KOlayPazar v5.3 - Firebase Canlı GB + Admin Fiyat Güncelleme
// GET  : /.netlify/functions/gb-fiyatlari?server=zero
// POST : /.netlify/functions/gb-fiyatlari  { pin, site, price, server }
//
// Not: ByNoGame / EnUcuzGB Cloudflare engellediği için gerçek otomatik çekim yapılamıyor.
// Mantıklı çözüm: Fiyatı admin panelinden güncelle, site anında Firestore'dan canlı okusun.

const PROJECT_ID = "kolaypazarko";
const API_KEY = "AIzaSyAZ-6403Gtu4_2CKJwb6EWARhouUsxIJO0";
const COLLECTION = "gbFiyatlari";
const DEFAULT_PIN = "1453";

function normalizeServer(v) {
  return String(v || "zero").trim().toLowerCase();
}

function readField(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  return null;
}

function docToItem(doc) {
  const fields = doc.fields || {};
  const docId = String(doc.name || "").split("/").pop();

  const site = readField(fields.site) || readField(fields.siteAdi) || readField(fields.name) || docId;
  const price = Number(
    readField(fields.price) ??
    readField(fields.fiyat) ??
    readField(fields.gbPrice) ??
    readField(fields.gbFiyat) ??
    readField(fields.zero)
  );

  const server = normalizeServer(
    readField(fields.server) ||
    readField(fields.sunucu) ||
    readField(fields.world) ||
    "zero"
  );

  return {
    id: docId,
    site: String(site || "").trim(),
    price,
    server,
    updatedAt: readField(fields.updatedAt) || readField(fields.tarih) || doc.updateTime || new Date().toISOString(),
    source: "Firebase"
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    },
    body: JSON.stringify(body)
  };
}

async function readPrices(wantedServer) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${COLLECTION}?key=${API_KEY}`;

  const response = await fetch(url, { headers: { accept: "application/json" } });
  const data = await response.json();

  if (!response.ok) {
    return json(200, {
      ok: false,
      status: "error",
      server: wantedServer,
      source: "Firebase REST",
      items: [],
      message: data.error?.message || "Firebase okunamadı."
    });
  }

  const items = (data.documents || [])
    .map(docToItem)
    .filter(x => x.site && Number.isFinite(x.price))
    .filter(x => wantedServer === "all" || x.server === wantedServer || !x.server)
    .sort((a, b) => a.price - b.price);

  return json(200, {
    ok: true,
    status: "ok",
    server: wantedServer,
    source: "Firebase gbFiyatlari",
    updatedAt: new Date().toISOString(),
    items,
    best: items[0] || null
  });
}

async function updatePrice(event) {
  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(200, { ok: false, status: "error", message: "Geçersiz JSON." });
  }

  const expectedPin = process.env.KP_ADMIN_PIN || DEFAULT_PIN;
  if (String(payload.pin || "") !== String(expectedPin)) {
    return json(200, { ok: false, status: "error", message: "Admin PIN hatalı." });
  }

  const site = String(payload.site || "ByNoGame").trim();
  const server = normalizeServer(payload.server || "zero");
  const price = Number(String(payload.price || "").replace(",", "."));

  if (!site || !Number.isFinite(price) || price <= 0) {
    return json(200, { ok: false, status: "error", message: "Site adı veya fiyat geçersiz." });
  }

  const docId = site.toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "bynogame";

  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${COLLECTION}/${docId}` +
    `?key=${API_KEY}&updateMask.fieldPaths=site&updateMask.fieldPaths=price&updateMask.fieldPaths=server&updateMask.fieldPaths=updatedAt`;

  const now = new Date().toISOString();

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "accept": "application/json"
    },
    body: JSON.stringify({
      fields: {
        site: { stringValue: site },
        price: { integerValue: String(Math.round(price)) },
        server: { stringValue: server },
        updatedAt: { timestampValue: now }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return json(200, {
      ok: false,
      status: "error",
      message: data.error?.message || "Firestore güncellenemedi."
    });
  }

  return json(200, {
    ok: true,
    status: "ok",
    message: "GB fiyatı güncellendi.",
    item: {
      id: docId,
      site,
      price: Math.round(price),
      server,
      updatedAt: now,
      source: "Admin güncelleme"
    }
  });
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod === "POST") {
    return updatePrice(event);
  }

  const wantedServer = normalizeServer(event.queryStringParameters?.server || "zero");
  return readPrices(wantedServer);
};
