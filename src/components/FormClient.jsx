import { useState, useEffect, useCallback } from "react";
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

// Schema y Pasos se mantienen igual...
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
  instagramUrl,
  showInstagramBtn,
  isIOS,
  iosUrl,
  clientLoading,
  connected,
  macAddress, // Nueva prop recibida
}) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAutoChecking, setIsAutoChecking] = useState(true); // Estado para la carga inicial por MAC

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

  const encode = (data) =>
    Object.keys(data)
      .map(
        (key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]),
      )
      .join("&");

  // 1. Verificación inicial por MAC
  useEffect(() => {
    const checkMacSilently = async () => {
      if (!macAddress) {
        setIsAutoChecking(false);
        return;
      }
      try {
        const res = await fetch("/.netlify/functions/check-user", {
          method: "POST",
          body: JSON.stringify({ mac: macAddress }),
        });
        const data = await res.json();
        if (data.exists) {
          setUserName(data.name);
          handleConnect(10000, 10000, 10080);
        }
      } catch (error) {
        console.error("Error verificando MAC:", error);
      } finally {
        setIsAutoChecking(false);
      }
    };
    checkMacSilently();
  }, [macAddress, handleConnect]);

  const handleNext = async () => {
    const currentId = pasos[step].id;
    const isStepValid = await trigger(currentId);

    if (isStepValid) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const res = await fetch("/.netlify/functions/check-user", {
            method: "POST",
            body: JSON.stringify({
              phone: getValues("phone"),
              mac: macAddress, // Enviamos la MAC para actualizar si el usuario existe
            }),
          });
          const data = await res.json();
          if (data.exists) {
            setUserName(data.name);
            setStep(pasos.length);
          } else {
            setStep((prev) => prev + 1);
          }
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
      if (!userName || step < pasos.length) {
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          // Incluimos la MAC en el registro de Netlify
          body: encode({
            "form-name": "portal-cautivo",
            ...data,
            mac: macAddress,
          }),
        });
      }
      handleConnect(10000, 10000, 10080);
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const isAnyLoading = loading || clientLoading || isAutoChecking;
  const currentField = pasos[step];
  const isLastStep = step >= pasos.length;

  // Mostramos spinner centrado durante la verificación silenciosa inicial
  if (isAutoChecking) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <Image className="spinner" src={spinnerImg} />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Card className="glass-card p-4 shadow-lg border-0">
          <Form
            onSubmit={handleSubmit(onSubmit)}
            name="portal-cautivo"
            data-netlify="true"
          >
            <input type="hidden" name="form-name" value="portal-cautivo" />

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
                  <Form.Label className="small text-info text-uppercase fw-bold">
                    {currentField.label}
                  </Form.Label>
                  {currentField.type === "select" ? (
                    <Form.Select
                      {...register(currentField.id)}
                      isInvalid={!!errors[currentField.id]}
                    >
                      <option value="" className="bg-dark-option">
                        Seleccionar...
                      </option>
                      {currentField.options.map((opt) => (
                        <option
                          key={opt}
                          value={opt}
                          className="bg-dark-option"
                        >
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
                  className="mb-4 progress-custom"
                  style={{ height: "6px" }}
                />

                <div className="d-flex justify-content-between align-items-center mt-4">
                  <Button
                    variant="link"
                    onClick={() => setStep(step - 1)}
                    className={`text-white-50 p-0 text-decoration-none ${step === 0 ? "invisible" : ""}`}
                  >
                    ← Volver
                  </Button>
                  <Button
                    variant="info"
                    onClick={handleNext}
                    disabled={isAnyLoading}
                    className="px-5 py-2 rounded-pill fw-bold text-white shadow d-flex align-items-center justify-content-center"
                    style={{ minWidth: "130px" }}
                  >
                    {isAnyLoading ? (
                      <Image className="spinner" src={spinnerImg} />
                    ) : (
                      "Siguiente"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-3">
                  <span style={{ fontSize: "4rem" }}>🎯</span>
                </div>
                <h2 className="fw-bold mb-2">¡Todo listo, {userName}!</h2>

                {isAnyLoading ? (
                  <div className="py-3">
                    <Image className="spinner" src={spinnerImg} />
                  </div>
                ) : (
                  !connected && (
                    <div className="d-flex flex-column align-items-center">
                      <p className="text-white-50 mb-4">
                        Haz clic abajo para iniciar tu navegación segura.
                      </p>
                      <Button
                        variant="primary"
                        type="submit"
                        size="lg"
                        className="rounded-pill py-3 px-5 fw-bold shadow-lg border-0 btn-grad-blue"
                        disabled={isAnyLoading}
                      >
                        CONECTAR
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-4 text-white-50 text-decoration-none"
                        onClick={() => {
                          setStep(0);
                          setUserName("");
                        }}
                      >
                        ¿No eres tú? Cambiar datos
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
