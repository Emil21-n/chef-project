"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

import { contactInfo } from "@/data/menu";
import { LOGO_URL } from "@/shared/constants/restaurant";
import { CartIcon, CloseIcon, MenuIcon } from "@/shared/ui/icons";

type SiteHeaderProps = {
  onCartOpen: () => void;
  totalItems: number;
};

export function SiteHeader({ onCartOpen, totalItems }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleNavigate = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className={`siteHeader ${mobileMenuOpen ? "isMenuOpen" : ""}`}>
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
          className="mobileNavOnly"
          href={contactInfo.phoneHref}
          onClick={() => setMobileMenuOpen(false)}
        >
          Позвонить
        </a>
        <a
          className="mobileNavOnly"
          href={contactInfo.whatsapp}
          onClick={() => setMobileMenuOpen(false)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
        <a
          className="mobileNavOnly"
          href={contactInfo.instagram}
          onClick={() => setMobileMenuOpen(false)}
          target="_blank"
          rel="noreferrer"
        >
          Instagram
        </a>
        <a
          className="mobileNavOnly"
          href={contactInfo.mapUrl}
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
  );
}
