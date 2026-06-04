import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import Script from "next/script";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { StructuredData } from "@/components/structured-data";
import { ThemeCustomizer, ThemeCustomizerInit } from "@/components/theme-customizer";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Press Start 2P — arcade chrome ONLY (wordmark, marquees, "insert coin"). Never body copy.
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  applicationName: siteConfig.name,
  manifest: "/site.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  other: {
    // Point LLMs / answer engines at the machine-readable index (llmstxt.org).
    "llms-txt": `${siteConfig.url}/llms.txt`,
  },
};

export const viewport: Viewport = {
  // CRT blue-black — matches favicon tile + manifest theme/background.
  themeColor: "#0d0e13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} antialiased`}
      >
        <StructuredData />
        {/* Umami — privacy-friendly, cookieless analytics. Loaded after hydration. */}
        <Script
          defer
          strategy="afterInteractive"
          src="https://cloud.umami.is/script.js"
          data-website-id="4d863adc-d357-4a78-83fe-4f94484c78e7"
        />
        <Providers>
          <ThemeCustomizerInit />
          <div className="flex min-h-svh flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
          <ThemeCustomizer />
        </Providers>
      </body>
    </html>
  );
}
