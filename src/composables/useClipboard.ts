import { ref } from 'vue'

export function useClipboard(resetMs = 1600) {
  const copied = ref(false)
  let timer: number | undefined

  function markCopied(): void {
    copied.value = true
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => (copied.value = false), resetMs)
  }

  function fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(textarea)
    return ok
  }

  async function copy(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        markCopied()
        return true
      } catch {
        /* fall through to legacy copy */
      }
    }
    const ok = fallbackCopy(text)
    if (ok) markCopied()
    return ok
  }

  return { copy, copied }
}
