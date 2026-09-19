<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { useIsMobile } from '@/composables/useMediaQuery'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { persistence } from '@/services/persistence'

const spotsStore = useSpotsStore()
const airspace = useAirspaceStore()
const homeStore = useHomeStore()
const ui = useUiStore()

const isMobile = useIsMobile()
watch(isMobile, (value) => ui.setMobile(value), { immediate: true })

const pendingCoordinates = ref<Coordinates | null>(null)
let legalityTimer: number | undefined

const inspectorVisible = computed(
  () => ui.inspectorEnabled || !!airspace.inspected || !!airspace.inspectError,
)

const hideFloating = computed(() => isMobile.value && ui.sidebarOpen)

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
      <Transition name="fade">
        <div
          v-if="isMobile && ui.sidebarOpen"
          class="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          @click="ui.closeSidebar()"
        />
      </Transition>

      <Transition name="sidebar">
        <div
          v-if="ui.sidebarOpen"
          class="pointer-events-auto absolute"
          :class="
            isMobile
              ? 'inset-0 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]'
              : 'inset-y-3 left-[max(0.75rem,env(safe-area-inset-left))] sm:w-[364px]'
          "
        >
          <Sidebar />
        </div>
      </Transition>

      <div class="absolute inset-0" :class="hideFloating ? 'hidden' : ''">
        <button
          v-if="!ui.sidebarOpen"
          type="button"
          aria-label="Ouvrir le panneau"
          class="glass-soft pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
          @click="ui.toggleSidebar()"
        >
          <PanelLeftOpen class="size-4" />
          AeroSpot FPV
        </button>

        <div
          class="pointer-events-none absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))]"
        >
          <MapControls />
        </div>

        <div
          class="pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] flex flex-col items-start gap-2 sm:bottom-16 sm:left-4 sm:max-w-[min(288px,calc(100vw-2rem))]"
        >
          <LegalityInspector />
          <AirspaceLegend v-show="!(isMobile && inspectorVisible)" />
        </div>

        <button
          v-show="!(isMobile && inspectorVisible)"
          type="button"
          aria-label="Ajouter un spot"
          class="glass-soft pointer-events-auto absolute flex items-center gap-2 rounded-xl font-medium text-fg transition-colors hover:text-accent"
          :class="
            isMobile
              ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] size-12 justify-center'
              : 'bottom-16 right-4 px-3.5 py-2.5 text-sm'
          "
          @click="startAddSpot"
        >
          <Plus :class="isMobile ? 'size-5' : 'size-4'" />
          <span v-if="!isMobile">Ajouter un spot</span>
        </button>
      </div>
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
  transform: translateY(12px);
}
@media (min-width: 768px) {
  .sidebar-enter-from,
  .sidebar-leave-to {
    transform: translateX(-12px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
