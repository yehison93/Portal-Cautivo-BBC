// Componente raíz de la aplicación que orquesta la lógica del portal cautivo.
// Contiene estados compartidos y funciones para iniciar la conexión del
// dispositivo (a través del backend) y verificar acceso a Internet.
import { useState, useEffect, useRef } from "react";
import PortalCautive from "./components/PortalCautive";
import "./App.css";

// Datos de configuración para la integración con el controlador Unifi.
// ATENCIÓN: estas credenciales NO deberían estar en el cliente; es un riesgo
// de seguridad. Idealmente deben moverse al backend o a variables de entorno
// en el servidor.
const UnifiData = {
  url: "https://buddhabarbeachhotel.ddns.net:8443",
  siteID: "d41gke5t",
  userName: "API.Admin",
  pw: "123456BBH#",
};

const App = () => {
  // Mensaje mostrado en la UI (instrucciones/errores/éxito).
  const [message, setMessage] = useState("Disfrute de nuestra red wifi.");

  // URLs usadas para detectar acceso a Internet o redirigir a Instagram.
  const instagramUrl = `https://www.instagram.com/maremareshotel/?hl=es`;
  const androidUrl = "https://www.google.com/generate_204"; // URL para Android
  const iosUrl = "http://captive.apple.com/hotspot-detect.html"; // URL para iOS

  // Refs y estados auxiliares:
  // - retryCountRef: número de intentos en la comprobación de Internet.
  // - isMountedRef: evita actualizaciones de estado tras desmontar el componente.
  // - timeoutRef: almacena el id de setTimeout para poder limpiarlo.
  // - checkAbortControllerRef: referencia al AbortController usado en fetch.
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const checkAbortControllerRef = useRef(null);
  const MAX_RETRIES = 30; // Número máximo de reintentos para verificar acceso a internet

  // Estados que controlan la UI del portal cautivo.
  const [macAddress, setMacAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showInstagramBtn, setShowInstagramBtn] = useState(false);

  // Detección simple de iOS usando el userAgent. No es perfecta para todos
  // los casos modernos (p. ej. iPadOS en modo escritorio), pero sirve como
  // heurística para decidir a qué URL dirigir al usuario.
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const getMacAddressFromUrl = () => {
    // Extrae el parámetro `id` desde la URL (se espera que el portal cautivo
    // añada la MAC o identificador en la query string). Si no existe, se
    // muestra un mensaje de error instructivo al usuario.
    const urlParams = new URLSearchParams(window.location.search);
    const mac = urlParams.get("id");
    if (mac) {
      setMacAddress(mac);
    } else {
      setMessage(
        "Disculpa, pero hubo un error. Desconecta el dispositivo de la red WIFI y vuelve a conectar para continuar. Si el problema persiste solicita ayuda."
      );
    }
  };

  // useEffect de montaje: se extrae la MAC de la URL al montar y se asegura
  // limpieza al desmontar (limpiar timeouts y abortar fetchs pendientes).
  useEffect(() => {
    isMountedRef.current = true;
    getMacAddressFromUrl();

    return () => {
      // Marca que el componente está desmontado para evitar setState
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (checkAbortControllerRef.current) {
        try {
          // Aborta cualquier fetch en curso (si aplica)
          checkAbortControllerRef.current.abort();
        } catch {
          void 0;
        }
        checkAbortControllerRef.current = null;
      }
    };
  }, []);

  const checkInternetAccess = async () => {
    let success = false;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      success = false;
    } else {
      const controller = new AbortController();
      checkAbortControllerRef.current = controller;
      const signal = controller.signal;
      // timeout interno para no esperar indefinidamente
      const FETCH_TIMEOUT = 3000;
      let timeoutId;
      try {
        timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        const response = await fetch(androidUrl, {
          mode: "no-cors",
          cache: "no-store",
          signal,
        });
        clearTimeout(timeoutId);
        // Si es una respuesta opaca (no-cors) no podemos leer status, pero la resolución indica que hubo conectividad
        if (response) {
          if (response.type === "opaque") {
            success = true;
          } else if (response.ok) {
            success = true;
          }
        }
      } catch {
        success = false;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        checkAbortControllerRef.current = null;
      }
    }

    if (!isMountedRef.current) return;

    if (success) {
      setShowInstagramBtn(true);
      setLoading(false);
      retryCountRef.current = 0;
      setMessage("¡Ya tienes acceso a internet! Haz clic en navegar.");
    } else {
      retryCountRef.current += 1;
      setMessage(
        `Intento ${retryCountRef.current}, Acceso a internet aún no disponible...`
      );
      if (retryCountRef.current < MAX_RETRIES) {
        timeoutRef.current = setTimeout(checkInternetAccess, 2000);
      } else {
        setMessage(
          "Parece que hay un problema con la conexión. Por favor, intenta de nuevo o contacta al soporte."
        );
      }
    }
  };

  const handleConnect = async (upBandWidth, downBandWidth, time) => {
    if (!macAddress) {
      setMessage("Dirección MAC no válida.");
      return;
    }
    setMessage("Iniciando conexión, por favor espere...");
    setConnected(false);
    setLoading(true);

    try {
      const response = await fetch(
        "https://backend-portal-captive-bbh.onrender.com/connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mac: macAddress,
            up: upBandWidth,
            down: downBandWidth,
            minutes: time,
            url: UnifiData.url,
            siteID: UnifiData.siteID,
            pw: UnifiData.pw,
            user: UnifiData.userName,
          }),
        }
      );

      let data = null;
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
      } catch {
        data = null;
      }

      if (response.ok) {
        setMessage("Conexión exitosa, verificando acceso a internet...");
        setConnected(true);
        setTimeout(checkInternetAccess, 1000); // Comienza a chequear acceso tras 1s
      } else {
        setMessage(
          `Hubo un problema al conectarse, intenta de nuevo más tarde.`
        );
      }

      console.log("Respuesta del servidor:", JSON.stringify(data, null, 2));
    } catch (error) {
      setMessage(`Error de conexión, intente de nuevo.`);
      setLoading(false);
      console.log(error);
    }
  };

  return (
    <>
      <PortalCautive
        macAddress={macAddress}
        handleConnect={handleConnect}
        message={message}
        loading={loading}
        connected={connected}
        instagramUrl={instagramUrl}
        showInstagramBtn={showInstagramBtn}
        isIOS={isIOS}
        iosUrl={iosUrl}
        androidUrl={androidUrl}
      />
    </>
  );
};

export default App;
