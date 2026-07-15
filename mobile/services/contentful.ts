import { createClient } from "contentful";

export type MobileBlogPost = {
  id: string;
  title: string;
  slug: string;
  author: string;
  publishDate: string;
  featuredImageUrl: string | null;
  excerpt: string;
  content: Record<string, unknown> | null;
  category: string;
};

function getClient() {
  const space = process.env.EXPO_PUBLIC_CONTENTFUL_SPACE_ID;
  const accessToken = process.env.EXPO_PUBLIC_CONTENTFUL_ACCESS_TOKEN;
  const environment =
    process.env.EXPO_PUBLIC_CONTENTFUL_ENVIRONMENT || "master";
  if (!space || !accessToken) {
    throw new Error("Contentful no configurado en la app móvil");
  }
  return createClient({ space, accessToken, environment });
}

function transformEntry(entry: {
  sys: { id: string };
  fields: Record<string, unknown>;
}): MobileBlogPost {
  const fields = entry.fields;
  const featuredImage = fields.featuredImage as
    | {
        fields?: {
          file?: { url?: string };
          title?: string;
        };
      }
    | undefined;
  const imageUrl = featuredImage?.fields?.file?.url
    ? `https:${featuredImage.fields.file.url}`
    : null;

  return {
    id: entry.sys.id,
    title: String(fields.title || ""),
    slug: String(fields.slug || ""),
    author: String(fields.author || ""),
    publishDate: String(fields.publishDate || ""),
    featuredImageUrl: imageUrl,
    excerpt: String(fields.excerpt || ""),
    content: (fields.content as Record<string, unknown>) || null,
    category: String(fields.category || ""),
  };
}

export async function fetchBlogPosts(limit = 20): Promise<MobileBlogPost[]> {
  const client = getClient();
  const response = await client.getEntries({
    content_type: "blog1",
    order: ["-fields.publishDate"],
    limit,
  });
  return response.items.map((item) =>
    transformEntry(item as { sys: { id: string }; fields: Record<string, unknown> }),
  );
}

export async function fetchBlogPostBySlug(
  slug: string,
): Promise<MobileBlogPost | null> {
  const client = getClient();
  const response = await client.getEntries({
    content_type: "blog1",
    "fields.slug": slug,
    limit: 1,
  });
  if (!response.items.length) return null;
  return transformEntry(
    response.items[0] as { sys: { id: string }; fields: Record<string, unknown> },
  );
}

/** Extrae texto plano aproximado del documento rich text de Contentful. */
export function richTextToPlain(content: Record<string, unknown> | null): string {
  if (!content || typeof content !== "object") return "";
  const chunks: string[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.nodeType === "text" && typeof n.value === "string") {
      chunks.push(n.value);
    }
    const contentArr = n.content;
    if (Array.isArray(contentArr)) {
      contentArr.forEach(walk);
    }
  };

  walk(content);
  return chunks.join("").replace(/\s+\n/g, "\n").trim();
}
