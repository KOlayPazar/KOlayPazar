exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "ok",
      source: "KOlayPazar",
      message: "Canlı GB Function aktif"
    })
  };
};
