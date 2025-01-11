<template>
  <v-container class="py-10">
    <v-card class="custom-card">
      <!-- 탭 버튼 -->
      <v-tabs v-model="activeTab" class="tabs-container">
        <v-tab class="tab" value="converter"><span style="color: white; font-size: 21px;">환율 변환기</span></v-tab>
        <v-tab class="tab" value="chart"><span style="color: white; font-size: 21px;">환율 변동 차트</span></v-tab>
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

// TODO 1 : 더 많은 국가 조회되도록 수정. https://api.frankfurter.app/currencies 링크 말고 더 좋은 링크 찾기.
// TODO 2 : 위 링크 찾게되면, 국가별로 조회되도록 로직 수정 -> 화폐 단위 겹쳐도 됨. 그냥 전부 보여주는게 사용자 입장에서 좋을듯.
// TODO 3 : Chart.js를 활용한 차트 개발. 어떤 차트를 어떻게 보여줄지? 1일, 1주일, 1개월, 1년 등 기간별로도 보여줄 것인지? 고려 필요.
// TODO 4 : 소스 정리 && 전반적인 UI 디자인 손보기

import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

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
    const validCurrencies = await (await fetch('https://api.frankfurter.app/currencies')).json();
    const countries = await (await fetch('https://restcountries.com/v3.1/all')).json();

    console.log("validCurrencies ::: ", validCurrencies);
    console.log("countries ::: ", countries);

    currencies.value = Object.entries(validCurrencies).map(([code]) => {
      const country = countries.find((c: any) =>
          c.currencies && Object.keys(c.currencies).includes(code)
      );

      return {
        code,
        flag: country?.flags?.png || '', // 국기 URL
        countryName: country?.name?.common || '', // 나라 이름
      };
    });
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
  height: 245px;
}

.v-tabs--density-default {
  --v-tabs-height: 68px;
}
.v-list-item {
  color: black !important;
  background-color: white !important;
}
</style>
