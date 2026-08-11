"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  defaultGardenSettings,
  normalizeSettings,
  SETTINGS_EVENT,
  SETTINGS_KEY,
} from "../admin/settings";
import type { GardenSettings } from "../admin/types";

export function SiteHeader() {
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
    <header className="site-header">
      <div className="header-inner">
        <Link className="garden-title-link" href="/" aria-label={`${settings.headerName}'s garden, home`}>
          {settings.headerName}&apos;s Garden
        </Link>
        <nav className="header-section-menu" aria-label="Garden sections">
          {settings.categories.map((category) => {
            const href = `/${category.slug}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link className={active ? "header-section-active" : ""} href={href} key={category.id} aria-current={active ? "page" : undefined}>
                {category.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
