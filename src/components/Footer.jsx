// Pie de página simple que muestra el año actual y el nombre del hotel.
// No tiene estado ni props; se mantiene aquí como un componente presentational.
const Footer = () => {
  // Año actual mostrado dinámicamente para evitar actualizaciones manuales.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="container-footer ">
      <p className="text-center mt-4 text-white-50 small opacity-50">
        &copy; {currentYear}{" "}
        <strong className="text-warning">Buddha Bar WiFi Service</strong>. Todos
        los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
