<template>
  <span class="confidence-badge" :class="level">
    可信度 {{ score }}%
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  score: number;
}>();

const level = computed(() => {
  if (props.score >= 85) return "high";
  if (props.score >= 70) return "medium";
  return "low";
});
</script>

<style scoped>
.confidence-badge { font-size:11px;padding:3px 7px;border-radius:999px;font-weight:600;white-space:nowrap; }
.confidence-badge.high { background:var(--success-soft);color:var(--success-color); }
.confidence-badge.medium { background:var(--warning-soft);color:var(--warning-color); }
.confidence-badge.low { background:var(--danger-soft);color:var(--danger-color); }
</style>
