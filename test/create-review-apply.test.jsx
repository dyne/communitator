import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { encodeTemplate } from '../src/utils/templates.js';

const { applyTemplate } = vi.hoisted(() => ({
  applyTemplate: vi.fn().mockResolvedValue({ status: 'complete', events: [] }),
}));

vi.mock('../src/hooks/useNostr.js', () => ({
  default: () => ({
    pubkey: 'a'.repeat(64),
    isConnected: true,
    disconnect: vi.fn(),
    applyTemplate,
  }),
}));

import TemplateApplier from '../src/components/TemplateApplier.jsx';

describe('create-review-apply path', () => {
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
          <Route path="/apply/:encoded" element={<TemplateApplier setConnectedPubkey={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Review fixture')).toBeInTheDocument();
    expect(screen.getByText('wss://relay.example/')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /apply template/i }));

    expect(applyTemplate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Review fixture',
      relays: [{ url: 'wss://relay.example/', read: true, write: true }],
    }));
    expect(await screen.findByText(/template applied successfully/i)).toBeInTheDocument();
  });
});
