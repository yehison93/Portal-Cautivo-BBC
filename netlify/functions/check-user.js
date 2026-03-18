/* global process */

exports.handler = async (event) => {
  // 1. Extraer variables del entorno (Configuradas en el panel de Netlify)
  const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
  const SITE_ID = process.env.NETLIFY_SITE_ID;

  if (!TOKEN || !SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Faltan variables de entorno en Netlify" }),
    };
  }

  try {
    const { phone } = JSON.parse(event.body);

    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    const submissions = await response.json();

    // IMPORTANTE: Limpieza de datos para la comparación
    const cleanIncomingPhone = String(phone).trim();

    const user = submissions.find((s) => {
      const phoneInDb = String(s.data.phone).trim();
      return phoneInDb === cleanIncomingPhone;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        exists: !!user,
        name: user ? user.data.name : null,
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
