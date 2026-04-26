"use client";

import { useEffect, useState } from "react";

import { contactInfo } from "@/data/menu";
import { isOutsideWorkingHours } from "@/shared/lib/work-hours";
import { CloseIcon } from "@/shared/ui/icons";

export function ClosedHoursNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isOutsideWorkingHours());
  }, []);

  if (!isVisible) return null;

  return (
    <aside className="closedNotice" role="status" aria-live="polite">
      <button
        className="closedNoticeClose"
        type="button"
        onClick={() => setIsVisible(false)}
        aria-label="Закрыть уведомление о режиме работы"
      >
        <CloseIcon />
      </button>
      <span>Сейчас ресторан не работает</span>
      <strong>Работаем ежедневно с 10:00 до 23:00</strong>
      <p>Можно посмотреть меню заранее и связаться с нами в рабочее время.</p>
      <div>
        <a href={contactInfo.whatsapp} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a href={contactInfo.mapUrl} target="_blank" rel="noreferrer">
          Маршрут
        </a>
      </div>
    </aside>
  );
}
