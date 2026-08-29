import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDevHttps } from '../vite.config.js';

/** @type {string[]} */
const temporaryPaths = [];

afterEach(() => {
  temporaryPaths.splice(0).forEach((temporaryPath) => {
    fs.rmSync(temporaryPath, { force: true });
  });
});

describe('local HTTPS configuration', () => {
  it('does not read certificates unless HTTPS is explicitly configured', () => {
    expect(resolveDevHttps({})).toBeUndefined();
  });

  it.each([
    { DEV_HTTPS_KEY_PATH: '/tmp/key.pem' },
    { DEV_HTTPS_CERT_PATH: '/tmp/cert.pem' },
  ])('rejects partial HTTPS configuration', (environment) => {
    expect(() => resolveDevHttps(environment)).toThrow(
      'Local HTTPS requires both DEV_HTTPS_KEY_PATH and DEV_HTTPS_CERT_PATH.'
    );
  });

  it('reads only the two caller-supplied certificate paths', () => {
    const keyPath = path.join(os.tmpdir(), `communitator-${crypto.randomUUID()}.key`);
    const certPath = path.join(os.tmpdir(), `communitator-${crypto.randomUUID()}.cert`);
    temporaryPaths.push(keyPath, certPath);
    fs.writeFileSync(keyPath, 'private-key-fixture');
    fs.writeFileSync(certPath, 'certificate-fixture');

    expect(resolveDevHttps({ DEV_HTTPS_KEY_PATH: keyPath, DEV_HTTPS_CERT_PATH: certPath }))
      .toEqual({ key: Buffer.from('private-key-fixture'), cert: Buffer.from('certificate-fixture') });
  });
});
