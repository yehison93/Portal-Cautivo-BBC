import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  Button,
  Container,
  Card,
  ProgressBar,
  Spinner,
  Alert,
} from "react-bootstrap";

// 1. Esquema de validación (Zod)
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

// Definición de los pasos del formulario
const pasos = [
  {
    id: "phone",
    label: "Número de teléfono",
    placeholder: "Ej: 04121234567",
    type: "text",
  },
  {
    id: "name",
    label: "Nombre completo",
    placeholder: "Ej: Juan Pérez",
    type: "text",
  },
  { id: "birthdate", label: "Fecha de nacimiento", type: "date" },
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
    label: "Correo electrónico",
    placeholder: "tu@correo.com",
    type: "email",
  },
];

const FormClient = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [returningUser, setReturningUser] = useState(null);

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

  // Función para codificar datos para Netlify Forms (Submissions tradicionales)
  const encode = (data) => {
    return Object.keys(data)
      .map(
        (key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]),
      )
      .join("&");
  };

  // Lógica para el botón "Siguiente" con consulta a la API
  const handleNext = async () => {
    const currentId = pasos[step].id;
    const isStepValid = await trigger(currentId);

    if (isStepValid) {
      // SI ESTAMOS EN EL PASO DEL TELÉFONO, CONSULTAMOS LA API
      if (currentId === "phone") {
        setLoading(true);
        const phoneValue = getValues("phone"); // <--- CORRECCIÓN: Extraemos el valor aquí

        try {
          const res = await fetch("/.netlify/functions/check-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: phoneValue }),
          });

          const data = await res.json();

          if (data.exists) {
            setReturningUser(data.name);
            setStep(pasos.length); // Salta directamente al final (Botón Conectar)
          } else {
            setStep((prev) => prev + 1); // Usuario nuevo, sigue el registro
          }
        } catch (error) {
          console.error("Error API:", error);
          setStep((prev) => prev + 1); // Si la API falla, permitimos que siga el registro manual
        } finally {
          setLoading(false);
        }
      } else {
        setStep((prev) => prev + 1);
      }
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Solo enviamos el formulario completo a Netlify si es un usuario NUEVO
      if (!returningUser) {
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encode({ "form-name": "portal-cautivo", ...data }),
        });
      }

      // Lógica final de conexión al router
      alert("¡Registro exitoso! Conectando al WiFi...");
      // window.location.href = "URL_DE_TU_MIKROTIK_LOGIN";
    } catch (error) {
      alert("Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const currentField = pasos[step];
  const progress = ((step + 1) / pasos.length) * 100;

  return (
    <Container className="mt-5" style={{ maxWidth: "450px" }}>
      {step < pasos.length && (
        <ProgressBar
          now={progress}
          variant="primary"
          className="mb-4"
          style={{ height: "8px" }}
        />
      )}

      <Card className="p-4 shadow border-0 rounded-4">
        <Form
          onSubmit={handleSubmit(onSubmit)}
          name="portal-cautivo"
          data-netlify="true"
        >
          {/* Requerido por Netlify */}
          <input type="hidden" name="form-name" value="portal-cautivo" />

          {step < pasos.length ? (
            <div key={currentField.id}>
              <h5 className="mb-3 text-secondary text-uppercase small fw-bold">
                Registro de Usuario
              </h5>
              <Form.Group>
                <Form.Label>{currentField.label}</Form.Label>

                {currentField.type === "select" ? (
                  <Form.Select
                    {...register(currentField.id)}
                    isInvalid={!!errors[currentField.id]}
                  >
                    <option value="">Selecciona una opción...</option>
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
                    placeholder={currentField.placeholder || ""}
                    isInvalid={!!errors[currentField.id]}
                    autoFocus
                  />
                )}
                <Form.Control.Feedback type="invalid">
                  {errors[currentField.id]?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="link"
                  onClick={() => setStep(step - 1)}
                  className={`text-decoration-none text-muted ${step === 0 ? "invisible" : ""}`}
                >
                  Anterior
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={loading}
                  className="px-4"
                >
                  {loading ? <Spinner size="sm" /> : "Siguiente"}
                </Button>
              </div>
            </div>
          ) : (
            // PANTALLA DE ÉXITO / BIENVENIDA
            <div className="text-center py-3">
              <div className="mb-3 display-6">✨</div>
              <h3>
                {returningUser ? `¡Hola, ${returningUser}!` : "¡Todo listo!"}
              </h3>
              <p className="text-muted">
                {returningUser
                  ? "Te hemos reconocido. Presiona abajo para activar tu acceso."
                  : "Tus datos han sido registrados correctamente."}
              </p>

              <Button
                variant="success"
                type="submit"
                size="lg"
                className="w-100 mt-3 fw-bold"
                disabled={loading}
              >
                {loading ? <Spinner animation="border" /> : "CONECTAR AHORA"}
              </Button>

              <Button
                variant="link"
                size="sm"
                className="mt-3 text-muted text-decoration-none"
                onClick={() => {
                  setStep(0);
                  setReturningUser(null);
                }}
              >
                ¿No eres tú? Cambiar número
              </Button>
            </div>
          )}
        </Form>
      </Card>
      <p className="text-center mt-3 text-muted small">
        Paso {step + 1} de {pasos.length}
      </p>
    </Container>
  );
};

export default FormClient;
