import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// dev.to authors often drop raw HTML into markdown for things GFM can't do —
// most commonly `<p align="center"><img ... width="…"></p>` for a centered,
// sized image. react-markdown v10 strips raw HTML by default (it renders as
// plain escaped text), so without rehype-raw that block just vanishes/shows
// as text instead of the image. Since this HTML comes from an external,
// untrusted source (synced dev.to content, or pasted into the editor), it's
// paired with rehype-sanitize rather than rendered as-is — extending the
// default allowlist just enough for the presentational attributes dev.to
// actually uses (align/width/height), not opening it up to scripts, event
// handlers, or iframes.
//
// Shared by PostView (reading) and Editor (write/preview) so the two never
// drift apart — a post edited here should look the same as it does published.
const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), 'width', 'height', 'align'],
    p: [...(defaultSchema.attributes?.p ?? []), 'align'],
    div: [...(defaultSchema.attributes?.div ?? []), 'align'],
  },
};

export const markdownRehypePlugins = [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]];
