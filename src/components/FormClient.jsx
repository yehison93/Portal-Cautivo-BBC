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
} from "react-bootstrap";

// 1. Esquema de validación
const schema = z.object({
  name: z.string().min(3, "Ingresa tu nombre completo"),
  birthdate: z.string().min(1, "La fecha es obligatoria"),
  gender: z.enum(["Masculino", "Femenino", "Otro"], {
    errorMap: () => ({ message: "Selecciona una opción" }),
  }),
  address: z.string().min(5, "Ingresa una dirección válida"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().min(8, "Mínimo 8 dígitos").regex(/^\d+$/, "Solo números"),
});

const pasos = [
  {
    id: "name",
    label: "Nombre completo",
    placeholder: "Ej. Juan Pérez",
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
    placeholder: "Calle, número, ciudad",
    type: "text",
  },
  {
    id: "email",
    label: "Correo electrónico",
    placeholder: "nombre@correo.com",
    type: "email",
  },
  {
    id: "phone",
    label: "Número de teléfono",
    placeholder: "1234567890",
    type: "text",
  },
];

const FormClient = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

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

  // Utilidad para codificar datos para Netlify
  const encode = (data) => {
    return Object.keys(data)
      .map(
        (key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]),
      )
      .join("&");
  };

  const handleNext = async () => {
    const isStepValid = await trigger(pasos[step].id);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({ "form-name": "portal-cautivo", ...data }),
      });

      // Lógica Post-Envío: Aquí disparas el login de tu Router (MikroTik/etc)
      alert("Registro completado. Conectando al WiFi...");
      // window.location.href = "URL_DE_LOGIN_DEL_ROUTER";
    } catch (error) {
      alert("Error al enviar los datos. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const currentField = pasos[step];
  const progress = ((step + 1) / pasos.length) * 100;

  return (
    <Container className="mt-5" style={{ maxWidth: "480px" }}>
      <ProgressBar
        now={progress}
        variant="info"
        className="mb-4"
        style={{ height: "8px" }}
      />

      <Card className="p-4 shadow-sm border-0">
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div key={currentField.id}>
            <Form.Label className="fw-bold text-secondary small text-uppercase">
              {currentField.label}
            </Form.Label>

            {currentField.type === "select" ? (
              <Form.Select
                {...register(currentField.id)}
                isInvalid={!!errors[currentField.id]}
                defaultValue={getValues(currentField.id) || ""}
              >
                <option value="">Selecciona...</option>
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
                defaultValue={getValues(currentField.id) || ""}
                autoFocus
              />
            )}

            <Form.Control.Feedback type="invalid">
              {errors[currentField.id]?.message}
            </Form.Control.Feedback>
          </div>

          <div className="d-flex justify-content-between mt-4">
            <Button
              variant="link"
              onClick={() => setStep(step - 1)}
              className={`text-decoration-none text-muted ${step === 0 || loading ? "invisible" : ""}`}
            >
              Anterior
            </Button>

            {step < pasos.length - 1 ? (
              <Button variant="primary" className="px-4" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button
                variant="success"
                className="px-4"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Conectar"
                )}
              </Button>
            )}
          </div>
        </Form>
      </Card>
      <p className="text-center mt-3 text-muted small">
        Paso {step + 1} de {pasos.length}
      </p>
    </Container>
  );
};

export default FormClient;
