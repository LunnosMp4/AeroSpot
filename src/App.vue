<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { PanelLeftOpen, Plus } from '@lucide/vue'
import type { Coordinates, Spot } from '@/types'
import AddSpotPanel from '@/components/spot/AddSpotPanel.vue'
import AirspaceLegend from '@/components/airspace/AirspaceLegend.vue'
import LegalityInspector from '@/components/airspace/LegalityInspector.vue'
import MapCanvas from '@/components/layout/MapCanvas.vue'
import MapControls from '@/components/layout/MapControls.vue'
import Sidebar from '@/components/sidebar/Sidebar.vue'
import SpotDetailSheet from '@/components/spot/SpotDetailSheet.vue'
import Toasts from '@/components/ui/Toasts.vue'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { persistence } from '@/services/persistence'

const spotsStore = useSpotsStore()
const airspace = useAirspaceStore()
const homeStore = useHomeStore()
const ui = useUiStore()

const pendingCoordinates = ref<Coordinates | null>(null)
let legalityTimer: number | undefined

function onPickCoordinates(coordinates: Coordinates): void {
  pendingCoordinates.value = coordinates
}

function startAddSpot(): void {
  ui.setAddSpotMode(true)
  ui.pushToast('Cliquez sur la carte pour placer votre spot.', 'info')
}

function scheduleLegality(spots: Spot[]): void {
  if (legalityTimer) window.clearTimeout(legalityTimer)
  legalityTimer = window.setTimeout(() => {
    void airspace.resolveForSpots(spots)
  }, 400)
}

onMounted(async () => {
  spotsStore.loadSeed()
  await persistence.init()
  await spotsStore.initLibrary()
  void spotsStore.loadCatalog()
  if (homeStore.hasHome) void spotsStore.computeRoutes()
})

watch(
  () => [homeStore.home?.setAt, spotsStore.catalogCount, spotsStore.user.length] as const,
  () => void spotsStore.computeRoutes(),
)

watch(
  () => spotsStore.candidateSpots,
  (spots) => scheduleLegality(spots),
  { immediate: true },
)

watch(
  () => ui.selectedSpotId,
  (id) => {
    if (!id || airspace.bySpotId[id]) return
    const spot = spotsStore.spotById.get(id)
    if (spot) void airspace.resolveForSpots([spot])
  },
)
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-ink-950">
    <MapCanvas @pick-coordinates="onPickCoordinates" />

    <div class="pointer-events-none absolute inset-0">
      <Transition name="sidebar">
        <div
          v-if="ui.sidebarOpen"
          class="pointer-events-auto absolute inset-x-3 top-3 bottom-3 sm:right-auto sm:w-[364px]"
        >
          <Sidebar />
        </div>
      </Transition>

      <button
        v-if="!ui.sidebarOpen"
        type="button"
        class="glass-soft pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
        title="Ouvrir le panneau"
        @click="ui.toggleSidebar()"
      >
        <PanelLeftOpen class="size-4" />
        AeroSpot FPV
      </button>

      <div class="pointer-events-none absolute right-4 top-4">
        <MapControls />
      </div>

      <div
        class="pointer-events-none absolute bottom-16 left-3 flex flex-col items-start gap-2 sm:left-4 sm:max-w-[min(288px,calc(100vw-2rem))]"
      >
        <LegalityInspector />
        <AirspaceLegend />
      </div>

      <button
        type="button"
        class="glass-soft pointer-events-auto absolute bottom-16 right-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-fg transition-colors hover:text-accent"
        title="Ajouter un spot"
        @click="startAddSpot"
      >
        <Plus class="size-4" />
        Ajouter un spot
      </button>
    </div>

    <SpotDetailSheet />
    <AddSpotPanel
      v-if="pendingCoordinates"
      :coordinates="pendingCoordinates"
      @close="pendingCoordinates = null"
    />
    <Toasts />
  </div>
</template>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
