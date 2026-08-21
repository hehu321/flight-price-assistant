<template>
  <div class="city-input-wrapper">
    <label>{{ label }}</label>
    <a-auto-complete
      :value="modelValue"
      :options="options"
      @search="onSearch"
      @select="onSelect"
      :placeholder="placeholder"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { AutoComplete as AAutoComplete } from "ant-design-vue";
import { searchLocations } from "@/core/query/airport-dictionary";
import { FlightMarket } from "@/shared/types/flight";

const props = defineProps<{
  label: string;
  modelValue: string;
  market?: FlightMarket;
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue", "select"]);

const suggestions = computed(() => searchLocations(props.modelValue, props.market || "domestic"));
const options = computed(() => suggestions.value.map((item) => ({
  value: item.displayName,
  label: `${item.displayName}${item.englishName ? ` · ${item.englishName}` : ""} (${item.iataCode})`,
})));

function onSearch(val: string) {
  emit("update:modelValue", val);
}

function onSelect(value: unknown) {
  const cityName = String(value);
  const item = suggestions.value.find((candidate) => candidate.displayName === cityName);
  emit("update:modelValue", cityName);
  if (item) emit("select", item);
}
</script>

<style scoped>
.city-input-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.city-input-wrapper :deep(.ant-select) { width: 100%; }
.city-input-wrapper label { margin-bottom: var(--space-1); font-size: var(--font-caption); font-weight: 600; color: var(--text-secondary); }
</style>
