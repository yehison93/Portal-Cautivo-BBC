/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  Button,
  Container,
  Card,
  ProgressBar,
  Image,
  Stack,
} from "react-bootstrap";

import spinnerImg from "../assets/logoSpinner.png";

const BACKEND_URL = "https://backend-portal-captive-bbh.onrender.com";

// Helper para formatear la nota de UniFi
const generarNotaCliente = (datos) => {
  const { name, phone, email, address, birthdate } = datos;
  return `Cli: ${name} | Tel: ${phone} | Mail: ${email} | Dir: ${address} | Nac: ${birthdate}`;
};

const schema = z.object({
  phone: z.string().min(8, "Número inválido").regex(/^\d+$/, "Solo números"),
  name: z.string().min(3, "Nombre muy corto"),
  birthdate: z.string().min(1, "Fecha requerida"),
  gender: z.enum(["Masculino", "Femenino", "Otro"], {
    errorMap: () => ({ message: "Selecciona una opción" }),
  }),
  address: z.string().min(5, "Dirección requerida"),
  email: z.string().email("Correo electrónico inválido"),
});

const pasos = [
  {
    id: "phone",
    label: "Número de Teléfono",
    placeholder: "04121234567",
    type: "text",
  },
  {
    id: "name",
    label: "Nombre Completo",
    placeholder: "Ej. Juan Pérez",
    type: "text",
  },
  { id: "birthdate", label: "Fecha de Nacimiento", type: "date" },
  {
    id: "gender",
    label: "Género",
    type: "select",
    options: ["Masculino", "Femenino", "Otro"],
  },
  {
    id: "address",
    label: "Dirección",
    placeholder: "Ciudad, Calle, Edificio",
    type: "text",
  },
  {
    id: "email",
    label: "Correo Electrónico",
    placeholder: "tu@correo.com",
    type: "email",
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

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  // 1. Verificación inicial por MAC
  useEffect(() => {
    const checkMac = async () => {
      if (!macAddress) {
        setIsAutoChecking(false);
        return;
      }
      try {
        const user = await checkUserStatus(macAddress);
        if (user) {
          setUserName(user.name);
          setUserDataSaved(user);
          setStep(pasos.length); // Ir al final directamente

          if (!autoConnectAttempted) {
            setAutoConnectAttempted(true);
            const notaConDatos = generarNotaCliente(user);
            handleConnect(10000, 10000, 10080, notaConDatos).catch(() => {});
          }
        }
      } catch (error) {
        console.error("Error en auto-check MAC:", error);
      } finally {
        setIsAutoChecking(false);
      }
    };
    checkMac();
  }, [autoConnectAttempted, checkUserStatus, handleConnect, macAddress]);

  // 2. Lógica de "Siguiente" con Rescate por Teléfono
  const handleNext = async () => {
    const currentId = pasos[step].id;
    const isStepValid = await trigger(currentId);

    if (isStepValid) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const phone = getValues("phone");
          // Intentamos buscar si este teléfono ya existe (MAC nueva o cambiada)
          const response = await fetch(`${BACKEND_URL}/check-phone/${phone}`);

          if (response.ok) {
            const user = await response.json();
            if (user) {
              // ¡Usuario rescatado! Saltamos el resto del formulario
              setUserName(user.name);
              setUserDataSaved(user);
              setStep(pasos.length);
              return;
            }
          }
          // Si no existe el teléfono, seguimos al paso "Nombre"
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

  // 3. Envío final: Actualiza/Guarda y Conecta
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Usamos los datos rescatados (si existen) o los del formulario (si es nuevo)
      const finalData = userDataSaved || data;

      // Enviamos siempre la MAC actual para que el backend la actualice en el registro
      await saveUserToFirebase({ ...finalData, mac: macAddress });

      const notaNueva = generarNotaCliente(finalData);
      await handleConnect(10000, 10000, 10080, notaNueva);
    } catch (error) {
      alert("Error al procesar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAnyLoading = loading || clientLoading || isAutoChecking;
  const currentField = pasos[step];
  const isLastStep = step >= pasos.length;

  if (isAutoChecking) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "350px" }}
      >
        <Image className="spinner" src={spinnerImg} />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Card className="glass-card p-4 shadow-lg border-0">
          <Form onSubmit={handleSubmit(onSubmit)}>
            {!isLastStep ? (
              <div key={currentField.id}>
                <Card.Title className="mb-4 text-center">
                  <Stack
                    direction="horizontal"
                    gap={2}
                    className="justify-content-center align-items-center"
                  >
                    <span className="palmeras">🌴</span>
                    <h1 className="mb-0 fw-light">¡Bienvenido!</h1>
                    <span className="palmeras">🌴</span>
                  </Stack>
                </Card.Title>

                <Form.Group className="mb-3">
                  <Form.Label className="small text-white fw-bold">
                    {currentField.label}
                  </Form.Label>
                  {currentField.type === "select" ? (
                    <Form.Select
                      {...register(currentField.id)}
                      isInvalid={!!errors[currentField.id]}
                    >
                      <option value="">Seleccionar...</option>
                      {currentField.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      {...register(currentField.id)}
                      type={currentField.type}
                      placeholder={currentField.placeholder}
                      isInvalid={!!errors[currentField.id]}
                      autoFocus
                    />
                  )}
                  <Form.Control.Feedback
                    type="invalid"
                    className="text-warning"
                  >
                    {errors[currentField.id]?.message}
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
                {isAnyLoading ? (
                  <Image className="spinner" src={spinnerImg} />
                ) : (
                  !connected && (
                    <div className="d-flex flex-column align-items-center">
                      <p className="text-white-50 mb-4">
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
                  )
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
