import { useEffect } from "react";
import { Spinner } from "react-bootstrap";

const SuccessRedirect = ({ url }) => {
  useEffect(() => {
    // Creamos la etiqueta meta dinámicamente
    const meta = document.createElement("meta");
    meta.httpEquiv = "refresh";
    // El '2' son los segundos de espera para que UniFi procese la autorización
    meta.content = `2; url=${url}`;

    // La insertamos en el head del documento
    document.head.appendChild(meta);

    // Limpieza: si el componente se desmonta, quitamos la etiqueta
    return () => {
      document.head.removeChild(meta);
    };
  }, [url]);

  return (
    <div className="text-center py-5 text-white animate__animated animate__fadeIn">
      <div style={{ fontSize: "4.5rem" }} className="mb-2">
        ✨
      </div>
      <h2 className="fw-bold mb-3">¡Acceso Autorizado!</h2>

      <p className="text-white-50 mb-4" style={{ fontSize: "1.1rem" }}>
        Disfruta de nuestra conexión de alta velocidad.
      </p>

      <div className="d-flex flex-column align-items-center gap-3">
        <Spinner animation="border" variant="info" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <span
          className="small text-info text-uppercase fw-bold"
          style={{ letterSpacing: "1px" }}
        >
          Redirigiendo a Instagram...
        </span>
      </div>

      <div className="mt-5 pt-4">
        <small className="text-muted d-block mb-2">
          ¿La redirección no inició?
        </small>
        <a href={url} className="btn btn-outline-info btn-sm rounded-pill px-4">
          Ir a Instagram manualmente
        </a>
      </div>
    </div>
  );
};

export default SuccessRedirect;
