<script setup lang="ts">
import { computed, ref } from "vue"

const emit = defineEmits<{
  add: [url: string]
}>()

const dialog = ref<HTMLElement & { show?: () => void; close?: () => void } | null>(null)
const url = ref("")
const hasTouched = ref(false)

const isUrlInvalid = computed(() => {
  const value = url.value.trim()

  if (!value) {
    return false
  }

  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:"
  } catch {
    return true
  }
})
const shouldShowUrlError = computed(() => hasTouched.value && isUrlInvalid.value)
const canAdd = computed(() => url.value.trim().length > 0 && !isUrlInvalid.value)
const supportingText = computed(() => shouldShowUrlError.value ? "URL形式で入力してください。" : "")

const handleUrlInput = (event: Event) => {
  url.value = (event.target as HTMLElement & { value?: string }).value || ""
  hasTouched.value = true
}

const open = () => {
  url.value = ""
  hasTouched.value = false
  dialog.value?.show?.()
}

const close = () => {
  dialog.value?.close?.()
}

const addWebhook = () => {
  hasTouched.value = true
  if (!canAdd.value) {
    return
  }

  emit("add", url.value.trim())
  close()
}

defineExpose({
  open,
  close,
})
</script>

<template>
  <md-dialog ref="dialog">
    <div slot="headline">Discord ウェブフックを追加</div>
    <form id="discord-webhook-dialog-form" slot="content" class="discord-webhook-dialog-form" @submit.prevent="addWebhook">
      <md-outlined-text-field
        label="Discord ウェブフック"
        type="url"
        :value="url"
        required
        :error="shouldShowUrlError"
        :supporting-text="supportingText"
        @input="handleUrlInput"
      ></md-outlined-text-field>
    </form>
    <div slot="actions">
      <md-text-button type="button" @click="close">キャンセル</md-text-button>
      <md-filled-button type="submit" form="discord-webhook-dialog-form" :disabled="!canAdd">保存</md-filled-button>
    </div>
  </md-dialog>
</template>

<style scoped>
.discord-webhook-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: min(420px, calc(100vw - 64px));
}

md-outlined-text-field {
  width: 100%;
}
</style>
