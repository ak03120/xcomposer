<script setup lang="ts">
import { onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import Footer from "@/components/Footer.vue"
import NavBar from "@/components/NavBar.vue"

const route = useRoute()
const router = useRouter()

const saveAccount = async () => {
  try {
    const code = route.query.code
    const state = route.query.state

    if (typeof code !== "string" || !code) return

    const savedState = sessionStorage.getItem("x_oauth_state")
    if (!savedState || savedState !== state) return

    const codeVerifier = sessionStorage.getItem("x_oauth_code_verifier")
    if (!codeVerifier) return

    sessionStorage.removeItem("x_oauth_state")
    sessionStorage.removeItem("x_oauth_code_verifier")

    await fetch("/api/x/auth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
    })
  } catch {
  } finally {
    await router.replace("/")
  }
}

onMounted(saveAccount)
</script>

<template>
  <main class="page-shell" aria-label="Login x callback page">
    <NavBar title="XCOMPOSER" />

    <section class="callback-surface" aria-label="読み込み中">
      <md-circular-progress indeterminate></md-circular-progress>
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

.callback-surface {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 40px 16px;
}
</style>
