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
  const isMobile = ref(false)
  const sidebarOpen = ref(true)
  const activePanel = ref<SidebarPanel>('spots')
  const selectedSpotId = ref<string | null>(null)
  const inspectorEnabled = ref(false)
  const addSpotMode = ref(false)
  const toasts = ref<Toast[]>([])

  function setMobile(value: boolean): void {
    isMobile.value = value
  }

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function openSidebar(): void {
    sidebarOpen.value = true
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function setPanel(panel: SidebarPanel): void {
    activePanel.value = panel
    sidebarOpen.value = true
  }

  function selectSpot(id: string | null): void {
    selectedSpotId.value = id
    if (id && isMobile.value) sidebarOpen.value = false
  }

  function toggleInspector(): void {
    inspectorEnabled.value = !inspectorEnabled.value
  }

  function setInspectorEnabled(value: boolean): void {
    inspectorEnabled.value = value
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
    isMobile,
    sidebarOpen,
    activePanel,
    selectedSpotId,
    inspectorEnabled,
    addSpotMode,
    toasts,
    setMobile,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setPanel,
    selectSpot,
    toggleInspector,
    setInspectorEnabled,
    setAddSpotMode,
    pushToast,
    dismissToast,
  }
})
