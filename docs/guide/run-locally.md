---
title: Run Communitator locally
description: Install, develop, and build the existing React application.
---

# Run Communitator locally

The interactive application remains a React and Vite project at the repository root. The documentation site in `docs/` has its own VitePress toolchain.

## Application prerequisites

- Node.js 18 or newer
- npm
- a NIP-07-compatible browser extension for signer testing
- HTTPS when exercising extension behavior

## Start the application

From the repository root:

```sh
npm install
npm run dev
```

Build the application with:

```sh
npm run build
```

The production application output is written to `dist/`.

## Start the documentation site

From `docs/`:

```sh
npm ci
npm run dev
```

Build and preview it with:

```sh
npm run build
npm run preview
```

The documentation output is written to `docs/.vitepress/dist/`.

## GitHub Pages base path

The documentation config reads `BASE_PATH`. Local development uses `/`; the deployment workflow builds with `/communitator/` so asset and navigation URLs work at the repository Pages path.
