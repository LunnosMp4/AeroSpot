<script setup lang="ts">
import { computed } from 'vue'
import { Crosshair, LoaderCircle, TriangleAlert, X } from '@lucide/vue'
import { STATUS_COLORS } from '@/services/map/layers'
import { LEGAL_STATUS_LABELS } from '@/services/regulation'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useUiStore } from '@/stores/ui.store'
import { formatAltitude, formatCoordinates, formatDateTime } from '@/utils/format'

const airspace = useAirspaceStore()
const ui = useUiStore()

const result = computed(() => airspace.inspected)
const statusColor = computed(() =>
  result.value ? STATUS_COLORS[result.value.status] : STATUS_COLORS.unknown,
)

function close(): void {
  ui.setInspectorEnabled(false)
  airspace.clearInspection()
}
</script>

<template>
  <div
    v-if="ui.inspectorEnabled || result || airspace.inspectError"
    class="glass pointer-events-auto w-[calc(100vw-1.5rem)] max-w-full rounded-2xl sm:w-72"
  >
    <header class="flex items-center justify-between border-b border-line/70 px-3.5 py-2.5">
      <div class="flex items-center gap-2 text-accent">
        <Crosshair class="size-3.5" />
        <span class="panel-title !text-accent">Inspecteur de légalité</span>
      </div>
      <button
        type="button"
        class="rounded-md p-1.5 text-fg-subtle transition-colors hover:text-fg sm:p-0.5"
        aria-label="Fermer l'inspecteur"
        title="Fermer"
        @click="close"
      >
        <X class="size-3.5" />
      </button>
    </header>

    <div class="px-3.5 py-3">
      <div v-if="airspace.inspectLoading" class="flex items-center gap-2 text-sm text-fg-muted">
        <LoaderCircle class="size-4 animate-spin" />
        Analyse de la zone…
      </div>

      <div v-else-if="airspace.inspectError" class="flex items-start gap-2 text-sm text-danger">
        <TriangleAlert class="mt-0.5 size-4 shrink-0" />
        <span>{{ airspace.inspectError }}</span>
      </div>

      <div v-else-if="result" class="space-y-3">
        <div class="flex items-center justify-between">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            :style="{
              color: statusColor,
              backgroundColor: `color-mix(in srgb, ${statusColor} 16%, transparent)`,
            }"
          >
            <span class="size-1.5 rounded-full" :style="{ backgroundColor: statusColor }" />
            {{ LEGAL_STATUS_LABELS[result.status] }}
          </span>
          <span class="text-xs text-fg-subtle">Plafond</span>
        </div>

        <div class="flex items-baseline justify-between">
          <span class="text-2xl font-semibold tabular-nums text-fg">
            {{ formatAltitude(result.maxAltitudeM) }}
          </span>
          <span class="font-mono text-[11px] text-fg-subtle">
            {{ formatCoordinates(result.coordinates) }}
          </span>
        </div>

        <div v-if="result.restrictions.length" class="space-y-1.5">
          <p class="panel-title">Zones détectées</p>
          <ul class="space-y-1.5">
            <li
              v-for="restriction in result.restrictions"
              :key="restriction.id"
              class="rounded-lg border border-line/70 bg-white/[0.03] px-2.5 py-2 text-xs"
            >
              <p class="font-medium text-fg">{{ restriction.limite }}</p>
              <p v-if="restriction.remarque" class="mt-0.5 leading-relaxed text-fg-subtle">
                {{ restriction.remarque }}
              </p>
            </li>
          </ul>
        </div>
        <p v-else class="text-xs text-fg-muted">
          Aucune restriction permanente détectée à cet endroit.
        </p>

        <p class="text-[10px] text-fg-subtle">
          Vérifié le {{ formatDateTime(result.checkedAt) }} ·
          {{ result.source === 'openaip' ? 'OpenAIP (approximation)' : 'DGAC / IGN' }}
        </p>
      </div>

      <p v-else class="text-xs leading-relaxed text-fg-muted">
        Cliquez n'importe où sur la carte pour connaître la hauteur de vol autorisée à cet endroit.
      </p>
    </div>
  </div>
</template>
