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
  Spinner,
} from "react-bootstrap";

import spinnerImg from "../assets/logoSpinner.png";

// --- COMPONENTE DE REDIRECCIÓN (Interno o Importado) ---
const SuccessRedirect = ({ url }) => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.httpEquiv = "refresh";
    // 2 segundos de delay: tiempo vital para que el Controller de UniFi autorice la MAC
    meta.content = `2; url=${url}`;
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
        <Spinner animation="border" variant="info" />
        <span className="small text-info text-uppercase fw-bold">
          Redirigiendo...
        </span>
      </div>
    </div>
  );
};

const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

const generarNotaCliente = (datos) => {
  const { name, phone, email, address, birthdate } = datos;
  return `Cli: ${name} | Tel: ${phone} | Mail: ${email} | Dir: ${address} | Nac: ${birthdate}`;
};

const isGarbageText = (text) => {
  const t = text.toLowerCase().trim();
  if (/([a-z])\1{2,}/.test(t)) return true;
  if (/[b-df-hj-np-tv-z]{5,}/.test(t)) return true;
  const keyboard = ["asdf", "sdfg", "dfgh", "ghjk", "jklñ", "qwerty", "zxcv"];
  if (keyboard.some((seq) => t.includes(seq))) return true;
  return false;
};

// --- ESQUEMA DE VALIDACIÓN ---
const schema = z.object({
  phone: z
    .string()
    .trim()
    .refine(
      (val) => {
        const phoneToValidate = val.startsWith("+")
          ? val
          : `+58${val.replace(/^0/, "")}`;
        const phoneNumber = parsePhoneNumberFromString(phoneToValidate);
        if (!phoneNumber || !phoneNumber.isValid()) return false;
        const nationalNumber = phoneNumber.nationalNumber;
        if (/(\d)\1{5,}/.test(nationalNumber)) return false;
        const sequences = ["0123456789", "9876543210"];
        if (sequences.some((s) => s.includes(nationalNumber.slice(-7))))
          return false;
        if (/^(\d{2})\1+$/.test(nationalNumber.slice(-6))) return false;
        return true;
      },
      { message: "Número no permitido. Ingresa uno real." },
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
    .min(4, "Dirección muy corta")
    .refine((val) => !isGarbageText(val), "Dirección inválida"),
  birthdate: z.string().refine((date) => {
    const hoy = new Date();
    const cumple = new Date(date);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad >= 13 && edad <= 90;
  }, "Debes ser mayor de 13 años"),
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
          "abc.com",
          "mail.com",
          "asdf.com",
          "ghj.com",
          "yopmail.com",
          "mailinator.com",
        ];
        if (blacklisted.includes(domain)) return false;
        if (/[^aeiou]{5,}/i.test(user)) return false;
        return domain.split(".")[0].length >= 2;
      },
      { message: "Ingresa un correo real." },
    ),
});

const pasos = [
  {
    id: "phone",
    label: "Número de Teléfono",
    placeholder: "Ej. 4241234567",
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

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
            handleConnect(10000, 10000, 10080, generarNotaCliente(user)).catch(
              () => {},
            );
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
  }, [macAddress, checkUserStatus]);

  const handleNext = async () => {
    const currentId = pasos[step].id;
    if (await trigger(currentId)) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const res = await fetch(
            `${BACKEND_URL}/check-phone/${getValues("phone")}`,
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
      const finalData = userDataSaved || data;
      await saveUserToFirebase({ ...finalData, mac: macAddress });
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
        backdrop="static" // Obliga a leer o cerrar manualmente
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

            <span className="small text-white-50">
              Si tus datos son correctos, el sistema te reconocerá al instante
              la próxima vez que nos visites.
            </span>
          </div>

          <Button
            variant="info"
            className="w-100 rounded-pill fw-bold text-white py-3 shadow-lg border-0"
            onClick={() => setShowWelcomeAlert(false)}
            style={{ letterSpacing: "1px" }}
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
                  {pasos[step].type === "select" ? (
                    <Form.Select
                      {...register(pasos[step].id)}
                      isInvalid={!!errors[pasos[step].id]}
                    >
                      <option value="">Seleccionar...</option>
                      {pasos[step].options.map((opt) => (
                        <option key={opt} value={opt}>
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
                  /* --- AQUÍ SE DISPARA LA REDIRECCIÓN AUTOMÁTICA --- */
                  <SuccessRedirect url={instagramUrl} />
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
