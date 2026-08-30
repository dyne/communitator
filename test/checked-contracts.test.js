import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checked production contracts', () => {
  it('includes signer and apply modules without file-wide typecheck bypasses', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf8'));
    expect(config.include).toEqual(expect.arrayContaining(['src/hooks/useNostr.js', 'src/components/TemplateApplier.jsx']));
    for (const path of ['src/hooks/useNostr.js', 'src/components/TemplateApplier.jsx']) expect(readFileSync(resolve(process.cwd(), path), 'utf8')).not.toMatch(/@ts-nocheck/u);
  });
});
