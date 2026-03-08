import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { docsSource } from "@/lib/docs-source";

type PageParams = {
  slug?: string[];
};

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const page = docsSource.getPage(slug);

  if (!page) {
    notFound();
  }

  const MdxContent = page.data.body;

  return (
    <DocsPage
      breadcrumb={{ enabled: true }}
      footer={{ enabled: true }}
      tableOfContent={{
        enabled: true,
        footer: (
          <Link
            className="text-xs font-medium text-fd-muted-foreground underline underline-offset-4"
            href="/docs"
          >
            Back to docs home
          </Link>
        ),
      }}
      toc={page.data.toc}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MdxContent />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = docsSource.getPage(slug);

  if (!page) {
    notFound();
  }

  const path = slug && slug.length > 0 ? `/docs/${slug.join("/")}` : "/docs";

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: path,
    },
  };
}

export function generateStaticParams() {
  return docsSource.generateParams();
}
