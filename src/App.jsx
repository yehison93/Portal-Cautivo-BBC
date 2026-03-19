import { useState, useEffect, useRef } from "react";
import PortalCautive from "./components/PortalCautive";
import "./App.css";

const UnifiData = {
  url: "https://hotelmaremares.duckdns.org:8443",
  siteID: "d41gke5t",
  userName: "API.Admin",
  pw: "123456BBH#",
};

// Base URL de tu backend en Render
const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

const App = () => {
  const [message, setMessage] = useState("Disfrute de nuestra red wifi.");
  const instagramUrl = `https://www.instagram.com/maremareshotel/?hl=es`;
  const androidUrl = "https://www.google.com/generate_204";
  const iosUrl = "http://captive.apple.com/hotspot-detect.html";

  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const checkAbortControllerRef = useRef(null);
  const MAX_RETRIES = 30;

  const [macAddress, setMacAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showInstagramBtn, setShowInstagramBtn] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const getMacAddressFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mac = urlParams.get("id");
    if (mac) {
      setMacAddress(mac.toLowerCase()); // Siempre en minúsculas para evitar errores en DB
    } else {
      setMessage(
        "Error: No se detectó la MAC. Desconecte y vuelva a intentar.",
      );
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    getMacAddressFromUrl();
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // --- NUEVA FUNCIÓN: Verificar si el usuario ya existe vía Proxy ---
  const checkUserStatus = async (mac) => {
    try {
      const response = await fetch(`${BACKEND_URL}/check-mac/${mac}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error al verificar usuario:", error);
      return null;
    }
  };

  // --- NUEVA FUNCIÓN: Guardar datos vía Proxy ---
  const saveUserToFirebase = async (data) => {
    try {
      const response = await fetch(`${BACKEND_URL}/save-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mac: macAddress }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      throw error;
    }
  };

  const checkInternetAccess = async () => {
    // ... (Tu lógica actual de checkInternetAccess se mantiene igual)
    // Solo asegúrate de que use setConnected(true) y setShowInstagramBtn(true)
  };

  // --- FUNCIÓN ACTUALIZADA: Conexión UniFi con Nota ---
  const handleConnect = async (upBandWidth, downBandWidth, time, note = "") => {
    if (!macAddress) {
      setMessage("Dirección MAC no válida.");
      return;
    }
    setMessage("Iniciando conexión, por favor espere...");
    setConnected(false);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mac: macAddress,
          up: upBandWidth,
          down: downBandWidth,
          minutes: time,
          note: note, // Enviamos la nota construida en el componente hijo
          url: UnifiData.url,
          siteID: UnifiData.siteID,
          pw: UnifiData.pw,
          user: UnifiData.userName,
        }),
      });

      if (response.ok) {
        setMessage("Conexión exitosa, verificando acceso a internet...");
        setConnected(true);
        setTimeout(checkInternetAccess, 1000);
      } else {
        setMessage("Hubo un problema al conectarse.");
        setLoading(false);
      }
    } catch (error) {
      setMessage("Error de conexión con el servidor.");
      setLoading(false);
      console.error(error);
    }
  };

  return (
    <>
      <PortalCautive
        macAddress={macAddress}
        handleConnect={handleConnect}
        checkUserStatus={checkUserStatus} // Pasamos la función de verificación
        saveUserToFirebase={saveUserToFirebase} // Pasamos la función de guardado
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
