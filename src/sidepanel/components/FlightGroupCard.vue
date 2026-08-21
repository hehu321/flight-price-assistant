<template>
  <article class="flight-row" :class="{ expanded }">
    <button class="flight-summary" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <div class="time-column">
        <strong>{{ displayFlightTime(rep.departureTime) }}</strong><span>{{ shortAirport(rep.departureAirport) }}</span>
      </div>
      <div class="journey-column">
        <span class="journey-meta">{{ rep.direct ? '直飞' : '经停/中转' }} · {{ durationText }}</span>
        <span class="journey-line" aria-hidden="true"></span>
        <span class="airline-line"><b>{{ rep.marketingFlightNumber || '航班号待确认' }}</b> {{ rep.airline || '待确认航空公司' }}</span>
      </div>
      <div class="time-column arrival">
        <strong>{{ displayFlightTime(rep.arrivalTime) }}</strong><span>{{ shortAirport(rep.arrivalAirport) }}</span>
      </div>
      <div class="price-summary">
        <span>{{ lowestVerified !== undefined ? '最低含税价' : summaryPrice !== undefined ? '最低票面价' : '不可跨币种比较' }}</span><strong>{{ summaryPrice === undefined ? '—' : `¥${summaryPrice}` }}</strong>
        <em v-if="lowestVerified !== undefined">含税已核验</em><em v-else-if="summaryPrice !== undefined">附加费待确认</em><em v-else>保留原币种展示</em>
        <div class="quote-chips" aria-label="各平台报价">
          <span v-for="platform in visiblePlatforms" :key="platform" :class="fareClass(offer(platform))">{{ platformShortName(platform) }} {{ offer(platform) ? formatFare(offer(platform)!) : '—' }}</span>
        </div>
      </div>
      <span class="expand-icon" aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</span>
    </button>

    <div v-if="expanded" class="flight-details">
      <div class="detail-heading"><span>平台报价</span><ConfidenceBadge :score="rep.confidence" /></div>
      <div class="platform-quotes">
        <section v-for="platform in visiblePlatforms" :key="platform" class="platform-quote" :class="{ best: isBest(platform) }">
          <span class="platform-name">{{ platformName(platform) }}</span>
          <template v-if="offer(platform)">
            <PriceTag :amount="fare(offer(platform)!).amount" :currency="fare(offer(platform)!).currency" :fare-label="fare(offer(platform)!).label" :price-type="offer(platform)!.priceType" :is-starting="offer(platform)!.isStartingPrice && offer(platform)!.totalPrice === undefined" />
            <small :class="feeClass(offer(platform)!)">{{ fare(offer(platform)!).note }}</small>
            <a-button size="small" type="primary" @click.stop="booking(platform)">去订票</a-button>
          </template>
          <em v-else>未查到</em>
        </section>
      </div>
      <div class="flight-extra">
        <span v-if="rep.cabin">{{ rep.cabin }}</span><span v-if="rep.baggage">{{ rep.baggage }}</span><span v-if="rep.stopInfo">{{ rep.stopInfo }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Button as AButton } from "ant-design-vue";
import ConfidenceBadge from "./ConfidenceBadge.vue";
import PriceTag from "./PriceTag.vue";
import { MatchedFlightGroup } from "@/shared/types/matching";
import { FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { displayFlightTime, groupDurationMinutes, groupLowestPrice, groupLowestVerifiedPrice } from "@/core/results/result-presentation";
import { presentFare } from "@/core/results/fare-presentation";

const props = defineProps<{ group: MatchedFlightGroup; platforms?: SupportedPlatform[] }>();
const emit = defineEmits<{ (event: "open-booking", flight: FlightResult): void }>();
const expanded = ref(false);
const visiblePlatforms = computed(() => props.platforms?.length ? props.platforms : ["ctrip", "qunar", "fliggy", "tongcheng"] as SupportedPlatform[]);
const rep = computed(() => props.group.representative);
const lowestPrice = computed(() => groupLowestPrice(props.group));
const lowestVerified = computed(() => groupLowestVerifiedPrice(props.group));
const summaryPrice = computed(() => lowestVerified.value ?? lowestPrice.value);
const durationText = computed(() => { const minutes = groupDurationMinutes(props.group); return Number.isFinite(minutes) && minutes > 0 ? `${Math.floor(minutes / 60)}小时${minutes % 60}分` : "时长待确认"; });
function offer(platform: SupportedPlatform) { return props.group.results[platform]?.[0]; }
function booking(platform: SupportedPlatform) { const flight = offer(platform); if (flight) emit("open-booking", flight); }
function priceOf(flight: FlightResult) { return flight.totalPrice ?? flight.displayedPrice; }
function fare(flight: FlightResult) { return presentFare(flight); }
function formatFare(flight: FlightResult) { const value = fare(flight); return `${value.currency === 'CNY' ? '¥' : `${value.currency} `}${value.amount}`; }
function isBest(platform: SupportedPlatform) { const value = offer(platform); return !!value && (value.currency || 'CNY') === 'CNY' && priceOf(value) === lowestPrice.value; }
function shortAirport(value: string) { return value.replace(/国际机场|机场/g, ""); }
function platformName(platform: SupportedPlatform) { return ({ ctrip: "携程", qunar: "去哪儿", fliggy: "飞猪", tongcheng: "同程" })[platform]; }
function platformShortName(platform: SupportedPlatform) { return ({ ctrip: "携", qunar: "去", fliggy: "飞", tongcheng: "同" })[platform]; }
function feeClass(flight: FlightResult) { return flight.totalPrice !== undefined ? "confirmed" : "pending"; }
function fareClass(flight?: FlightResult) { return flight?.totalPrice !== undefined ? "verified" : "ticket"; }
</script>

<style scoped>
.flight-row{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:var(--space-2);overflow:hidden;box-shadow:var(--shadow-sm);transition:border-color var(--transition-fast),box-shadow var(--transition-fast),transform var(--transition-fast)}.flight-row:hover{border-color:color-mix(in srgb,var(--border-color),var(--accent-color) 35%);box-shadow:var(--shadow-md)}.flight-row.expanded{border-color:var(--accent-color)}.flight-summary{display:grid;grid-template-columns:76px minmax(120px,1fr) 76px 128px 20px;gap:var(--space-2);align-items:center;width:100%;min-height:100px;padding:var(--space-3);background:transparent;border:0;color:inherit;text-align:left;cursor:pointer}.flight-summary:hover{background:var(--accent-hover)}.time-column{display:flex;flex-direction:column;gap:var(--space-1)}.time-column strong{font-size:20px;line-height:1.05;font-variant-numeric:tabular-nums;letter-spacing:-.02em}.time-column span,.journey-meta,.airline-line,.price-summary span,.price-summary em{font-size:var(--font-caption);color:var(--text-muted);font-style:normal}.arrival{text-align:right;align-items:flex-end}.journey-column{min-width:0;display:flex;flex-direction:column;gap:6px}.journey-meta{color:var(--text-secondary)}.journey-line{height:1px;background:linear-gradient(90deg,var(--border-color),var(--accent-color),var(--border-color));position:relative}.journey-line:after{content:"";position:absolute;right:0;top:-4px;border-left:7px solid var(--accent-color);border-top:4px solid transparent;border-bottom:4px solid transparent}.airline-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.airline-line b{color:var(--text-primary);margin-right:5px;font-variant-numeric:tabular-nums}.price-summary{display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:0}.price-summary strong{font-size:20px;line-height:1.1;color:var(--success-color);font-variant-numeric:tabular-nums;letter-spacing:-.02em}.price-summary em{color:var(--success-color)}.quote-chips{display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;width:100%;margin-top:4px}.quote-chips span{padding:2px 5px;border-radius:999px;background:var(--bg-elevated);font-size:10px;line-height:1.25;font-variant-numeric:tabular-nums}.quote-chips .verified{color:var(--success-color);background:var(--success-soft)}.quote-chips .ticket{color:var(--warning-color);background:var(--warning-soft)}.expand-icon{color:var(--text-muted);font-size:18px}.flight-details{border-top:1px solid var(--border-color);padding:var(--space-3)}.detail-heading{display:flex;justify-content:space-between;align-items:center;font-size:var(--font-caption);color:var(--text-secondary);margin-bottom:var(--space-2)}.platform-quotes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}.platform-quote{min-height:96px;padding:var(--space-2);border:1px solid transparent;border-radius:8px;background:var(--bg-subtle);display:flex;align-items:flex-start;gap:5px;flex-direction:column}.platform-quote.best{border-color:var(--success-color);background:var(--success-soft)}.platform-name{font-size:var(--font-caption);color:var(--text-secondary);font-weight:600}.platform-quote small{font-size:var(--font-caption);line-height:1.4}.platform-quote small.confirmed{color:var(--success-color)}.platform-quote small.pending,.platform-quote em{font-size:var(--font-caption);color:var(--text-muted);font-style:normal}.flight-extra{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3);color:var(--text-muted);font-size:var(--font-caption)}@media(max-width:620px){.flight-summary{grid-template-columns:61px minmax(80px,1fr) 61px 93px 12px;gap:6px;min-height:94px;padding:10px}.time-column strong,.price-summary strong{font-size:17px}.time-column span,.journey-meta,.airline-line,.price-summary span,.price-summary em{font-size:11px}.platform-quotes{grid-template-columns:1fr}.journey-meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quote-chips{min-height:17px}}
</style>
