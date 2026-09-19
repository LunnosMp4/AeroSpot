<script setup lang="ts">
import { List, PanelLeftClose, SlidersHorizontal, Sparkles } from '@lucide/vue'
import type { SidebarPanel } from '@/stores/ui.store'
import { useUiStore } from '@/stores/ui.store'
import FilterPanel from './FilterPanel.vue'
import HomeBaseWidget from './HomeBaseWidget.vue'
import PluginsPanel from './PluginsPanel.vue'
import SearchBar from './SearchBar.vue'
import SpotList from './SpotList.vue'

const ui = useUiStore()

const tabs: { id: SidebarPanel; label: string; icon: unknown }[] = [
  { id: 'spots', label: 'Spots', icon: List },
  { id: 'filters', label: 'Filtres', icon: SlidersHorizontal },
  { id: 'plugins', label: 'Modules', icon: Sparkles },
]
</script>

<template>
  <aside
    class="glass pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl"
  >
    <header class="flex items-center justify-between px-3.5 pt-3.5">
      <div class="flex items-center gap-2">
        <span class="relative flex size-6 items-center justify-center">
          <span class="absolute size-6 rounded-lg bg-accent/20" />
          <span class="absolute size-2.5 rounded-sm bg-accent" />
        </span>
        <div class="leading-none">
          <p class="text-sm font-semibold tracking-tight text-fg">AeroSpot</p>
          <p class="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-fg-subtle">FPV · FRANCE</p>
        </div>
      </div>
      <button
        type="button"
        class="rounded-lg p-2 text-fg-subtle transition-colors hover:bg-white/5 hover:text-fg sm:p-1.5"
        aria-label="Réduire le panneau"
        title="Réduire le panneau"
        @click="ui.toggleSidebar()"
      >
        <PanelLeftClose class="size-4" />
      </button>
    </header>

    <div class="space-y-2 px-3 pt-3">
      <SearchBar />
      <HomeBaseWidget />
    </div>

    <nav class="mt-3 flex gap-1 px-3">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors sm:py-2"
        :class="
          ui.activePanel === tab.id
            ? 'bg-white/[0.06] text-fg'
            : 'text-fg-subtle hover:bg-white/[0.03] hover:text-fg-muted'
        "
        @click="ui.setPanel(tab.id)"
      >
        <component :is="tab.icon" class="size-3.5" />
        {{ tab.label }}
      </button>
    </nav>

    <div class="mt-2 min-h-0 flex-1 border-t border-line/60">
      <SpotList v-if="ui.activePanel === 'spots'" />
      <FilterPanel v-else-if="ui.activePanel === 'filters'" />
      <PluginsPanel v-else-if="ui.activePanel === 'plugins'" />
    </div>
  </aside>
</template>
