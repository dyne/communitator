import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPaths = [
  '.github/workflows/app-quality.yml',
  '.github/workflows/deploy-docs.yml',
];

describe('workflow supply-chain policy', () => {
  it.each(workflowPaths)('pins every action in %s to a full commit SHA', (workflowPath) => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    for (const reference of workflow.matchAll(/^\s*uses:\s*[^@\s]+@([^\s#]+)/gm)) {
      expect(reference[1]).toMatch(/^[a-f0-9]{40}$/);
    }
  });

  it('keeps deployment credentials out of the docs build job', () => {
    const workflow = fs.readFileSync('.github/workflows/deploy-docs.yml', 'utf8');
    const buildStart = workflow.indexOf('  build:\n');
    const deployStart = workflow.indexOf('\n  deploy:\n');
    const buildSection = workflow.slice(buildStart, deployStart);
    const deploySection = workflow.slice(deployStart);
    expect(buildSection).not.toMatch(/pages:\s*write|id-token:\s*write/);
    expect(deploySection).toMatch(/pages:\s*write/);
    expect(deploySection).toMatch(/id-token:\s*write/);
  });

  it('scopes the application quality gate to application inputs', () => {
    const workflow = fs.readFileSync('.github/workflows/app-quality.yml', 'utf8');
    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(/package-lock\.json/);
    expect(workflow).toMatch(/npm audit --audit-level=high/);
    expect(workflow).toMatch(/src\/\*\*/);
    expect(workflow).toMatch(/vite\.config\.js/);
    expect(workflow).toMatch(/contents:\s*read/);
  });

  it('keeps the established documentation artifact output path', () => {
    const workflow = fs.readFileSync('.github/workflows/deploy-docs.yml', 'utf8');
    expect(workflow).toMatch(/BASE_PATH:\s*\/communitator\//);
    expect(workflow).toMatch(/path:\s*docs\/\.vitepress\/dist/);
  });
});
