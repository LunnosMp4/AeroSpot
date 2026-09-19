<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { getPluginHost } from '@/plugins'
import { persistenceMode } from '@/services/persistence'
import { usePluginsStore } from '@/stores/plugins.store'

const store = usePluginsStore()
const plugins = getPluginHost().list()

async function toggle(id: string, value: boolean): Promise<void> {
  store.setEnabled(id, value)
  await getPluginHost().sync()
}
</script>

<template>
  <div class="space-y-3 overflow-y-auto scrollbar-thin px-3.5 py-3.5">
    <p class="flex items-center gap-2 panel-title">
      <Sparkles class="size-3.5 text-accent" />
      Modules
    </p>

    <ul class="space-y-2">
      <li
        v-for="plugin in plugins"
        :key="plugin.id"
        class="rounded-xl border border-line/70 bg-ink-850/40 p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-medium text-fg">{{ plugin.name }}</p>
            <p v-if="plugin.description" class="mt-0.5 text-[11px] leading-relaxed text-fg-subtle">
              {{ plugin.description }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="store.isEnabled(plugin.id)"
            :aria-label="`Activer ${plugin.name}`"
            class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors sm:h-5 sm:w-9"
            :class="
              store.isEnabled(plugin.id)
                ? 'border-accent/60 bg-accent/30'
                : 'border-line bg-ink-700'
            "
            @click="toggle(plugin.id, !store.isEnabled(plugin.id))"
          >
            <span
              class="absolute top-0.5 size-4 rounded-full transition-all sm:size-3.5"
              :class="
                store.isEnabled(plugin.id)
                  ? 'left-[22px] bg-accent sm:left-[18px]'
                  : 'left-0.5 bg-fg-subtle'
              "
            />
          </button>
        </div>
        <p class="mt-1.5 font-mono text-[10px] text-fg-subtle">v{{ plugin.version }}</p>
      </li>
    </ul>

    <p class="text-[11px] leading-relaxed text-fg-subtle">
      Les modules ajoutent des couches, des sources de spots ou des enrichissements sans modifier le
      cœur de l'application.
    </p>

    <p class="border-t border-line/60 pt-3 text-[11px] text-fg-subtle">
      Stockage :
      <span :class="persistenceMode === 'server' ? 'text-ok' : 'text-warn'">
        {{ persistenceMode === 'server' ? 'serveur partagé (multi-PC)' : 'navigateur uniquement' }}
      </span>
    </p>
  </div>
</template>
