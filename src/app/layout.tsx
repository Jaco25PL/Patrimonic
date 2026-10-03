import type { Metadata, Viewport } from "next";
import { site } from "@/config/site";
import { NavigationTracker } from "@/components/NavigationTracker";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Toast } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", locale: "es_UY", siteName: site.name, title: `${site.name} · ${site.tagline}`, description: site.description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-UY">
      <body>
        {children}
        <Toast />
        <NavigationTracker />
        <ServiceWorker />
      </body>
    </html>
  );
}
