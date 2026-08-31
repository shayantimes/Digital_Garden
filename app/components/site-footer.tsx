"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { gardenSettings } from "../lib/garden-config";
import { PlantIcon } from "./plant-icon";

export function SiteFooter() {
  const pathname = usePathname();
  const settings = gardenSettings;

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <PlantIcon />
        <p><b>PLANTED BY {settings.headerName.toUpperCase()}</b><small>Keep planting. Keep growing.</small></p>
      </div>
      <p className="site-footer-note">© 2026 {settings.headerName}&apos;s Garden<small>A living archive, built with curiosity.</small></p>
      <Link className="site-footer-return" href="/"><span>RETURN TO</span>THE GARDEN ↑</Link>
    </footer>
  );
}
