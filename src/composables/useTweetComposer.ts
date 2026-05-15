import { computed, ref, watch } from "vue"
import type { ComputedRef, Ref } from "vue"
import { storeToRefs } from "pinia"
import { toast } from "vue-sonner"
import { clearTweetDraft, loadTweetDraft, saveTweetDraft } from "@/lib/tweet-draft"
import { useAccountsStore } from "@/stores/accounts"
import { useDiscordWebhooksStore } from "@/stores/discord-webhooks"

type SelectedImage = {
  id: string
  file: File
  url: string
}

const maxTweetLength = 280

export const useTweetComposer = (
  isSignedIn: ComputedRef<boolean>,
  signedInUserId: ComputedRef<string>,
  selectedImages: Ref<SelectedImage[]>,
  clearSelectedImages: () => void,
) => {
  const accountStore = useAccountsStore()
  const discordWebhooksStore = useDiscordWebhooksStore()
  const { accounts, selectedAccountId, isLoading: isLoadingAccounts } = storeToRefs(accountStore)
  const { webhooks: discordWebhooks, selectedWebhookId: selectedDiscordWebhookId, isLoading: isLoadingDiscordWebhooks } = storeToRefs(discordWebhooksStore)

  const tweetText = ref("")
  const isPosting = ref(false)
  const hasTriedSubmit = ref(false)
  const errorMessage = ref("")

  const remainingCharacters = computed(() => maxTweetLength - tweetText.value.length)
  const characterCountText = computed(() => `${tweetText.value.length}/${maxTweetLength}`)
  const isAccountMissing = computed(() => !selectedAccountId.value)
  const isTweetMissing = computed(() => tweetText.value.trim().length === 0)
  const shouldShowAccountError = computed(() => hasTriedSubmit.value && isAccountMissing.value)
  const shouldShowTweetError = computed(() => hasTriedSubmit.value && (isTweetMissing.value || remainingCharacters.value < 0))
  const accountSupportingText = computed(() => shouldShowAccountError.value ? "投稿アカウントは必須です" : "")
  const tweetSupportingText = computed(() => {
    if (shouldShowTweetError.value && isTweetMissing.value) {
      return "本文は必須です"
    }
    return characterCountText.value
  })
  const canPost = computed(() => Boolean(selectedAccountId.value) && tweetText.value.trim().length > 0 && remainingCharacters.value >= 0 && !isPosting.value)
  const isComposerDisabled = computed(() => !isSignedIn.value || isPosting.value)

  const resetComposerForm = () => {
    hasTriedSubmit.value = false
    errorMessage.value = ""
    tweetText.value = ""
    selectedDiscordWebhookId.value = ""
    clearSelectedImages()
  }

  const resetComposerAfterPost = () => {
    hasTriedSubmit.value = false
    errorMessage.value = ""
    tweetText.value = ""
    clearSelectedImages()
  }

  const restoreComposerDraft = () => {
    if (!signedInUserId.value) return
    const draft = loadTweetDraft(signedInUserId.value)
    if (!draft) return
    tweetText.value = draft.tweetText
    selectedAccountId.value = draft.selectedAccountId
    selectedDiscordWebhookId.value = draft.selectedDiscordWebhookId
  }

  const persistComposerDraft = () => {
    if (!signedInUserId.value) return
    saveTweetDraft(signedInUserId.value, {
      tweetText: tweetText.value,
      selectedAccountId: selectedAccountId.value,
      selectedDiscordWebhookId: selectedDiscordWebhookId.value,
    })
  }

  const clearComposerDraft = (userId = signedInUserId.value) => {
    if (!userId) return
    clearTweetDraft(userId)
  }

  const loadAccounts = async () => {
    errorMessage.value = ""
    try {
      await Promise.all([
        accountStore.loadAccounts(),
        discordWebhooksStore.loadWebhooks(),
      ])
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "フォーム情報を取得できませんでした。"
    }
  }

  const handleAccountChange = (event: Event) => {
    selectedAccountId.value = (event.target as HTMLElement & { value?: string }).value || ""
    if (selectedAccountId.value) {
      hasTriedSubmit.value = false
    }
  }

  const handleTextInput = (event: Event) => {
    tweetText.value = (event.target as HTMLElement & { value?: string }).value || ""
    if (tweetText.value.trim().length > 0) {
      hasTriedSubmit.value = false
    }
  }

  const handleDiscordWebhookChange = (event: Event) => {
    selectedDiscordWebhookId.value = (event.target as HTMLElement & { value?: string }).value || ""
  }

  const postTweet = async () => {
    hasTriedSubmit.value = true

    if (!canPost.value) {
      if (isAccountMissing.value) {
        toast.error("投稿アカウントは必須です。")
      } else if (isTweetMissing.value) {
        toast.error("本文は必須です。")
      } else if (remainingCharacters.value < 0) {
        toast.error("本文が長すぎます。")
      }
      return
    }

    isPosting.value = true
    errorMessage.value = ""

    try {
      const formData = new FormData()
      formData.append("accountId", selectedAccountId.value)
      formData.append("text", tweetText.value.trim())
      if (selectedDiscordWebhookId.value) {
        formData.append("discordWebhookId", selectedDiscordWebhookId.value)
      }
      selectedImages.value.forEach((image) => formData.append("images", image.file))

      const response = await fetch("/api/tweets", { method: "POST", body: formData })
      const data = await response.json<{ id?: string; error?: string }>()

      if (!response.ok) {
        throw new Error(data.error || "投稿に失敗しました。")
      }

      const tweetUrl = data.id ? `https://x.com/i/status/${data.id}` : ""
      toast.success("投稿しました。", tweetUrl ? {
        action: {
          label: "ツイートを表示",
          onClick: () => window.open(tweetUrl, "_blank", "noopener"),
        },
      } : undefined)
      resetComposerAfterPost()
      persistComposerDraft()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "投稿に失敗しました。")
    } finally {
      isPosting.value = false
    }
  }

  watch(
    [tweetText, selectedAccountId, selectedDiscordWebhookId],
    () => {
      if (isSignedIn.value) {
        persistComposerDraft()
      }
    },
  )

  return {
    accounts,
    selectedAccountId,
    isLoadingAccounts,
    discordWebhooks,
    selectedDiscordWebhookId,
    isLoadingDiscordWebhooks,
    accountStore,
    discordWebhooksStore,
    tweetText,
    isPosting,
    hasTriedSubmit,
    errorMessage,
    remainingCharacters,
    isAccountMissing,
    isTweetMissing,
    shouldShowAccountError,
    shouldShowTweetError,
    accountSupportingText,
    tweetSupportingText,
    canPost,
    isComposerDisabled,
    resetComposerForm,
    restoreComposerDraft,
    persistComposerDraft,
    clearComposerDraft,
    loadAccounts,
    handleAccountChange,
    handleTextInput,
    handleDiscordWebhookChange,
    postTweet,
  }
}
