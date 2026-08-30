export type DestinationProvenance = Readonly<{ url: string; blast: boolean; template: boolean }>;
export type RelayResult = DestinationProvenance & Readonly<{ status: string; error?: string }>;
export type OperationEventResult = Readonly<{ event: Readonly<{ id?: string; kind: number }>; signer: Readonly<{ status: string; error?: string }>; results: readonly RelayResult[] }>;
export type OperationResult = Readonly<{ status: string; events: readonly OperationEventResult[]; completed: number; retry?: () => Promise<OperationResult> }>;
