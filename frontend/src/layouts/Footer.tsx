"use client";

import type { MouseEvent } from "react";

import type { ContactInfo } from "@/shared/model/restaurant";

export function Footer({ contactInfo }: { contactInfo: ContactInfo }) {
  const handleNavigate = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="siteFooter">
      <div className="sectionInner footerGrid">
        <div>
          <strong>Chef&apos;s Choice</strong>
          <p>Оригинальная турецкая кухня, кебабы, стейки, выпечка и десерты.</p>
        </div>
        <div>
          <span>О компании</span>
          <a href="#top" onClick={handleNavigate("top")}>
            Главная
          </a>
          <a href="#contacts" onClick={handleNavigate("contacts")}>
            Контакты
          </a>
        </div>
        <div>
          <span>Соцсети</span>
          <a href={contactInfo.whatsapp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href={contactInfo.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
