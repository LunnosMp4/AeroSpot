<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    format?: (value: number) => string
  }>(),
  { min: 0, max: 100, step: 1 },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

function onInput(event: Event): void {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}

function display(value: number): string {
  return props.format ? props.format(value) : String(value)
}
</script>

<template>
  <div class="w-full">
    <input
      type="range"
      class="range-input w-full"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
    />
    <div class="mt-1 flex justify-between text-[10px] tabular-nums text-fg-subtle">
      <span>{{ display(min) }}</span>
      <span class="text-fg-muted">{{ display(modelValue) }}</span>
      <span>{{ display(max) }}</span>
    </div>
  </div>
</template>

<style scoped>
.range-input {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink-600) 80%, transparent);
  outline: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--color-fg);
  border: 2px solid var(--color-accent);
  box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.7);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}

.range-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--color-fg);
  border: 2px solid var(--color-accent);
  cursor: pointer;
}
</style>
