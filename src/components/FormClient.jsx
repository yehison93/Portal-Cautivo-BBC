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

const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

const generarNotaCliente = (datos) => {
  const { name, phone, email, address, birthdate } = datos;
  return `Cli: ${name} | Tel: ${phone} | Mail: ${email} | Dir: ${address} | Nac: ${birthdate}`;
};

// --- ESQUEMA DE VALIDACIÓN ROBUSTO ---
const schema = z.object({
  phone: z
    .string()
    .trim()
    .refine(
      (val) => {
        // Si no tiene '+', intentamos validarlo como número de Venezuela por defecto
        const phoneToValidate = val.startsWith("+")
          ? val
          : `+58${val.replace(/^0/, "")}`;
        const phoneNumber = parsePhoneNumberFromString(phoneToValidate);

        // isValid() verifica que el número tenga la cantidad de dígitos y el prefijo correcto
        return phoneNumber && phoneNumber.isValid();
      },
      {
        message:
          "Número inválido. Asegúrate de incluir tu código de país (ej: +57, +1, +34)",
      },
    ),
  name: z
    .string()
    .trim()
    .min(6, "Nombre y apellido")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Solo letras")
    .refine((v) => v.trim().split(/\s+/).length >= 2, {
      message: "Falta apellido",
    }),
  birthdate: z.string().refine((date) => {
    const hoy = new Date();
    const cumple = new Date(date);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad >= 13 && edad <= 90;
  }, "Debes ser mayor de 13 años"),
  gender: z.enum(["Masculino", "Femenino", "Otro"]),
  address: z.string().trim().min(10, "Dirección muy corta"),

  // ... dentro de tu schema de Zod ...
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (val) => isEmail(val, { require_tld: true }),
      "Correo electrónico inválido",
    )
    .refine(
      (val) => {
        const [user, domain] = val.split("@");

        // 1. Bloqueo de dominios de prueba o obvios
        const blacklistedDomains = [
          "test.com",
          "example.com",
          "abc.com",
          "mail.com",
          "asdf.com",
          "ghj.com",
        ];
        if (blacklistedDomains.includes(domain)) return false;

        // 2. Bloqueo de correos temporales conocidos (Yopmail, etc.)
        const tempDomains = [
          "yopmail.com",
          "mailinator.com",
          "guerrillamail.com",
          "10minutemail.com",
        ];
        if (tempDomains.includes(domain)) return false;

        // 3. Filtro de "Teclazo Aleatorio" (Entropy Check)
        // Si el usuario tiene 4 o más consonantes seguidas, probablemente es basura
        const randomPattern = /[^aeiou]{5,}/i;
        if (randomPattern.test(user)) return false;

        // 4. Longitud mínima del dominio (evita d.c o similares)
        if (domain.split(".")[0].length < 2) return false;

        return true;
      },
      {
        message: "Por favor, ingresa un correo electrónico real y verificable.",
      },
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
  showInstagramBtn,
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

  // Estado para la Alerta de Bienvenida
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
    setValue("name", user.name);
    setValue("email", user.email);
    setValue("phone", user.phone);
    setValue("address", user.address);
    setValue("gender", user.gender);
    setValue("birthdate", user.birthdate);
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
            const notaConDatos = generarNotaCliente(user);
            handleConnect(10000, 10000, 10080, notaConDatos).catch(() => {});
          }
        } else {
          setShowWelcomeAlert(true); // Activar bienvenida si es usuario nuevo
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
    const isStepValid = await trigger(currentId);
    if (isStepValid) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const phoneValue = getValues("phone");
          const response = await fetch(
            `${BACKEND_URL}/check-phone/${phoneValue}`,
          );
          if (response.ok) {
            const user = await response.json();
            if (user && user.name) {
              rescatarUsuario(user);
              return;
            }
          }
          setStep((prev) => prev + 1);
        } catch (error) {
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
      {/* ALERTA MODAL DE BIENVENIDA */}
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
            <strong>activar tu acceso automático</strong> en futuras visitas,
            por favor completa tu perfil con datos reales.
          </p>

          <div
            className="p-3 mb-4 rounded-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <small className="text-info d-block fw-bold mb-1">
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
                    <h1 className="mb-0 fw-light">Registro</h1>
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
                      inputMode={pasos[step].inputMode || "text"}
                      autoCapitalize={pasos[step].autoCapitalize || "none"}
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
                <div className="mb-3">
                  <span style={{ fontSize: "4rem" }}>🎯</span>
                </div>
                <h2 className="fw-bold mb-2">¡Todo listo, {userName}!</h2>
                {!connected && (
                  <div className="d-flex flex-column align-items-center mt-4">
                    <p className="text-white-50 mb-4 text-center">
                      Haz clic abajo para iniciar tu navegación.
                    </p>
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      className="rounded-pill py-3 px-5 fw-bold shadow-lg border-0 btn-grad-blue"
                    >
                      CONECTAR
                    </Button>
                  </div>
                )}
                {connected && showInstagramBtn && (
                  <Button
                    className="w-100 rounded-pill py-3 fw-bold shadow-lg mt-3"
                    variant="light"
                    href={isIOS ? iosUrl : instagramUrl}
                  >
                    NAVEGAR AHORA
                  </Button>
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
