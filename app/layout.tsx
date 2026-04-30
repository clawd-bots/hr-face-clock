import type { Metadata } from "next";
import localFont from "next/font/local";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const sofiaPro = localFont({
  variable: "--font-sofia-pro",
  display: "swap",
  src: [
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Light_Az.otf",          weight: "300", style: "normal" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Light_Italic_Az.otf",   weight: "300", style: "italic" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Regular_Az.otf",        weight: "400", style: "normal" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Regular_Italic_Az.otf", weight: "400", style: "italic" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Medium_Az.otf",         weight: "500", style: "normal" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Medium_Italic_Az.otf",  weight: "500", style: "italic" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Semi_Bold_Az.otf",      weight: "600", style: "normal" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Semi_Bold_Italic_Az.otf", weight: "600", style: "italic" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Bold_Az.otf",           weight: "700", style: "normal" },
    { path: "../public/fonts/sofia-pro/Sofia_Pro_Bold_Italic_Az.otf",    weight: "700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "&you HR",
  description: "Face recognition time tracking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sofiaPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
