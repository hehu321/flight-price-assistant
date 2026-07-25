<template><div class="chart-container"><canvas ref="canvasRef"></canvas></div></template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import { TrendPoint } from "@/core/analytics/history-analysis";

const props = defineProps<{ points: TrendPoint[] }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let instance: Chart | null = null;

function render() {
  if (!canvasRef.value) return;
  instance?.destroy();
  instance = new Chart(canvasRef.value, {
    type: "line",
    data: { labels: props.points.map((point) => point.label), datasets: [{ label: "每次查询最低可比价", data: props.points.map((point) => point.price), borderColor: "#4f7cff", backgroundColor: "rgba(79,124,255,.14)", fill: true, tension: .28, pointRadius: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
        y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "#2e3a4e" } },
      },
    },
  });
}
onMounted(render);
watch(() => props.points, render, { deep: true });
onBeforeUnmount(() => instance?.destroy());
</script>

<style scoped>.chart-container { height: 180px; position: relative; width: 100%; }</style>
