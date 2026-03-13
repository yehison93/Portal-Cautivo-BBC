// Punto de entrada de la aplicación React.
// `StrictMode` ayuda a detectar prácticas potencialmente inseguras
// durante el desarrollo (no afecta al comportamiento en producción).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Monta el componente raíz `App` en el elemento con id `root`.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
