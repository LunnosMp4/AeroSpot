import { onBeforeUnmount, ref, type Ref } from 'vue'

export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    const onChange = (event: MediaQueryListEvent): void => {
      matches.value = event.matches
    }
    mediaQuery.addEventListener('change', onChange)
    onBeforeUnmount(() => mediaQuery.removeEventListener('change', onChange))
  }

  return matches
}

export const MOBILE_QUERY = '(max-width: 767px)'
export const COARSE_POINTER_QUERY = '(pointer: coarse)'

export function useIsMobile(): Ref<boolean> {
  return useMediaQuery(MOBILE_QUERY)
}

export function useIsCoarsePointer(): Ref<boolean> {
  return useMediaQuery(COARSE_POINTER_QUERY)
}
