import { useState, useEffect, useRef } from "react";
import PortalCautive from "./components/PortalCautive";
import "./App.css";

const getSiteIdFromUrl = () => {
  const path = window.location.pathname; // Obtiene "/guest/s/d41gke5t/"

  // Usamos una Expresión Regular para buscar lo que esté entre /s/ y la siguiente barra o final
  const match = path.match(/\/s\/([^/]+)/);

  // Si encuentra coincidencia, devuelve el grupo capturado [1], si no, null
  return match ? match[1] : null;
};

const UnifiData = {
  // Aquí colocas tus dos (o más) URLs. El sistema intentará en orden.
  urls: [
    "https://buddhabarbeachhotel.ddns.net:8443",
    "https://hotelmaremares.duckdns.org:8443", // Principal
    // Respaldo
  ],
  siteID: getSiteIdFromUrl() || null,
  userName: "API.Admin",
  pw: "123456BBH#",
};

const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

const App = () => {
  // --- ESTADOS DE UI ---
  const [message, setMessage] = useState("Disfrute de nuestra red wifi.");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showInstagramBtn, setShowInstagramBtn] = useState(false);
  const [macAddress, setMacAddress] = useState("");

  // --- CONFIGURACIÓN Y REFS ---
  const instagramUrl = `https://www.instagram.com/maremareshotel/?hl=es`;
  const androidUrl = "https://www.google.com/generate_204";
  const iosUrl = "http://captive.apple.com/hotspot-detect.html";

  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const checkAbortControllerRef = useRef(null);
  const MAX_RETRIES = 30;

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  // --- LÓGICA DE MONTAJE Y LIMPIEZA ---
  useEffect(() => {
    isMountedRef.current = true;

    // Obtener MAC de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const mac = urlParams.get("id");
    if (mac) {
      setMacAddress(mac.toLowerCase());
    } else {
      setMessage(
        "Disculpa, hubo un error. Desconecta y vuelve a conectar el WIFI.",
      );
    }

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkAbortControllerRef.current) {
        try {
          checkAbortControllerRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // --- FUNCIONES PROXY (FIREBASE) ---
  const checkUserStatus = async (mac) => {
    try {
      const response = await fetch(`${BACKEND_URL}/check-mac/${mac}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error Proxy check-mac:", error);
      return null;
    }
  };

  const saveUserToFirebase = async (data) => {
    try {
      const response = await fetch(`${BACKEND_URL}/save-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mac: macAddress }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error Proxy save-client:", error);
      throw error;
    }
  };

  // --- VERIFICACIÓN DE INTERNET (ROBUSTA) ---
  const checkInternetAccess = async () => {
    let success = false;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      success = false;
    } else {
      const controller = new AbortController();
      checkAbortControllerRef.current = controller;
      const FETCH_TIMEOUT = 3000;
      let timeoutId;

      try {
        timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        const response = await fetch(androidUrl, {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response) success = true;
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
        `Intento ${retryCountRef.current}/${MAX_RETRIES}: Verificando acceso...`,
      );

      if (retryCountRef.current < MAX_RETRIES) {
        timeoutRef.current = setTimeout(checkInternetAccess, 2000);
      } else {
        setLoading(false);
        setMessage(
          "La conexión tardó demasiado. Revisa tu señal o contacta a soporte.",
        );
      }
    }
  };

  // --- CONEXIÓN UNIFI (CON MÚLTIPLES URLs) ---
  const handleConnect = async (up, down, time, note = "") => {
    if (!macAddress) {
      setMessage("Error: Dirección MAC no detectada.");
      return;
    }

    setMessage("Iniciando conexión, por favor espere...");
    setConnected(false);
    setLoading(true);

    let success = false;
    let lastErrorMsg = "";

    // Bucle para intentar con cada URL disponible
    for (const currentUrl of UnifiData.urls) {
      try {
        const response = await fetch(`${BACKEND_URL}/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mac: macAddress,
            up,
            down,
            minutes: time,
            note,
            url: currentUrl,
            siteID: UnifiData.siteID,
            pw: UnifiData.pw,
            user: UnifiData.userName,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          success = true;
          setMessage("¡Autorizado! Verificando flujo de datos...");
          setConnected(true);
          // Esperamos un segundo y medio antes de empezar los reintentos de red
          timeoutRef.current = setTimeout(checkInternetAccess, 1500);
          break; // Salimos del bucle porque la conexión fue exitosa
        } else {
          lastErrorMsg = data.message || "No se pudo autorizar el dispositivo.";
          console.warn(`Intento fallido con la URL: ${currentUrl}`);
        }
      } catch (error) {
        lastErrorMsg = "No se pudo contactar con el backend.";
        console.warn(`Error de red con la URL: ${currentUrl}`, error);
      }
    }

    // Si después de intentar todas las URLs, no hubo éxito
    if (!success) {
      setLoading(false);
      setMessage(`Error: ${lastErrorMsg}`);
    }
  };

  return (
    <PortalCautive
      siteID={UnifiData.siteID}
      macAddress={macAddress}
      handleConnect={handleConnect}
      checkUserStatus={checkUserStatus}
      saveUserToFirebase={saveUserToFirebase}
      message={message}
      loading={loading}
      connected={connected}
      instagramUrl={instagramUrl}
      showInstagramBtn={showInstagramBtn}
      isIOS={isIOS}
      iosUrl={iosUrl}
      androidUrl={androidUrl}
    />
  );
};

export default App;
