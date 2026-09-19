<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle, MapPin, Search, X } from '@lucide/vue'
import { searchAddress, type AddressSuggestion } from '@/services/api/ban'
import { useDebounceFn } from '@/composables/useDebounce'
import { useHomeStore } from '@/stores/home.store'
import { useMapStore } from '@/stores/map.store'
import { useUiStore } from '@/stores/ui.store'

const homeStore = useHomeStore()
const mapStore = useMapStore()
const ui = useUiStore()

const query = ref('')
const suggestions = ref<AddressSuggestion[]>([])
const loading = ref(false)
const open = ref(false)

let controller: AbortController | null = null

function bias() {
  const instance = mapStore.map
  if (instance) {
    const center = instance.getCenter()
    return { lng: center.lng, lat: center.lat }
  }
  return homeStore.coordinates ?? undefined
}

async function runSearch(value: string): Promise<void> {
  const trimmed = value.trim()
  if (trimmed.length < 3) {
    suggestions.value = []
    loading.value = false
    return
  }
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    suggestions.value = await searchAddress(trimmed, {
      bias: bias(),
      limit: 6,
      signal: controller.signal,
    })
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') suggestions.value = []
  } finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn((value: string) => void runSearch(value), 280)

watch(query, (value) => {
  open.value = true
  debouncedSearch(value)
})

function flyTo(suggestion: AddressSuggestion): void {
  mapStore.flyTo(suggestion.coordinates, 14)
  query.value = ''
  open.value = false
  suggestions.value = []
}

async function setHome(suggestion: AddressSuggestion): Promise<void> {
  homeStore.setHome({
    coordinates: suggestion.coordinates,
    label: suggestion.label,
    postcode: suggestion.postcode,
    citycode: suggestion.citycode,
    context: suggestion.context,
    setAt: new Date().toISOString(),
  })
  mapStore.flyTo(suggestion.coordinates, 13)
  ui.pushToast('Base mise à jour.', 'success')
  query.value = ''
  open.value = false
  suggestions.value = []
}

function clear(): void {
  query.value = ''
  suggestions.value = []
  open.value = false
}

function onEnter(): void {
  if (suggestions.value[0]) flyTo(suggestions.value[0])
}
</script>

<template>
  <div class="relative">
    <div
      class="flex items-center gap-2 rounded-xl border border-line/80 bg-ink-850/70 px-3 transition-colors focus-within:border-accent/60"
    >
      <Search class="size-4 shrink-0 text-fg-subtle" />
      <input
        v-model="query"
        type="text"
        placeholder="Rechercher une adresse, une ville…"
        class="h-10 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
        autocomplete="off"
        @focus="open = true"
        @keydown.enter="onEnter"
        @keydown.esc="clear"
      />
      <LoaderCircle v-if="loading" class="size-3.5 shrink-0 animate-spin text-fg-subtle" />
      <button
        v-else-if="query"
        type="button"
        class="shrink-0 rounded-md p-0.5 text-fg-subtle transition-colors hover:text-fg"
        @click="clear"
      >
        <X class="size-3.5" />
      </button>
    </div>

    <div
      v-if="open && suggestions.length"
      class="glass absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl"
    >
      <ul class="max-h-72 overflow-y-auto scrollbar-thin py-1">
        <li v-for="suggestion in suggestions" :key="suggestion.id">
          <div
            class="group flex items-center gap-2 px-2.5 py-2 transition-colors hover:bg-white/5"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              @click="flyTo(suggestion)"
            >
              <MapPin class="size-3.5 shrink-0 text-fg-subtle" />
              <span class="min-w-0">
                <span class="block truncate text-sm text-fg">{{ suggestion.label }}</span>
                <span v-if="suggestion.context" class="block truncate text-[11px] text-fg-subtle">
                  {{ suggestion.context }}
                </span>
              </span>
            </button>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-line/70 px-2 py-1 text-[11px] text-fg-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
              title="Définir comme base"
              @click="setHome(suggestion)"
            >
              Base
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
