import type { Metadata } from "next";
import "./globals.css";
import "./garden-design-system.css";
import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";

export const metadata: Metadata = {
  title: "Shayan's Digital Garden",
  description: "Notes, experiments, projects, and small things worth keeping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" id="top">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
