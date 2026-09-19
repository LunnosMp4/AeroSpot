<script setup lang="ts">
import { computed } from 'vue'
import { House, LoaderCircle, LocateFixed, RefreshCw, X } from '@lucide/vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useHomeStore } from '@/stores/home.store'
import { useMapStore } from '@/stores/map.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { formatCoordinates, formatDateTime } from '@/utils/format'

const homeStore = useHomeStore()
const mapStore = useMapStore()
const spotsStore = useSpotsStore()
const ui = useUiStore()
const { locate, loading: locating } = useGeolocation()

const home = computed(() => homeStore.home)

async function useMyPosition(): Promise<void> {
  const coordinates = await locate()
  if (!coordinates) {
    ui.pushToast('Position indisponible.', 'error')
    return
  }
  await homeStore.setHomeAtCoordinates(coordinates)
  mapStore.flyTo(coordinates, 12)
  ui.pushToast('Base définie sur votre position.', 'success')
  void spotsStore.computeRoutes()
}

function clear(): void {
  homeStore.clearHome()
  spotsStore.clearRoutes()
  ui.pushToast('Base supprimée.', 'info')
}
</script>

<template>
  <section class="rounded-xl border border-line/70 bg-ink-850/50 p-3">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <House class="size-3.5 text-accent" />
        <span class="panel-title">Base de départ</span>
      </div>
      <LoaderCircle
        v-if="spotsStore.matrixLoading"
        class="size-3.5 animate-spin text-fg-subtle"
        title="Calcul des temps de trajet"
      />
    </div>

    <template v-if="home">
      <p class="text-sm font-medium text-fg">{{ home.label }}</p>
      <p class="mt-0.5 font-mono text-[11px] text-fg-subtle">
        {{ formatCoordinates(home.coordinates) }}
      </p>
      <p class="mt-0.5 text-[11px] text-fg-subtle">
        Définie le {{ formatDateTime(home.setAt) }}
      </p>

      <div class="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          class="action"
          :disabled="spotsStore.matrixLoading"
          @click="spotsStore.computeRoutes(true)"
        >
          <RefreshCw class="size-3.5" :class="spotsStore.matrixLoading ? 'animate-spin' : ''" />
          Recalculer
        </button>
        <button type="button" class="action" @click="useMyPosition">
          <LocateFixed class="size-3.5" :class="locating ? 'animate-pulse' : ''" />
          Ma position
        </button>
        <button
          type="button"
          class="action hover:!text-danger"
          @click="clear"
        >
          <X class="size-3.5" />
          Effacer
        </button>
      </div>

      <p v-if="spotsStore.matrixError" class="mt-2 text-[11px] text-danger">
        {{ spotsStore.matrixError }}
      </p>
    </template>

    <template v-else>
      <p class="text-xs leading-relaxed text-fg-muted">
        Définissez votre point de départ pour trier les spots par temps de trajet.
      </p>
      <div class="mt-2.5 flex flex-wrap gap-2">
        <button type="button" class="action !border-accent/50 !text-accent" @click="useMyPosition">
          <LocateFixed class="size-3.5" :class="locating ? 'animate-pulse' : ''" />
          Utiliser ma position
        </button>
      </div>
      <p class="mt-2 text-[11px] text-fg-subtle">
        Astuce : recherche une adresse, appui long (ou clic droit) sur la carte.
      </p>
    </template>
  </section>
</template>

<style scoped>
.action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  padding: 0.3rem 0.55rem;
  font-size: 11px;
  color: var(--color-fg-muted);
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}
.action:hover {
  color: var(--color-fg);
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.action:disabled {
  opacity: 0.5;
}

@media (pointer: coarse) {
  .action {
    padding: 0.5rem 0.7rem;
    font-size: 12px;
  }
}
</style>
