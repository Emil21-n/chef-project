"use client";

import type { CSSProperties, PointerEvent } from "react";

import type { HeroSlide } from "@/shared/model/restaurant";
import { BakeryIcon, ChefHatIcon, FlameIcon } from "@/shared/ui/icons";

const featureMeta = [
  {
    Icon: ChefHatIcon,
    label: "Шеф из Турции"
  },
  {
    Icon: FlameIcon,
    label: "Открытый огонь"
  },
  {
    Icon: BakeryIcon,
    label: "Своя пекарня"
  }
];

export function FeatureBand({ heroSlides }: { heroSlides: HeroSlide[] }) {
  const featureCards = heroSlides.slice(0, featureMeta.length).map((slide, index) => ({
    ...featureMeta[index],
    title: slide.title,
    text: slide.text,
    image: slide.image
  }));

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 14;
    const rotateX = ((0.5 - y / rect.height)) * 14;

    card.style.setProperty("--feature-rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--feature-rotate-y", `${rotateY.toFixed(2)}deg`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--feature-rotate-x", "0deg");
    event.currentTarget.style.setProperty("--feature-rotate-y", "0deg");
  };

  return (
    <section className="featureBand" id="delivery">
      <div className="sectionInner featureIntro">
        <span className="eyebrow">Наши плюсы</span>
        <h2>Блюда от шефа, стейки и выпечка</h2>
        <p>
          Собрали самое важное в трех направлениях: авторская кухня, горячий огонь
          и свежая выпечка к каждому заказу.
        </p>
      </div>

      <div className="sectionInner featureGrid">
        {featureCards.map(({ Icon, label, title, text, image }) => (
          <article
            className="featureItem"
            key={title}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={
              {
                "--feature-rotate-x": "0deg",
                "--feature-rotate-y": "0deg"
              } as CSSProperties & Record<string, string>
            }
          >
            <div className="featureMedia">
              <img src={image} alt="" loading="lazy" />
              <span className="featureBadge">
                <Icon />
                {label}
              </span>
            </div>
            <div className="featureBody">
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
