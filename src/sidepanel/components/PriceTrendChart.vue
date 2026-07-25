<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import Chart from "chart.js/auto";
import { LocalPriceRecord } from "@/shared/types/storage";

const props = defineProps<{
  records: LocalPriceRecord[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

function renderChart() {
  if (!canvasRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const sorted = [...props.records].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
  const labels = sorted.map((r) => r.collectedAt.substring(5, 16));
  const prices = sorted.map((r) => r.totalPrice ?? r.displayedPrice);

  chartInstance = new Chart(canvasRef.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "机票总价(¥)",
          data: prices,
          borderColor: "#4f7cff",
          backgroundColor: "rgba(79, 124, 255, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: "#64748b", font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: "#64748b", font: { size: 10 } }, grid: { color: "#2e3a4e" } },
      },
    },
  });
}

onMounted(renderChart);
watch(() => props.records, renderChart, { deep: true });
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 180px;
  width: 100%;
}
</style>
