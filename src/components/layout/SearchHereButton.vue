<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle, Search } from '@lucide/vue'
import { DISCOVERY_RADIUS_KM, useSpotDiscovery } from '@/composables/useSpotDiscovery'

const discovery = useSpotDiscovery()

const loading = computed(() => discovery.loading.value)

const percent = computed(() => {
  const p = discovery.progress.value
  if (!p || p.total === 0) return 0
  return Math.min(100, Math.round((p.done / p.total) * 100))
})

const indeterminate = computed(() => !discovery.progress.value)

function search(): void {
  void discovery.discover()
}
</script>

<template>
  <button
    type="button"
    class="search-here glass-soft pointer-events-auto relative flex items-center gap-2 overflow-hidden rounded-full border border-accent/50 px-4 py-2.5 text-xs font-medium text-fg shadow-2xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent hover:text-accent active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:hover:translate-y-0"
    :class="{ 'is-searching': loading }"
    :disabled="loading"
    :title="`Chercher les spots dans un rayon de ${DISCOVERY_RADIUS_KM} km autour du centre de la carte`"
    @click="search"
  >
    <LoaderCircle v-if="loading" class="size-4 shrink-0 animate-spin" />
    <Search v-else class="size-4 shrink-0" />
    <span class="tabular-nums">{{ discovery.statusLabel.value }}</span>

    <span v-if="loading" class="progress-track" aria-hidden="true">
      <span
        class="progress-fill"
        :class="{ 'is-indeterminate': indeterminate }"
        :style="indeterminate ? undefined : { width: `${percent}%` }"
      />
    </span>
  </button>
</template>

<style scoped>
.search-here {
  backdrop-filter: blur(12px);
  will-change: transform, box-shadow;
}

.search-here.is-searching {
  animation: search-pulse 1.4s ease-in-out infinite;
}

@keyframes search-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 45%, transparent);
  }
  50% {
    box-shadow: 0 0 0 12px color-mix(in srgb, var(--color-accent) 0%, transparent);
  }
}

.progress-track {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 3px;
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  background: var(--color-accent);
  transition: width 0.25s ease;
}

.progress-fill.is-indeterminate {
  width: 40%;
  animation: progress-slide 1.1s ease-in-out infinite;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-here {
    transition: none;
  }
  .search-here.is-searching {
    animation: none;
  }
  .progress-fill.is-indeterminate {
    animation: none;
    width: 100%;
  }
}
</style>
