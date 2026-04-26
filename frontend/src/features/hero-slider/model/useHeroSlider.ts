"use client";

import { useEffect, useState } from "react";

export function useHeroSlider(slideCount: number, intervalMs = 4500) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (slideCount <= 1) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slideCount);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, slideCount]);

  return {
    activeSlide,
    setActiveSlide
  };
}
