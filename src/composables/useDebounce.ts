export function useDebounceFn<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay = 300,
): (...args: Args) => void {
  let timer: number | undefined
  return (...args: Args) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}
