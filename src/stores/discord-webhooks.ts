import { computed, ref } from "vue"
import { defineStore } from "pinia"

export type DiscordWebhook = {
  id: string
  url: string
}

export const useDiscordWebhooksStore = defineStore("discord-webhooks", () => {
  const webhooks = ref<DiscordWebhook[]>([])
  const selectedWebhookId = ref("")
  const isLoading = ref(false)

  const selectedWebhook = computed(() => webhooks.value.find((webhook) => webhook.id === selectedWebhookId.value))

  const loadWebhooks = async () => {
    isLoading.value = true

    try {
      const response = await fetch("/api/discord-webhooks")
      const data = await response.json<{ webhooks?: DiscordWebhook[]; error?: string }>()

      if (!response.ok) {
        throw new Error(data.error || "Discord ウェブフック一覧を取得できませんでした。")
      }

      webhooks.value = data.webhooks || []
      if (selectedWebhookId.value && !webhooks.value.some((webhook) => webhook.id === selectedWebhookId.value)) {
        selectedWebhookId.value = ""
      }
    } finally {
      isLoading.value = false
    }
  }

  const addWebhook = async (url: string) => {
    const response = await fetch("/api/discord-webhooks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url }),
    })
    const data = await response.json<{ webhooks?: DiscordWebhook[]; error?: string }>()

    if (!response.ok) {
      throw new Error(data.error || "Discord ウェブフックを追加できませんでした。")
    }

    webhooks.value = data.webhooks || []
    const addedWebhook = webhooks.value.at(-1)
    selectedWebhookId.value = addedWebhook?.id || selectedWebhookId.value
  }

  const clearWebhooks = () => {
    webhooks.value = []
    selectedWebhookId.value = ""
  }

  return {
    webhooks,
    selectedWebhook,
    selectedWebhookId,
    isLoading,
    loadWebhooks,
    addWebhook,
    clearWebhooks,
  }
})
