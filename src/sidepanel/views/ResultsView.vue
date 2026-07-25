<template>
  <div class="page-container fade-enter-active">
    <header class="page-header">
      <div><h2>四平台统一比价结果</h2><p v-if="groups.length" class="result-summary">共 {{ groups.length }} 个航班 · 直飞 {{ directCount }} 个 · <b v-if="lowestComparablePrice !== null">已核验最低含税 ¥{{ lowestComparablePrice }}</b><b v-else>暂无已核验含税价</b></p></div>
      <a-tag color="blue">已显示 {{ renderedGroups.length }} / {{ groups.length }}</a-tag>
    </header>

    <section class="quick-filters" aria-label="快捷筛选">
      <a-button :type="filters.direct === 'direct' ? 'primary' : 'default'" @click="filters.direct = filters.direct === 'direct' ? 'all' : 'direct'">仅直飞</a-button>
      <a-select v-model:value="filters.airlines" mode="multiple" allow-clear :options="airlineOptions" placeholder="航空公司" class="quick-airline" />
      <a-select v-model:value="filters.departurePeriod" :options="periodOptions" class="quick-select" />
      <a-input-number v-model:value="filters.maxPrice" :min="0" :controls="false" prefix="¥" placeholder="总价上限" class="quick-price" />
      <a-select v-model:value="filters.sort" :options="sortOptions" class="quick-sort" />
      <a-button class="more-filter-button" @click="drawerOpen = true">更多筛选<span v-if="activeFilterCount">（{{ activeFilterCount }}）</span></a-button>
    </section>
    <div v-if="activeFilterCount" class="filter-tags"><a-tag v-for="tag in activeTags" :key="tag.key" closable @close.prevent="tag.clear">{{ tag.label }}</a-tag><a-button type="link" size="small" @click="resetFilters">清空全部</a-button></div>

    <div v-if="resultsStore.rawResults.length" class="data-quality"><span>报价状态</span><b>{{ verifiedOfferCount }}/{{ resultsStore.rawResults.length }}</b><span>条已核验含税价</span><em v-if="unverifiedOfferCount">其余为票面价，附加费待平台确认</em></div>
    <a-alert v-if="bookingNotice" class="booking-notice" :type="bookingNotice.type" show-icon :message="bookingNotice.message" closable @close="bookingNotice = undefined" />
    <SearchProgressPanel v-if="taskStore.currentTask" :task="taskStore.currentTask" @retry="retryPlatform" @login="openPlatformLogin" />

    <section v-if="renderedGroups.length" class="results-list"><FlightGroupCard v-for="group in renderedGroups" :key="group.id" :group="group" :platforms="filters.platforms" @open-booking="openBooking" /><a-button v-if="renderedGroups.length < groups.length" block @click="filters.visibleLimit += 40">加载更多（剩余 {{ groups.length - renderedGroups.length }} 条）</a-button></section>
    <div v-else class="empty-state"><p>{{ resultsStore.rawResults.length ? '没有符合当前筛选条件的航班。' : '暂无比价数据，请在“查询”页面发起一键比价。' }}</p><a-button v-if="resultsStore.rawResults.length" @click="resetFilters">清空筛选</a-button></div>

    <a-drawer v-model:open="drawerOpen" title="更多筛选" placement="right" :width="420">
      <p class="drawer-intro">条件会实时应用到当前查询；价格区间按已选平台中的最低可比价计算。</p>
      <section class="filter-group">
        <h3>航司与平台</h3>
        <div class="drawer-section"><label>航空公司</label><a-select v-model:value="filters.airlines" mode="multiple" allow-clear show-search :options="airlineOptions" placeholder="全部航空公司" /></div>
        <div class="drawer-section"><label>比价平台</label><a-checkbox-group v-model:value="filters.platforms" :options="platformOptions" /></div>
      </section>
      <section class="filter-group">
        <h3>机场与航程</h3>
        <div class="drawer-section"><label>出发机场</label><a-select v-model:value="filters.departureAirports" mode="multiple" allow-clear show-search :options="departureAirportOptions" placeholder="全部出发机场" /></div>
        <div class="drawer-section"><label>到达机场</label><a-select v-model:value="filters.arrivalAirports" mode="multiple" allow-clear show-search :options="arrivalAirportOptions" placeholder="全部到达机场" /></div>
        <div class="drawer-section two-column"><div><label>航班类型</label><a-select v-model:value="filters.direct" :options="directOptions" /></div><div><label>最长航程</label><a-input-number v-model:value="filters.maxDuration" :min="30" :step="30" suffix="分钟" placeholder="不限" /></div></div>
      </section>
      <section class="filter-group">
        <h3>价格与时间</h3>
        <div class="drawer-section two-column"><div><label>最低总价</label><a-input-number v-model:value="filters.minPrice" :min="0" prefix="¥" placeholder="不限" /></div><div><label>最高总价</label><a-input-number v-model:value="filters.maxPrice" :min="0" prefix="¥" placeholder="不限" /></div></div>
        <div class="drawer-section two-column"><div><label>出发时段</label><a-select v-model:value="filters.departurePeriod" :options="periodOptions" /></div><div><label>到达时段</label><a-select v-model:value="filters.arrivalPeriod" :options="arrivalPeriodOptions" /></div></div>
        <a-checkbox v-model:checked="filters.verifiedOnly">仅显示已核验含税价的航班</a-checkbox>
      </section>
      <template #footer><div class="drawer-actions"><a-button @click="resetFilters">清空条件</a-button><a-button type="primary" @click="drawerOpen = false">查看 {{ groups.length }} 个航班</a-button></div></template>
    </a-drawer>
    <a-modal v-model:open="bookingConfirmOpen" title="确认前往订票" ok-text="打开并验证订票页" cancel-text="暂不前往" :confirm-loading="bookingLoading" @ok="confirmBooking">
      <template v-if="bookingFlight">
        <p class="booking-intro">将先在 {{ platformLabel(bookingFlight.platform) }} 重新验证当前航班与价格，再打开可用的订票页面。</p>
        <dl class="booking-details">
          <div><dt>航班</dt><dd>{{ bookingFlight.marketingFlightNumber || '航班号待确认' }} · {{ bookingFlight.airline || '待确认航空公司' }}</dd></div>
          <div><dt>行程</dt><dd>{{ bookingFlight.departureDate }} · {{ displayFlightTime(bookingFlight.departureTime) }} → {{ displayFlightTime(bookingFlight.arrivalTime) }}</dd></div>
          <div><dt>机场</dt><dd>{{ bookingFlight.departureAirport }} → {{ bookingFlight.arrivalAirport }}</dd></div>
          <div><dt>当前价格</dt><dd :class="bookingFare.confidence">{{ bookingFare.label }} ¥{{ bookingFare.amount }} · {{ bookingFare.note }}</dd></div>
          <div><dt>采集时间</dt><dd>{{ collectedAtText }}</dd></div>
        </dl>
        <p v-if="bookingLoading" class="booking-progress" aria-live="polite">{{ bookingProgressMessage }}</p>
        <p class="booking-warning">平台的库存、税费和最终支付价格可能变化，请以平台订票页展示为准。</p>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Alert as AAlert, Button as AButton, Checkbox as ACheckbox, CheckboxGroup as ACheckboxGroup, Drawer as ADrawer, InputNumber as AInputNumber, Modal as AModal, Select as ASelect, Tag as ATag } from "ant-design-vue";
import { useTaskStore } from "../stores/task"; import { useResultsStore } from "../stores/results";
import { BookingActionResult, BookingProgressPayload, ExtensionMessage } from "@/shared/types/message"; import { FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { matchFlightsAcrossPlatforms } from "@/core/matching/flight-matcher";
import { defaultResultFilters, displayFlightTime, filterAndSortGroups, filterCount, groupLowestVerifiedPrice, ResultFilterState, UNKNOWN_AIRLINE } from "@/core/results/result-presentation";
import { presentFare, verifiedTotalPrice } from "@/core/results/fare-presentation";
import FlightGroupCard from "../components/FlightGroupCard.vue"; import SearchProgressPanel from "../components/SearchProgressPanel.vue";

interface ResultsFilterState extends ResultFilterState { visibleLimit: number }
const taskStore = useTaskStore(); const resultsStore = useResultsStore();
const filters = ref<ResultsFilterState>({ ...defaultResultFilters(), visibleLimit: 40 });
const drawerOpen = ref(false); const bookingNotice = ref<{ type: "success" | "info" | "warning" | "error"; message: string }>();
const bookingFlight = ref<FlightResult>(); const bookingConfirmOpen = ref(false); const bookingLoading = ref(false); const bookingProgressMessage = ref("正在准备平台订票验证…");
const platformOptions = [{ value: "ctrip", label: "携程" }, { value: "qunar", label: "去哪儿" }, { value: "fliggy", label: "飞猪" }, { value: "tongcheng", label: "同程" }];
const sortOptions = [{ value: "recommended", label: "智能推荐" }, { value: "price_asc", label: "价格从低到高" }, { value: "price_desc", label: "价格从高到低" }, { value: "depart_asc", label: "最早出发" }, { value: "depart_desc", label: "最晚出发" }, { value: "arrive_asc", label: "最早到达" }, { value: "duration_asc", label: "最短航程" }];
const periodOptions = [{ value: "all", label: "全部时段" }, { value: "morning", label: "上午出发" }, { value: "afternoon", label: "下午出发" }, { value: "evening", label: "晚上出发" }];
const arrivalPeriodOptions = [{ value: "all", label: "全部到达时段" }, { value: "morning", label: "上午到达" }, { value: "afternoon", label: "下午到达" }, { value: "evening", label: "晚上到达" }];
const directOptions = [{ value: "all", label: "全部航班" }, { value: "direct", label: "仅直飞" }, { value: "non_direct", label: "仅经停/中转" }];
const baseGroups = computed(() => matchFlightsAcrossPlatforms(resultsStore.rawResults));
const groups = computed(() => filterAndSortGroups(baseGroups.value, filters.value));
const renderedGroups = computed(() => groups.value.slice(0, filters.value.visibleLimit));
const directCount = computed(() => groups.value.filter((group) => group.representative.direct).length);
const lowestComparablePrice = computed(() => { const prices = groups.value.map(groupLowestVerifiedPrice).filter((value): value is number => value !== undefined); return prices.length ? Math.min(...prices) : null; });
const verifiedOfferCount = computed(() => resultsStore.rawResults.filter((item) => verifiedTotalPrice(item) !== undefined).length);
const unverifiedOfferCount = computed(() => resultsStore.rawResults.length - verifiedOfferCount.value);
const bookingFare = computed(() => bookingFlight.value ? presentFare(bookingFlight.value) : { amount: 0, confidence: "ticket_only" as const, label: "票面价", note: "附加费待平台确认" });
const collectedAtText = computed(() => bookingFlight.value?.collectedAt ? new Date(bookingFlight.value.collectedAt).toLocaleString("zh-CN", { hour12: false }) : "时间未知");
const airlineOptions = computed(() => Object.entries(resultsStore.rawResults.reduce<Record<string, number>>((count, item) => { const airline = item.airline?.trim() || UNKNOWN_AIRLINE; count[airline] = (count[airline] || 0) + 1; return count; }, {})).sort(([a], [b]) => a.localeCompare(b, "zh-CN")).map(([value, count]) => ({ value, label: `${value}（${count}）` })));
const departureAirportOptions = computed(() => airportOptions("departureAirport")); const arrivalAirportOptions = computed(() => airportOptions("arrivalAirport"));
const activeFilterCount = computed(() => filterCount(filters.value));
const activeTags = computed(() => { const tags: Array<{ key: string; label: string; clear: () => void }> = []; if (filters.value.platforms.length < platformOptions.length) tags.push({ key: "platform", label: `平台 ${filters.value.platforms.length} 个`, clear: () => filters.value.platforms = platformOptions.map((item) => item.value) as SupportedPlatform[] }); if (filters.value.direct !== "all") tags.push({ key: "direct", label: filters.value.direct === "direct" ? "仅直飞" : "仅经停/中转", clear: () => filters.value.direct = "all" }); if (filters.value.airlines.length) tags.push({ key: "airline", label: `航司 ${filters.value.airlines.length} 个`, clear: () => filters.value.airlines = [] }); if (filters.value.maxPrice !== undefined) tags.push({ key: "max", label: `≤ ¥${filters.value.maxPrice}`, clear: () => filters.value.maxPrice = undefined }); if (filters.value.minPrice !== undefined) tags.push({ key: "min", label: `≥ ¥${filters.value.minPrice}`, clear: () => filters.value.minPrice = undefined }); if (filters.value.departureAirports.length) tags.push({ key: "dep", label: `出发机场 ${filters.value.departureAirports.length} 个`, clear: () => filters.value.departureAirports = [] }); if (filters.value.arrivalAirports.length) tags.push({ key: "arr", label: `到达机场 ${filters.value.arrivalAirports.length} 个`, clear: () => filters.value.arrivalAirports = [] }); if (filters.value.departurePeriod !== "all") tags.push({ key: "depart-period", label: periodOptions.find((item) => item.value === filters.value.departurePeriod)?.label || "出发时段", clear: () => filters.value.departurePeriod = "all" }); if (filters.value.arrivalPeriod !== "all") tags.push({ key: "arrive-period", label: arrivalPeriodOptions.find((item) => item.value === filters.value.arrivalPeriod)?.label || "到达时段", clear: () => filters.value.arrivalPeriod = "all" }); if (filters.value.maxDuration !== undefined) tags.push({ key: "duration", label: `航程 ≤ ${filters.value.maxDuration} 分钟`, clear: () => filters.value.maxDuration = undefined }); if (filters.value.verifiedOnly) tags.push({ key: "verified", label: "含税已核验", clear: () => filters.value.verifiedOnly = false }); return tags; });
watch(() => resultsStore.rawResults, () => resetFilters(), { deep: false });
watch(() => ({ ...filters.value, visibleLimit: undefined }), () => { filters.value.visibleLimit = 40; }, { deep: true });
onMounted(() => {
  resultsStore.markResultsViewed();
  if (typeof chrome !== "undefined" && chrome.runtime) chrome.runtime.onMessage.addListener(handleBookingProgress);
});
onUnmounted(() => {
  if (typeof chrome !== "undefined" && chrome.runtime) chrome.runtime.onMessage.removeListener(handleBookingProgress);
});
function airportOptions(field: "departureAirport" | "arrivalAirport") { return [...new Set(resultsStore.rawResults.map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN")).map((value) => ({ value, label: value })); }
function resetFilters() { filters.value = { ...defaultResultFilters(), visibleLimit: 40 }; }
function retryPlatform(platform: SupportedPlatform) { const taskId = taskStore.currentTask?.id; if (taskId && chrome?.runtime) chrome.runtime.sendMessage({ type: "RETRY_PLATFORM", taskId, platform, payload: { taskId, platform } }); }
function openPlatformLogin(platform: SupportedPlatform) { const taskId = taskStore.currentTask?.id; if (taskId && chrome?.runtime) chrome.runtime.sendMessage({ type: "OPEN_PLATFORM_LOGIN", taskId, platform, payload: { taskId, platform } }); }
function platformLabel(platform: SupportedPlatform) { return ({ ctrip: "携程", qunar: "去哪儿", fliggy: "飞猪", tongcheng: "同程" })[platform]; }
function openBooking(flight: FlightResult) { bookingFlight.value = flight; bookingConfirmOpen.value = true; }
function handleBookingProgress(message: ExtensionMessage) {
  if (message.type !== "BOOKING_PROGRESS" || !bookingLoading.value || !bookingFlight.value) return;
  const payload = message.payload as BookingProgressPayload;
  if (payload.platform === bookingFlight.value.platform) bookingProgressMessage.value = payload.message;
}
function confirmBooking() {
  if (!bookingFlight.value || !chrome?.runtime) return;
  bookingLoading.value = true;
  bookingProgressMessage.value = `正在打开${platformLabel(bookingFlight.value.platform)}结果页…`;
  bookingNotice.value = { type: "info", message: `正在在${platformLabel(bookingFlight.value.platform)}重新验证当前航班与价格…` };
  chrome.runtime.sendMessage({ type: "OPEN_FLIGHT_BOOKING", platform: bookingFlight.value.platform, payload: { flight: bookingFlight.value } }, (response) => {
    const result = response?.result as BookingActionResult | undefined;
    bookingNotice.value = result ? { type: result.opened ? "success" : "warning", message: result.message } : { type: "error", message: "订票流程未收到平台响应，请重新验证" };
    bookingLoading.value = false;
    bookingConfirmOpen.value = false;
  });
}
</script>

<style scoped>
.page-container{max-width:1180px;width:100%;margin:0 auto;padding:var(--space-5);padding-bottom:88px}.page-header{display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start;margin-bottom:var(--space-3)}.page-header h2{margin:0;font-size:var(--font-title);letter-spacing:-.02em}.result-summary{margin:var(--space-1) 0 0;font-size:var(--font-caption);color:var(--text-muted)}.result-summary b{color:var(--success-color);font-variant-numeric:tabular-nums}.quick-filters{position:sticky;top:var(--space-2);z-index:8;display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;padding:var(--space-2);border:1px solid var(--border-color);background:color-mix(in srgb,var(--bg-secondary) 94%,transparent);backdrop-filter:blur(12px);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}.quick-airline{min-width:180px;flex:1}.quick-select,.quick-sort{min-width:145px}.quick-price{width:136px}.more-filter-button{margin-left:auto}.filter-tags{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;margin:var(--space-2) 0}.data-quality{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;margin:var(--space-2) 0 var(--space-3);font-size:var(--font-caption);color:var(--text-secondary)}.data-quality b{color:var(--success-color);font-variant-numeric:tabular-nums}.data-quality em{font-style:normal;color:var(--text-muted)}.booking-notice{margin-bottom:var(--space-3)}.results-list{display:grid;gap:0}.empty-state{text-align:center;color:var(--text-muted);padding:64px 0;font-size:var(--font-body)}.drawer-intro{margin:0 0 var(--space-5);font-size:var(--font-caption);line-height:1.6;color:var(--text-secondary)}.filter-group{padding:var(--space-4) 0;border-top:1px solid var(--border-color)}.filter-group:first-of-type{padding-top:0;border-top:0}.filter-group h3{margin:0 0 var(--space-3);font-size:var(--font-body);letter-spacing:-.01em}.drawer-section{display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4)}.drawer-section label{display:block;font-size:var(--font-caption);font-weight:600;color:var(--text-secondary)}.drawer-section :deep(.ant-select),.drawer-section :deep(.ant-input-number){width:100%}.two-column{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}.two-column>div{min-width:0}.drawer-actions{display:flex;justify-content:space-between;gap:var(--space-2)}.booking-intro,.booking-warning,.booking-progress{font-size:var(--font-caption);color:var(--text-secondary);line-height:1.65}.booking-progress{margin-top:var(--space-3);color:var(--accent-color)}.booking-warning{color:var(--text-muted);margin-top:var(--space-3)}.booking-details{display:grid;gap:var(--space-2);margin:var(--space-4) 0}.booking-details div{display:grid;grid-template-columns:72px 1fr;gap:var(--space-2)}.booking-details dt{font-size:var(--font-caption);color:var(--text-muted)}.booking-details dd{margin:0;font-size:var(--font-caption);color:var(--text-primary)}.booking-details dd.verified_total{color:var(--success-color)}.booking-details dd.ticket_only{color:var(--warning-color)}@media(max-width:620px){.page-container{padding:var(--space-4);padding-bottom:80px}.quick-filters{top:0}.quick-airline{min-width:130px}.quick-sort{flex:1}.more-filter-button{margin-left:0}.page-header{align-items:center}.page-header h2{font-size:19px}.two-column{grid-template-columns:1fr}}
</style>
