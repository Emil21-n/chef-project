"use client";

import { useMemo, useRef, useState } from "react";

import type { MenuSection } from "@/shared/model/restaurant";

export function useMenuCatalog(menuSections: MenuSection[]) {
  const [activeSection, setActiveSection] = useState("all");
  const [query, setQuery] = useState("");
  const catalogRef = useRef<HTMLDivElement | null>(null);

  const displayedSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return menuSections
      .filter((section) => activeSection === "all" || section.id === activeSection)
      .map((section) => ({
        ...section,
        products: section.products
          .filter((product) => {
            if (!normalizedQuery) return true;
            return [product.name, product.description, section.title]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);
          })
          .map((product) => ({ ...product, sectionTitle: section.title }))
      }))
      .filter((section) => section.products.length);
  }, [activeSection, query]);

  const displayedProducts = useMemo(
    () => displayedSections.flatMap((section) => section.products),
    [displayedSections]
  );

  const selectCategory = (id: string) => {
    setActiveSection(id);
    window.requestAnimationFrame(() => {
      const target = catalogRef.current;
      if (!target) return;

      const stickyOffset = window.innerWidth <= 560 ? 146 : window.innerWidth <= 820 ? 154 : 160;
      const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;

      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });
  };

  return {
    activeSection,
    catalogRef,
    displayedProducts,
    displayedSections,
    query,
    selectCategory,
    setQuery
  };
}
