import type { Metadata, Viewport } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import { getLocale } from "next-intl/server";
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
  title: { default: "Strelnica", template: "%s | Strelnica" },
  description: "Rezervačný systém strelnice",
  // Demo site with a fictional range: keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLocale();

  return (
    <html
      lang={lang}
      className={`${dmSans.variable} ${bebasNeue.variable} h-full dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("theme")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)] bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
