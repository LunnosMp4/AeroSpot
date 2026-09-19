<script setup lang="ts">
import { computed, ref } from 'vue'
import { LoaderCircle, Search, SlidersHorizontal, Sparkles, Trash } from '@lucide/vue'
import { useSpotDiscovery } from '@/composables/useSpotDiscovery'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useFiltersStore } from '@/stores/filters.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import SpotCard from './SpotCard.vue'

const spotsStore = useSpotsStore()
const filters = useFiltersStore()
const airspace = useAirspaceStore()
const ui = useUiStore()
const discovery = useSpotDiscovery()

const radius = ref(25)

const hiddenProhibited = computed(() => {
  if (filters.criteria.legalStatuses.includes('prohibited')) return 0
  return spotsStore.candidateSpots.filter(
    (spot) => airspace.bySpotId[spot.id]?.status === 'prohibited',
  ).length
})

const query = computed({
  get: () => filters.criteria.query,
  set: (value: string) => filters.setQuery(value),
})

function onSelect(id: string): void {
  ui.selectSpot(id)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center gap-2 px-3 pt-3">
      <div
        class="flex flex-1 items-center gap-2 rounded-lg border border-line/80 bg-ink-850/70 px-2.5 transition-colors focus-within:border-accent/60"
      >
        <Search class="size-3.5 shrink-0 text-fg-subtle" />
        <input
          v-model="query"
          type="text"
          placeholder="Filtrer les spots…"
          class="h-10 w-full bg-transparent text-xs text-fg placeholder:text-fg-subtle focus:outline-none sm:h-8"
        />
      </div>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line/80 text-fg-muted transition-colors hover:border-accent/50 hover:text-accent sm:size-8"
        aria-label="Ouvrir les filtres"
        title="Filtres"
        @click="ui.setPanel('filters')"
      >
        <SlidersHorizontal class="size-3.5" />
      </button>
    </div>

    <div class="flex items-center gap-2 px-3 pt-2">
      <div
        class="flex flex-1 items-center gap-1.5 rounded-lg border border-line/80 bg-ink-850/70 px-2 py-1"
      >
        <Sparkles class="size-3.5 shrink-0 text-accent" />
        <select
          v-model.number="radius"
          class="h-8 w-full bg-transparent text-[11px] text-fg focus:outline-none sm:h-6"
          title="Rayon de recherche"
        >
          <option :value="10">Rayon 10 km</option>
          <option :value="25">Rayon 25 km</option>
          <option :value="50">Rayon 50 km</option>
          <option :value="100">Rayon 100 km</option>
        </select>
      </div>
      <button
        type="button"
        class="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-2.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50 sm:h-8"
        :disabled="discovery.loading.value"
        title="Chercher des spots autour de la base"
        @click="discovery.discover(radius)"
      >
        <LoaderCircle v-if="discovery.loading.value" class="size-3.5 animate-spin" />
        <Sparkles v-else class="size-3.5" />
        Découvrir
      </button>
      <button
        v-if="spotsStore.external.length"
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line/80 text-fg-subtle transition-colors hover:border-danger/50 hover:text-danger sm:size-8"
        aria-label="Effacer les spots OpenStreetMap"
        title="Effacer les spots OpenStreetMap"
        @click="discovery.clear()"
      >
        <Trash class="size-3.5" />
      </button>
    </div>

    <div class="flex items-center justify-between px-3 py-2">
      <span class="text-[11px] text-fg-subtle">
        {{ spotsStore.visibleSpots.length }} affichés
        <template v-if="spotsStore.totalCount > spotsStore.visibleSpots.length">
          · {{ spotsStore.totalCount.toLocaleString('fr-FR') }} au total
        </template>
        <template v-if="spotsStore.external.length">
          · {{ spotsStore.external.length }} OSM
        </template>
        <template v-if="hiddenProhibited > 0">
          · {{ hiddenProhibited }} en zone interdite masqués
        </template>
      </span>
      <span
        v-if="spotsStore.catalogLoading"
        class="flex items-center gap-1 text-[11px] text-fg-subtle"
      >
        <LoaderCircle class="size-3 animate-spin" />
        Catalogue…
      </span>
      <span
        v-else-if="airspace.legalityLoading"
        class="flex items-center gap-1 text-[11px] text-fg-subtle"
      >
        <LoaderCircle class="size-3 animate-spin" />
        Analyse…
      </span>
    </div>

    <div class="flex-1 space-y-2 overflow-y-auto scrollbar-thin px-3 pb-3">
      <SpotCard
        v-for="spot in spotsStore.visibleSpots"
        :key="spot.id"
        :spot="spot"
        :selected="spot.id === ui.selectedSpotId"
        @select="onSelect"
      />

      <p
        v-if="spotsStore.visibleSpots.length === 0"
        class="rounded-xl border border-dashed border-line/70 px-4 py-8 text-center text-xs leading-relaxed text-fg-subtle"
      >
        Aucun spot ne correspond à ces critères.<br />
        Utilisez « Découvrir » pour charger des spots OpenStreetMap ou élargissez les filtres.
      </p>
    </div>
  </div>
</template>
