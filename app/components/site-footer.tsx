"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  defaultGardenSettings,
  normalizeSettings,
  SETTINGS_EVENT,
  SETTINGS_KEY,
} from "../admin/settings";
import type { GardenSettings } from "../admin/types";
import { PlantIcon } from "./plant-icon";

export function SiteFooter() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<GardenSettings>(defaultGardenSettings);

  useEffect(() => {
    const refresh = () => {
      const stored = window.localStorage.getItem(SETTINGS_KEY);
      try {
        setSettings(stored ? normalizeSettings(JSON.parse(stored)) : defaultGardenSettings);
      } catch {
        setSettings(defaultGardenSettings);
      }
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <PlantIcon />
        <p><b>PLANTED BY {settings.headerName.toUpperCase()}</b><small>Keep planting. Keep growing.</small></p>
      </div>
      <p className="site-footer-note">© 2026 {settings.headerName}&apos;s Garden<br />Built with curiosity</p>
    </footer>
  );
}
