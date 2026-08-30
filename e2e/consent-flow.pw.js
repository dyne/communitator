import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { TEMPLATE_LIMITS } from '../src/utils/templates.js';

const encodeTemplate = (template) => Buffer.from(JSON.stringify({ v: 1, ...template })).toString('base64url');
const validTemplate = encodeTemplate({
  id: 'playwright',
  name: 'Browser fixture',
  description: 'Exercises all reviewed event kinds without a live relay.',
  relays: [
    { url: 'wss://relay.example', read: true, write: true },
    { url: 'wss://relay.damus.io', read: true, write: false },
  ],
  blossomServers: [{ url: 'https://media.example' }],
  dmRelays: [{ url: 'wss://dm.example' }],
});
const applyUrl = `/#/apply/${validTemplate}`;
const secondApplyUrl = `/#/apply/${encodeTemplate({
  id: 'second-playwright', name: 'Second browser fixture', description: 'Must require its own explicit approval.',
  relays: [{ url: 'wss://second-relay.example', read: true, write: true }], blossomServers: [], dmRelays: [],
})}`;
const secretKey = Uint8Array.from({ length: 32 }, (_, index) => index === 31 ? 1 : 0);
let externalRequests;

const browserFixture = ({ fixtureOptions: { relayMode = 'accepted', signingMode = 'immediate', rejectSigningAt = -1 }, pubkey }) => {
  const pendingSignatures = [];
  const state = { activeSockets: 0, closedSockets: 0, completedSignatures: 0, getPublicKeyCalls: 0, maxActiveSockets: 0, relayAttempts: {}, relayMode, sentEvents: [], signedKinds: [], socketsConstructed: 0 };
  globalThis.nostr = {
    getPublicKey: async () => { state.getPublicKeyCalls += 1; return pubkey; },
    signEvent: async (event) => {
      const signingIndex = state.signedKinds.length; state.signedKinds.push(event.kind);
      if (signingMode === 'deferred') await new Promise((resolve) => pendingSignatures.push(resolve));
      if (signingIndex === rejectSigningAt) throw new Error('<b>private signer detail</b>');
      state.completedSignatures += 1;
      return globalThis.__signEventForTest(event);
    },
  };
  globalThis.WebSocket = class FixtureWebSocket {
    constructor(url) { this.url = url; state.socketsConstructed += 1; state.activeSockets += 1; state.maxActiveSockets = Math.max(state.maxActiveSockets, state.activeSockets); queueMicrotask(() => this.onopen?.()); }
    send(payload) { const [, event] = JSON.parse(payload); state.sentEvents.push({ kind: event.kind, url: this.url }); if (state.relayMode === 'stalled') return; const key = `${event.kind}:${this.url}`; state.relayAttempts[key] = (state.relayAttempts[key] ?? 0) + 1; const accepted = state.relayMode === 'accepted' || (state.relayMode === 'partial' && event.kind !== 10050) || (state.relayMode === 'one-kind-one-url' && event.kind === 10002 && this.url.includes('relay.primal.net')); queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, accepted, accepted ? 'accepted' : 'fixture rejection']) })); }
    close() { if (this.closed) return; this.closed = true; state.activeSockets -= 1; state.closedSockets += 1; }
  };
  globalThis.__communitatorTest = { releaseSigning: () => pendingSignatures.splice(0).forEach((resolve) => resolve()), setRelayMode: (mode) => { state.relayMode = mode; }, state };
};
const installFixture = async (page, options) => {
  await page.exposeFunction('__signEventForTest', (event) => finalizeEvent(event, secretKey));
  await page.evaluate(browserFixture, { fixtureOptions: options, pubkey: getPublicKey(secretKey) });
};
const fixtureState = (page) => page.evaluate(() => structuredClone(globalThis.__communitatorTest.state));
const connectAndApply = async (page, options) => {
  await page.goto(applyUrl);
  await installFixture(page, options);
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await page.getByRole('button', { name: /apply template and publish/i }).click();
};

test.beforeEach(async ({ page }) => {
  externalRequests = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4401')) externalRequests.push(request.url());
  });
  await page.route('**/*', async (route) => route.request().url().startsWith('http://127.0.0.1:4401') ? route.continue() : route.abort());
});

test('malformed, oversized, and extension-missing paths never sign or publish', async ({ page }) => {
  await page.goto('/#/apply/not-a-template');
  await expect(page.getByRole('alert')).toContainText('invalid or unsupported');
  await page.goto(`/#/apply/${'a'.repeat(16 * 1024 + 1)}`);
  await expect(page.getByRole('alert')).toContainText('invalid or unsupported');
  await page.goto(applyUrl);
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await expect(page.getByText('Unable to connect the signer.')).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('enforced CSP blocks disallowed resource classes while permitting a mocked configured WSS relay', async ({ page }) => {
  let allowedWssRoutes = 0;
  await page.routeWebSocket('wss://relay.primal.net/**', (route) => {
    allowedWssRoutes += 1;
    route.onMessage(() => {});
  });
  await page.goto('/#/');

  const evidence = await page.evaluate(async () => {
    const violations = [];
    let resolveViolations;
    const allViolations = new Promise((resolve) => { resolveViolations = resolve; });
    const handler = (event) => {
      violations.push({ blockedURI: event.blockedURI, directive: event.effectiveDirective });
      if (violations.length === 4) resolveViolations();
    };
    document.addEventListener('securitypolicyviolation', handler);

    const fetchBlocked = fetch('http://blocked.invalid/csp-fetch').catch(() => {});
    const imageBlocked = new Promise((resolve) => {
      const image = new Image();
      image.onload = image.onerror = () => { image.remove(); resolve(); };
      image.src = 'http://blocked.invalid/csp-image';
      document.body.append(image);
    });
    const scriptBlocked = new Promise((resolve) => {
      const script = document.createElement('script');
      script.onload = script.onerror = () => { script.remove(); resolve(); };
      script.src = 'http://blocked.invalid/csp-script.js';
      document.body.append(script);
    });
    const websocketBlocked = new Promise((resolve) => {
      try {
        const socket = new WebSocket('ws://blocked.invalid/csp-websocket');
        socket.onopen = socket.onerror = socket.onclose = () => resolve();
      } catch {
        resolve();
      }
    });

    await Promise.all([fetchBlocked, imageBlocked, scriptBlocked, websocketBlocked, allViolations]);
    document.removeEventListener('securitypolicyviolation', handler);
    const allowedSocket = await new Promise((resolve, reject) => {
      const socket = new WebSocket('wss://relay.primal.net/csp-allowed');
      socket.onopen = () => resolve(socket);
      socket.onerror = () => reject(new Error('Configured WSS relay was blocked.'));
    });
    allowedSocket.close();
    return violations;
  });

  expect(evidence).toEqual(expect.arrayContaining([
    { blockedURI: 'http://blocked.invalid/csp-fetch', directive: 'connect-src' },
    { blockedURI: 'http://blocked.invalid/csp-image', directive: 'img-src' },
    { blockedURI: 'http://blocked.invalid/csp-script.js', directive: 'script-src-elem' },
    { blockedURI: 'ws://blocked.invalid/csp-websocket', directive: 'connect-src' },
  ]));
  expect(evidence).toHaveLength(4);
  expect(allowedWssRoutes).toBe(1);
});

test('explicit consent signs all kinds and publishes through the real operation with four sockets maximum', async ({ page }) => {
  await page.goto(applyUrl);
  await expect(page.getByRole('region', { name: 'Configured blast destinations (12)' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Template relay destinations (2)' })).toBeVisible();
  await installFixture(page, { relayMode: 'accepted' });
  expect((await fixtureState(page)).getPublicKeyCalls).toBe(0);

  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await expect(page.getByText(/Connected signer:/)).toBeVisible();
  expect((await fixtureState(page)).socketsConstructed).toBe(0);
  await page.getByRole('button', { name: /apply template and publish/i }).click();

  await expect(page.getByRole('heading', { name: 'Template applied successfully' })).toBeVisible();
  const state = await fixtureState(page);
  expect(state.signedKinds).toEqual([10002, 10063, 10050]);
  expect([...new Set(state.sentEvents.map(({ kind }) => kind))]).toEqual([10002, 10063, 10050]);
  expect(state.sentEvents).toHaveLength(39);
  expect(state.maxActiveSockets).toBeLessThanOrEqual(4);
  expect(state.activeSockets).toBe(0);
  expect(externalRequests).toEqual([]);
});

test('a rejected event kind produces a partial outcome with per-kind evidence', async ({ page }) => {
  await connectAndApply(page, { relayMode: 'partial' });
  await expect(page.getByRole('heading', { name: 'Template partially applied' })).toBeVisible();
  await expect(page.locator('.event-result').filter({ hasText: 'Kind 10050' })).toContainText('Accepted by 0 of 13 destinations.');
  const failed = page.locator('.event-result').filter({ hasText: 'Kind 10050' });
  await expect(failed).toContainText('configured blast');
  await expect(failed).toContainText('reviewed template');
  await expect(failed).toContainText('fixture rejection');
  const state = await fixtureState(page);
  expect(state.signedKinds).toEqual([10002, 10063, 10050]);
  expect(state.maxActiveSockets).toBeLessThanOrEqual(4);
  expect(state.activeSockets).toBe(0);
});

test('all relay rejections produce a failed outcome and retry action', async ({ page }) => {
  await connectAndApply(page, { relayMode: 'rejected' });
  await expect(page.getByRole('heading', { name: 'Template was not applied' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry failed destinations' })).toBeVisible();
  const state = await fixtureState(page);
  expect(state.sentEvents).toHaveLength(39);
  expect(state.maxActiveSockets).toBeLessThanOrEqual(4);
  expect(state.activeSockets).toBe(0);
});

test('successive retries retain merged results and contact only destinations still failing', async ({ page }) => {
  await connectAndApply(page, { relayMode: 'rejected' });
  await expect(page.getByRole('heading', { name: 'Template was not applied' })).toBeVisible();
  expect((await fixtureState(page)).sentEvents).toHaveLength(39);

  await page.evaluate(() => globalThis.__communitatorTest.setRelayMode('one-kind-one-url'));
  const firstRetry = page.getByRole('button', { name: 'Retry failed destinations' }); await firstRetry.focus(); await firstRetry.press('Enter');
  await expect(page.getByRole('heading', { name: 'Template partially applied' })).toBeVisible();
  expect((await fixtureState(page)).sentEvents).toHaveLength(78);

  await page.evaluate(() => globalThis.__communitatorTest.setRelayMode('accepted'));
  const secondRetry = page.getByRole('button', { name: 'Retry failed destinations' }); await secondRetry.focus(); await secondRetry.press('Space');
  await expect(page.getByRole('heading', { name: 'Template applied successfully' })).toBeVisible();
  const state = await fixtureState(page); expect(state.sentEvents).toHaveLength(116);
  expect(Object.values(state.relayAttempts).sort((a, b) => a - b)).toEqual([2, ...Array.from({ length: 38 }, () => 3)]);
  expect(state.signedKinds).toEqual([10002, 10063, 10050]);
});

for (const rejectSigningAt of [0, 1, 2]) {
  test(`signature rejection at position ${rejectSigningAt + 1} is a structured no-publication result`, async ({ page }) => {
    await connectAndApply(page, { rejectSigningAt });
    await expect(page.getByRole('heading', { name: 'Template was not applied' })).toBeVisible();
    const eventResults = page.locator('.event-result'); await expect(eventResults).toHaveCount(3);
    await expect(eventResults.nth(rejectSigningAt)).toContainText('Signer: Rejected. The signer declined or failed to sign this event.');
    expect(await page.getByText(/private signer detail/i).count()).toBe(0);
    expect((await fixtureState(page)).socketsConstructed).toBe(0);
  });
}

test('keyboard cancellation stops active and queued publication without leaking sockets', async ({ page }) => {
  await page.goto(applyUrl);
  await installFixture(page, { relayMode: 'stalled' });
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await page.getByRole('button', { name: /apply template and publish/i }).click();
  await expect.poll(async () => (await fixtureState(page)).activeSockets).toBe(4);
  const cancel = page.getByRole('button', { name: 'Cancel application' }); await cancel.focus(); await cancel.press('Enter');

  await expect(page.getByRole('heading', { name: 'Template application cancelled' })).toBeVisible();
  const state = await fixtureState(page);
  expect(state.maxActiveSockets).toBe(4);
  expect(state.activeSockets).toBe(0);
  expect(state.closedSockets).toBe(state.socketsConstructed);
});

test('route changes revoke an active reviewed apply before a new template can publish', async ({ page }) => {
  await page.goto(applyUrl);
  await installFixture(page, { relayMode: 'stalled' });
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await page.getByRole('button', { name: /apply template and publish/i }).click();
  await expect.poll(async () => (await fixtureState(page)).activeSockets).toBe(4);

  await page.evaluate((url) => { globalThis.location.hash = url.slice(1); }, secondApplyUrl);
  await expect(page.getByText('Second browser fixture')).toBeVisible();
  await expect.poll(async () => (await fixtureState(page)).activeSockets).toBe(0);
  expect(page.getByRole('button', { name: 'Retry failed destinations' })).toHaveCount(0);

  await page.getByRole('button', { name: /apply template and publish/i }).click();
  await expect.poll(async () => (await fixtureState(page)).signedKinds).toEqual([10002, 10063, 10050, 10002]);
  await expect.poll(async () => (await fixtureState(page)).activeSockets).toBe(4);
  await page.getByRole('button', { name: 'Cancel application' }).press('Space');
});

test('route changes remove failed-operation retry authority beneath a new preview', async ({ page }) => {
  await connectAndApply(page, { relayMode: 'rejected' });
  await expect(page.getByRole('heading', { name: 'Template was not applied' })).toBeVisible();
  const failedBeforeRouteChange = (await fixtureState(page)).sentEvents.length;
  await page.evaluate((url) => { globalThis.location.hash = url.slice(1); }, secondApplyUrl);
  await expect(page.getByText('Second browser fixture')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry failed destinations' })).toHaveCount(0);
  await page.waitForTimeout(100);
  expect((await fixtureState(page)).sentEvents).toHaveLength(failedBeforeRouteChange);
});

test('unmount during signing completes no publication sockets', async ({ page }) => {
  await page.goto(applyUrl);
  await installFixture(page, { signingMode: 'deferred' });
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await page.getByRole('button', { name: /apply template and publish/i }).click();
  await expect.poll(async () => (await fixtureState(page)).signedKinds).toEqual([10002]);
  await page.getByRole('link', { name: 'Create Template' }).click();
  await page.evaluate(() => globalThis.__communitatorTest.releaseSigning());
  await expect.poll(async () => (await fixtureState(page)).completedSignatures).toBe(1);
  expect((await fixtureState(page)).socketsConstructed).toBe(0);
});

test('disconnect during signing returns a cancelled per-kind result without publication', async ({ page }) => {
  await page.goto(applyUrl); await installFixture(page, { signingMode: 'deferred' });
  await page.getByRole('button', { name: 'Connect with extension' }).click();
  await page.getByRole('button', { name: /apply template and publish/i }).click();
  await expect.poll(async () => (await fixtureState(page)).signedKinds).toEqual([10002]);
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('heading', { name: 'Template application cancelled' })).toBeVisible();
  await expect(page.locator('.event-result')).toHaveCount(3);
  await expect(page.locator('.event-result')).toContainText(['Signer: Cancelled.', 'Signer: Cancelled.', 'Signer: Cancelled.']);
  expect((await fixtureState(page)).socketsConstructed).toBe(0);
  await page.evaluate(() => globalThis.__communitatorTest.releaseSigning());
});

test('creator validation and endpoint controls work from the keyboard', async ({ page }) => {
  await page.goto('/#/');
  const name = page.getByLabel('Template name', { exact: true }); const relay = page.getByLabel('relay endpoint 1', { exact: true });
  await expect(name).toHaveAttribute('required', ''); await expect(name).toHaveAttribute('maxlength', '80');
  await expect(relay).toHaveAttribute('required', ''); await expect(relay).toHaveAttribute('maxlength', '2048');
  await relay.fill(''); await relay.press('Tab'); await expect(relay).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Generate shareable template' }).click(); await expect(name).toBeFocused();
  await name.fill('Keyboard fixture'); await page.getByRole('button', { name: 'Generate shareable template' }).click(); await expect(relay).toBeFocused();
  await relay.fill('wss://corrected.example'); await expect(relay).not.toHaveAttribute('aria-invalid');

  const add = page.getByRole('button', { name: 'Add relay endpoint' }); await add.focus(); await add.press('Enter'); await expect(page.getByLabel('relay endpoint 2', { exact: true })).toBeVisible();
  const remove = page.getByRole('button', { name: 'Remove relay endpoint 2' }); await remove.focus(); await remove.press('Enter'); await expect(page.getByLabel('relay endpoint 2', { exact: true })).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'Hide Blossom servers (kind 10063)' }); await toggle.focus(); await toggle.press('Space'); await expect(page.getByRole('button', { name: 'Show Blossom servers (kind 10063)' })).toHaveAttribute('aria-expanded', 'false');
  expect(externalRequests).toEqual([]);
});

for (const { group, limit, key } of [
  { group: 'relay', limit: TEMPLATE_LIMITS.relays, key: 'Enter' },
  { group: 'blossom', limit: TEMPLATE_LIMITS.blossomServers, key: 'Space' },
  { group: 'dm', limit: TEMPLATE_LIMITS.dmRelays, key: 'Enter' },
]) {
  test(`keyboard ${group} creator limit announces and enforces the canonical maximum`, async ({ page }) => {
    await page.goto('/#/');
    const add = page.getByRole('button', { name: `Add ${group} endpoint` });
    for (let index = 2; index <= limit; index += 1) { await add.focus(); await add.press(key); }
    await expect(page.getByLabel(`${group} endpoint ${limit}`, { exact: true })).toBeVisible();
    await expect(add).toBeDisabled();
    await expect(add).toHaveAccessibleDescription(`${limit} of ${limit} endpoints configured. Maximum reached.`);
    const remove = page.getByRole('button', { name: `Remove ${group} endpoint ${limit}` }); await remove.focus(); await remove.press('Enter');
    await expect(add).toBeEnabled(); await add.focus(); await add.press(key);
    await expect(page.getByLabel(`${group} endpoint ${limit}`, { exact: true })).toBeVisible();
    expect(externalRequests).toEqual([]);
  });
}

test('review and consent surface has no serious or critical accessibility violations', async ({ browser }) => {
  const violations = [];
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4401${applyUrl}`);
    await installFixture(page, { relayMode: 'accepted' });
    await page.getByRole('button', { name: 'Connect with extension' }).click();
    const results = await new AxeBuilder({ page }).analyze();
    violations.push(...results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical').map((violation) => ({ colorScheme, id: violation.id, nodes: violation.nodes.map(({ target }) => target) })));
    await context.close();
  }
  expect(violations).toEqual([]);
});

const visualMatrix = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
].flatMap((viewport) => ['light', 'dark'].map((colorScheme) => ({ ...viewport, colorScheme, scale: 1 })));
const scaledMatrix = [
  { width: 390, height: 844, colorScheme: 'light', scale: 2 },
  { width: 1440, height: 1000, colorScheme: 'light', scale: 2 },
];

for (const scenario of [...visualMatrix, ...scaledMatrix]) {
  const label = `${scenario.width}x${scenario.height}-${scenario.colorScheme}-${scenario.scale === 2 ? 'font-200' : 'default'}`;
  test(`review remains usable at ${label}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.emulateMedia({ colorScheme: scenario.colorScheme });
    await page.goto(applyUrl);
    if (scenario.scale === 2) await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });

    await expect(page.getByRole('heading', { name: 'Publication destinations' })).toBeVisible();
    expect(await page.locator('html').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    const shortControls = await page.getByRole('button').evaluateAll((buttons) => buttons.filter((button) => button.getBoundingClientRect().height < 48).map((button) => button.textContent));
    expect(shortControls).toEqual([]);
    const screenshot = await page.screenshot({ animations: 'disabled', fullPage: true });
    await testInfo.attach(`consent-${label}`, { body: screenshot, contentType: 'image/png' });
  });
}
