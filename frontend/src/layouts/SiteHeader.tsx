"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import { LOGO_URL } from "@/shared/constants/restaurant";
import type { ContactInfo } from "@/shared/model/restaurant";
import { CartIcon, CloseIcon, MenuIcon } from "@/shared/ui/icons";

type SiteHeaderProps = {
  contactInfo: ContactInfo;
  onCartOpen: () => void;
  totalItems: number;
};

export function SiteHeader({ contactInfo, onCartOpen, totalItems }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleNavigate = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 10);

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <button
        className={`mobileMenuBackdrop ${mobileMenuOpen ? "isOpen" : ""}`}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setMobileMenuOpen(false)}
      />
      <header
        className={`siteHeader ${scrolled ? "isScrolled" : ""} ${
          mobileMenuOpen ? "isMenuOpen" : ""
        }`}
      >
      <a className="brand" href="#top" aria-label="Chef's Choice">
        <span className="brandLogoWrap">
          <img className="brandLogo" src={LOGO_URL} alt="" />
        </span>
        <span>
          <strong>Chef&apos;s Choice</strong>
          <small>Turkish kitchen</small>
        </span>
      </a>

      <nav className="topNav" aria-label="Основная навигация">
        <a href="#menu" onClick={handleNavigate("menu")}>
          Меню
        </a>
        <a href="#delivery" onClick={handleNavigate("delivery")}>
          Доставка
        </a>
        <a href="#contacts" onClick={handleNavigate("contacts")}>
          Контакты
        </a>
        <a
          href={contactInfo.mapUrl || "#contacts"}
          onClick={() => setMobileMenuOpen(false)}
          target="_blank"
          rel="noreferrer"
        >
          Маршрут
        </a>
      </nav>

      <div className="headerActions">
        <a className="phoneLink" href={contactInfo.phoneHref}>
          {contactInfo.phone}
        </a>
        <button className="iconButton cartButton" type="button" onClick={onCartOpen}>
          <CartIcon />
          <span className="cartCount" aria-label={`В корзине ${totalItems}`}>
            {totalItems}
          </span>
        </button>
        <button
          className="iconButton mobileMenuButton"
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      </header>
    </>
  );
}
