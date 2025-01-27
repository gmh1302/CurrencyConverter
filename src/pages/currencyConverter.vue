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
          <p>환율 변동 차트 콘텐츠가 여기에 표시됩니다.</p>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>

// TODO 1 : Chart.js를 활용한 차트 개발. 어떤 차트를 어떻게 보여줄지? 1일, 1주일, 1개월, 1년 등 기간별로도 보여줄 것인지? 고려 필요.
// TODO 2 : 나만의 탭 생성 -> 흔한 환율 변환기 기능 말고, 좀 색다른 기능 추가 필요. 대신 사용자가 쓸만한 기능이어야 함.
// TODO 3 : 소스 정리 and 전반적인 UI 디자인 손보기

import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

import { representativeCountries } from "../data/representativeCountries";

const activeTab = ref('converter');
const amount1 = ref<number | ''>(1);
const amount2 = ref<number | ''>(0);
const fromCurrency = ref('USD');
const toCurrency = ref('KRW');
const currencies = ref<any[]>([]); // 화폐 단위 Select Box 목록
const rates = ref<Record<string, Record<string, number>>>({});

onMounted(async () => {
  await fetchCurrencies();
  await fetchRates();
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
    amount1.value = parseFloat((amount2.value * rates.value[toCurrency.value][fromCurrency.value]).toFixed(2)) || 0;
  }
};

const updateAmount2 = () => {
  if (fromCurrency.value === toCurrency.value) {
    amount2.value = amount1.value;
    return;
  }
  if (rates.value[fromCurrency.value] && rates.value[fromCurrency.value][toCurrency.value]) {
    amount2.value = parseFloat((amount1.value * rates.value[fromCurrency.value][toCurrency.value]).toFixed(2)) || 0;
  }
};

const swapCurrencies = () => {
  const tempCurrency = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = tempCurrency;

  // 금액 재계산
  updateAmount2();
};

watch([fromCurrency, toCurrency], async ([newFrom, newTo], [oldFrom, oldTo]) => {
  if (newFrom !== oldFrom || newTo !== oldTo) {
    await fetchRates();
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

</style>
