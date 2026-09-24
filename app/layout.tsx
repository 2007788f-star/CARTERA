import RegisterSW from "./register-sw";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartera de préstamos",
  description: "Control privado de préstamos y pagos.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"><head><link rel="manifest" href="/manifest.webmanifest"/><meta name="theme-color" content="#0c2338"/></head>
      <body className="antialiased">{children}<RegisterSW/></body>
    </html>
  );
}
