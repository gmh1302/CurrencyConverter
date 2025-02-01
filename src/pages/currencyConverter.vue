<template>
  <v-container class="py-10">
    <v-card class="custom-card">
      <!-- 탭 버튼 -->
      <v-tabs v-model="activeTab" class="tabs-container">
        <v-tab class="tab" value="converter"><span style="color: white; font-size: 20px;">환율 변환기</span></v-tab>
        <v-tab class="tab" value="chart"><span style="color: white; font-size: 20px;">환율 변동 차트</span></v-tab>
      </v-tabs>

      <v-card-text>
        <!-- 1. 환율 변환기 -->
        <v-row v-if="activeTab === 'converter'" class="converter-content">
          <!-- 첫 번째 필드 -->
          <v-col cols="12" style="height: 100px;">
            <v-row align="center">
              <v-col cols="8">
                <v-select
                    v-model="fromCurrency"
                    :items="currencyList"
                    label="Currency"
                    outlined
                    class="currency-select-box mt-1"
                    item-title="code"
                    item-value="code"
                    style="height: 100px;"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props">
                      <v-avatar>
                        <img :src="item.raw.flag" :alt="item.raw.flag"  style="width: 30px; height: 20px;" />
                      </v-avatar>
                      <span style="margin-left: 10px;">{{ item.raw.countryName }}</span>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="4">
                <v-text-field
                    v-model="amount1"
                    label="Amount"
                    type="number"
                    outlined
                    class="amount-text-field mt-1"
                    @input="handleAmountInput('amount1', $event.target.value)"
                    style="height: 100px;"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-col>

          <!-- 구분선 -->
          <v-col cols="12">
            <hr class="divider" />
          </v-col>

          <!-- 두 번째 필드 -->
          <v-col cols="12" style="height: 100px;">
            <v-row align="center">
              <v-col cols="8">
                <v-select
                    v-model="toCurrency"
                    :items="currencyList"
                    label="Currency"
                    outlined
                    class="currency-select-box mt-1"
                    item-title="code"
                    item-value="code"
                    style="height: 100px;"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props">
                      <v-avatar>
                        <img :src="item.raw.flag" :alt="item.raw.flag"  style="width: 30px; height: 20px;" />
                      </v-avatar>
                      <span style="margin-left: 10px;">{{ item.raw.countryName }}</span>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="4">
                <v-text-field
                    v-model="amount2"
                    label="Amount"
                    type="number"
                    outlined
                    class="amount-text-field mt-1"
                    @input="handleAmountInput('amount2', $event.target.value)"
                    style="height: 100px;"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-col>

          <!-- 변환 버튼 -->
          <v-col>
            <v-btn
                class="swap-button"
                color="#004225"
                @click="swapCurrencies"
            >
              <v-icon left>mdi-autorenew</v-icon>
              <p style="margin: 0px 0px 3px 3px; font-size: 25px;">SWAP</p>
            </v-btn>
          </v-col>
        </v-row>

        <!-- 2. 환율 변동 차트 -->
        <v-row v-else>
          <v-col cols="12" class="chart-wrapper">
            <canvas ref="chartRef"></canvas>
          </v-col>

          <!-- 기간 선택 버튼 -->
          <v-col cols="12" class="d-flex justify-center">
            <v-btn-group>
              <v-btn
                  v-for="period in periods"
                  :key="period.value"
                  :class="{ 'active-period': activePeriod === period.value }"
                  @click="changePeriod(period.value)"
              >
                {{ period.label }}
              </v-btn>
            </v-btn-group>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>

// TODO : 변환 기능 최종 확인

import { ref, onMounted, watch, nextTick } from 'vue';
import axios from 'axios';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { currencyCountryMapping } from "../data/currencyCountryMapping";

Chart.register(...registerables);

const activeTab = ref('converter'); // 기본탭 : 환율 변환기
const amount1 = ref<number>(1);
const amount2 = ref<number>(0);
const fromCurrency = ref('USD');
const toCurrency = ref('KRW');
const currencyList = ref<any[]>([]); // 화폐 단위 Select Box 목록
const rates = ref<Record<string, Record<string, number>>>({});

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<"line", number[], unknown> | null = null; // 차트 인스턴스

const activePeriod = ref(30); // 차트 기간 기본값 : 1개월
const periods = ref([
  { label: "1개월", value: 30 },
  { label: "1년", value: 365 },
  { label: "5년", value: 1825 },
]);

onMounted(async () => {
  await getCurrencies();
  await getExchangeRates();
  await getExchangeRateHistory(activePeriod.value);
});

const changePeriod = (days: number) => {
  activePeriod.value = days;
  getExchangeRateHistory(days);
}

const getCurrencies = async () => {
  try {
    // 국가별 데이터 가져오기
    const countryList = await (await fetch('https://restcountries.com/v3.1/all')).json();

    // 화폐 코드 및 국가명 매핑
    currencyList.value = Object.entries(currencyCountryMapping).map(([code, countryName]) => {
      const country = countryList.find((c: any) => c.name.common === countryName);
      return {
        code,
        flag: country?.flags?.png || '',
        countryName,
      };
    }).filter(item => item.code && item.countryName) // 유효 데이터만 필터링

    // 유럽연합(EU) 추가
    currencyList.value.push({
      code: 'EUR',
      flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg',
      countryName: 'European Union',
    });

    // 전체 데이터 정렬 -> 국가명 기준
    currencyList.value.sort((a, b) => a.countryName.localeCompare(b.countryName));
  } catch (error) {
    console.error('Error fetching currencyList:', error);
  }
};

const getExchangeRates = async () => {
  try {
    // 기준 화폐(fromCurrency) 기준으로 최신 환율 데이터 가져오기
    const fromCurrencyResponse = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: fromCurrency.value },
    });

    // 대상 화폐(toCurrency) 기준으로 최신 환율 데이터 가져오기
    const toCurrencyResponse = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: toCurrency.value },
    });

    // 가져온 환율 데이터를 rates 객체에 저장
    rates.value[fromCurrency.value] = fromCurrencyResponse.data.rates;
    rates.value[toCurrency.value] = toCurrencyResponse.data.rates;

    // 최신 환율을 기준으로 변환된 금액 업데이트
    updateAmount2();
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }
};

const updateAmount1 = () => {
  if (fromCurrency.value === toCurrency.value) {
    amount1.value = amount2.value;
    return;
  }
  if (rates.value[toCurrency.value] && rates.value[toCurrency.value][fromCurrency.value]) {
    amount1.value = parseFloat((amount2.value * rates.value[toCurrency.value][fromCurrency.value]).toFixed(4)) || 0;
  }
};

const updateAmount2 = () => {
  if (fromCurrency.value === toCurrency.value) {
    amount2.value = amount1.value;
    return;
  }
  if (rates.value[fromCurrency.value] && rates.value[fromCurrency.value][toCurrency.value]) {
    amount2.value = parseFloat((amount1.value * rates.value[fromCurrency.value][toCurrency.value]).toFixed(4)) || 0;
  }
};

// 양방향 금액 수정 시, 업데이트 처리 핸들러
const handleAmountInput = (field: 'amount1' | 'amount2', value: string) => {
  const formattedValue = parseFloat(limitToDecimals(value)) || 0;

  if (field === 'amount1') {
    amount1.value = formattedValue;
    updateAmount2();
  } else {
    amount2.value = formattedValue;
    updateAmount1();
  }
};

// 소수점 처리 -> 4자리까지만 허용
const limitToDecimals = (value: string) => {
  if (value.includes('.')) {
    const [integer, decimal] = value.split('.');
    return decimal.length > 4 ? `${integer}.${decimal.slice(0, 4)}` : value;
  }
  return value;
};

// [SWAP] 버튼 클릭
const swapCurrencies = () => {
  const tempCurrency = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = tempCurrency;

  updateAmount2(); // 최신 환율 기준으로 amount2 업데이트
};

const getExchangeRateHistory = async (days: number) => {
  activePeriod.value = days;

  try {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days);

    const startDate = formatDate(pastDate);
    const endDate = formatDate(today);

    // 환율 데이터 가져오기
    const response = await axios.get(`https://api.frankfurter.app/${startDate}..${endDate}`, {
      params: { from: fromCurrency.value, to: toCurrency.value },
    });

    const rates = response.data.rates;
    if (!rates) {
      console.error("No exchange rate data found.");
      return;
    }

    let labels = Object.keys(rates); // 날짜 배열
    let data = labels.map(date => rates[date][toCurrency.value]); // 환율 배열

    // 기간별 데이터 필터링
    switch (days) {
    case 30: // 최근 1개월 데이터 (금요일만)
      [labels, data] = filterWeeklyData(labels, rates);
      break;
    case 365: // 최근 1년 데이터 (월별 대표 날짜만)
      [labels, data] = filterMonthlyData(labels, rates);
      break;
    case 1825: // 최근 5년 데이터 (연도별 대표 날짜만)
      [labels, data] = filterYearlyData(labels, rates);
      break;
    }

    updateChart(labels, data);
  } catch (error) {
    console.error("환율 데이터를 가져오는 중 오류 발생:", error);
  }
};

// 날짜 포맷 변환 -> YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const updateChart = (labels: string[], data: number[]) => {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${fromCurrency.value} → ${toCurrency.value} 환율`,
          data,
          borderColor: "#004225",
          backgroundColor: "rgba(0, 66, 37, 0.2)",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointStyle: "circle",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top', // 위치 조정 가능 (top, bottom, left, right)
          labels: {
            font: {
              size: 14,
            },
            color: '#004225',
          },
          onClick: (e: any) => e.stopPropagation(),
        }
      },
      y: {
        suggestedMin: Math.min(...data) * 0.95, // 최소값보다 5% 낮게 설정
        suggestedMax: Math.max(...data) * 1.05, // 최대값보다 5% 높게 설정
      },
    },
  } as ChartConfiguration<"line", number[], unknown>;

  // 차트 인스턴스 생성
  chartInstance = new Chart(chartRef.value, chartConfig);
};

const filterWeeklyData = (labels: string[], rates: Record<string, Record<string, number>>): [string[], number[]] => {
  const filteredLabels: string[] = [];
  const filteredData: number[] = [];

  labels.forEach((date, i) => {
    const dayOfWeek = new Date(date).getDay(); // 0: 일요일, 5: 금요일

    if (dayOfWeek === 5) { // 금요일 데이터 확인
      let validDate = findLastAvailableDate(date, rates); // 공휴일인 경우 대체 날짜 찾기
      if (validDate) {
        filteredLabels.push(validDate);
        filteredData.push(rates[validDate][toCurrency.value]);
      }
    }
  });

  return [filteredLabels, filteredData];
};

const filterMonthlyData = (labels: string[], rates: Record<string, Record<string, number>>): [string[], number[]] => {
  const monthMap = new Map<string, string>();

  labels.forEach(date => {
    const month = date.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      let validDate = findLastAvailableDate(date, rates); // 공휴일 처리
      if (validDate) {
        monthMap.set(month, validDate);
      }
    }
  });

  const filteredLabels = Array.from(monthMap.values());
  const filteredData = filteredLabels.map(date => rates[date][toCurrency.value]);

  return [filteredLabels.map(date => date.substring(0, 7)), filteredData];
};

const filterYearlyData = (labels: string[], rates: Record<string, Record<string, number>>): [string[], number[]] => {
  const yearMap = new Map<string, string>();

  labels.forEach(date => {
    const year = date.substring(0, 4); // YYYY
    if (!yearMap.has(year)) {
      let validDate = findLastAvailableDate(date, rates); // 공휴일 처리
      if (validDate) {
        yearMap.set(year, validDate);
      }
    }
  });

  const filteredLabels = Array.from(yearMap.values());
  const filteredData = filteredLabels.map(date => rates[date][toCurrency.value]);

  return [filteredLabels.map(date => date.substring(0, 4)), filteredData];
};

const findLastAvailableDate  = (targetDate: string, rates: Record<string, Record<string, number>>): string | null => {
  let date = new Date(targetDate);

  for (let i = 0; i < 7; i++) {
    const dateString = formatDate(date);
    if (rates[dateString]) {
      return dateString;
    }
    date.setDate(date.getDate() - 1); // 하루 전으로 이동
  }

  return null;
};

watch([fromCurrency, toCurrency, activeTab], async ([newFrom, newTo, newTab], [oldFrom, oldTo, oldTab]) => {
  // 첫 번째 탭: 화폐 변경 시 환율 갱신
  if (newFrom !== oldFrom || newTo !== oldTo) {
    await getExchangeRates();
  }

  // 두 번째 탭: '환율 변동 차트' 탭 선택 시 1주일 기준 차트 표시
  if (newTab === 'chart' && oldTab !== 'chart') {
    await nextTick();
    await getExchangeRateHistory(30);
  }
});

</script>

<style scoped>
.v-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  background-color: white;
}

.custom-card {
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  background: white;
  color: #004225;
  border-radius: 12px;
  border: 2px solid #004225;
}

.v-card-text {
  height: 310px;
}

.tabs-container {
  display: flex;
  justify-content: space-between;
  background-color: #004225;
  color: white;
  height: 70px;
}

.tab {
  flex: 1;
  text-align: center;
  font-weight: bold;
  color: #ffdb58;
}

.v-tabs--density-default {
  --v-tabs-height: 68px;
}

.divider {
  border: none;
  border-top: 2px solid #004225;
}

.currency-select-box .v-input__control,
.amount-text-field .v-input__control {
  height: 100px;
  font-size: 30px;
}

.v-list-item {
  color: black !important;
  background-color: white !important;
}

.chart-wrapper {
  height: 230px;
}

canvas {
  height: 100% !important;
}

.active-period {
  background-color: #004225 !important;
  color: white !important;
}

.swap-button {
  width: 100%;
  margin: 0 auto;
  font-size: 20px;
  font-weight: bold;
  height: 53px !important;
  text-transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.chart-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  color: #004225;
}
</style>
