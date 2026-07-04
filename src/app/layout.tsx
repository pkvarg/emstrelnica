import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Strelnica",
  description: "Rezervačný systém strelnice",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: Promise<{ locale?: string }>;
}>) {
  const resolvedParams = params ? await params : {};
  const lang = resolvedParams.locale || "sk";

  return (
    <html
      lang={lang}
      className={`${dmSans.variable} ${bebasNeue.variable} h-full dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)] bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
