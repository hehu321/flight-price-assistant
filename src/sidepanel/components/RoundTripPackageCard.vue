<template>
  <article class="package-card">
    <header><span class="platform">携程往返套餐</span><span class="price">¥{{ item.displayedTotalPrice }}<small v-if="item.isStartingPrice">起</small></span></header>
    <section class="route"><span class="label">去程</span><strong>{{ item.outbound.departureTime }}</strong><span>{{ item.outbound.departureAirport }}</span><i>→</i><strong>{{ item.outbound.arrivalTime }}</strong><span>{{ item.outbound.arrivalAirport }}</span></section>
    <section class="route"><span class="label">返程</span><strong>{{ item.inbound.departureTime }}</strong><span>{{ item.inbound.departureAirport }}</span><i>→</i><strong>{{ item.inbound.arrivalTime }}</strong><span>{{ item.inbound.arrivalAirport }}</span></section>
    <footer>{{ item.outbound.marketingFlightNumber }} · {{ item.outbound.airline }} / {{ item.inbound.marketingFlightNumber }} · {{ item.inbound.airline }}<em>平台标注的往返总价，最终以订票页为准</em></footer>
  </article>
</template>
<script setup lang="ts">
import { RoundTripPackageResult } from "@/shared/types/flight";
defineProps<{ item: RoundTripPackageResult }>();
</script>
<style scoped>
.package-card{display:grid;gap:10px;padding:16px 18px;border:1px solid var(--border-color);border-radius:var(--radius-lg);background:var(--bg-secondary);box-shadow:var(--shadow-sm)}header,.route,footer{display:flex;align-items:center;gap:10px}.platform{font-weight:700;color:var(--accent-color)}.price{margin-left:auto;font-size:24px;font-weight:750;color:var(--success-color);font-variant-numeric:tabular-nums}.price small{font-size:13px;margin-left:2px}.route{display:grid;grid-template-columns:38px 52px 1fr 18px 52px 1fr;color:var(--text-secondary);font-size:13px}.route strong{font-size:17px;color:var(--text-primary);font-variant-numeric:tabular-nums}.label{font-weight:700;color:var(--text-muted)}.route i{font-style:normal;color:var(--accent-color)}footer{flex-wrap:wrap;font-size:12px;color:var(--text-secondary)}footer em{margin-left:auto;font-style:normal;color:var(--text-muted)}@media(max-width:620px){.route{grid-template-columns:34px 48px 1fr 14px 48px 1fr;font-size:11px}.route strong{font-size:15px}footer em{margin-left:0;width:100%}}
</style>
