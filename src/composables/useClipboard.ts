import { ref } from 'vue'

export function useClipboard(resetMs = 1600) {
  const copied = ref(false)
  let timer: number | undefined

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => (copied.value = false), resetMs)
      return true
    } catch {
      return false
    }
  }

  return { copy, copied }
}
