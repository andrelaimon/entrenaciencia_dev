import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Entrena con Ciencia — Entrenamiento Inteligente",
  description: "Transforma tu cuerpo con ciencia y eficiencia. Calcula tus calorías, accede a recursos gratuitos y comienza tu transformación hoy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-poppins)]">
        {children}
      </body>
    </html>
  );
}
