// Pie de página simple que muestra el año actual y el nombre del hotel.
// No tiene estado ni props; se mantiene aquí como un componente presentacional.
const Footer = () => {
  // Año actual mostrado dinámicamente para evitar actualizaciones manuales.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="container-footer text-light">
      <p>
        &copy; {currentYear}{" "}
        <strong className="text-warning">Maremares Hotel</strong>. Todos los
        derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
