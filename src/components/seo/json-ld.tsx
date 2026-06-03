/**
 * Renders a JSON-LD <script> block. Server-safe (no client JS). Pass a single
 * schema object or an array of them. Used for Organization / WebSite (sitewide)
 * and SoftwareApplication / Offer (marketing pages).
 */
export function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <script
      type="application/ld+json"
      // Schema is built from our own trusted values, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
