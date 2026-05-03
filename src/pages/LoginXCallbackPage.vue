<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import Footer from "@/components/Footer.vue"
import NavBar from "@/components/NavBar.vue"

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const errorMessage = ref("")

const saveAccount = async () => {
  isLoading.value = true
  errorMessage.value = ""

  try {
    const code = route.query.code
    const state = route.query.state

    if (typeof code !== "string" || !code) {
      throw new Error("X 認証コードが見つかりません。")
    }

    const savedState = sessionStorage.getItem("x_oauth_state")
    if (!savedState || savedState !== state) {
      throw new Error("OAuth state が一致しません。")
    }

    const codeVerifier = sessionStorage.getItem("x_oauth_code_verifier")
    if (!codeVerifier) {
      throw new Error("code_verifier が見つかりません。")
    }

    sessionStorage.removeItem("x_oauth_state")
    sessionStorage.removeItem("x_oauth_code_verifier")

    const response = await fetch("/api/x/auth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
    })

    const data = (await response.json()) as { ok?: boolean; error?: string }

    if (!response.ok) {
      throw new Error(data.error || "X アカウント保存に失敗しました。")
    }

    await router.replace("/")
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "X アカウント保存に失敗しました。"
  } finally {
    isLoading.value = false
  }
}

onMounted(saveAccount)
</script>

<template>
  <main class="page-shell" aria-label="Login x callback page">
    <NavBar title="XCOMPOSER" />

    <section class="callback-surface">
      <h1>Xアカウントを連携しています</h1>
      <p v-if="isLoading">認証情報を保存しています。しばらくお待ちください。</p>
      <p v-else-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <Footer />
  </main>
</template>

<style scoped>
.page-shell {
  box-sizing: border-box;
  min-height: 100vh;
}

.callback-surface {
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 20px auto 0;
  padding: 0 20px;
}

h1 {
  margin: 0;
  color: var(--md-sys-color-on-surface);
  font-size: clamp(1.75rem, 6vw, 2.5rem);
  line-height: 1.2;
  font-weight: 500;
}

p {
  margin: 12px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.7;
}
</style>
