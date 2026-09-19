<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark, Check, Copy, Gauge, House, Navigation, Trash, X } from '@lucide/vue'
import { useClipboard } from '@/composables/useClipboard'
import { STATUS_COLORS } from '@/services/map/layers'
import { LEGAL_STATUS_LABELS } from '@/services/regulation'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { SPOT_CATEGORY_COLORS, SPOT_CATEGORY_LABELS } from '@/types'
import {
  formatAltitude,
  formatCoordinates,
  formatDistanceKm,
  formatDurationMin,
} from '@/utils/format'

const spotsStore = useSpotsStore()
const ui = useUiStore()
const homeStore = useHomeStore()
const airspace = useAirspaceStore()
const { copy, copied } = useClipboard()

const spot = computed(() =>
  ui.selectedSpotId ? (spotsStore.spotById.get(ui.selectedSpotId) ?? null) : null,
)
const legality = computed(() =>
  ui.selectedSpotId ? (airspace.bySpotId[ui.selectedSpotId] ?? null) : null,
)
const statusColor = computed(() =>
  spot.value ? STATUS_COLORS[spot.value.legalStatus] : STATUS_COLORS.unknown,
)
const categoryColor = computed(() =>
  spot.value ? SPOT_CATEGORY_COLORS[spot.value.category] : SPOT_CATEGORY_COLORS.park,
)
const saved = computed(() => (spot.value ? spotsStore.isSaved(spot.value.id) : false))

function toggleSave(): void {
  if (spot.value) spotsStore.toggleSaved(spot.value.id)
}

function close(): void {
  ui.selectSpot(null)
}

function copyCoordinates(): void {
  if (spot.value) void copy(formatCoordinates(spot.value.coordinates))
}

function setAsHome(): void {
  if (!spot.value) return
  homeStore.setHome({
    coordinates: spot.value.coordinates,
    label: spot.value.name,
    setAt: new Date().toISOString(),
  })
  ui.pushToast('Base définie sur ce spot.', 'success')
  void spotsStore.computeRoutes()
}

function removeSpot(): void {
  if (!spot.value) return
  spotsStore.removeUserSpot(spot.value.id)
  close()
  ui.pushToast('Spot supprimé.', 'info')
}

function mapsLink(kind: 'google' | 'apple' | 'waze'): string {
  const coordinates = spot.value?.coordinates
  if (!coordinates) return '#'
  const { lat, lng } = coordinates
  if (kind === 'google') return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  if (kind === 'apple') return `https://maps.apple.com/?daddr=${lat},${lng}`
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="spot"
        class="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" @click="close" />

        <div
          class="glass relative z-10 max-h-[88vh] w-full overflow-y-auto scrollbar-thin rounded-t-2xl sm:max-w-md sm:rounded-2xl"
        >
          <header class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line/70 bg-ink-900/80 px-4 py-3 backdrop-blur">
            <div class="min-w-0">
              <h2 class="truncate text-base font-semibold text-fg">{{ spot.name }}</h2>
              <p v-if="spot.city" class="mt-0.5 text-xs text-fg-subtle">{{ spot.city }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-white/5 hover:text-fg"
              @click="close"
            >
              <X class="size-4" />
            </button>
          </header>

          <div class="space-y-4 px-4 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                :style="{
                  color: categoryColor,
                  backgroundColor: `color-mix(in srgb, ${categoryColor} 16%, transparent)`,
                }"
              >
                {{ SPOT_CATEGORY_LABELS[spot.category] }}
              </span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                :style="{
                  color: statusColor,
                  backgroundColor: `color-mix(in srgb, ${statusColor} 16%, transparent)`,
                }"
              >
                <Gauge class="size-3" />
                {{ LEGAL_STATUS_LABELS[spot.legalStatus] }}
              </span>
            </div>

            <p v-if="spot.description" class="text-sm leading-relaxed text-fg-muted">
              {{ spot.description }}
            </p>

            <div v-if="spot.route" class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-line/70 bg-white/[0.03] px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-fg-subtle">Trajet</p>
                <p class="mt-0.5 text-sm font-medium text-accent tabular-nums">
                  {{ formatDurationMin(spot.route.travelTimeMin) }}
                </p>
              </div>
              <div class="rounded-xl border border-line/70 bg-white/[0.03] px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-fg-subtle">Distance</p>
                <p class="mt-0.5 text-sm font-medium text-fg tabular-nums">
                  {{ formatDistanceKm(spot.route.distanceKm) }}
                </p>
              </div>
            </div>

            <div
              v-if="legality"
              class="rounded-xl border border-line/70 bg-white/[0.03] px-3 py-2.5"
            >
              <p class="text-[10px] uppercase tracking-wide text-fg-subtle">
                Hauteur autorisée
              </p>
              <p class="mt-0.5 text-sm font-medium" :style="{ color: statusColor }">
                {{ formatAltitude(legality.maxAltitudeM) }}
              </p>
              <ul v-if="legality.restrictions.length" class="mt-2 space-y-1">
                <li
                  v-for="restriction in legality.restrictions"
                  :key="restriction.id"
                  class="text-[11px] leading-relaxed text-fg-subtle"
                >
                  · {{ restriction.limite }}
                </li>
              </ul>
            </div>

            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl border border-line/70 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-accent/40"
              @click="copyCoordinates"
            >
              <span>
                <span class="block text-[10px] uppercase tracking-wide text-fg-subtle">
                  Coordonnées
                </span>
                <span class="mt-0.5 block font-mono text-xs text-fg">
                  {{ formatCoordinates(spot.coordinates) }}
                </span>
              </span>
              <component :is="copied ? Check : Copy" class="size-4 shrink-0" :class="copied ? 'text-ok' : 'text-fg-subtle'" />
            </button>

            <div v-if="spot.tags.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in spot.tags"
                :key="tag"
                class="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-fg-subtle"
              >
                {{ tag }}
              </span>
            </div>

            <div class="space-y-2">
              <p class="panel-title">Itinéraire</p>
              <div class="grid grid-cols-3 gap-2">
                <a
                  v-for="link in [
                    { kind: 'google', label: 'Google' },
                    { kind: 'apple', label: 'Apple' },
                    { kind: 'waze', label: 'Waze' },
                  ] as const"
                  :key="link.kind"
                  :href="mapsLink(link.kind)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-1.5 rounded-lg border border-line/70 py-2 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <Navigation class="size-3.5" />
                  {{ link.label }}
                </a>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-line/60 pt-3">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors"
                :class="
                  saved
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-line/70 text-fg-muted hover:border-accent/50 hover:text-accent'
                "
                @click="toggleSave"
              >
                <Bookmark class="size-3.5" :class="saved ? 'fill-current' : ''" />
                {{ saved ? 'Sauvegardé' : 'Sauvegarder' }}
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-line/70 px-3 py-2 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent"
                @click="setAsHome"
              >
                <House class="size-3.5" />
                Définir comme base
              </button>
              <button
                v-if="spot.source === 'user'"
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-line/70 px-3 py-2 text-xs text-fg-muted transition-colors hover:border-danger/50 hover:text-danger"
                @click="removeSpot"
              >
                <Trash class="size-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-active .glass,
.sheet-leave-active .glass {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .glass,
.sheet-leave-to .glass {
  transform: translateY(16px) scale(0.98);
}
</style>
