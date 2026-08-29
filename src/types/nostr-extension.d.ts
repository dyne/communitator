interface Window {
  nostr?: {
    getPublicKey: () => Promise<string>;
    signEvent: (event: {
      kind: number;
      pubkey: string;
      created_at: number;
      tags: string[][];
      content: string;
    }) => Promise<{
      id: string;
      sig: string;
      kind: number;
      pubkey: string;
      created_at: number;
      tags: string[][];
      content: string;
    }>;
  };
}
