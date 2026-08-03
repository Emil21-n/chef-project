"use client";

import Image, { getImageProps } from "next/image";
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

const HERO_VIDEO_SRC = "/videos/turkish-food-dish.mp4";

export function HeroSection({
  contactInfo,
  heroSlides
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const breadSlide =
    heroSlides.find((slide) => /выпеч|пекар|хлеб/i.test(`${slide.title} ${slide.text}`)) ||
    heroSlides[2] ||
    heroSlides[0];
  const steakSlide =
    heroSlides.find((slide) => /стейк|грил|огонь|мяс/i.test(`${slide.title} ${slide.text}`)) ||
    heroSlides[1] ||
    heroSlides[0];
  const backgroundImage = breadSlide?.image || "";
  const foregroundImage = steakSlide?.image || "";
  const foregroundPoster = foregroundImage
    ? getImageProps({
        alt: "",
        src: foregroundImage,
        width: 960,
        height: 1200,
        quality: 78
      }).props.src
    : undefined;

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;

    if (connection?.saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const enableVideo = () => setVideoEnabled(true);

    if (document.readyState === "complete") {
      enableVideo();
      return;
    }

    window.addEventListener("load", enableVideo, { once: true });
    return () => window.removeEventListener("load", enableVideo);
  }, []);

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
      {backgroundImage ? (
        <Image
          className="heroBackgroundImage"
          src={backgroundImage}
          alt=""
          fill
          priority
          quality={78}
          sizes="100vw"
          aria-hidden="true"
        />
      ) : null}
      <div className="heroOverlay" />
      <div className="heroStage">
        <div className="heroMediaShell" aria-hidden="true">
          <video
            className="heroVideo"
            src={videoEnabled ? HERO_VIDEO_SRC : undefined}
            poster={foregroundPoster}
            autoPlay={videoEnabled}
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="heroMediaShade" />
        </div>

        <h1
          className="heroTitleSplit"
          aria-label="Chef's Choice — доставка турецкой кухни в Москве"
        >
          <span className="heroTitleWord heroTitleWordLeft">Chef&apos;s</span>
          {" "}
          <span className="heroTitleWord heroTitleWordRight">Choice</span>
        </h1>

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
