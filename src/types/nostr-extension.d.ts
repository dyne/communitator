export {};

declare global {
  var nostr: import('./operation-result').SignerAdapter | undefined;

  interface Window {
    nostr?: import('./operation-result').SignerAdapter;
  }
}
