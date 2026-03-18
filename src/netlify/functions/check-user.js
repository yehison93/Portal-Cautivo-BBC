// netlify/functions/verificar-cliente.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  // Solo permitimos el método POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  const { phone } = JSON.parse(event.body);
  const TOKEN =
    "nfp_XisrTdMVm45YHUg8osPRLaeBQADxB7EG5d48 " ||
    process.env.NETLIFY_AUTH_TOKEN;
  const SITE_ID =
    "05c77944-04ee-457d-a4e0-65bb01699ed0" || process.env.NETLIFY_SITE_ID;

  try {
    // 1. Pedimos a la API de Netlify todos los envíos (submissions) de este sitio
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/submissions`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    if (!response.ok)
      throw new Error("Error al conectar con la API de Netlify");

    const submissions = await response.json();

    // 2. Buscamos si el teléfono ya existe en la base de datos
    const clienteEncontrado = submissions.find((s) => s.data.phone === phone);

    return {
      statusCode: 200,
      body: JSON.stringify({
        existe: !!clienteEncontrado,
        datos: clienteEncontrado ? clienteEncontrado.data : null,
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
