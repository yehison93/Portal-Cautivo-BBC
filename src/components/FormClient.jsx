import { useState } from "react";
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
} from "react-bootstrap";
import spinner from "../assets/logoSpinner.png";

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
  androidUrl,
  clientLoading,
  connected,
}) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

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

  const handleNext = async () => {
    const currentId = pasos[step].id;
    const isStepValid = await trigger(currentId);

    if (isStepValid) {
      if (currentId === "phone") {
        setLoading(true);
        const phoneValue = getValues("phone");
        try {
          const res = await fetch("/.netlify/functions/check-user", {
            method: "POST",
            body: JSON.stringify({ phone: phoneValue }),
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
        // Guardamos el nombre conforme lo escriben para la pantalla final de nuevos usuarios
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
          body: encode({ "form-name": "portal-cautivo", ...data }),
        });
      }
      alert("Conectando al servicio WiFi...");
      // Lógica de redirección al router aquí
    } catch (error) {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const currentField = pasos[step];
  const isLastStep = step >= pasos.length;

  return (
    <Container>
      <style>{`
        body {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          color: white;
        }
        .form-control, .form-select {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white !important;
          border-radius: 12px;
          padding: 12px;
        }
        .form-control:focus, .form-select:focus {
          background: rgba(255, 255, 255, 0.15);
          border-color: #00d2ff;
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
        }
        .form-control::placeholder { color: rgba(255, 255, 255, 0.4); }
        .progress { background: rgba(255, 255, 255, 0.1); border-radius: 20px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Card className="glass-card p-4 shadow-lg">
          {!isLastStep && (
            <ProgressBar
              now={((step + 1) / pasos.length) * 100}
              variant="info"
              className="mb-4"
            />
          )}
          <Form
            onSubmit={handleSubmit(onSubmit)}
            name="portal-cautivo"
            data-netlify="true"
          >
            <input type="hidden" name="form-name" value="portal-cautivo" />

            {!isLastStep ? (
              <div key={currentField.id}>
                <h4 className="mb-4 fw-light text-center">
                  Registro de Invitado
                </h4>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-info text-uppercase fw-bold">
                    {currentField.label}
                  </Form.Label>
                  {currentField.type === "select" ? (
                    <Form.Select
                      {...register(currentField.id)}
                      isInvalid={!!errors[currentField.id]}
                    >
                      <option value="" className="bg-dark">
                        Seleccionar...
                      </option>
                      {currentField.options.map((opt) => (
                        <option key={opt} value={opt} className="bg-dark">
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
                    disabled={loading}
                    className="px-5 py-2 rounded-pill fw-bold text-white shadow"
                  >
                    {loading ? (
                      <Image
                        className="spinner"
                        src={spinner}
                        alt="Cargando..."
                      />
                    ) : (
                      "Siguiente"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="mb-4">
                  <span style={{ fontSize: "4rem" }}>🎯</span>
                </div>
                <h2 className="fw-bold mb-2">¡Todo listo, {userName}!</h2>

                {clientLoading ? (
                  <Image className="spinner" src={spinner} alt="Cargando..." />
                ) : (
                  !connected && (
                    <>
                      <p className="text-white-50 mb-4">
                        Haz clic abajo para iniciar tu navegación segura.
                      </p>
                      <Button
                        variant="primary"
                        type="submit"
                        size="lg"
                        className="w-100 rounded-pill py-3 fw-bold shadow-lg border-0"
                        onClick={() => handleConnect(10000, 10000, 10080)}
                        style={{
                          background:
                            "linear-gradient(45deg, #00d2ff 0%, #3a7bd5 100%)",
                        }}
                        disabled={loading}
                      >
                        {loading ? (
                          <Image
                            className="spinner"
                            src={spinner}
                            alt="Cargando..."
                          />
                        ) : (
                          "ACCEDER A INTERNET"
                        )}
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
                      <Button
                        className="btn-submit"
                        variant="light"
                        aria-label="Ir a Instagram"
                        href={isIOS ? iosUrl : instagramUrl}
                        hidden={loading || !connected || !showInstagramBtn}
                      >
                        NAVEGAR
                      </Button>
                    </>
                  )
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
