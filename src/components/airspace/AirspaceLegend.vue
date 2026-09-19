<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { DATASETS } from '@/services/config'
import { useSettingsStore } from '@/stores/settings.store'

const settings = useSettingsStore()
const open = ref(false)

const items = [
  { color: '#ef4444', label: 'Rouge — vol interdit (0 m)' },
  { color: '#f97316', label: 'Orange — hauteur réduite (30/50 m)' },
  { color: '#eab308', label: 'Jaune — restriction modérée (100 m)' },
  { color: '#22c55e', label: 'Vert / clair — plafond standard (120 m)' },
]
</script>

<template>
  <div v-if="settings.isLayerVisible('airspace')" class="glass-soft pointer-events-auto w-64 rounded-xl">
    <button
      type="button"
      class="flex w-full items-center justify-between px-3 py-2"
      @click="open = !open"
    >
      <span class="panel-title">Légende · Restrictions drone</span>
      <ChevronDown
        class="size-3.5 text-fg-subtle transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div v-if="open" class="space-y-2.5 border-t border-line/70 px-3 py-2.5">
      <img
        :src="DATASETS.droneLegend"
        alt="Légende officielle des restrictions drones DGAC"
        class="w-full rounded-md bg-white/90 p-1"
        loading="lazy"
      />
      <ul class="space-y-1.5 text-xs text-fg-muted">
        <li v-for="item in items" :key="item.label" class="flex items-center gap-2">
          <span class="size-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: item.color }" />
          {{ item.label }}
        </li>
      </ul>
      <p class="text-[10px] leading-relaxed text-fg-subtle">
        Source : DGAC · IGN Géoplateforme. Les restrictions temporaires ne sont pas couvertes —
        consultez sia.aviation-civile.gouv.fr.
      </p>
    </div>
  </div>
</template>
