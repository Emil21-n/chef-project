import { heroSlides } from "@/data/menu";
import { BakeryIcon, ChefHatIcon, FlameIcon } from "@/shared/ui/icons";

const featureCards = [
  {
    ...heroSlides[0],
    Icon: ChefHatIcon,
    label: "Шеф из Турции"
  },
  {
    ...heroSlides[1],
    Icon: FlameIcon,
    label: "Открытый огонь"
  },
  {
    ...heroSlides[2],
    Icon: BakeryIcon,
    label: "Своя пекарня"
  }
];

export function FeatureBand() {
  return (
    <section className="featureBand" id="delivery">
      <div className="sectionInner featureGrid">
        {featureCards.map(({ Icon, label, ...slide }) => (
          <article className="featureItem" key={slide.title}>
            <div className="featureMedia">
              <img src={slide.image} alt="" loading="lazy" />
              <span className="featureBadge">
                <Icon />
                {label}
              </span>
            </div>
            <div className="featureBody">
              <h3>{slide.title}</h3>
              <p>{slide.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
