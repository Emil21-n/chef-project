"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import type { ContactInfo, HeroSlide } from "@/shared/model/restaurant";
import { MapPinIcon, MenuIcon, WhatsAppIcon } from "@/shared/ui/icons";

type HeroSectionProps = {
  activeSlide: number;
  contactInfo: ContactInfo;
  heroSlides: HeroSlide[];
  onSlideChange: (index: number) => void;
};

const HERO_VIDEO_SRC = "/videos/turkish-food-dish.mp4";

export function HeroSection({
  contactInfo,
  heroSlides
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frameId = 0;

    const applyProgress = () => {
      frameId = 0;
      const rect = section.getBoundingClientRect();
      const maxDistance = window.innerWidth <= 760 ? 380 : 440;
      const distance = Math.min(Math.max(-rect.top, 0), maxDistance);
      const progress = Number((distance / maxDistance).toFixed(3));
      const isMobile = window.innerWidth <= 760;
      const mediaWidth = isMobile ? 300 + progress * 620 : 320 + progress * 800;
      const mediaHeight = isMobile ? 370 + progress * 230 : 390 + progress * 260;

      section.style.setProperty("--hero-progress", String(progress));
      section.style.setProperty("--hero-media-width", `${mediaWidth}px`);
      section.style.setProperty("--hero-media-height", `${mediaHeight}px`);
      section.style.setProperty(
        "--hero-title-shift",
        `${progress * (isMobile ? 22 : 19)}vw`
      );
    };

    const scheduleProgress = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(applyProgress);
    };

    applyProgress();
    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", scheduleProgress);
      window.removeEventListener("resize", scheduleProgress);
    };
  }, []);

  const heroStyle = {
    backgroundImage: `url(${backgroundImage})`,
    "--hero-progress": 0,
    "--hero-media-width": "320px",
    "--hero-media-height": "390px",
    "--hero-title-shift": "0vw"
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
          <video
            className="heroVideo"
            src={HERO_VIDEO_SRC}
            poster={foregroundImage}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
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
