<script lang="ts" setup>

import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import CurrencyLineChart from '../components/chart/currencyLineChart.vue';
import Alert from '../components/alert/alertDialog.vue'

/** 변수 선언 **/
const amount = ref(1);
const fromCurrency = ref('USD');
const toCurrency = ref('KRW');
const displayAmount = ref(1);
const displayFromCurrency = ref('USD');
const displayToCurrency = ref('KRW');
const convertedAmount = ref<number | null>(null);
const currencies = ref([]);
const activeTab = ref('converter'); // 탭을 관리하는 상태 변수

const chartData = ref<number[]>([]);
const chartLabels = ref<string[]>([]);

const alertVisible = ref(false);
const alertMessage = ref('');

onMounted(() => {
  getCurrencies();
  getWeeklyCurrencyData(fromCurrency.value, toCurrency.value);
});

// fromCurrency, toCurrency 변경 시, 최근 1주일 데이터 재조회
watch([fromCurrency, toCurrency], () => {
  getWeeklyCurrencyData(fromCurrency.value, toCurrency.value);
});

/** 함수 **/

// 환율 목록 조회
const getCurrencies = async () => {
  try {
    const response = await fetch('https://api.frankfurter.app/currencies');
    const data = await response.json();
    currencies.value = Object.keys(data);

  } catch (error) {
    await alertFunc(true, '환율 목록 조회에 실패했습니다.');
  }
};

// 최근 1주일 간의 특정 나라 환율 데이터 조회(주말 제외)
const getWeeklyCurrencyData = async (fromCurrency: string, toCurrency: string) => {
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const start = lastWeek.toISOString().split('T')[0]; // yyyy-mm-dd 형식
  const end = today.toISOString().split('T')[0];

  try {
    const response = await axios.get(`https://api.frankfurter.app/${start}..${end}`, {
      params: {
        from: fromCurrency,
        to: toCurrency,
      },
    });

    const data = response.data.rates;
    const labels = Object.keys(data);
    const rates = labels.map(date => data[date][toCurrency]);

    chartLabels.value = labels;
    chartData.value = rates;

  } catch (error) {
    await alertFunc(true, '1주일 간의 환율 데이터 조회에 실패했습니다.');
  }
};

// [변환] 버튼 클릭 시, 환율 변환
const convertCurrency = async () => {
  // 화폐가 같을 경우, 변환 없이 그대로 반환
  if (fromCurrency.value === toCurrency.value) {
    convertedAmount.value = amount.value;
    displayAmount.value = amount.value;
    displayFromCurrency.value = fromCurrency.value;
    displayToCurrency.value = toCurrency.value;
    return;
  }

  try {
    const response = await axios.get('https://api.frankfurter.app/latest', {
      params: {
        from: fromCurrency.value,
        to: toCurrency.value,
      },
    });

    const rate = response.data.rates[toCurrency.value];
    if (rate) {
      convertedAmount.value = rate * amount.value;
      displayAmount.value = amount.value;
      displayFromCurrency.value = fromCurrency.value;
      displayToCurrency.value = toCurrency.value;
    } else {
      convertedAmount.value = null;
    }

  } catch (error) {
    await alertFunc(true, '환율 변환에 실패했습니다.');
    convertedAmount.value = null;
  }
};

const changeTab = async (tab: string) => {
  if (tab === 'chart' && fromCurrency.value === toCurrency.value) {
    await alertFunc(true, '같은 통화로는 환율 차트를 확인할 수 없습니다.')
  } else {
    activeTab.value = tab;
  }
}

const alertFunc = async (showAlert: boolean, message: string) => {
  alertVisible.value = showAlert;
  alertMessage.value = message;
}

</script>

<template>
  <div class="page-container">
    <div class="currency-converter">
      <h1>환율 변환기</h1>

      <!-- 탭 버튼 추가 -->
      <div class="tabs">
        <button :class="{'active': activeTab === 'converter'}" @click="changeTab('converter')">환율 변환기</button>
        <button :class="{'active': activeTab === 'chart'}" @click="changeTab('chart')">환율 변동 차트</button>
      </div>

      <!-- 환율 변환기 탭 내용 -->
      <div v-if="activeTab === 'converter'" class="converter-box">
        <div class="input-group">
          <label for="amount">Amount</label>
          <input v-model="amount" id="amount" type="number" placeholder="Enter amount" />
        </div>
        <div class="input-group">
          <label for="fromCurrency">From</label>
          <select v-model="fromCurrency" id="fromCurrency">
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </div>
        <div class="input-group">
          <label for="toCurrency">To</label>
          <select v-model="toCurrency" id="toCurrency">
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </div>
        <button @click="convertCurrency">변환</button>
        <div v-if="convertedAmount !== null" class="result">
          <h2>{{ displayAmount }} {{ displayFromCurrency }} = {{ convertedAmount }} {{ displayToCurrency }}</h2>
        </div>
      </div>

      <!-- 라인 차트 탭 내용 -->
      <div v-if="activeTab === 'chart'" class="chart-box">
        <CurrencyLineChart
          :chartData="chartData"
          :labels="chartLabels"
          :fromCurrency="fromCurrency"
          :toCurrency="toCurrency"
        />
      </div>

      <!-- 알림창 컴포넌트 -->
      <Alert v-if="alertVisible" :message="alertMessage" />

    </div>
  </div>
</template>

<style scoped>

.page-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f0f2f5;
}

.currency-converter {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  max-width: 500px;
  width: 500px;
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  min-height: 560px;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
}

.tabs button {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  background-color: #e0e0e0;
  transition: background-color 0.3s ease;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.converter-box {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.converter-box, .chart-box {
  height: 400px;
}

#amount {
  width: 478px;
  height: 25px;
}

.input-group {
  margin-bottom: 15px;
}

label {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
  display: block;
  color: #555;
}

input, select {
  width: 100%;
  height: 46px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 16px;
  color: #333;
}

button {
  padding: 10px;
  background-color: #13264E;
  color: white;
  font-size: 22px;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}

button:hover {
  background-color: #0056b3;
}

.result {
  font-size: 18px;
  color: #333;
  text-align: center;
  height: 50px;
  overflow: hidden;
}

.result h2 {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

</style>