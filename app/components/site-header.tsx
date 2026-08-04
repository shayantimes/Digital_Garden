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
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        try {
          setSettings(normalizeSettings(JSON.parse(stored)));
        } catch {
          window.localStorage.removeItem(SETTINGS_KEY);
        }
      }
    }, 0);
    const onSettingsChange = (event: Event) => {
      if (event instanceof CustomEvent) setSettings(normalizeSettings(event.detail));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY && event.newValue) {
        try {
          setSettings(normalizeSettings(JSON.parse(event.newValue)));
        } catch {
          return;
        }
      }
    };
    window.addEventListener(SETTINGS_EVENT, onSettingsChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SETTINGS_EVENT, onSettingsChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const navigation = [
    { href: "/", label: settings.headerName },
    ...settings.categories.map((category) => ({ href: `/${category.slug}`, label: category.label })),
  ];

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="site-nav">
      <nav className="nav-links" aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={pathname === item.href ? "nav-active" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="social-links" aria-label="Elsewhere">
        <a href="#cv">CV</a>
        <a href="#github">GitHub</a>
        <a href="#twitter">Twitter</a>
        <a href="#instagram">Instagram</a>
        <a href="#linkedin">LinkedIn</a>
      </nav>
    </header>
  );
}
