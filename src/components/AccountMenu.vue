<script setup lang="ts">
import { ref } from "vue"

const props = defineProps<{
  image?: string | null
  name?: string | null
}>()

const emit = defineEmits<{
  signOut: []
}>()

const menu = ref<(HTMLElement & { open?: boolean }) | null>(null)

const toggle = () => {
  if (!menu.value) return
  menu.value.open = !menu.value.open
}

const handleSignOut = () => {
  if (menu.value) menu.value.open = false
  emit("signOut")
}

defineExpose({ menu })
</script>

<template>
  <md-filled-tonal-button
    id="account-menu-button"
    class="account-menu-button"
    type="button"
    @click="toggle"
  >
    <img
      v-if="props.image"
      class="account-avatar"
      :src="props.image"
      :alt="props.name ?? ''"
    />
    <svg v-else class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 8.6-4.8 8.6-7.3 0-.5-.1-.9-.1-1.3Z"/>
      <path fill="#4285F4" d="M20.5 12c0-.5-.1-.9-.1-1.3H12v3.9h4.8c-.2 1.1-.9 2-1.8 2.6v2.2h2.9c1.7-1.6 2.6-4 2.6-7.4Z"/>
      <path fill="#FBBC05" d="M6.4 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V8.1H3.4C2.9 9.2 2.6 10.5 2.6 12s.3 2.8.8 3.9Z"/>
      <path fill="#34A853" d="M12 21.3c2.5 0 4.6-.8 6.1-2.2l-2.9-2.2c-.8.6-1.8 1-3.2 1-2.4 0-4.5-1.6-5.3-3.8H3.6v2.3c1.5 3 4.6 4.9 8.4 4.9Z"/>
    </svg>
  </md-filled-tonal-button>
  <md-menu
    ref="menu"
    anchor="account-menu-button"
    positioning="popover"
    quick
    class="account-menu"
  >
    <md-menu-item @click="handleSignOut">
      <div slot="headline">ログアウト</div>
    </md-menu-item>
  </md-menu>
</template>

<style scoped>
.account-menu-button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.account-menu {
  --md-menu-container-color: var(--md-sys-color-surface-container);
}
</style>
