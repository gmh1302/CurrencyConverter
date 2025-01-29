<template>
  <v-container class="py-10">
    <v-card class="custom-card">
      <!-- 탭 버튼 -->
      <v-tabs v-model="activeTab" class="tabs-container">
        <v-tab class="tab" value="converter"><span style="color: white; font-size: 20px;">환율 변환기</span></v-tab>
        <v-tab class="tab" value="chart"><span style="color: white; font-size: 20px;">환율 변동 차트</span></v-tab>
      </v-tabs>

      <!-- 탭 내용 -->
      <v-card-text>
        <!-- 1. 환율 변동 차트 -->
        <v-row v-if="activeTab === 'converter'" class="converter-content">
          <!-- 첫 번째 필드 -->
          <v-col cols="12" style="height: 100px;">
            <v-row align="center">
              <v-col cols="8">
                <v-select
                    v-model="fromCurrency"
                    :items="currencies"
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
                    :items="currencies"
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

// TODO 1 : 확대했더니 그래프 사라짐. 버그 수정 필요
// TODO 2 : 탭별(1개월,1년,5년)로 x축 시간 어떻게 보여줄지 수정 필요. 마우스 휠 했을 때도 보여지는게 자연스러워야 함.
// TODO 3 : 소스 정리

import { ref, onMounted, watch, nextTick } from 'vue';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';

import { representativeCountries } from "../data/representativeCountries";

import zoomPlugin from 'chartjs-plugin-zoom'; // ★ 추가

Chart.register(...registerables, zoomPlugin); // ★ 플러그인 등록

const activeTab = ref('converter');
const amount1 = ref<number | ''>(1);
const amount2 = ref<number | ''>(0);
const fromCurrency = ref('USD');
const toCurrency = ref('KRW');
const currencies = ref<any[]>([]); // 화폐 단위 Select Box 목록
const rates = ref<Record<string, Record<string, number>>>({});

const activePeriod = ref(7); // 기본값 1주일
const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null; // 차트 인스턴스

const periods = ref([
  { label: "1개월", value: 30 },
  { label: "1년", value: 365 },
  { label: "5년", value: 1825 },
]);

const changePeriod = (days: number) => {
  activePeriod.value = days;
  fetchHistoricalRates(days);
}

onMounted(async () => {
  await fetchCurrencies();
  await fetchRates();
  await fetchHistoricalRates(30);
  activePeriod.value = 30;
});

const fetchCurrencies = async () => {
  try {
    const countries = await (await fetch('https://restcountries.com/v3.1/all')).json();

    currencies.value = Object.entries(representativeCountries).map(([code, countryName]) => {
      const country = countries.find((c: any) => c.name.common === countryName);
      return {
        code,
        // flag: country?.flags?.png || '',
        flag: country?.flags?.png || '/default-flag.png', // 기본 플래그 추가
        countryName,
      };
    }).filter(item => item.code && item.countryName) // 유효 데이터만 필터링
        .sort((a, b) => a.countryName.localeCompare(b.countryName));

    // 유럽연합(EU) 추가
    currencies.value.push({
      code: 'EUR',
      flag: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg', // 유럽연합 깃발
      countryName: 'European Union',
    });

    // 전체 데이터 정렬
    currencies.value.sort((a, b) => a.countryName.localeCompare(b.countryName));
  } catch (error) {
    console.error('Error fetching currencies:', error);
  }
};

const fetchRates = async () => {
  try {
    const response = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: fromCurrency.value },
    });
    const reverseResponse = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: toCurrency.value },
    });

    rates.value[fromCurrency.value] = response.data.rates;
    rates.value[toCurrency.value] = reverseResponse.data.rates;

    updateAmount2();
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }
};

// 소수점 처리 -> 2자리까지만 허용
const limitToDecimals = (value: string) => {
  if (value.includes('.')) {
    const [integer, decimal] = value.split('.');
    return decimal.length > 2 ? `${integer}.${decimal.slice(0, 2)}` : value;
  }
  return value;
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

const swapCurrencies = () => {
  const tempCurrency = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = tempCurrency;

  updateAmount2(); // 최신 환율 기준으로 amount2 업데이트
};

// 날짜 포맷을 YYYY-MM-DD로 변환하는 함수
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const fetchHistoricalRates = async (days: number) => {
  try {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days); // 현재 날짜에서 days일 전으로 이동

    const start_date = formatDate(pastDate);
    const end_date = formatDate(today);

    // ✅ API 요청
    const response = await axios.get(`https://api.frankfurter.app/${start_date}..${end_date}`, {
      params: {
        from: fromCurrency.value,
        to: toCurrency.value,
      },
    });

    const rates = response.data.rates;
    if (!rates) {
      console.error("No exchange rate data found.");
      return;
    }

    let labels = Object.keys(rates); // 날짜 리스트
    let data = labels.map(date => rates[date][toCurrency.value]);

    // ✅ X축 필터링 (기간별 조정)
    if (days === 30) {
      // 1개월: 3일 간격으로 X축 표시
      labels = labels.filter((_, index) => index % 3 === 0);
      data = data.filter((_, index) => index % 3 === 0);
    } else if (days === 365) {
      // 1년: 매월 첫 번째 거래일만 X축에 표시
      labels = labels.filter((date, index, arr) => {
        const currentMonth = date.substring(0, 7);
        return index === 0 || currentMonth !== arr[index - 1].substring(0, 7);
      });
      data = data.filter((_, index) => labels.includes(labels[index]));
    } else if (days === 1825) {
      // 5년: 매년 첫 번째 거래일만 X축에 표시
      labels = labels.filter((date, index, arr) => {
        const currentYear = date.substring(0, 4);
        return index === 0 || currentYear !== arr[index - 1].substring(0, 4);
      });
      data = data.filter((_, index) => labels.includes(labels[index]));
    }

    updateChart(labels, data);
  } catch (error) {
    console.error("환율 데이터를 가져오는 중 오류 발생:", error);
  }
};

const updateChart = (labels: string[], data: number[]) => {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartRef.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${fromCurrency.value} → ${toCurrency.value} 환율 변동`,
          data,
          borderColor: "#004225",
          backgroundColor: "rgba(0, 66, 37, 0.2)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        zoom: {  // ★ Zoom & Pan 기능 추가
          pan: {
            enabled: true,
            mode: "x", // ★ X축 방향으로만 이동 가능
            speed: 10, // 이동 속도
          },
          zoom: {
            wheel: {
              enabled: true, // ★ 마우스 휠로 확대/축소 가능
            },
            pinch: {
              enabled: true, // ★ 터치 패드 핀치 줌 지원
            },
            mode: "x", // ★ X축만 확대/축소 가능
            limits: {
              x: {
                min: 10,  // ✅ 최소한 10개 이상의 데이터가 보이도록 제한
                max: labels.length, // ✅ 최대 줌 범위는 전체 데이터 크기
                minRange: 10, // ✅ 너무 확대되지 않도록 최소 범위 설정
              },
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: false,
        },
        y: {
          beginAtZero: false,
        },
      },
    },
  });
};

watch([fromCurrency, toCurrency, activeTab], async ([newFrom, newTo, newTab], [oldFrom, oldTo, oldTab]) => {
  // ✅ 첫 번째 탭: 화폐 변경 시 환율 갱신
  if (newFrom !== oldFrom || newTo !== oldTo) {
    await fetchRates();
  }

  // ✅ 두 번째 탭: '환율 변동 차트' 탭 선택 시 1주일 기준 차트 표시
  if (newTab === 'chart' && oldTab !== 'chart') {
    await nextTick(); // ★ DOM이 렌더링된 후 실행
    await fetchHistoricalRates(30);
    activePeriod.value = 30;
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

.divider {
  border: none;
  border-top: 2px solid #004225;
}

.currency-select-box .v-input__control,
.amount-text-field .v-input__control {
  height: 100px;
  font-size: 30px;
}

.v-card-text {
  height: 310px;
}

.v-tabs--density-default {
  --v-tabs-height: 68px;
}
.v-list-item {
  color: black !important;
  background-color: white !important;
}

.swap-button {
  width: 100%;
  margin: 0 auto; /* 중앙 정렬 */
  font-size: 20px; /* 글자 크기 */
  font-weight: bold; /* 글자 굵기 */
  height: 53px !important;
  text-transform: none; /* 문구 대문자 변환 방지 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.chart-wrapper {
  height: 223px; /* 🛠 원하는 높이로 조절 (기존보다 증가) */
}

canvas {
  height: 100% !important; /* 🛠 차트가 부모 요소 크기를 따르도록 설정 */
}

.active-period {
  background-color: #004225 !important;
  color: white !important;
}
</style>
