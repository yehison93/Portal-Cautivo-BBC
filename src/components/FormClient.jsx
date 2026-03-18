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
  Spinner,
} from "react-bootstrap";

// 1. Esquema de validación (Zod)
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

  // Utilidad para enviar datos a Netlify (form-urlencoded)
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

      // LOGICA DE CONEXIÓN AL ROUTER AQUÍ
      alert("¡Registro exitoso! Conectando al WiFi del Casino...");
    } catch (error) {
      alert("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const currentField = pasos[step];
  const progress = ((step + 1) / pasos.length) * 100;

  return (
    <Container className="mt-4" style={{ maxWidth: "420px" }}>
      <ProgressBar
        now={progress}
        variant="warning"
        className="mb-4"
        style={{ height: "6px" }}
      />

      <Card className="p-4 shadow-lg border-0 bg-light">
        <Form
          onSubmit={handleSubmit(onSubmit)}
          name="portal-cautivo"
          data-netlify="true"
        >
          {/* Requerido por Netlify para identificar el form en el POST */}
          <input type="hidden" name="form-name" value="portal-cautivo" />

          <div key={currentField.id}>
            <Form.Label className="fw-bold text-dark small">
              {currentField.label}
            </Form.Label>

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
          </div>

          <div className="d-flex justify-content-between mt-4">
            <Button
              variant="outline-secondary"
              onClick={() => setStep(step - 1)}
              className={step === 0 ? "invisible" : ""}
            >
              Atrás
            </Button>

            {step < pasos.length - 1 ? (
              <Button variant="primary" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button variant="success" type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" /> : "Conectar WiFi"}
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </Container>
  );
};

export default FormClient;
