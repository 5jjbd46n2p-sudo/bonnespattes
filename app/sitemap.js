// sitemap.xml : pages publiques uniquement.
export default function sitemap() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!base) return [];
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
