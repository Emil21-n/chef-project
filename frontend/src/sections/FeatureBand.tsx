import type { HeroSlide } from "@/shared/model/restaurant";
import { BakeryIcon, ChefHatIcon, FlameIcon } from "@/shared/ui/icons";

const featureMeta = [
  { Icon: ChefHatIcon, label: "Шеф из Турции" },
  { Icon: FlameIcon, label: "Открытый огонь" },
  { Icon: BakeryIcon, label: "Своя пекарня" }
];

export function FeatureBand({ heroSlides }: { heroSlides: HeroSlide[] }) {
  const featureCards = heroSlides.slice(0, featureMeta.length).map((slide, index) => ({
    ...slide,
    ...featureMeta[index]
  }));

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
