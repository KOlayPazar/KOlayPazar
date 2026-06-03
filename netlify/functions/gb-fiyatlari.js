// KOlayPazar v5.2 - Ücretsiz Firebase REST canlı GB fiyat servisi
// Test: https://kolaypazar.netlify.app/.netlify/functions/gb-fiyatlari?server=zero

const PROJECT_ID = "kolaypazarko";
const API_KEY = "AIzaSyAZ-6403Gtu4_2CKJwb6EWARhouUsxIJO0";
const COLLECTION = "gbFiyatlari";

function readField(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  return null;
}

function normalizeServer(v) {
  return String(v || "zero").trim().toLowerCase();
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

exports.handler = async function (event) {
  const wantedServer = normalizeServer(event.queryStringParameters?.server || "zero");

  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${COLLECTION}?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      headers: { "accept": "application/json" }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          ok: false,
          status: "error",
          server: wantedServer,
          source: "Firebase REST",
          items: [],
          message: data.error?.message || "Firebase okunamadı."
        })
      };
    }

    const items = (data.documents || [])
      .map(docToItem)
      .filter(x => x.site && Number.isFinite(x.price))
      .filter(x => wantedServer === "all" || x.server === wantedServer || !x.server)
      .sort((a, b) => a.price - b.price);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60"
      },
      body: JSON.stringify({
        ok: true,
        status: "ok",
        server: wantedServer,
        source: "Firebase gbFiyatlari",
        updatedAt: new Date().toISOString(),
        items,
        best: items[0] || null
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        ok: false,
        status: "error",
        server: wantedServer,
        source: "Firebase REST",
        items: [],
        message: error.message
      })
    };
  }
};
