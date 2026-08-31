export type RelayStatus = 'accepted' | 'rejected' | 'timeout' | 'network-error' | 'cancelled';
export type SignerStatus = 'not-requested' | 'signed' | 'rejected' | 'cancelled';
export type OperationStatus = 'complete' | 'partial' | 'failed' | 'cancelled';

export type TemplateRelay = Readonly<{
  url: string;
  read: boolean;
  write: boolean;
}>;

export type TemplateEndpoint = Readonly<{ url: string }>;

export type CanonicalTemplate = Readonly<{
  id?: string;
  name: string;
  description: string;
  relays: readonly TemplateRelay[];
  blossomServers: readonly TemplateEndpoint[];
  dmRelays: readonly TemplateEndpoint[];
  created_at?: number;
}>;

export type UnsignedNostrEvent = Readonly<{
  kind: number;
  created_at: number;
  tags: readonly (readonly string[])[];
  content: string;
}>;

export type SignedNostrEvent = UnsignedNostrEvent & Readonly<{
  id: string;
  sig: string;
  pubkey: string;
}>;

export type SignerAdapter = Readonly<{
  getPublicKey: () => Promise<string>;
  signEvent: (event: {
    kind: number;
    created_at: number;
    tags: string[][];
    content: string;
  }) => Promise<SignedNostrEvent>;
}>;

export type DestinationProvenance = Readonly<{
  url: string;
  blast: boolean;
  template: boolean;
}>;

export type DestinationInput = Readonly<{
  url: string;
  blast?: boolean;
  template?: boolean;
}>;

export type TransportResult = Readonly<{
  url: string;
  status: RelayStatus;
  error?: string;
}>;

export type RelayResult = DestinationProvenance & TransportResult;

export type SignerState = Readonly<{
  status: SignerStatus;
  error?: string;
}>;

export type OperationEventResult = Readonly<{
  event: SignedNostrEvent | UnsignedNostrEvent;
  signer: SignerState;
  results: readonly RelayResult[];
}>;

export type OperationResult = Readonly<{
  status: OperationStatus;
  events: readonly OperationEventResult[];
  completed: number;
  retry?: () => Promise<OperationResult>;
}>;

export type RelayPublisher = (
  url: string,
  event: SignedNostrEvent
) => Promise<TransportResult>;

export type NostrSession = Readonly<{
  pubkey: string | null;
  isConnected: boolean;
  error: string | null;
  isConnecting: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
  cancelOperation: () => void;
  applyTemplate: (template: CanonicalTemplate) => Promise<OperationResult>;
}>;
