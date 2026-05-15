<script setup lang="ts">
import { RouterLink } from "vue-router"
import Footer from "@/components/Footer.vue"
import NavBar from "@/components/NavBar.vue"
</script>

<template>
  <main class="page-shell" aria-label="Login error page">
    <NavBar title="XCOMPOSER" />

    <section class="error-surface">
      <div class="error-content">
        <h1>認証に失敗しました</h1>
        <p>もう一度ログインをお試しください。</p>
        <RouterLink class="home-link" to="/">ホームに戻る</RouterLink>
      </div>
    </section>

    <Footer />
  </main>
</template>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.error-surface {
  flex: 1;
  box-sizing: border-box;
  padding: 40px 20px;
  display: grid;
  place-items: center;
}

.error-content {
  width: min(100%, 420px);
  display: grid;
  gap: 16px;
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

p {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.7;
}

.home-link {
  color: var(--md-sys-color-primary);
  text-decoration: none;
  font-weight: 500;
}

.home-link:hover {
  text-decoration: underline;
}
</style>
