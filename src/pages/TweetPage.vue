<script setup lang="ts">
import AccountMenu from "@/components/AccountMenu.vue"
import Footer from "@/components/Footer.vue"
import LoginScreen from "@/components/LoginScreen.vue"
import NavBar from "@/components/NavBar.vue"
import TweetComposer from "@/components/TweetComposer.vue"
import { useAuth } from "@/composables/useAuth"

const { isAuthResolved, isSignedIn, sessionUser, isSigningInWithGoogle, signInWithGoogle, signOut } = useAuth()
</script>

<template>
  <main class="page-shell" aria-label="Tweet page">
    <NavBar title="XCOMPOSER">
      <template #actions>
        <AccountMenu
          v-if="isAuthResolved && isSignedIn"
          :image="sessionUser?.image"
          :name="sessionUser?.name"
          @sign-out="signOut"
        />
      </template>
    </NavBar>

    <LoginScreen
      v-if="isAuthResolved && !isSignedIn"
      :is-loading="isSigningInWithGoogle"
      @login="signInWithGoogle"
    />

    <TweetComposer v-else-if="isAuthResolved" />

    <Footer />
  </main>
</template>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
</style>
