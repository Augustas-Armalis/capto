import Script from "next/script";
import { env } from "@/lib/env";

/**
 * Google Analytics 4. Renders nothing when NEXT_PUBLIC_GA_ID is unset, so the
 * app ships zero analytics weight by default. Server-rendered so the id never
 * leaks via a client-only env var (no `next.config` env wiring needed).
 */
export function GoogleAnalytics() {
  const id = env.gaId;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
