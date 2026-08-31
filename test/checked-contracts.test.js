import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checked production contracts', () => {
  it('includes signer and apply modules without file-wide typecheck bypasses', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf8'));
    expect(config.include).toEqual(expect.arrayContaining(['src/hooks/useNostr.js', 'src/components/TemplateApplier.jsx']));
    const strictConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.contracts.json'), 'utf8'));
    expect(strictConfig.compilerOptions).toMatchObject({ noImplicitAny: true });
    expect(strictConfig.files).toEqual(expect.arrayContaining(['src/hooks/useNostr.js', 'src/components/TemplateApplier.jsx']));
    for (const path of ['src/hooks/useNostr.js', 'src/components/TemplateApplier.jsx']) expect(readFileSync(resolve(process.cwd(), path), 'utf8')).not.toMatch(/@ts-nocheck/u);
  });

  it('accepts valid operation literals and rejects invalid status drift at compile time', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'communitator-contract-'));
    const typeFile = resolve(process.cwd(), 'src/types/operation-result.d.ts');
    const typeImport = relative(directory, typeFile).split(sep).join('/').replace(/\.d\.ts$/u, '');
    const compiler = resolve(process.cwd(), 'node_modules/.bin/tsc');
    const compile = (source) => {
      const fixture = resolve(directory, 'fixture.ts');
      writeFileSync(fixture, `import type { OperationResult, RelayResult, SignerState, TransportResult } from '${typeImport}';\n${source}\n`);
      return spawnSync(compiler, ['--ignoreConfig', '--strict', '--noEmit', '--skipLibCheck', '--module', 'ESNext', '--moduleResolution', 'bundler', '--target', 'ES2022', fixture], { encoding: 'utf8' });
    };

    try {
      const valid = compile("const result: OperationResult = { status: 'complete', events: [], completed: 0 };");
      expect({ status: valid.status, output: `${valid.stdout}${valid.stderr}` }).toEqual({ status: 0, output: '' });
      const invalid = compile("const result: OperationResult = { status: 'success', events: [], completed: 0 };");
      expect(invalid.status).not.toBe(0);
      expect(`${invalid.stdout}${invalid.stderr}`).toMatch(/Type '"success"' is not assignable to type 'OperationStatus'/u);
      const invalidSigner = compile("const signer: SignerState = { status: 'approved' };");
      expect(`${invalidSigner.stdout}${invalidSigner.stderr}`).toMatch(/Type '"approved"' is not assignable to type 'SignerStatus'/u);
      const invalidRelay = compile("const relay: TransportResult = { url: 'wss://relay.example', status: 'sent' };");
      expect(`${invalidRelay.stdout}${invalidRelay.stderr}`).toMatch(/Type '"sent"' is not assignable to type 'RelayStatus'/u);
      const invalidShape = compile("const relay: RelayResult = { status: 'accepted', blast: true, template: false };");
      expect(`${invalidShape.stdout}${invalidShape.stderr}`).toMatch(/Property 'url' is missing/u);
      const mutated = compile("const result: OperationResult = { status: 'complete', events: [], completed: 0 }; result.status = 'failed';");
      expect(`${mutated.stdout}${mutated.stderr}`).toMatch(/Cannot assign to 'status' because it is a read-only property/u);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
