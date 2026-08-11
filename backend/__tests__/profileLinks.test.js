import { normalizeGithub, normalizeUrl } from '../controllers/userController.js';

// The profile link fields are the one place in the API that rewrites what the
// user typed rather than storing or rejecting it, so the rewrite rules are
// worth pinning down.

describe('normalizeUrl', () => {
  test('keeps an absolute http(s) URL as typed', () => {
    expect(normalizeUrl('https://ada.dev/writing', 'Portfolio link')).toBe(
      'https://ada.dev/writing'
    );
    expect(normalizeUrl('http://ada.dev', 'Portfolio link')).toBe('http://ada.dev');
  });

  test('blank clears the field rather than storing an empty string', () => {
    expect(normalizeUrl('', 'Portfolio link')).toBeUndefined();
    expect(normalizeUrl('   ', 'Portfolio link')).toBeUndefined();
  });

  test('rejects a scheme-less host, and names the field in the message', () => {
    expect(() => normalizeUrl('ada.dev', 'Portfolio link')).toThrow(/Portfolio link/);
  });

  test('rejects a non-http scheme', () => {
    expect(() => normalizeUrl('javascript:alert(1)', 'Portfolio link')).toThrow();
    expect(() => normalizeUrl('ftp://ada.dev', 'Portfolio link')).toThrow();
  });
});

describe('normalizeGithub', () => {
  test('expands a bare handle', () => {
    expect(normalizeGithub('octocat')).toBe('https://github.com/octocat');
  });

  test('tolerates a leading @', () => {
    expect(normalizeGithub('@octocat')).toBe('https://github.com/octocat');
  });

  test('accepts hyphenated handles but not leading/trailing hyphens', () => {
    expect(normalizeGithub('ada-lovelace')).toBe('https://github.com/ada-lovelace');
    expect(() => normalizeGithub('-ada')).toThrow();
  });

  test('keeps a full GitHub URL', () => {
    expect(normalizeGithub('https://github.com/octocat')).toBe('https://github.com/octocat');
    expect(normalizeGithub('https://www.github.com/octocat')).toBe(
      'https://www.github.com/octocat'
    );
  });

  test('refuses a URL that is not GitHub — the label would be lying', () => {
    expect(() => normalizeGithub('https://gitlab.com/octocat')).toThrow(/github\.com/);
    expect(() => normalizeGithub('https://github.com.evil.example/octocat')).toThrow(/github\.com/);
  });

  test('blank clears the field', () => {
    expect(normalizeGithub('')).toBeUndefined();
    expect(normalizeGithub('  @  ')).toBeUndefined();
  });
});
