import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BLAST_RELAYS, decodeTemplate, encodeTemplate } from '../src/utils/templates.js';

const { applyTemplate, cancelOperation } = vi.hoisted(() => ({
  applyTemplate: vi.fn().mockResolvedValue({ status: 'complete', events: [] }),
  cancelOperation: vi.fn(),
}));

vi.mock('../src/hooks/useNostr.js', () => ({
  default: () => ({
    pubkey: 'a'.repeat(64),
    isConnected: true,
    disconnect: vi.fn(),
    cancelOperation,
    applyTemplate,
  }),
}));

import TemplateApplier from '../src/components/TemplateApplier.jsx';
import TemplateCreator from '../src/components/TemplateCreator.jsx';
import PublishResults from '../src/components/PublishResults.jsx';

afterEach(() => cleanup());

describe('create-review-apply path', () => {
  it('exposes bounded required fields and per-row accessible validation', async () => {
    const user = userEvent.setup(); render(<TemplateCreator />);
    const name = screen.getByLabelText('Template name'); const relay = screen.getByLabelText('relay endpoint 1');
    expect(name).toBeRequired(); expect(name).toHaveAttribute('maxlength', '80');
    expect(relay).toBeRequired(); expect(relay).toHaveAttribute('maxlength', '2048');

    await user.clear(relay); await user.tab();
    expect(relay).toHaveAttribute('aria-invalid', 'true');
    expect(relay).toHaveAccessibleDescription(/secure WebSocket URL.*Enter a relay endpoint/i);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a relay endpoint.');

    await user.type(relay, 'wss://corrected.example');
    expect(relay).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Enter a relay endpoint.')).not.toBeInTheDocument();
  });

  it('focuses the first invalid field, then the canonical-boundary summary, and clears stale output after correction', async () => {
    const user = userEvent.setup(); render(<TemplateCreator />);
    const name = screen.getByLabelText('Template name'); const firstRelay = screen.getByLabelText('relay endpoint 1');
    await user.clear(firstRelay); await user.click(screen.getByRole('button', { name: 'Generate shareable template' }));
    await waitFor(() => expect(name).toHaveFocus());

    await user.type(name, 'Validation fixture'); await user.click(screen.getByRole('button', { name: 'Generate shareable template' }));
    await waitFor(() => expect(firstRelay).toHaveFocus());

    await user.type(firstRelay, 'wss://duplicate.example');
    await user.click(screen.getByRole('button', { name: 'Add relay endpoint' }));
    const secondRelay = screen.getByLabelText('relay endpoint 2'); await user.type(secondRelay, 'wss://duplicate.example');
    await user.click(screen.getByRole('button', { name: 'Generate shareable template' }));
    const summary = screen.getByRole('alert'); await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('Check the template name and endpoint values.');

    await user.clear(secondRelay); await user.type(secondRelay, 'wss://corrected.example');
    expect(summary).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate shareable template' }));
    expect(await screen.findByLabelText('Shareable template link')).toBeInTheDocument();
    await user.type(name, ' changed');
    expect(screen.queryByLabelText('Shareable template link')).not.toBeInTheDocument();
  });

  it('supports keyboard add, remove, and optional-group toggles', async () => {
    const user = userEvent.setup(); render(<TemplateCreator />);
    const addRelay = screen.getByRole('button', { name: 'Add relay endpoint' }); addRelay.focus(); await user.keyboard('{Enter}');
    expect(screen.getByLabelText('relay endpoint 2')).toBeInTheDocument();
    const removeRelay = screen.getByRole('button', { name: 'Remove relay endpoint 2' }); removeRelay.focus(); await user.keyboard('{Enter}');
    expect(screen.queryByLabelText('relay endpoint 2')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Hide Blossom servers (kind 10063)' }); toggle.focus(); await user.keyboard(' ');
    expect(screen.queryByLabelText('blossom endpoint 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Blossom servers (kind 10063)' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('strips reducer-only endpoint IDs before canonical link generation', async () => {
    const user = userEvent.setup();
    render(<TemplateCreator />);

    await user.type(screen.getByLabelText('Template name'), 'ID boundary fixture');
    await user.click(screen.getByRole('button', { name: 'Generate shareable template' }));

    const shareUrl = /** @type {HTMLInputElement} */ (await screen.findByLabelText('Shareable template link'));
    const template = decodeTemplate(shareUrl.value.split('/apply/')[1]);
    expect(Object.keys(template.relays[0])).toEqual(['url', 'read', 'write']);
    expect(Object.keys(template.blossomServers[0])).toEqual(['url']);
    expect(Object.keys(template.dmRelays[0])).toEqual(['url']);
  });

  it('shows decoded template details before applying through the injected publisher', async () => {
    const encoded = encodeTemplate({
      name: 'Review fixture',
      description: 'Visible before signer publication',
      relays: [{ url: 'wss://relay.example', read: true, write: true }],
      blossomServers: [],
      dmRelays: [],
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/apply/${encoded}`]}>
        <Routes>
          <Route path="/apply/:encoded" element={<TemplateApplier />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Review fixture')).toBeInTheDocument();
    expect(screen.getAllByText('wss://relay.example/')).toHaveLength(2);
    const blastDestinations = screen.getByRole('region', { name: `Configured blast destinations (${BLAST_RELAYS.length})` });
    const templateDestinations = screen.getByRole('region', { name: 'Template relay destinations (1)' });
    for (const { url } of BLAST_RELAYS) expect(within(blastDestinations).getByText(url)).toBeInTheDocument();
    expect(within(templateDestinations).getByText('wss://relay.example/')).toBeInTheDocument();
    expect(screen.getByText(/at most four relay connections are open across the whole operation/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /apply template/i }));

    expect(applyTemplate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Review fixture',
      relays: [{ url: 'wss://relay.example/', read: true, write: true }],
    }));
    expect(await screen.findByText(/template applied successfully/i)).toBeInTheDocument();
  });

  it('renders failed destination provenance and explanations as text', () => {
    render(<PublishResults applying={false} onRetry={vi.fn()} onReset={vi.fn()} results={{ status: 'partial', events: [{ event: { kind: 10002 }, signer: { status: 'signed' }, results: [
      { url: 'wss://blast.example/', blast: true, template: false, status: 'rejected', error: '<b>blast denial</b>' },
      { url: 'wss://template.example/', blast: false, template: true, status: 'timeout', error: 'Relay timed out.' },
      { url: 'wss://both.example/', blast: true, template: true, status: 'network-error', error: 'Relay connection failed.' },
    ] }] }} />);
    expect(screen.getAllByText(/configured blast/)).toHaveLength(2);
    expect(screen.getAllByText(/reviewed template/)).toHaveLength(2);
    expect(screen.getByText('wss://blast.example/').closest('li')).toHaveTextContent('<b>blast denial</b>');
    expect(document.querySelector('b')).toBeNull();
  });
});
