<script setup lang="ts">
import { onMounted, ref } from "vue"

const isDarkMode = ref(false)

const applyTheme = (dark: boolean) => {
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  localStorage.setItem("theme", dark ? "dark" : "light")
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  applyTheme(isDarkMode.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  isDarkMode.value = savedTheme ? savedTheme === "dark" : prefersDark
  applyTheme(isDarkMode.value)
})
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <md-outlined-icon-button
        type="button"
        :aria-label="isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'"
        @click="toggleTheme"
      >
        <svg v-if="isDarkMode" class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 17.5q2.3 0 3.9-1.6 1.6-1.6 1.6-3.9t-1.6-3.9Q14.3 6.5 12 6.5T8.1 8.1Q6.5 9.7 6.5 12t1.6 3.9q1.6 1.6 3.9 1.6Zm0 2.5q-.4 0-.7-.3-.3-.3-.3-.7v-1q0-.4.3-.7.3-.3.7-.3t.7.3q.3.3.3.7v1q0 .4-.3.7-.3.3-.7.3Zm0-13q-.4 0-.7-.3Q11 6.4 11 6V5q0-.4.3-.7.3-.3.7-.3t.7.3q.3.3.3.7v1q0 .4-.3.7-.3.3-.7.3Zm7 6q-.4 0-.7-.3-.3-.3-.3-.7t.3-.7q.3-.3.7-.3h1q.4 0 .7.3.3.3.3.7t-.3.7q-.3.3-.7.3Zm-15 0q-.4 0-.7-.3Q3 12.4 3 12t.3-.7q.3-.3.7-.3h1q.4 0 .7.3.3.3.3.7t-.3.7q-.3.3-.7.3Zm12.95 4.35-.7-.7q-.275-.275-.275-.7t.275-.7q.275-.275.7-.275t.7.275l.7.7q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275Zm-9.9-9.9-.7-.7q-.275-.275-.275-.7t.275-.7q.275-.275.7-.275t.7.275l.7.7q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275Zm9.9 0q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l.7-.7q.275-.275.7-.275t.7.275q.275.275.275.7t-.275.7Zm-9.9 9.9q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l.7-.7q.275-.275.7-.275t.7.275q.275.275.275.7t-.275.7Z" />
        </svg>
        <svg v-else class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12.1 22q-4 0-7-2.95Q2.1 16.1 2.1 12.1q0-3.6 2.38-6.4 2.37-2.8 5.92-3.5.5-.1.78.14.27.24.27.66 0 .12-.03.24-.02.11-.07.23-.3.7-.45 1.46-.15.77-.15 1.57 0 3.13 2.18 5.31Q15.1 14.1 18.23 14.1q.78 0 1.54-.15.77-.15 1.48-.45.1-.05.21-.07.12-.03.25-.03.42 0 .66.28.24.27.14.77-.7 3.55-3.48 5.92Q15.75 22 12.1 22Z" />
        </svg>
      </md-outlined-icon-button>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: 32px;
  padding: 20px 0 8px;
}

.footer-inner {
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-icon {
  width: 22px;
  height: 22px;
}
</style>
