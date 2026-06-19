import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import { SmoothScroll } from "@/components/smooth-scroll";
import { GoogleAnalytics } from "@/components/marketing/google-analytics";
import "./globals.css";

const siteName = env.siteName;
const siteUrl = env.siteUrl;

const heroDescription =
  "The focused caption tool for short-form video. Word-level timing, lossless export, and no watermark. Captions are all we do.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Capto, the focused AI caption tool for short-form video", template: `%s · ${siteName}` },
  description: heroDescription,
  alternates: { canonical: "/" },
  keywords: [
    "AI captions",
    "AI subtitle generator",
    "video caption editor",
    "TikTok captions",
    "Instagram Reels captions",
    "YouTube Shorts captions",
    "Submagic alternative",
    "Captions.ai alternative",
    "VEED alternative",
    "Hormozi captions",
  ],
  openGraph: {
    type: "website",
    siteName,
    title: "Capto, the focused caption tool",
    description: heroDescription,
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Capto, the focused caption tool",
    description: heroDescription,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Pick currency from the visitor's TIMEZONE only (not language —
            plenty of EU users run en-US). Americas + US Pacific = USD, else EUR. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';var usd=/^America\\//.test(tz)||/^Pacific\\/(Honolulu|Pago_Pago|Midway|Guam|Saipan)/.test(tz);document.documentElement.setAttribute('data-cur',usd?'usd':'eur');}catch(e){document.documentElement.setAttribute('data-cur','eur');}})();",
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] antialiased">
        <SmoothScroll />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
