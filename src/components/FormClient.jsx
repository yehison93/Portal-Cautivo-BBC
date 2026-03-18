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

const schema = z.object({
  phone: z.string().min(8, "Número inválido").regex(/^\d+$/, "Solo números"),
  name: z.string().min(3, "Nombre muy corto"),
  birthdate: z.string().min(1, "Fecha requerida"),
  gender: z.enum(["Masculino", "Femenino", "Otro"]),
  address: z.string().min(5, "Dirección requerida"),
  email: z.string().email("Correo inválido"),
});

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
    setValue,
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

  // Lógica especial para el botón Siguiente
  const handleNext = async () => {
    const currentId = pasos[step].id;
    const isStepValid = await trigger(currentId);

    if (isStepValid) {
      if (currentId === "phone") {
        setLoading(true);
        try {
          const res = await fetch("/.src/netlify/functions/check-user", {
            method: "POST",
            body: JSON.stringify({ phone: getValues("phone") }),
          });
          const data = await res.json();

          if (data.exists) {
            setReturningUser(data.name);
            setStep(pasos.length); // Saltar al final
          } else {
            setStep((prev) => prev + 1);
          }
        } catch (e) {
          setStep((prev) => prev + 1); // Si falla la API, seguimos con el registro normal
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
      // Si es un usuario nuevo, guardamos en Netlify Forms
      if (!returningUser) {
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encode({ "form-name": "portal-cautivo", ...data }),
        });
      }

      alert("¡Conexión Exitosa! Bienvenido al WiFi.");
      // Aquí disparas el submit hacia tu router (MikroTik/pfSense)
    } catch (error) {
      alert("Error al conectar.");
    } finally {
      setLoading(false);
    }
  };

  const currentField = pasos[step];

  return (
    <Container className="mt-5" style={{ maxWidth: "420px" }}>
      <Card className="p-4 shadow-lg border-0">
        <Form
          onSubmit={handleSubmit(onSubmit)}
          name="portal-cautivo"
          data-netlify="true"
        >
          <input type="hidden" name="form-name" value="portal-cautivo" />

          {step < pasos.length ? (
            <div key={currentField.id}>
              <Form.Label className="fw-bold">{currentField.label}</Form.Label>
              {currentField.type === "select" ? (
                <Form.Select
                  {...register(currentField.id)}
                  isInvalid={!!errors[currentField.id]}
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
                  placeholder={currentField.placeholder}
                  isInvalid={!!errors[currentField.id]}
                  defaultValue={getValues(currentField.id) || ""}
                  autoFocus
                />
              )}
              <Form.Control.Feedback type="invalid">
                {errors[currentField.id]?.message}
              </Form.Control.Feedback>

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="link"
                  onClick={() => setStep(step - 1)}
                  className={step === 0 ? "invisible" : ""}
                >
                  Atrás
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "Siguiente"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h3>
                {returningUser
                  ? `¡Hola de nuevo, ${returningUser}!`
                  : "¡Todo listo!"}
              </h3>
              <p className="text-muted">
                Presiona el botón para activar tu acceso a internet.
              </p>
              <Button
                variant="success"
                size="lg"
                type="submit"
                className="w-100"
                disabled={loading}
              >
                {loading ? <Spinner animation="border" /> : "CONECTAR AHORA"}
              </Button>
              {!returningUser && (
                <Button variant="link" size="sm" onClick={() => setStep(0)}>
                  Corregir datos
                </Button>
              )}
            </div>
          )}
        </Form>
      </Card>
    </Container>
  );
};

export default FormClient;
