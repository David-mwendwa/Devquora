// One source of truth for the strings that appear in <head>, in the prerendered
// pages, in the sitemap and on the social card. They were previously either
// absent or written into index.html by hand, which is how a site ends up
// telling Google one thing and Twitter another.
export const site = {
  name: 'Devquora',
  url: 'https://devquora.netlify.app',
  tagline: 'Developer writing worth reading',
  description:
    'A developer-focused blogging platform: markdown-first writing, code that looks like code, threaded discussion, and a reading feed with no algorithm in the way.',
  shortDescription: 'Markdown-first blogging for developers.',
  author: 'David Mwendwa',
  repo: 'https://github.com/David-mwendwa/Devquora',
  locale: 'en_US',
};

export default site;
