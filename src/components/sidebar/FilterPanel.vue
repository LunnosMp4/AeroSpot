<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark, RotateCcw } from '@lucide/vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import { STATUS_COLORS } from '@/services/map/layers'
import { LEGAL_STATUS_LABELS } from '@/services/regulation'
import { useFiltersStore } from '@/stores/filters.store'
import { useSpotsStore } from '@/stores/spots.store'
import {
  MAX_DRIVE_MIN,
  SPOT_CATEGORY_COLORS,
  SPOT_CATEGORY_LABELS,
  type LegalStatus,
  type SortBy,
  type SpotCategory,
} from '@/types'

const filters = useFiltersStore()
const spotsStore = useSpotsStore()

const categories = Object.keys(SPOT_CATEGORY_LABELS) as SpotCategory[]
const statuses: LegalStatus[] = ['clear', 'limited', 'prohibited', 'unknown']
const sorts: { value: SortBy; label: string }[] = [
  { value: 'driveTime', label: 'Trajet' },
  { value: 'distance', label: 'Distance' },
  { value: 'name', label: 'Nom' },
]

const driveLabel = computed({
  get: () => filters.criteria.maxDriveMin,
  set: (value: number) => filters.setMaxDrive(value),
})

function driveFormat(value: number): string {
  return value >= MAX_DRIVE_MIN ? '120+ min' : `${value} min`
}
</script>

<template>
  <div class="space-y-4 overflow-y-auto scrollbar-thin px-3.5 py-3.5">
    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="panel-title">Temps de trajet max</span>
        <span class="text-xs text-accent tabular-nums">{{ driveFormat(driveLabel) }}</span>
      </div>
      <RangeSlider
        v-model="driveLabel"
        :min="0"
        :max="MAX_DRIVE_MIN"
        :step="5"
        label="Temps de trajet maximum"
        :format="driveFormat"
      />
    </section>

    <section class="space-y-2">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-xs transition-colors"
        :class="
          filters.criteria.savedOnly
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-line/70 text-fg-muted hover:text-fg'
        "
        @click="filters.toggleSavedOnly()"
      >
        <span class="flex items-center gap-2">
          <Bookmark class="size-3.5" :class="filters.criteria.savedOnly ? 'fill-current' : ''" />
          Sauvegardés uniquement
        </span>
        <span class="tabular-nums">{{ spotsStore.savedCount }}</span>
      </button>
    </section>

    <section class="space-y-2">
      <span class="panel-title">Type de spot</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="chip"
          :class="filters.criteria.categories.includes(category) ? 'chip-on' : ''"
          :style="
            filters.criteria.categories.includes(category)
              ? {
                  color: SPOT_CATEGORY_COLORS[category],
                  borderColor: `color-mix(in srgb, ${SPOT_CATEGORY_COLORS[category]} 45%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${SPOT_CATEGORY_COLORS[category]} 14%, transparent)`,
                }
              : {}
          "
          @click="filters.toggleCategory(category)"
        >
          {{ SPOT_CATEGORY_LABELS[category] }}
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <span class="panel-title">Statut réglementaire</span>
      <div class="space-y-1.5">
        <button
          v-for="status in statuses"
          :key="status"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg border border-line/70 px-2.5 py-2.5 text-xs transition-colors sm:py-2"
          :class="
            filters.criteria.legalStatuses.includes(status)
              ? 'bg-white/[0.04] text-fg'
              : 'text-fg-subtle hover:bg-white/[0.02]'
          "
          @click="filters.toggleLegalStatus(status)"
        >
          <span
            class="size-2.5 rounded-full"
            :style="{
              backgroundColor: STATUS_COLORS[status],
              opacity: filters.criteria.legalStatuses.includes(status) ? 1 : 0.4,
            }"
          />
          {{ LEGAL_STATUS_LABELS[status] }}
          <span
            class="ml-auto size-1.5 rounded-full"
            :class="filters.criteria.legalStatuses.includes(status) ? 'bg-accent' : 'bg-transparent'"
          />
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <span class="panel-title">Trier par</span>
      <div class="grid grid-cols-3 gap-1 rounded-lg border border-line/70 p-1">
        <button
          v-for="sort in sorts"
          :key="sort.value"
          type="button"
          class="rounded-md py-1.5 text-xs transition-colors"
          :class="
            filters.criteria.sortBy === sort.value
              ? 'bg-accent/15 text-accent'
              : 'text-fg-muted hover:bg-white/5'
          "
          @click="filters.setSortBy(sort.value)"
        >
          {{ sort.label }}
        </button>
      </div>
    </section>

    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg border border-line/70 py-2 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
      @click="filters.reset()"
    >
      <RotateCcw class="size-3.5" />
      Réinitialiser les filtres
    </button>
  </div>
</template>

<style scoped>
.chip {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  padding: 0.3rem 0.7rem;
  font-size: 11px;
  color: var(--color-fg-muted);
  transition: all 0.15s ease;
}
.chip:hover {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
}
</style>
