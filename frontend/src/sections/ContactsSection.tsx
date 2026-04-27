import {
  ChatIcon,
  ClockIcon,
  DeliveryIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon
} from "@/shared/ui/icons";
import type { ContactInfo } from "@/shared/model/restaurant";

export function ContactsSection({ contactInfo }: { contactInfo: ContactInfo }) {
  return (
    <section className="contactBand" id="contacts">
      <div className="sectionInner">
        <div className="contactHeader">
          <div>
            <span className="eyebrow">Контакты</span>
            <h2>Москва, Аминьевское шоссе, 6</h2>
            <p>
              Ресторан находится на 5 этаже МФК KVARTAL WEST. Работаем ежедневно
              с 10:00 до 23:00.
            </p>
          </div>
          <div className="contactActions">
            <a className="contactAction isPrimary" href={contactInfo.phoneHref}>
              <PhoneIcon />
              Позвонить
            </a>
            <a
              className="contactAction"
              href={contactInfo.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <ChatIcon />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="contactPanel">
          <div className="contactCards">
            <a className="contactCard" href={contactInfo.phoneHref}>
              <span className="contactIcon">
                <PhoneIcon />
              </span>
              <span>
                <small>Телефон</small>
                <strong>{contactInfo.phone}</strong>
              </span>
            </a>
            <a className="contactCard" href={`mailto:${contactInfo.email}`}>
              <span className="contactIcon">
                <MailIcon />
              </span>
              <span>
                <small>Почта</small>
                <strong>{contactInfo.email}</strong>
              </span>
            </a>
            <a
              className="contactCard"
              href={contactInfo.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="contactIcon">
                <MapPinIcon />
              </span>
              <span>
                <small>Адрес</small>
                <strong>{contactInfo.address}</strong>
              </span>
            </a>
            <div className="contactCard">
              <span className="contactIcon">
                <ClockIcon />
              </span>
              <span>
                <small>Ресторан</small>
                <strong>{contactInfo.hours}</strong>
              </span>
            </div>
            <div className="contactCard">
              <span className="contactIcon">
                <DeliveryIcon />
              </span>
              <span>
                <small>Доставка</small>
                <strong>{contactInfo.deliveryHours}</strong>
              </span>
            </div>
          </div>

          <div className="mapFrame">
            <iframe
              title="Chef's Choice на карте"
              src={contactInfo.mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              className="mapLink"
              href={contactInfo.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MapPinIcon />
              Открыть в Яндекс.Картах
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
