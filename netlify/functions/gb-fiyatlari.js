exports.handler = async () => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        source: "Firebase gbFiyatlari",
        site: "ByNoGame",
        price: 1250
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: error.message
      })
    };
  }
};
