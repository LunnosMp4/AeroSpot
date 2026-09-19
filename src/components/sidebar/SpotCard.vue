<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark, Gauge, MapPin, Zap } from '@lucide/vue'
import type { Spot } from '@/types'
import { SPOT_CATEGORY_COLORS, SPOT_CATEGORY_LABELS } from '@/types'
import { STATUS_COLORS } from '@/services/map/layers'
import { useSpotsStore } from '@/stores/spots.store'
import { formatDistanceKm, formatDurationMin } from '@/utils/format'

const props = defineProps<{ spot: Spot; selected?: boolean }>()
const emit = defineEmits<{ (e: 'select', id: string): void }>()

const spotsStore = useSpotsStore()

const categoryColor = computed(() => SPOT_CATEGORY_COLORS[props.spot.category])
const statusColor = computed(() => STATUS_COLORS[props.spot.legalStatus])
const route = computed(() => props.spot.route)
const saved = computed(() => spotsStore.isSaved(props.spot.id))

function ceilingLabel(): string {
  const value = props.spot.altitudeCeilingM
  if (value == null) return 'À vérifier'
  if (value <= 0) return 'Interdit'
  return `${value} m`
}

function select(): void {
  emit('select', props.spot.id)
}

function toggleSave(): void {
  spotsStore.toggleSaved(props.spot.id)
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group w-full cursor-pointer rounded-xl border p-3 text-left transition-colors"
    :class="
      selected
        ? 'border-accent/60 bg-accent/10'
        : 'border-line/70 bg-ink-850/40 hover:border-line hover:bg-ink-850/70'
    "
    @click="select"
    @keydown.enter="select"
    @keydown.space.prevent="select"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-fg">{{ spot.name }}</p>
        <p v-if="spot.city" class="mt-0.5 flex items-center gap-1 text-[11px] text-fg-subtle">
          <MapPin class="size-3" />
          {{ spot.city }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-medium"
          :style="{
            color: categoryColor,
            backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, transparent)`,
          }"
        >
          {{ SPOT_CATEGORY_LABELS[spot.category] }}
        </span>
        <button
          type="button"
          class="rounded-md p-1 transition-colors hover:bg-white/10"
          :class="saved ? 'text-accent' : 'text-fg-subtle hover:text-fg'"
          :title="saved ? 'Retirer des sauvegardés' : 'Sauvegarder ce spot'"
          @click.stop="toggleSave"
        >
          <Bookmark class="size-3.5" :class="saved ? 'fill-current' : ''" />
        </button>
      </div>
    </div>

    <div class="mt-2.5 flex items-center gap-3 text-xs">
      <span v-if="route" class="flex items-center gap-1 text-accent">
        <Zap class="size-3.5" />
        <span class="font-medium tabular-nums">{{ formatDurationMin(route.travelTimeMin) }}</span>
        <span class="text-fg-subtle">•</span>
        <span class="tabular-nums text-fg-muted">{{ formatDistanceKm(route.distanceKm) }}</span>
      </span>
      <span v-else class="text-fg-subtle">Itinéraire non calculé</span>

      <span class="ml-auto flex items-center gap-1" :style="{ color: statusColor }">
        <Gauge class="size-3.5" />
        <span class="tabular-nums">{{ ceilingLabel() }}</span>
      </span>
    </div>

    <div v-if="spot.tags.length" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="tag in spot.tags.slice(0, 3)"
        :key="tag"
        class="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-fg-subtle"
      >
        {{ tag }}
      </span>
    </div>
  </div>
</template>
