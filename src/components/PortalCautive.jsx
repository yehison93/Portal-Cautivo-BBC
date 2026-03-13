// Componente principal que muestra la UI del portal cautivo.
// - Recibe props como `macAddress`, `handleConnect`, `message`, `loading`,
//   `connected` y URLs para navegar.
// - Carga imágenes de fondo de forma dinámica desde la carpeta
//   `assets/Fotos_Maremares` y muestra un carrusel de sponsors y un footer.
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Container, Row, Button, Image, Stack } from "react-bootstrap";
import { useState, useEffect } from "react";
import Sponsors from "./Sponsors";
import Footer from "./Footer";
import logo from "../assets/logo.png";
import spinner from "../assets/logoSpinner.png";

// Importa dinámicamente todas las imágenes de la carpeta Fotos_Maremares.
// `import.meta.glob` devuelve un objeto con funciones que cargan los módulos.
const images = import.meta.glob(
  "../assets/Fotos_Maremares/*.{png,jpg,jpeg,heic}"
);

const PortalCautive = ({
  // Props que viene desde `App.jsx`.
  // eslint-disable-next-line react/prop-types
  macAddress,
  // eslint-disable-next-line react/prop-types
  handleConnect,
  // eslint-disable-next-line react/prop-types
  message,
  // eslint-disable-next-line react/prop-types
  loading,
  // eslint-disable-next-line react/prop-types
  connected,
  // eslint-disable-next-line react/prop-types
  instagramUrl,
  // eslint-disable-next-line react/prop-types
  showInstagramBtn,
  // eslint-disable-next-line react/prop-types
  isIOS,
  // eslint-disable-next-line react/prop-types
  iosUrl,
}) => {
  // Contador local para detectar múltiples clicks en el logo.
  const [numItem, setNumItem] = useState(0);

  // Selección aleatoria de índice de imagen. Se guarda en estado para que
  // no cambie en cada render; se calcula una vez al montar.
  const [randomIndex] = useState(() => {
    const imagePaths = Object.keys(images);
    return imagePaths.length > 0
      ? Math.floor(Math.random() * imagePaths.length)
      : 0;
  });
  const [randomImage, setRandomImage] = useState("");

  // Efecto para cargar la imagen correspondiente al índice aleatorio.
  // Al usar import.meta.glob la llamada devuelve una promesa que resuelve
  // al módulo con la ruta (module.default contiene el path de la imagen).
  useEffect(() => {
    const imagePaths = Object.keys(images);
    if (imagePaths.length > 0) {
      const selectedImagePath = imagePaths[randomIndex];
      images[selectedImagePath]().then((module) => {
        setRandomImage(module.default);
      });
    }
  }, [randomIndex]);

  // Si el usuario hace 10 clicks en el logo se llama a `handleConnect`
  // con parámetros grandes (uso accesible para pruebas/atajo).
  useEffect(() => {
    if (numItem === 10) {
      // Concede acceso por mucho tiempo (43800 minutos = 30 días aprox.).
      handleConnect(20000, 20000, 43800);
    }
  }, [handleConnect, numItem]);

  const incrementItem = () => {
    setNumItem((item) => item + 1);
  };

  // Render: muestra la imagen de fondo, el card central y los botones según
  // el estado (`loading`, `connected`, `showInstagramBtn`).
  return (
    <Container fluid className="main-container bg-dark gap-1">
      {/* Imagen de fondo cargada dinámicamente */}
      <Image
        src={randomImage}
        alt="Imagen de fondo del hotel"
        className="bg-img"
        loading="eager"
      />
      <Row>
        <Card
          className="container-card bg-transparent text-light text-center gap-1"
          style={{ width: "30rem" }}
        >
          <Card.Img
            variant="top"
            src={logo}
            className="img-logo"
            onClick={incrementItem}
            alt="Logo Maremares"
          />
          <Card.Body>
            <Card.Title>
              <Stack direction="horizontal" className="justify-content-center">
                <span className="palmeras" aria-label="Palmera">
                  🌴
                </span>
                <h1>¡Bienvenido!</h1>
                <span className="palmeras" aria-label="Palmera">
                  🌴
                </span>
              </Stack>
            </Card.Title>

            {/* Si existe la MAC mostramos los botones de conectar/navegar */}
            {macAddress ? (
              <>
                <Card.Text>{message}</Card.Text>
                <Button
                  className="btn-submit"
                  variant="light"
                  aria-label="Ir a Instagram"
                  href={isIOS ? iosUrl : instagramUrl}
                  hidden={loading || !connected || !showInstagramBtn}
                >
                  NAVEGAR
                </Button>

                {/* Spinner cuando `loading` es true; botón CONECTAR cuando no */}
                {loading ? (
                  <Image className="spinner" src={spinner} alt="Cargando..." />
                ) : (
                  !connected && (
                    <Button
                      className="btn-submit"
                      variant="light"
                      onClick={() => handleConnect(10000, 10000, 10080)}
                      disabled={loading}
                      aria-label="Conectar a WiFi"
                    >
                      CONECTAR
                    </Button>
                  )
                )}
              </>
            ) : (
              // Si no hay macAddress mostramos sólo el mensaje de error/instrucción
              <Card.Text>{message}</Card.Text>
            )}
          </Card.Body>
        </Card>
      </Row>
      <Row className="container-sponsor">
        <Sponsors />
      </Row>
      <Footer />
    </Container>
  );
};

export default PortalCautive;
