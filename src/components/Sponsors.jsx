// Componente que muestra un carrusel de patrocinadores.
// Los logos se importan como recursos estáticos y se listan en `sponsorItem`.
import { Carousel, Figure } from "react-bootstrap";
import logoTecnonet from "../assets/sponsors/tecnonet.webp";
import logoBBH from "../assets/sponsors/bbh.png";
import logoBrisas from "../assets/sponsors/brisas.png";
import logoShelumSpa from "../assets/sponsors/logoShelumSpa.png";

// Lista de objetos que representan cada patrocinador. Se usa `img` como
// referencia al recurso importado y `slogan` para mostrar un pie de imagen.
const sponsorItem = [
  {
    name: "Tecnonet",
    img: logoTecnonet,
    slogan: "Te mantiene conectado",
  },
  {
    name: "BBH",
    img: logoBBH,
    slogan: "¡Gana a lo grande con bbh!",
  },
  {
    name: "Brisas",
    img: logoBrisas,
    slogan: "Tradición que puedes saborear",
  },
  {
    name: "Shelum Spa",
    img: logoShelumSpa,
    slogan: "Te hace sentir y vivir mejor",
  },
];

const Sponsors = () => {
  // Mapear `sponsorItem` a elementos del carrusel.
  // `interval` controla el tiempo de cada slide (en ms).
  return (
    <Carousel slide controls={false} indicators={false}>
      {sponsorItem.map((item, index) => {
        return (
          <Carousel.Item interval={1000} className="text-center" key={index}>
            <Figure className="container-figure">
              <Figure.Image
                className="figure-img"
                alt={"Imagen de " + item.name}
                src={item.img}
              />
              <Figure.Caption className="text-light text-slogan">
                {item.slogan}
              </Figure.Caption>
            </Figure>
          </Carousel.Item>
        );
      })}
    </Carousel>
  );
};

export default Sponsors;
