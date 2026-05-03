<script setup lang="ts">
import { computed, ref } from "vue"

const emit = defineEmits<{
  add: [authToken: string]
}>()

const dialog = ref<HTMLElement & { show?: () => void; close?: () => void } | null>(null)
const authToken = ref("")
const canAdd = computed(() => authToken.value.trim().length > 0)

const handleAuthTokenInput = (event: Event) => {
  authToken.value = (event.target as HTMLElement & { value?: string }).value || ""
}

const open = () => {
  authToken.value = ""
  dialog.value?.show?.()
}

const close = () => {
  dialog.value?.close?.()
}

const addAccount = () => {
  if (!canAdd.value) {
    return
  }

  emit("add", authToken.value.trim())
  close()
}

defineExpose({
  open,
  close,
})
</script>

<template>
  <md-dialog ref="dialog">
    <div slot="headline">アカウントを追加</div>
    <form id="account-token-dialog-form" slot="content" class="account-dialog-form" @submit.prevent="addAccount">
      <md-outlined-text-field
        label="auth_token"
        type="password"
        :value="authToken"
        required
        @input="handleAuthTokenInput"
      ></md-outlined-text-field>
    </form>
    <div slot="actions">
      <md-text-button type="button" @click="close">キャンセル</md-text-button>
      <md-filled-button type="submit" form="account-token-dialog-form" :disabled="!canAdd">追加</md-filled-button>
    </div>
  </md-dialog>
</template>

<style scoped>
.account-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: min(420px, calc(100vw - 64px));
}

md-outlined-text-field {
  width: 100%;
}
</style>
