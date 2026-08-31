<script setup lang="ts">
const sourceUrl = 'https://github.com/dyne/communitator'

const channels = [
  { kind: '10002', name: 'Main relays', note: 'Inbox + outbox', tone: 'orange', spec: 'NIP-65', specUrl: 'https://github.com/nostr-protocol/nips/blob/master/65.md' },
  { kind: '10063', name: 'Blossom', note: 'Media servers', tone: 'green', spec: 'NIP-B7', specUrl: 'https://github.com/nostr-protocol/nips/blob/master/B7.md' },
  { kind: '10050', name: 'DM relays', note: 'Private messages', tone: 'gold', spec: 'NIP-17', specUrl: 'https://github.com/nostr-protocol/nips/blob/master/17.md' }
]

const steps = [
  { label: 'Patch', title: 'Set the route', copy: 'Choose the relays your community reads from and writes to, then add media and private-message destinations.' },
  { label: 'Print', title: 'Generate one link', copy: 'Communitator packages the complete settings as a portable URL—ready to publish in your welcome channel.' },
  { label: 'Transmit', title: 'Let members review', copy: 'A member sees every destination before connecting a NIP-07 signer and publishing the update.' }
]
</script>

<template>
  <div class="signal-home">
    <header class="signal-hero">
      <div class="signal-hero__copy">
        <h1>Put your Nostr community on the right relays.</h1>
        <p class="signal-hero__lede">
          Build one reviewable Nostr settings template for relays, media, and private messages. Share the link; your members choose when to sign.
        </p>
        <div class="signal-actions">
          <a class="signal-button signal-button--live" href="./guide/create-a-template">Read the leader guide</a>
          <a class="signal-button signal-button--quiet" :href="sourceUrl">Inspect the source</a>
        </div>
        <p class="signal-hero__note">No account layer. No hidden configuration. A compatible NIP-07 signer is required to apply a template.</p>
      </div>

      <figure class="routing-console" aria-labelledby="console-title">
        <figcaption id="console-title" class="routing-console__head">
          <span>Community route / illustrative</span>
          <span class="routing-console__clock">TX 03</span>
        </figcaption>
        <div class="routing-console__body">
          <div class="routing-console__channels">
            <div v-for="channel in channels" :key="channel.kind" class="channel-strip" :class="`channel-strip--${channel.tone}`">
              <span class="channel-strip__lamp" aria-hidden="true"></span>
              <a class="channel-strip__kind" :href="channel.specUrl" :aria-label="`Nostr event kind ${channel.kind}, defined by ${channel.spec}`">{{ channel.kind }}</a>
              <strong>{{ channel.name }}</strong>
              <small>{{ channel.note }}</small>
            </div>
          </div>
          <svg class="route-lines" viewBox="0 0 560 170" role="img" aria-label="Three Nostr settings events converge into a signed template and publish to community and blast relays.">
            <path class="route-lines__base" d="M18 28 H210 Q240 28 250 55 L275 85" />
            <path class="route-lines__base" d="M18 85 H275" />
            <path class="route-lines__base" d="M18 142 H210 Q240 142 250 115 L275 85" />
            <path class="route-lines__base" d="M275 85 H395" />
            <path class="route-lines__base" d="M395 85 Q425 85 438 57 L456 28 H542" />
            <path class="route-lines__base" d="M395 85 Q425 85 438 113 L456 142 H542" />
            <path class="route-lines__pulse" d="M18 85 H275 H395 Q425 85 438 57 L456 28 H542" />
            <circle cx="275" cy="85" r="19" />
            <circle cx="395" cy="85" r="8" />
            <text x="275" y="81" text-anchor="middle">NIP</text>
            <text x="275" y="93" text-anchor="middle">07</text>
            <text x="458" y="18">COMMUNITY</text>
            <text x="458" y="164">BLAST RELAYS</text>
          </svg>
          <div class="route-mobile" aria-label="Kinds 10002, 10063, and 10050 are signed through NIP-07 and published to community and blast relays.">
            <div class="route-mobile__sources">
              <a v-for="channel in channels" :key="channel.kind" :href="channel.specUrl" :aria-label="`Nostr event kind ${channel.kind}, defined by ${channel.spec}`"><code>{{ channel.kind }}</code></a>
            </div>
            <span aria-hidden="true">↓</span>
            <strong>NIP-07 signer</strong>
            <span aria-hidden="true">↓</span>
            <div class="route-mobile__destinations"><span>Community</span><span>Blast relays</span></div>
          </div>
          <div class="routing-console__footer">
            <span><i class="meter meter--green" aria-hidden="true"></i> Review</span>
            <span><i class="meter meter--orange" aria-hidden="true"></i> Sign</span>
            <span><i class="meter meter--gold" aria-hidden="true"></i> Publish</span>
          </div>
        </div>
      </figure>
    </header>

    <section class="leader-path" aria-labelledby="leader-path-title">
      <div class="section-heading">
        <h2 id="leader-path-title">Make one link do the explaining.</h2>
        <p>Your relay policy stays exact without turning the welcome message into a wall of protocol detail.</p>
      </div>
      <ol class="leader-path__steps">
        <li v-for="step in steps" :key="step.label">
          <span>{{ step.label }}</span>
          <div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.copy }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="event-log" aria-labelledby="event-log-title">
      <div class="event-log__intro">
        <h2 id="event-log-title">Three Nostr events. One deliberate hand-off.</h2>
        <p>These numbers are Nostr event-kind identifiers—not TCP ports or NIP numbers. A kind tells Nostr clients how to interpret a signed event; each row links to the specification that defines it.</p>
        <a href="./reference/event-kinds">Open the event reference <span aria-hidden="true">→</span></a>
      </div>
      <div class="event-log__table" role="table" aria-label="Nostr event kinds published by Communitator">
        <div class="event-log__row event-log__row--head" role="row">
          <span role="columnheader">Nostr event kind</span><span role="columnheader">Carries</span><span role="columnheader">Defined by</span>
        </div>
        <div v-for="channel in channels" :key="channel.kind" class="event-log__row" role="row">
          <a class="event-log__kind" :href="channel.specUrl" role="cell" :aria-label="`Read the specification for Nostr event kind ${channel.kind}`"><code>{{ channel.kind }}</code></a>
          <strong role="cell">{{ channel.name }}</strong>
          <a class="event-log__spec" :href="channel.specUrl" role="cell">{{ channel.spec }} <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>

    <section class="trust-strip" aria-labelledby="trust-title">
      <div>
        <h2 id="trust-title">The member keeps the final switch.</h2>
        <p>The shared link opens a readable preview first. Nothing is signed until the member connects their own NIP-07 extension and chooses to apply the template.</p>
      </div>
      <div class="trust-strip__sequence" aria-label="Review, connect, sign, and publish sequence">
        <span>Review</span><i aria-hidden="true"></i><span>Connect</span><i aria-hidden="true"></i><span>Sign</span><i aria-hidden="true"></i><span>Publish</span>
      </div>
    </section>

    <section class="final-call" aria-labelledby="final-call-title">
      <div>
        <h2 id="final-call-title">Ready to prepare the route?</h2>
        <p>Start with the leader guide, or inspect the implementation and community presets directly.</p>
      </div>
      <div class="signal-actions">
        <a class="signal-button signal-button--live" href="./guide/create-a-template">Read the leader guide</a>
        <a class="signal-button signal-button--quiet" :href="sourceUrl">Browse source</a>
      </div>
    </section>
  </div>
</template>
