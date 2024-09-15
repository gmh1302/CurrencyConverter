<template>
  <div v-if="visible" class="alert-overlay">
    <div class="alert-box">
      <div class="alert-header">
        <div class="icon">
          &#x26A0;
        </div>
        <button class="close-btn" @click="closeAlert">✖</button>
      </div>
      <div class="alert-body">
        <p>{{ message }}</p>
      </div>
      <div class="alert-footer">
        <button @click="closeAlert">확인</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>

import { ref } from 'vue';

const props = defineProps<{ message: string }>();

const visible = ref(true);

const closeAlert = () => {
  visible.value = false;
};

</script>

<style scoped>

.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.alert-box {
  width: 400px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.icon {
  font-size: 27px;
  font-weight: bold;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.close-btn:hover {
  color: #ffcccc;
}

.alert-body {
  padding: 20px;
  font-size: 16px;
  color: #333;
  text-align: center;
}

.alert-footer {
  padding: 10px 20px;
  display: flex;
  justify-content: flex-end;
}

.alert-footer button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.alert-footer button:hover {
  background-color: #0056b3;
}

</style>