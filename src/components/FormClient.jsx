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

// 1. Esquema de validación con Zod
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

  // Función para codificar los datos para Netlify (application/x-www-form-urlencoded)
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
        // IMPORTANTE: Incluimos el 'form-name' para que Netlify sepa qué formulario es
        body: encode({ "form-name": "portal-cautivo", ...data }),
      });

      alert("¡Registro exitoso! Conectando a la red...");

      // Aquí iría tu lógica para activar el internet en el router
      // Ejemplo: document.getElementById('router-login').submit();
    } catch (error) {
      console.error("Error en el envío:", error);
      alert("Hubo un error al enviar los datos.");
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
        variant="primary"
        className="mb-4"
        style={{ height: "10px" }}
      />

      <Card className="p-4 shadow border-0">
        {/* Agregamos atributos oficiales de Netlify al componente de React */}
        <Form
          onSubmit={handleSubmit(onSubmit)}
          name="portal-cautivo"
          data-netlify="true"
        >
          {/* Mantenemos el campo oculto de form-name por redundancia de seguridad */}
          <input type="hidden" name="form-name" value="portal-cautivo" />

          <div key={currentField.id}>
            <Form.Label className="fw-bold text-dark small text-uppercase">
              {currentField.label}
            </Form.Label>

            {currentField.type === "select" ? (
              <Form.Select
                {...register(currentField.id)}
                isInvalid={!!errors[currentField.id]}
                defaultValue={getValues(currentField.id) || ""}
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
              ← Anterior
            </Button>

            {step < pasos.length - 1 ? (
              <Button variant="dark" className="px-4" onClick={handleNext}>
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
                  "Finalizar"
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
