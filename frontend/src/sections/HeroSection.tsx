"use client";

import type { ContactInfo, HeroSlide } from "@/shared/model/restaurant";

type HeroSectionProps = {
  activeSlide: number;
  contactInfo: ContactInfo;
  heroSlides: HeroSlide[];
  onSlideChange: (index: number) => void;
};

export function HeroSection({
  activeSlide,
  contactInfo,
  heroSlides,
  onSlideChange
}: HeroSectionProps) {
  const slide = heroSlides[activeSlide] || heroSlides[0];

  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${slide.image})` }}
    >
      <div className="heroOverlay" />
      <div className="heroContent">
        <span className="eyebrow">Доставка от 60 минут</span>
        <h1>Chef&apos;s Choice</h1>
        <p>Оригинальные турецкие блюда с доставкой по Москве.</p>
        <div className="heroActions">
          <a className="primaryCta" href="#menu">
            Смотреть меню
          </a>
          <a
            className="secondaryCta"
            href={contactInfo.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
        <div className="heroBullets" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <button
              type="button"
              key={slide.title}
              className={index === activeSlide ? "isActive" : ""}
              onClick={() => onSlideChange(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
