import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chef's Choice - доставка турецкой кухни",
  description: "Оригинальные турецкие блюда с доставкой по Москве от 60 минут.",
  openGraph: {
    title: "Chef's Choice - доставка турецкой кухни",
    description: "Оригинальные турецкие блюда с доставкой по Москве от 60 минут.",
    type: "website",
    images: [
      "https://static.tildacdn.com/tild3934-3637-4534-a134-396566346331/photo.png"
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
