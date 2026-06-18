import { env } from "@/lib/env";
import type { QA } from "@/lib/faqs";

const URL = env.siteUrl;

export function JsonLd({ data }: { data: object | object[] }) {
  const arr = Array.isArray(data) ? data : [data];
  return (
    <>
      {arr.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Capto",
    url: URL,
    logo: `${URL}/icon-192.png`,
    sameAs: ["https://contles.com"],
    description: "AI captions for short-form video. Built and powered by Contles.",
  };
}

export function softwareAppLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Capto",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: URL,
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Pro", price: "6.99", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Ultra", price: "17.99", priceCurrency: "EUR" },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "212",
    },
    description:
      "Word-perfect AI captions for short-form video, drag, style and time on a real timeline, export with no watermark.",
  };
}

export function faqLd(faqs: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.text },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${URL}${it.path}`,
    })),
  };
}

export function articleLd(post: {
  title: string;
  description: string;
  slug: string;
  date: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author || "Capto" },
    publisher: { "@type": "Organization", name: "Capto", logo: { "@type": "ImageObject", url: `${URL}/icon-192.png` } },
    mainEntityOfPage: `${URL}/blog/${post.slug}`,
  };
}

export function howToLd(name: string, steps: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
  };
}
