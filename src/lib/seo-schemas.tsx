const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.yashbogam.me";

const publisher = {
  "@type": "Organization",
  name: "TrustLoop",
  url: appUrl,
  logo: { "@type": "ImageObject", url: `${appUrl}/512.png` },
};

const author = {
  "@type": "Person",
  name: "TrustLoop Team",
  url: appUrl,
};

export function articleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: `${appUrl}${opts.path}`,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author,
    publisher,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${appUrl}${opts.path}` },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${appUrl}${item.path}`,
      })),
    ],
  };
}

export function SeoSchemas({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
