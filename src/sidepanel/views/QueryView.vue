<template>
  <div class="page-container fade-enter-active">
    <header class="page-title">
      <span class="eyebrow">公开票价比较</span>
      <h2>机票一键比价</h2>
      <span class="subtitle">输入一次行程，逐步采集并对比四个平台的公开报价。</span>
    </header>

    <div class="form-card">
      <a-radio-group v-model:value="queryStore.query.tripType" class="trip-type-selector" button-style="solid">
        <a-radio-button value="oneway">单程</a-radio-button>
        <a-radio-button value="roundtrip">往返</a-radio-button>
      </a-radio-group>

      <div class="form-row">
        <CityInput
          label="出发城市"
          :model-value="queryStore.query.originCity"
          placeholder="如: 武汉"
          @update:model-value="(value) => queryStore.setCity('origin', value)"
        />
        <a-button class="swap-icon" shape="circle" aria-label="交换出发城市和到达城市" @click="swapCities"><SwapOutlined /></a-button>
        <CityInput
          label="到达城市"
          :model-value="queryStore.query.destinationCity"
          placeholder="如: 北京"
          @update:model-value="(value) => queryStore.setCity('destination', value)"
        />
      </div>

      <div class="form-row">
        <div class="input-group">
          <label>出发日期</label>
          <a-date-picker v-model:value="departureDateValue" value-format="YYYY-MM-DD" :locale="datePickerLocale" placeholder="选择出发日期" />
        </div>
        <div v-if="queryStore.query.tripType === 'roundtrip'" class="input-group">
          <label>返程日期</label>
          <a-date-picker v-model:value="returnDateValue" value-format="YYYY-MM-DD" :locale="datePickerLocale" placeholder="选择返程日期" />
        </div>
      </div>

      <div class="form-row">
        <div class="input-group">
          <label>成人人数</label>
          <a-select v-model:value="queryStore.query.adultCount" :options="adultOptions" />
        </div>
        <div class="input-group">
          <label>舱位类型</label>
          <a-select v-model:value="queryStore.query.cabinClass" :options="cabinOptions" />
        </div>
      </div>

      <div class="form-group checkbox-group">
        <a-checkbox v-model:checked="queryStore.query.directOnly">仅看直飞航班</a-checkbox>
      </div>

      <div class="platform-selection">
        <label class="section-label">比价平台</label>
        <a-checkbox-group v-model:value="queryStore.query.enabledPlatforms" :options="platformOptions" />
      </div>

      <div v-if="validationError" class="error-msg">
        {{ validationError }}
      </div>

      <div class="submit-area">
        <a-button class="btn-submit" type="primary" block :loading="taskStore.isComparing" @click="handleStartComparison">开始比价</a-button>
        <span>结果会按平台逐步更新；价格以各平台订票页为准。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Button as AButton,
  Checkbox as ACheckbox,
  CheckboxGroup as ACheckboxGroup,
  DatePicker as ADatePicker,
  RadioButton as ARadioButton,
  RadioGroup as ARadioGroup,
  Select as ASelect,
} from "ant-design-vue";
import { SwapOutlined } from "@ant-design/icons-vue";
import zhCNDatePicker from "ant-design-vue/es/date-picker/locale/zh_CN";
import { useRouter } from "vue-router";
import { useQueryStore } from "../stores/query";
import { useTaskStore } from "../stores/task";
import CityInput from "../components/CityInput.vue";
import { validateFlightQuery } from "@/core/query/query-validator";

const queryStore = useQueryStore();
const taskStore = useTaskStore();
const router = useRouter();
const datePickerLocale = zhCNDatePicker;

const validationError = ref<string | null>(null);
const departureDateValue = computed({ get: () => queryStore.query.departureDate, set: (value: string) => { queryStore.query.departureDate = value; } });
const returnDateValue = computed({ get: () => queryStore.query.returnDate || "", set: (value: string) => { queryStore.query.returnDate = value || undefined; } });
const adultOptions = [{ value: 1, label: "1 成人" }, { value: 2, label: "2 成人" }, { value: 3, label: "3 成人" }];
const cabinOptions = [{ value: "economy", label: "经济舱" }, { value: "premium_economy", label: "超级经济舱" }, { value: "business", label: "公务舱" }, { value: "first", label: "头等舱" }];
const platformOptions = [{ value: "ctrip", label: "携程旅行" }, { value: "qunar", label: "去哪儿旅行" }, { value: "fliggy", label: "飞猪旅行" }, { value: "tongcheng", label: "同程旅行" }];

function swapCities() {
  const tmp = queryStore.query.originCity;
  const tmpCode = queryStore.query.originCityCode;
  queryStore.query.originCity = queryStore.query.destinationCity;
  queryStore.query.originCityCode = queryStore.query.destinationCityCode;
  queryStore.query.destinationCity = tmp;
  queryStore.query.destinationCityCode = tmpCode;
}

function handleStartComparison() {
  queryStore.synchronizeCityCodes();
  const result = validateFlightQuery(queryStore.query);
  if (!result.valid) {
    validationError.value = result.errors.join("; ");
    return;
  }
  validationError.value = null;

  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: "START_COMPARISON",
      payload: { query: queryStore.query },
    }, (res) => {
      if (res && res.task) {
        taskStore.setTask(res.task);
        router.push("/results");
      }
    });
  } else {
    // Mock 环境直接跳转
    router.push("/results");
  }
}
</script>

<style scoped>
.page-container{width:100%;max-width:760px;margin:0 auto;padding:var(--space-6);padding-bottom:88px}.page-title{display:flex;flex-direction:column;gap:var(--space-1)}.eyebrow{font-size:var(--font-caption);font-weight:700;letter-spacing:.06em;color:var(--accent-color)}.page-title h2{font-size:28px;line-height:1.18;letter-spacing:-.035em;margin:0}.subtitle{font-size:var(--font-body);color:var(--text-secondary);line-height:1.6}.form-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:var(--space-5);margin-top:var(--space-5);box-shadow:var(--shadow-md)}.trip-type-selector{display:flex;margin-bottom:var(--space-5)}
.trip-type-selector :deep(.ant-radio-button-wrapper) {
  flex: 1;
}
.form-row{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4);min-width:0}
.form-row :deep(.city-input-wrapper) {
  flex: 1 1 0;
  min-width: 0;
}
.swap-icon{width:42px;height:42px;margin-top:22px;color:var(--accent-color);flex:0 0 auto;background:var(--bg-subtle);border-color:var(--border-color);box-shadow:var(--shadow-sm)}.swap-icon:hover{border-color:var(--accent-color);background:var(--accent-soft);transform:rotate(180deg)}.input-group{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--space-1)}.input-group label,.city-input-wrapper label{font-size:var(--font-caption);font-weight:600;color:var(--text-secondary)}
.input-group :deep(.ant-picker),
.input-group :deep(.ant-select) {
  width: 100%;
}
.checkbox-group{margin:2px 0 var(--space-4)}
.checkbox-label {
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.platform-selection{margin-bottom:var(--space-5);background:var(--bg-subtle);border:1px solid var(--border-color);padding:var(--space-3);border-radius:var(--radius-md)}
.platform-selection :deep(.ant-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.section-label{font-size:var(--font-caption);font-weight:600;color:var(--text-secondary);display:block;margin-bottom:var(--space-2)}
.platform-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.platform-check {
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.error-msg{padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);border-radius:var(--radius-sm);background:var(--danger-soft);color:var(--danger-color);font-size:var(--font-caption)}.submit-area{display:flex;flex-direction:column;gap:var(--space-2)}.btn-submit{width:100%;min-height:48px;font-size:16px;font-weight:700;border-radius:10px!important}.submit-area span{font-size:var(--font-caption);text-align:center;color:var(--text-muted)}@media(max-width:620px){.page-container{padding:var(--space-4);padding-bottom:80px}.page-title h2{font-size:24px}.form-card{padding:var(--space-4)}.form-row{gap:6px}.swap-icon{width:38px;height:38px;margin-top:21px}}
</style>
