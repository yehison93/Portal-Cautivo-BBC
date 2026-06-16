/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import isEmail from "validator/lib/isEmail";
import * as z from "zod";
import {
  Form,
  Button,
  Container,
  Card,
  ProgressBar,
  Image,
  Stack,
  Modal,
} from "react-bootstrap";

import spinnerImg from "../assets/logoSpinner.png";

// --- ESTILOS PARA CORREGIR SELECTS EN WINDOWS ---
const selectStyle = {
  backgroundColor: "#1a1d20",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  appearance: "none",
};

// --- HELPERS PARA LA FECHA ---
const days = Array.from({ length: 31 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const months = [
  { v: "01", n: "Enero" },
  { v: "02", n: "Febrero" },
  { v: "03", n: "Marzo" },
  { v: "04", n: "Abril" },
  { v: "05", n: "Mayo" },
  { v: "06", n: "Junio" },
  { v: "07", n: "Julio" },
  { v: "08", n: "Agosto" },
  { v: "09", n: "Septiembre" },
  { v: "10", n: "Octubre" },
  { v: "11", n: "Noviembre" },
  { v: "12", n: "Diciembre" },
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) =>
  (currentYear - 13 - i).toString(),
);

const SuccessRedirect = ({ url }) => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.httpEquiv = "refresh";
    meta.content = `5; url=${url}`;
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [url]);

  return (
    <div className="text-center py-4 animate__animated animate__fadeIn">
      <div style={{ fontSize: "4rem" }} className="mb-3">
        🚀
      </div>
      <h3 className="fw-bold text-white">¡Acceso Autorizado!</h3>
      <p className="text-white-50">Configurando tu conexión premium...</p>
      <div className="d-flex flex-column align-items-center gap-3 mt-4">
        <Image className="spinner" src={spinnerImg} width={40} />
        <span className="small text-info text-uppercase fw-bold">
          Redirigiendo...
        </span>
      </div>
    </div>
  );
};

const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

// Agregamos siteID a la nota que verá el administrador
const generarNotaCliente = (datos) => {
  const { name, phone, email, address, birthdate, siteID } = datos;
  return `ID: ${siteID || "N/A"} | Cli: ${name} | Tel: ${phone} | Mail: ${email} | Dir: ${address} | Nac: ${birthdate}`;
};

const isGarbageText = (text) => {
  const t = text.toLowerCase().trim();
  if (/([a-z])\1{2,}/.test(t)) return true;
  if (/[b-df-hj-np-tv-z]{5,}/.test(t)) return true;
  const keyboard = ["asdf", "sdfg", "dfgh", "ghjk", "jklñ", "qwerty", "zxcv"];
  if (keyboard.some((seq) => t.includes(seq))) return true;
  return false;
};

const schema = z.object({
  phone: z
    .string()
    .trim()
    .refine(
      (val) => {
        // 1. Intentamos validar asumiendo Venezuela ('VE') como país por defecto.
        const phoneNumber = parsePhoneNumberFromString(val, "VE");

        // Función auxiliar para detectar números basura/inventados
        const isGarbageNumber = (numStr) => {
          if (/(\d)\1{5,}/.test(numStr)) return true;
          const sequences = ["0123456789", "9876543210"];
          if (sequences.some((s) => s.includes(numStr.slice(-7)))) return true;
          if (/^(\d{2})\1+$/.test(numStr.slice(-6))) return true;
          return false;
        };

        // Si la librería lo reconoce como válido (nacional o internacional con +)
        if (phoneNumber && phoneNumber.isValid()) {
          return !isGarbageNumber(phoneNumber.nationalNumber);
        }

        // 2. Fallback para turistas: Si la librería falla,
        // validamos que tenga una longitud razonable según el estándar ITU (entre 8 y 15 dígitos).
        const rawDigits = val.replace(/\D/g, "");
        if (rawDigits.length >= 8 && rawDigits.length <= 15) {
          return !isGarbageNumber(rawDigits);
        }

        return false;
      },
      {
        message: `Número inválido.
          Extranjeros: incluyan su código (ej. +1, +57).`,
      },
    ),
  name: z
    .string()
    .trim()
    .min(6, "Nombre y apellido completo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Solo letras")
    .refine((val) => val.trim().split(/\s+/).length >= 2, "Falta apellido")
    .refine((val) => !isGarbageText(val), "Ingresa un nombre real"),
  address: z
    .string()
    .trim()
    .min(7, "Dirección muy corta")
    .refine((val) => !isGarbageText(val), "Dirección inválida"),
  birthdate: z.string().refine((date) => {
    const hoy = new Date();
    const cumple = new Date(date);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad >= 13 && edad <= 90;
  }, "Si eres menor de 13 años de edad, por favor pide a un adulto que te ayude a completar el registro."),
  gender: z.enum(["Masculino", "Femenino", "Otro"]),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => isEmail(val, { require_tld: true }), "Correo inválido")
    .refine(
      (val) => {
        const [user, domain] = val.split("@");
        const blacklisted = [
          "test.com",
          "example.com",
          "yopmail.com",
          "mailinator.com",
          "10minutemail.com",
        ];
        if (blacklisted.includes(domain)) return false;
        const keyboard = ["asdfgh", "qwerty", "zxcvbn"];
        if (keyboard.some((seq) => user.includes(seq))) return false;
        return domain.split(".")[0].length >= 2;
      },
      { message: "Ingresa un correo real." },
    ),
});

const pasos = [
  {
    id: "phone",
    label: "Número de Teléfono",
    placeholder: "Ej. 04141234567 o +13051234567",
    type: "text",
    inputMode: "tel",
  },
  {
    id: "name",
    label: "Nombre y Apellido",
    placeholder: "Ej. Juan Pérez",
    type: "text",
    autoCapitalize: "words",
  },
  { id: "birthdate", label: "Fecha de Nacimiento", type: "date" },
  {
    id: "gender",
    label: "Género",
    type: "select",
    options: ["Masculino", "Femenino", "Otro"],
  },
  {
    id: "email",
    label: "Correo Electrónico",
    placeholder: "tu@correo.com",
    type: "email",
  },
  {
    id: "address",
    label: "Dirección de Habitación",
    placeholder: "Ciudad, Calle, Edificio",
    type: "text",
  },
];

const FormClient = ({
  handleConnect,
  checkUserStatus,
  saveUserToFirebase,
  instagramUrl,
  isIOS,
  iosUrl,
  clientLoading,
  connected,
  macAddress,
  siteID,
}) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAutoChecking, setIsAutoChecking] = useState(true);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [userDataSaved, setUserDataSaved] = useState(null);
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const birthdateValue = watch("birthdate") || "";

  const rescatarUsuario = (user) => {
    setUserName(user.name);
    setUserDataSaved(user);
    Object.keys(user).forEach((key) => setValue(key, user[key]));
    setStep(pasos.length);
  };

  useEffect(() => {
    const checkMac = async () => {
      if (!macAddress) {
        setIsAutoChecking(false);
        return;
      }
      try {
        const user = await checkUserStatus(macAddress);
        if (user && user.name) {
          rescatarUsuario(user);
          if (!autoConnectAttempted) {
            setAutoConnectAttempted(true);
            handleConnect(
              10000,
              10000,
              10080,
              generarNotaCliente({ ...user, siteID }),
            ).catch(() => {});
          }
        } else {
          setShowWelcomeAlert(true);
        }
      } catch (error) {
        setShowWelcomeAlert(true);
      } finally {
        setIsAutoChecking(false);
      }
    };
    checkMac();
  }, [macAddress, checkUserStatus, siteID]);

  const handleNext = async () => {
    const currentId = pasos[step].id;
    if (await trigger(currentId)) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const res = await fetch(
            `${BACKEND_URL}/check-phone/${getValues("phone").replace(/\+/g, "%2B")}`,
          );
          if (res.ok) {
            const user = await res.json();
            if (user && user.name) {
              rescatarUsuario(user);
              return;
            }
          }
          setStep((prev) => prev + 1);
        } catch {
          setStep((prev) => prev + 1);
        } finally {
          setLoading(false);
        }
      } else {
        if (currentId === "name") setUserName(getValues("name"));
        setStep((prev) => prev + 1);
      }
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const finalData = { ...(userDataSaved || data), siteID, mac: macAddress };
      await saveUserToFirebase(finalData);
      await handleConnect(10000, 10000, 10080, generarNotaCliente(finalData));
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAnyLoading = loading || clientLoading || isAutoChecking;

  if (isAutoChecking)
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "350px" }}
      >
        <Image className="spinner" src={spinnerImg} />
      </Container>
    );

  return (
    <Container className="d-flex justify-content-center align-items-center">
      <Modal
        show={showWelcomeAlert}
        onHide={() => setShowWelcomeAlert(false)}
        centered
        backdrop="static"
        contentClassName="glass-card border-0 text-white overflow-hidden"
      >
        <div
          style={{
            background: "linear-gradient(45deg, #0dcaf033, transparent)",
            height: "5px",
          }}
        />
        <Modal.Body className="p-4 text-center">
          <div style={{ fontSize: "3.5rem" }} className="mb-2">
            ✨
          </div>
          <h3 className="fw-bold text-white mb-3">¡Qué gusto tenerte aquí!</h3>
          <p className="text-white-50 mb-4" style={{ fontSize: "1.05rem" }}>
            Para disfrutar de una conexión premium y{" "}
            <strong className="text-info">activar tu acceso automático</strong>{" "}
            en futuras visitas, por favor completa tu perfil con{" "}
            <strong className="text-info">datos reales</strong>.
          </p>
          <div
            className="p-3 mb-4 rounded-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <small className="text-info d-block fw-bold mb-1 text-uppercase text-decoration-underline">
              BENEFICIO EXCLUSIVO
            </small>
            <span className="small text-warning opacity-75">
              Si tus datos son correctos, el sistema te reconocerá al instante
              la próxima vez que nos visites.
            </span>
          </div>
          <Button
            variant="info"
            className="w-100 rounded-pill fw-bold text-white py-3 shadow-lg border-0"
            onClick={() => setShowWelcomeAlert(false)}
          >
            COMENZAR REGISTRO
          </Button>
        </Modal.Body>
      </Modal>

      <div style={{ width: "90%", maxWidth: "420px" }}>
        <Card className="glass-card p-4 shadow-lg border-0">
          <Form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            {step < pasos.length ? (
              <div key={pasos[step].id}>
                <Card.Title className="mb-4 text-center">
                  <Stack
                    direction="horizontal"
                    gap={2}
                    className="justify-content-center align-items-center"
                  >
                    <span className="palmeras">🌴</span>
                    <h1 className="mb-0 fw-light text-uppercase">Registro</h1>
                    <span className="palmeras">🌴</span>
                  </Stack>
                </Card.Title>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-white fw-bold">
                    {pasos[step].label}
                  </Form.Label>
                  {pasos[step].id === "birthdate" ? (
                    <div className="d-flex gap-2">
                      <Form.Select
                        style={selectStyle}
                        value={birthdateValue.split("-")[2] || ""}
                        onChange={(e) => {
                          const [y, m] = (birthdateValue || "2000-01-01").split(
                            "-",
                          );
                          setValue("birthdate", `${y}-${m}-${e.target.value}`, {
                            shouldValidate: true,
                          });
                        }}
                      >
                        <option value="">Día</option>
                        {days.map((d) => (
                          <option
                            key={d}
                            value={d}
                            style={{ backgroundColor: "#212529" }}
                          >
                            {d}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Select
                        style={selectStyle}
                        value={birthdateValue.split("-")[1] || ""}
                        onChange={(e) => {
                          const [y, _, d] = (
                            birthdateValue || "2000-01-01"
                          ).split("-");
                          setValue(
                            "birthdate",
                            `${y}-${e.target.value}-${d || "01"}`,
                            { shouldValidate: true },
                          );
                        }}
                      >
                        <option value="">Mes</option>
                        {months.map((m) => (
                          <option
                            key={m.v}
                            value={m.v}
                            style={{ backgroundColor: "#212529" }}
                          >
                            {m.n}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Select
                        style={selectStyle}
                        value={birthdateValue.split("-")[0] || ""}
                        onChange={(e) => {
                          const [_, m, d] = (
                            birthdateValue || "2000-01-01"
                          ).split("-");
                          setValue(
                            "birthdate",
                            `${e.target.value}-${m || "01"}-${d || "01"}`,
                            { shouldValidate: true },
                          );
                        }}
                      >
                        <option value="">Año</option>
                        {years.map((y) => (
                          <option
                            key={y}
                            value={y}
                            style={{ backgroundColor: "#212529" }}
                          >
                            {y}
                          </option>
                        ))}
                      </Form.Select>
                      <input type="hidden" {...register("birthdate")} />
                    </div>
                  ) : pasos[step].type === "select" ? (
                    <Form.Select
                      {...register(pasos[step].id)}
                      isInvalid={!!errors[pasos[step].id]}
                      style={selectStyle}
                    >
                      <option value="" style={{ backgroundColor: "#212529" }}>
                        Seleccionar...
                      </option>
                      {pasos[step].options.map((opt) => (
                        <option
                          key={opt}
                          value={opt}
                          style={{ backgroundColor: "#212529" }}
                        >
                          {opt}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      {...register(pasos[step].id)}
                      type={pasos[step].type}
                      placeholder={pasos[step].placeholder}
                      isInvalid={!!errors[pasos[step].id]}
                      inputMode={pasos[step].inputMode}
                      autoCapitalize={pasos[step].autoCapitalize}
                      autoFocus
                    />
                  )}
                  <Form.Control.Feedback
                    type="invalid"
                    className="text-warning"
                  >
                    {errors[pasos[step].id]?.message}
                  </Form.Control.Feedback>
                </Form.Group>
                <ProgressBar
                  now={((step + 1) / pasos.length) * 100}
                  variant="info"
                  className="mb-4"
                  style={{ height: "6px" }}
                />
                <div className="d-flex justify-content-between align-items-center">
                  <Button
                    variant="link"
                    onClick={() => setStep(step - 1)}
                    className={`text-white-50 p-0 ${step === 0 ? "invisible" : ""}`}
                  >
                    ← Volver
                  </Button>
                  {isAnyLoading ? (
                    <Image className="spinner" src={spinnerImg} width={40} />
                  ) : (
                    <Button
                      variant="info"
                      onClick={handleNext}
                      className="px-5 rounded-pill fw-bold text-white shadow"
                    >
                      Siguiente
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                {connected ? (
                  <SuccessRedirect url={isIOS ? iosUrl : instagramUrl} />
                ) : (
                  <>
                    <div className="mb-3">
                      <span style={{ fontSize: "4rem" }}>🎯</span>
                    </div>
                    <h2 className="fw-bold mb-2">¡Todo listo, {userName}!</h2>
                    <p className="text-white-50 mb-4">
                      Haz clic abajo para iniciar tu navegación.
                    </p>
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      className="rounded-pill py-3 px-5 fw-bold shadow-lg border-0 btn-grad-blue"
                      disabled={isAnyLoading}
                    >
                      {isAnyLoading ? "CONECTANDO..." : "CONECTAR"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </Form>
        </Card>
      </div>
    </Container>
  );
};

export default FormClient;
