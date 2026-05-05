<script setup lang="ts">
defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  login: []
}>()
</script>

<template>
  <section class="login-screen">
    <div class="login-content">
      <h1>XCOMPOSERにログイン</h1>
      <md-filled-button type="button" :disabled="isLoading" @click="emit('login')">
        Googleにログイン
      </md-filled-button>
    </div>
  </section>
</template>

<style scoped>
.login-screen {
  box-sizing: border-box;
  min-height: calc(100vh - 64px);
  padding: 32px 20px;
  display: grid;
  place-items: center;
}

.login-content {
  width: min(100%, 420px);
  display: grid;
  gap: 24px;
  justify-items: center;
  text-align: center;
}

h1 {
  margin: 0;
  color: var(--md-sys-color-on-surface);
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.3;
  font-weight: 500;
}

md-filled-button {
  min-width: 220px;
}
</style>
