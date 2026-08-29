import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { encodeTemplate } from '../src/utils/templates.js';

const { publishKind10002 } = vi.hoisted(() => ({
  publishKind10002: vi.fn().mockResolvedValue({
    event: { id: 'signed-event' },
    results: [{ url: 'wss://relay.example', success: true }],
    blastResults: [],
    userResults: [{ url: 'wss://relay.example', success: true }],
  }),
}));

vi.mock('../src/hooks/useNostr.js', () => ({
  default: () => ({
    pubkey: 'a'.repeat(64),
    isConnected: true,
    disconnect: vi.fn(),
    publishKind10002,
    publishKind10063: vi.fn(),
    publishKind10050: vi.fn(),
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
    expect(screen.getByText('wss://relay.example')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /apply template/i }));

    expect(publishKind10002).toHaveBeenCalledWith(
      [{ url: 'wss://relay.example', read: true, write: true }],
      'a'.repeat(64)
    );
    expect(await screen.findByText(/template applied successfully/i)).toBeInTheDocument();
  });
});
