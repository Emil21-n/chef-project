"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { ContactInfo, HeroSlide } from "@/shared/model/restaurant";
import { MapPinIcon, MenuIcon, WhatsAppIcon } from "@/shared/ui/icons";

type HeroSectionProps = {
  activeSlide: number;
  contactInfo: ContactInfo;
  heroSlides: HeroSlide[];
  onSlideChange: (index: number) => void;
};

export function HeroSection({
  contactInfo,
  heroSlides
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const breadSlide =
    heroSlides.find((slide) => /выпеч|пекар|хлеб/i.test(`${slide.title} ${slide.text}`)) ||
    heroSlides[2] ||
    heroSlides[0];
  const steakSlide =
    heroSlides.find((slide) => /стейк|грил|огонь|мяс/i.test(`${slide.title} ${slide.text}`)) ||
    heroSlides[1] ||
    heroSlides[0];
  const backgroundImage =
    breadSlide?.image ||
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1800&auto=format&fit=crop";
  const foregroundImage =
    steakSlide?.image ||
    "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=1800&auto=format&fit=crop";
  const heroText =
    steakSlide?.text ||
    "Мясо, кебабы и овощи готовятся на гриле, чтобы сохранить аромат дыма и сочность.";

  useEffect(() => {
    const updateProgress = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const distance = Math.min(Math.max(-rect.top, 0), 420);
      setScrollProgress(Number((distance / 420).toFixed(3)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const heroStyle = {
    backgroundImage: `url(${backgroundImage})`,
    "--hero-progress": scrollProgress,
    "--hero-media-width": `${320 + scrollProgress * 760}px`,
    "--hero-media-height": `${390 + scrollProgress * 250}px`,
    "--hero-title-shift": `${scrollProgress * 19}vw`
  } as CSSProperties & Record<string, string | number>;

  return (
    <section
      ref={sectionRef}
      className="hero"
      style={heroStyle}
    >
      <div className="heroOverlay" />
      <div className="heroStage">
        <div className="heroMediaShell" aria-hidden="true">
          <img src={foregroundImage} alt="" />
          <div className="heroMediaShade" />
        </div>

        <div className="heroTitleSplit" aria-label="Chef's Choice">
          <span className="heroTitleWord heroTitleWordLeft">Chef&apos;s</span>
          <span className="heroTitleWord heroTitleWordRight">Choice</span>
        </div>

        <div className="heroContent">
          <div className="heroActions">
            <a className="primaryCta" href="#menu" aria-label="Смотреть меню" title="Смотреть меню">
              <MenuIcon />
            </a>
            <a
              className="secondaryCta"
              href={contactInfo.whatsapp}
              aria-label="WhatsApp"
              title="WhatsApp"
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
            </a>
            <a
              className="secondaryCta tertiaryCta"
              href={contactInfo.mapUrl || "#contacts"}
              aria-label="Маршрут"
              title="Маршрут"
              target="_blank"
              rel="noreferrer"
            >
              <MapPinIcon />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
