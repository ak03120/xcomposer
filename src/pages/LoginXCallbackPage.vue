<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import Footer from "@/components/Footer.vue"
import NavBar from "@/components/NavBar.vue"
import { authClient } from "@/lib/auth-client"

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const errorMessage = ref("")

const saveAccount = async () => {
  isLoading.value = true
  errorMessage.value = ""

  try {
    const code = route.query.code

    if (typeof code !== "string" || !code) {
      throw new Error("X 認証コードが見つかりません。")
    }

    const session = await authClient.getSession()
    const googleSub = session.data?.user?.id

    if (!googleSub) {
      throw new Error("Google ログイン状態を確認できませんでした。")
    }

    await fetch("/api/x/accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        googleSub,
        accessToken: code,
      }),
    })

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
