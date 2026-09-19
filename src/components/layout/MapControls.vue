<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Compass,
  Crosshair,
  Layers,
  LocateFixed,
  LoaderCircle,
  Moon,
  Route,
  Satellite,
  ShieldAlert,
  Sun,
} from '@lucide/vue'
import { getPluginHost } from '@/plugins'
import { BASEMAP_ORDER } from '@/services/map/mapProvider'
import { useGeolocation } from '@/composables/useGeolocation'
import { useMapStore } from '@/stores/map.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore } from '@/stores/ui.store'

const mapStore = useMapStore()
const settings = useSettingsStore()
const ui = useUiStore()
const { locate, loading } = useGeolocation()
const geolocating = ref(false)

const layerDefs = computed(() =>
  getPluginHost()
    .layers.all()
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
)

const LAYER_ICONS: Record<string, unknown> = {
  airspace: ShieldAlert,
  isochrone: Route,
}

const BASEMAPS: Record<string, { label: string; icon: unknown }> = {
  dark: { label: 'Sombre', icon: Moon },
  light: { label: 'Clair', icon: Sun },
  satellite: { label: 'Satellite', icon: Satellite },
}

const basemapIcon = computed(() => BASEMAPS[settings.basemap]?.icon ?? Moon)
const basemapLabel = computed(() => BASEMAPS[settings.basemap]?.label ?? 'Fond de carte')

function layerIcon(id: string): unknown {
  return LAYER_ICONS[id] ?? Layers
}

async function onLocate(): Promise<void> {
  geolocating.value = true
  const coordinates = await locate()
  geolocating.value = false
  if (coordinates) {
    mapStore.flyTo(coordinates, 13)
  } else {
    ui.pushToast('Position indisponible.', 'error')
  }
}

function cycleBasemap(): void {
  const index = BASEMAP_ORDER.indexOf(settings.basemap)
  const next = BASEMAP_ORDER[(index + 1) % BASEMAP_ORDER.length]
  settings.setBasemap(next)
}
</script>

<template>
  <div class="glass-soft pointer-events-auto flex flex-col overflow-hidden rounded-xl">
    <button
      type="button"
      class="ctrl-btn"
      title="Recentrer le nord"
      @click="mapStore.resetNorth()"
    >
      <Compass class="size-4" />
    </button>

    <button
      type="button"
      class="ctrl-btn"
      :title="`Fond de carte : ${basemapLabel}`"
      @click="cycleBasemap"
    >
      <component :is="basemapIcon" class="size-4" />
    </button>

    <button
      type="button"
      class="ctrl-btn"
      :disabled="geolocating || loading"
      title="Ma position"
      @click="onLocate"
    >
      <LoaderCircle v-if="geolocating || loading" class="size-4 animate-spin" />
      <LocateFixed v-else class="size-4" />
    </button>

    <span class="mx-2 my-0.5 h-px bg-line" />

    <button
      v-for="def in layerDefs"
      :key="def.id"
      type="button"
      class="ctrl-btn"
      :class="settings.isLayerVisible(def.id, def.defaultVisible ?? true) ? 'text-accent' : 'text-fg-subtle'"
      :title="def.label"
      @click="settings.toggleLayer(def.id, def.defaultVisible ?? true)"
    >
      <component :is="layerIcon(def.id)" class="size-4" />
    </button>

    <span class="mx-2 my-0.5 h-px bg-line" />

    <button
      type="button"
      class="ctrl-btn"
      :class="ui.inspectorEnabled ? 'text-accent' : 'text-fg-subtle'"
      title="Inspecteur de légalité"
      @click="ui.toggleInspector()"
    >
      <Crosshair class="size-4" />
    </button>
  </div>
</template>

<style scoped>
.ctrl-btn {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  color: var(--color-fg-muted);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.ctrl-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  color: var(--color-fg);
}

.ctrl-btn:disabled {
  opacity: 0.5;
}
</style>
