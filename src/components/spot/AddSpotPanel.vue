<script setup lang="ts">
import { reactive, ref } from 'vue'
import { MapPin, X } from '@lucide/vue'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { SPOT_CATEGORY_LABELS, type Coordinates, type SpotCategory } from '@/types'
import { formatCoordinates } from '@/utils/format'

const props = defineProps<{ coordinates: Coordinates }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const spotsStore = useSpotsStore()
const airspace = useAirspaceStore()
const ui = useUiStore()

const categories = Object.keys(SPOT_CATEGORY_LABELS) as SpotCategory[]
const form = reactive({
  name: '',
  category: 'bando' as SpotCategory,
  tags: '',
  description: '',
})
const saving = ref(false)

function cancel(): void {
  ui.setAddSpotMode(false)
  emit('close')
}

async function save(): Promise<void> {
  if (!form.name.trim()) {
    ui.pushToast('Donnez un nom à ce spot.', 'error')
    return
  }
  saving.value = true
  const spot = spotsStore.addUserSpot({
    name: form.name.trim(),
    category: form.category,
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    description: form.description.trim() || undefined,
    coordinates: props.coordinates,
  })
  ui.setAddSpotMode(false)
  await airspace.resolveForSpots([spot])
  void spotsStore.computeRoutes(true)
  ui.selectSpot(spot.id)
  ui.pushToast('Spot ajouté.', 'success')
  saving.value = false
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" @click="cancel" />
      <div
        class="glass relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        <header class="flex items-center justify-between border-b border-line/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <h2 class="text-base font-semibold text-fg">Nouveau spot</h2>
            <p class="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
              <MapPin class="size-3" />
              {{ formatCoordinates(coordinates) }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-fg-subtle transition-colors hover:bg-white/5 hover:text-fg sm:p-1.5"
            aria-label="Fermer"
            @click="cancel"
          >
            <X class="size-4" />
          </button>
        </header>

        <div class="space-y-3 overflow-y-auto scrollbar-thin px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <label class="block space-y-1">
            <span class="panel-title">Nom</span>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ex : Friche des Halles"
              class="w-full rounded-lg border border-line/80 bg-ink-850/70 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent/60 focus:outline-none"
            />
          </label>

          <label class="block space-y-1">
            <span class="panel-title">Catégorie</span>
            <select
              v-model="form.category"
              class="w-full rounded-lg border border-line/80 bg-ink-850/70 px-3 py-2 text-sm text-fg focus:border-accent/60 focus:outline-none"
            >
              <option v-for="category in categories" :key="category" :value="category">
                {{ SPOT_CATEGORY_LABELS[category] }}
              </option>
            </select>
          </label>

          <label class="block space-y-1">
            <span class="panel-title">Tags (séparés par des virgules)</span>
            <input
              v-model="form.tags"
              type="text"
              placeholder="urbex, lignes, couvert"
              class="w-full rounded-lg border border-line/80 bg-ink-850/70 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent/60 focus:outline-none"
            />
          </label>

          <label class="block space-y-1">
            <span class="panel-title">Description</span>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Accès, particularités, précautions…"
              class="w-full resize-none rounded-lg border border-line/80 bg-ink-850/70 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent/60 focus:outline-none"
            />
          </label>

          <div class="flex justify-end gap-2 border-t border-line/60 pt-3">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-xs text-fg-muted transition-colors hover:text-fg"
              @click="cancel"
            >
              Annuler
            </button>
            <button
              type="button"
              :disabled="saving"
              class="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              @click="save"
            >
              Enregistrer le spot
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
