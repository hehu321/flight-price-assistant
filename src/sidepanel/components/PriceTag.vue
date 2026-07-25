<template>
  <div class="price-tag-wrapper">
    <span class="price-type-tag" :class="priceTypeClass">{{ fareLabel || priceTypeLabel }}</span>
    <span class="price-val">¥{{ amount }}</span>
    <span v-if="isStarting" class="starting-text">起</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FlightPriceType } from "@/shared/types/flight";

const props = defineProps<{
  amount: number;
  priceType: FlightPriceType;
  isStarting?: boolean;
  fareLabel?: string;
}>();

const priceTypeLabel = computed(() => {
  switch (props.priceType) {
    case "member": return "会员价";
    case "coupon": return "券后价";
    case "new_user": return "新客价";
    case "student": return "学生价";
    case "child": return "儿童价";
    default: return "公共价";
  }
});

const priceTypeClass = computed(() => props.priceType);
</script>

<style scoped>
.price-tag-wrapper { display:inline-flex;align-items:center;gap:var(--space-1);font-variant-numeric:tabular-nums; }
.price-type-tag { font-size:11px;padding:2px 6px;border-radius:999px;background:var(--bg-card);color:var(--text-muted); }
.price-type-tag.member { background:var(--accent-soft);color:var(--accent-color); }
.price-type-tag.coupon { background:var(--warning-soft);color:var(--warning-color); }
.price-type-tag.new_user { background:var(--success-soft);color:var(--success-color); }

.price-val { font-size:18px;font-weight:700;line-height:1;color:var(--success-color);letter-spacing:-.02em; }
.starting-text { font-size:var(--font-caption);color:var(--text-muted); }
</style>
