<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from '@lucide/vue'
import { useUiStore } from '@/stores/ui.store'
import type { Toast } from '@/stores/ui.store'

const ui = useUiStore()

const ICONS = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
} as const

const TONES: Record<Toast['kind'], string> = {
  info: 'text-fg-muted',
  success: 'text-ok',
  error: 'text-danger',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[max(5rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 sm:bottom-[max(1rem,env(safe-area-inset-bottom))]"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in ui.toasts"
        :key="toast.id"
        class="glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm shadow-lg"
      >
        <component :is="ICONS[toast.kind]" :class="['size-4 shrink-0', TONES[toast.kind]]" />
        <span class="text-fg">{{ toast.message }}</span>
        <button
          type="button"
          class="ml-1 rounded-md p-0.5 text-fg-subtle transition-colors hover:text-fg"
          @click="ui.dismissToast(toast.id)"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
