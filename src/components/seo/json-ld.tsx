/**
 * A structured-data block.
 *
 * `JSON.stringify` drops the `undefined` fields the builders leave behind, so
 * absent facts never reach the page as nulls. The `<` escape is the standard
 * guard against a title containing `</script>` closing the block early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
