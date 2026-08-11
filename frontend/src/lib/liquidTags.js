// Frontend counterpart to backend/services/devtoSync.js's cleanLiquidTags —
// duplicated rather than shared because the frontend and backend are separate
// deployables with no shared package set up. Keep the two in sync if either
// changes; there's no build-time link enforcing that here.
//
// dev.to's editor supports "Liquid tags" — its own embed/template syntax
// ({% card %}...{% endcard %}, {% cta url %}label{% endcta %}, {% youtube id %},
// {% embed url %}, etc.) that only renders into real widgets on dev.to itself.
// The backend already strips these out of synced posts before they ever reach
// the database, but the editor's preview renders whatever is currently typed
// or pasted into the textarea — bypassing that pipeline entirely — so pasting
// dev.to source into a new/edited post would still show raw, broken-looking
// `{% ... %}` text here. Applied only to the *preview* render, never to the
// textarea's own value: an author's literal input shouldn't be silently
// rewritten out from under them.
const LIQUID_URL_RE = /^https?:\/\/\S+$/;

export const cleanLiquidTags = (markdown = '') => {
  let result = markdown;
  let previous;
  do {
    previous = result;
    result = result.replace(
      // Args use a lazy match up to the literal `%}` rather than excluding `%`
      // outright — dev.to's own `cta` tags embed percent-encoded URLs (full of
      // `%XX` sequences) as their argument, which a `[^%]*` args pattern would
      // cut off at the first `%0A`/`%3A`/etc. Safe because percent-encoding
      // always follows `%` with a hex digit, never `}`, so a real `%}` can't
      // appear inside an encoded argument.
      /\{%\s*(\w+)([\s\S]*?)%\}([\s\S]*?)\{%\s*end\1\s*%\}/g,
      (_match, _name, argsRaw, inner) => {
        const arg = argsRaw.trim().split(/\s+/)[0];
        const content = inner.trim();
        return arg && LIQUID_URL_RE.test(arg) ? `[${content || arg}](${arg})` : content;
      }
    );
  } while (result !== previous);

  result = result.replace(/\{%\s*\w+([\s\S]*?)%\}/g, (_match, argsRaw) => {
    const arg = argsRaw.trim().split(/\s+/)[0];
    return arg && LIQUID_URL_RE.test(arg) ? `[Embedded content](${arg})` : '';
  });

  return result.replace(/\n{3,}/g, '\n\n').trim();
};
