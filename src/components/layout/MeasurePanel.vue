<script setup lang="ts">
import { Ruler, RotateCcw, X } from '@lucide/vue'
import { useMeasureStore } from '@/stores/measure.store'
import { formatCoordinates, formatDistanceKm } from '@/utils/format'

const measure = useMeasureStore()
</script>

<template>
  <div
    v-if="measure.enabled"
    class="glass pointer-events-auto w-[calc(100vw-1.5rem)] max-w-full rounded-2xl sm:w-72"
  >
    <header class="flex items-center justify-between border-b border-line/70 px-3.5 py-2.5">
      <div class="flex items-center gap-2 text-accent">
        <Ruler class="size-3.5" />
        <span class="panel-title !text-accent">Mesure de distance</span>
      </div>
      <button
        type="button"
        class="rounded-md p-1.5 text-fg-subtle transition-colors hover:text-fg sm:p-0.5"
        aria-label="Fermer la mesure"
        title="Fermer"
        @click="measure.setEnabled(false)"
      >
        <X class="size-3.5" />
      </button>
    </header>

    <div class="space-y-3 px-3.5 py-3">
      <p v-if="!measure.points.length" class="text-xs leading-relaxed text-fg-muted">
        Cliquez sur la carte pour placer le point de départ.
      </p>
      <p v-else-if="!measure.complete" class="text-xs leading-relaxed text-fg-muted">
        Cliquez sur la carte pour placer le point d'arrivée.
      </p>

      <div v-if="measure.complete" class="space-y-1">
        <p class="panel-title">Distance</p>
        <p class="text-2xl font-semibold tabular-nums text-fg">
          {{ formatDistanceKm(measure.distanceKm) }}
        </p>
      </div>

      <ul v-if="measure.points.length" class="space-y-1.5">
        <li
          v-for="(point, index) in measure.points"
          :key="index"
          class="flex items-center gap-2 text-[11px] text-fg-subtle"
        >
          <span
            class="flex size-4 shrink-0 items-center justify-center rounded-full border border-accent text-[9px] font-medium text-accent"
          >
            {{ index + 1 }}
          </span>
          <span class="font-mono">{{ formatCoordinates(point) }}</span>
        </li>
      </ul>

      <button
        v-if="measure.points.length"
        type="button"
        class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line/70 bg-white/[0.03] px-2.5 py-2 text-xs text-fg-muted transition-colors hover:text-fg"
        @click="measure.reset()"
      >
        <RotateCcw class="size-3.5" />
        Réinitialiser
      </button>
    </div>
  </div>
</template>
