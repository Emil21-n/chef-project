"use client";

import { contactInfo, heroSlides } from "@/data/menu";

type HeroSectionProps = {
  activeSlide: number;
  onSlideChange: (index: number) => void;
};

export function HeroSection({ activeSlide, onSlideChange }: HeroSectionProps) {
  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${heroSlides[activeSlide].image})` }}
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
