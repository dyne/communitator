<template>
  <span class="dyne-brand" :class="variant">
    <img class="dyne-brand__mark" :src="withBase('/dyne-mark.svg')" alt="" />
    <img class="dyne-brand__logotype" :src="withBase('/dyne-logotype.svg')" alt="Dyne.org foundation" />
  </span>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'

defineProps<{
  variant?: 'nav' | 'doc'
}>()
</script>
