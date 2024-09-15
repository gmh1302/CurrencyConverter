<script lang="ts" setup>

import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import { Chart, LineElement, PointElement, LineController, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartConfiguration } from 'chart.js';

// Chart.js 구성 요소 등록
Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface Props {
  chartData: number[];
  labels: string[];
  fromCurrency: string;
  toCurrency: string;
}

const props = defineProps<Props>();

let chartInstance: Chart | null = null;
const chartCanvas = ref<HTMLCanvasElement | null>(null);

const createChart = async () => {
  await nextTick();

  if (chartCanvas.value) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: props.labels,
        datasets: [{
          label: `${props.fromCurrency} to ${props.toCurrency}`,
          data: props.chartData,
          borderColor: '#007bff',
          fill: false,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            beginAtZero: false,
          },
        },
      },
    };

    chartInstance = new Chart(chartCanvas.value as HTMLCanvasElement, config);
  }
};

onMounted(() => {
  createChart();
});

watch(() => [props.chartData, props.labels], createChart);

// 컴포넌트를 unMount 하기 전, 차트 인스턴스 제거 → 메모리 누수 방지
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});

</script>

<template>
  <div>
    <canvas ref="chartCanvas" style="width: 100%; height: 400px;"></canvas>
  </div>
</template>

<style scoped>

</style>