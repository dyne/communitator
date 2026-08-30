import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('browser security contract', () => {
  it('uses a static-host CSP without inline execution allowances', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toMatch(/Content-Security-Policy/); expect(html).toContain("script-src 'self'"); expect(html).toContain("style-src 'self'"); expect(html).toContain("connect-src 'self' wss:"); expect(html).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
  it('keeps the security policy explicit about host-only headers', () => {
    const policy = fs.readFileSync('SECURITY.md', 'utf8');
    expect(policy).toMatch(/frame-ancestors 'none'/); expect(policy).toMatch(/GitHub Pages cannot configure response headers/); expect(policy).toMatch(/Referrer-Policy: no-referrer/);
  });
  it('keeps Playwright browser specs outside Vitest discovery', () => {
    const config = fs.readFileSync('vitest.config.js', 'utf8');
    expect(config).toContain("include: ['test/**/*.{test,spec}.{js,jsx}']");
    expect(config).toContain("exclude: ['e2e/**']");
  });
});
