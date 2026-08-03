import "server-only";

import nodemailer from "nodemailer";

import type { CheckoutOrder } from "@/features/checkout/model/types";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  recipient: string;
};

type MailErrorDetails = {
  name?: string;
  message: string;
  code?: string;
  command?: string;
  syscall?: string;
  errno?: string | number;
  address?: string;
  port?: number;
  responseCode?: number;
};

class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigurationError";
  }
}

function getMailConfig(): MailConfig {
  const host = process.env.SMTP_HOST?.trim();
  const rawPort = process.env.SMTP_PORT || "465";
  const port = Number(rawPort);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || user;
  const missing = [
    !host ? "SMTP_HOST" : "",
    !user ? "SMTP_USER" : "",
    !password ? "SMTP_PASSWORD" : "",
    !recipient ? "ORDER_NOTIFICATION_EMAIL" : ""
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new MailConfigurationError(
      `SMTP is not configured. Missing environment variables: ${missing.join(", ")}`
    );
  }

  if (!host || !user || !password || !recipient) {
    throw new MailConfigurationError("SMTP is not configured.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new MailConfigurationError(`SMTP_PORT must be a valid TCP port. Current value: ${rawPort}`);
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE !== "false",
    user,
    password,
    recipient
  };
}

export function getOrderEmailErrorDetails(error: unknown): MailErrorDetails {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const smtpError = error as Error & {
    code?: string;
    command?: string;
    syscall?: string;
    errno?: string | number;
    address?: string;
    port?: number;
    responseCode?: number;
  };

  return {
    name: smtpError.name,
    message: smtpError.message,
    code: smtpError.code,
    command: smtpError.command,
    syscall: smtpError.syscall,
    errno: smtpError.errno,
    address: smtpError.address,
    port: smtpError.port,
    responseCode: smtpError.responseCode
  };
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function getAddress(order: CheckoutOrder) {
  if (order.delivery.methodCode === "pickup") return "Самовывоз";

  const main = [order.delivery.street, order.delivery.house].filter(Boolean).join(", д. ");
  const details = [
    order.delivery.entrance ? `подъезд ${order.delivery.entrance}` : "",
    order.delivery.apartment ? `кв/оф ${order.delivery.apartment}` : "",
    order.delivery.floor ? `этаж ${order.delivery.floor}` : ""
  ].filter(Boolean);

  return [main, ...details].filter(Boolean).join(", ");
}

function getOptionText(order: CheckoutOrder, itemIndex: number) {
  return order.items[itemIndex].selectedOptions
    .map((option) => `${option.groupLabel}: ${option.optionLabel}`)
    .join(", ");
}

function buildText(order: CheckoutOrder) {
  const orderNumber = order.orderNumber || order.id;
  const items = order.items
    .map((item, index) => {
      const options = getOptionText(order, index);
      return [
        `${index + 1}. ${item.name} — ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.totalPrice)}`,
        options ? `   ${options}` : ""
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    `Новый заказ ${orderNumber}`,
    `Клиент: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Способ получения: ${order.delivery.methodLabel || order.delivery.method}`,
    `Адрес: ${getAddress(order)}`,
    `Время: ${order.deliveryTime}`,
    order.delivery.comment ? `Комментарий: ${order.delivery.comment}` : "",
    "Состав заказа:",
    items,
    `Итого: ${formatPrice(order.totalAmount)}`,
    "Оплата: оплачено онлайн через ЮKassa",
    `Создан: ${new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Moscow"
    }).format(new Date(order.createdAt))}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtml(order: CheckoutOrder) {
  const orderNumber = order.orderNumber || order.id;
  const rows = order.items
    .map((item, index) => {
      const options = getOptionText(order, index);

      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee">
            <strong style="color:#171717">${escapeHtml(item.name)}</strong>
            ${options ? `<div style="margin-top:4px;color:#777;font-size:13px">${escapeHtml(options)}</div>` : ""}
          </td>
          <td style="padding:14px 10px;border-bottom:1px solid #eee;text-align:center;white-space:nowrap">${item.quantity} × ${escapeHtml(formatPrice(item.price))}</td>
          <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;white-space:nowrap">${escapeHtml(formatPrice(item.totalPrice))}</td>
        </tr>`;
    })
    .join("");
  const detail = (label: string, value: string) => `
    <tr>
      <td style="padding:5px 14px 5px 0;color:#777;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:5px 0;color:#171717;font-weight:600">${escapeHtml(value || "—")}</td>
    </tr>`;

  return `<!doctype html>
  <html lang="ru">
    <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#171717">
      <div style="max-width:680px;margin:0 auto;padding:24px 12px">
        <div style="overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.08)">
          <div style="padding:28px;background:#171313;color:#fff">
            <div style="color:#ff4d4d;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Chef's Choice</div>
            <h1 style="margin:8px 0 0;font-size:26px">Новый заказ ${escapeHtml(orderNumber)}</h1>
          </div>
          <div style="padding:24px 28px">
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
              ${detail("Клиент", order.customer.name)}
              ${detail("Телефон", order.customer.phone)}
              ${detail("Email", order.customer.email)}
              ${detail("Получение", order.delivery.methodLabel || order.delivery.method)}
              ${detail("Адрес", getAddress(order))}
              ${detail("Время", order.deliveryTime)}
              ${order.delivery.comment ? detail("Комментарий", order.delivery.comment) : ""}
              ${detail("Оплата", "Оплачено онлайн через ЮKassa")}
            </table>

            <h2 style="margin:28px 0 4px;font-size:18px">Состав заказа</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
              ${rows}
              <tr>
                <td colspan="2" style="padding:18px 10px 0 0;text-align:right;font-size:16px">Итого</td>
                <td style="padding:18px 0 0;text-align:right;font-size:20px;font-weight:800;white-space:nowrap">${escapeHtml(formatPrice(order.totalAmount))}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendOrderEmail(order: CheckoutOrder) {
  const config = getMailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: config.user,
      pass: config.password
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });
  const orderNumber = order.orderNumber || order.id;
  const messageIdOrder = orderNumber.replace(/[^A-Za-z0-9._-]/g, "-");

  await transporter.sendMail({
    from: `"Chef's Choice" <${config.user}>`,
    to: config.recipient,
    messageId: `<order-${messageIdOrder}@chefschoice-turk.ru>`,
    subject: `Новый заказ ${orderNumber} на ${formatPrice(order.totalAmount)}`,
    text: buildText(order),
    html: buildHtml(order)
  });
}
