import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  message: string
}

export type SidebarPanel = 'home' | 'spots' | 'filters' | 'plugins'

let toastSeq = 0

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const activePanel = ref<SidebarPanel>('spots')
  const selectedSpotId = ref<string | null>(null)
  const inspectorEnabled = ref(false)
  const addSpotMode = ref(false)
  const toasts = ref<Toast[]>([])

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setPanel(panel: SidebarPanel): void {
    activePanel.value = panel
    sidebarOpen.value = true
  }

  function selectSpot(id: string | null): void {
    selectedSpotId.value = id
  }

  function toggleInspector(): void {
    inspectorEnabled.value = !inspectorEnabled.value
  }

  function setAddSpotMode(value: boolean): void {
    addSpotMode.value = value
  }

  function pushToast(message: string, kind: Toast['kind'] = 'info', ttlMs = 4000): number {
    const id = ++toastSeq
    toasts.value = [...toasts.value, { id, kind, message }]
    if (ttlMs > 0) {
      window.setTimeout(() => dismissToast(id), ttlMs)
    }
    return id
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    sidebarOpen,
    activePanel,
    selectedSpotId,
    inspectorEnabled,
    addSpotMode,
    toasts,
    toggleSidebar,
    setPanel,
    selectSpot,
    toggleInspector,
    setAddSpotMode,
    pushToast,
    dismissToast,
  }
})
