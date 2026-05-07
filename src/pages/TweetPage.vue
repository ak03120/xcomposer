<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import Footer from "@/components/Footer.vue"
import LoginScreen from "@/components/LoginScreen.vue"
import NavBar from "@/components/NavBar.vue"
import { authClient } from "@/lib/auth-client"
import { clearTweetDraft, loadTweetDraft, saveTweetDraft } from "@/lib/tweet-draft"
import { useAccountsStore } from "@/stores/accounts"

type SelectedImage = {
  id: string
  file: File
  url: string
}

const maxTweetLength = 280
const X_OAUTH_SCOPES = "tweet.read tweet.write tweet.moderate.write users.read follows.read follows.write offline.access space.read mute.read mute.write like.read like.write list.read list.write block.read block.write bookmark.read bookmark.write media.write"
const tweetText = ref("")
const discordWebhookUrl = ref("")
const selectedImages = ref<SelectedImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isPosting = ref(false)
const hasTriedSubmit = ref(false)
const statusMessage = ref("")
const errorMessage = ref("")
const accountStore = useAccountsStore()
const { accounts, selectedAccountId, isLoading: isLoadingAccounts } = storeToRefs(accountStore)
const accountMenu = ref<(HTMLElement & { open?: boolean }) | null>(null)
const session = authClient.useSession()
const lastSignedInUserId = ref("")
const isAuthResolved = computed(() => !session.value.isPending)
const isSignedIn = computed(() => Boolean(session.value.data?.user))
const isComposerDisabled = computed(() => !isSignedIn.value || isPosting.value)
const signedInUserId = computed(() => session.value.data?.user?.id || "")

const remainingCharacters = computed(() => maxTweetLength - tweetText.value.length)
const characterCountText = computed(() => `${tweetText.value.length}/${maxTweetLength}`)
const isAccountMissing = computed(() => !selectedAccountId.value)
const isTweetMissing = computed(() => tweetText.value.trim().length === 0)
const isDiscordWebhookInvalid = computed(() => {
  const value = discordWebhookUrl.value.trim()

  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol !== "https:" && url.protocol !== "http:"
  } catch {
    return true
  }
})
const shouldShowAccountError = computed(() => hasTriedSubmit.value && isAccountMissing.value)
const shouldShowTweetError = computed(() => hasTriedSubmit.value && (isTweetMissing.value || remainingCharacters.value < 0))
const shouldShowDiscordWebhookError = computed(() => discordWebhookUrl.value.trim().length > 0 && isDiscordWebhookInvalid.value)
const accountSupportingText = computed(() => shouldShowAccountError.value ? "投稿アカウントは必須です" : "")
const tweetSupportingText = computed(() => {
  if (shouldShowTweetError.value && isTweetMissing.value) {
    return "本文は必須です"
  }

  return characterCountText.value
})
const discordWebhookSupportingText = computed(() => shouldShowDiscordWebhookError.value ? "URL形式で入力してください。" : "")
const canPost = computed(() => Boolean(selectedAccountId.value) && tweetText.value.trim().length > 0 && remainingCharacters.value >= 0 && !isDiscordWebhookInvalid.value && !isPosting.value)

const clearSelectedImages = () => {
  selectedImages.value.forEach((image) => URL.revokeObjectURL(image.url))
  selectedImages.value = []
}

const resetComposerForm = () => {
  tweetText.value = ""
  discordWebhookUrl.value = ""
  hasTriedSubmit.value = false
  errorMessage.value = ""
  clearSelectedImages()
}

const resetComposerAfterPost = () => {
  tweetText.value = ""
  hasTriedSubmit.value = false
  errorMessage.value = ""
  clearSelectedImages()
}

const restoreComposerDraft = () => {
  if (!signedInUserId.value) {
    return
  }

  const draft = loadTweetDraft(signedInUserId.value)
  if (!draft) {
    return
  }

  tweetText.value = draft.tweetText
  discordWebhookUrl.value = draft.discordWebhookUrl
  selectedAccountId.value = draft.selectedAccountId
}

const persistComposerDraft = () => {
  if (!signedInUserId.value) {
    return
  }

  saveTweetDraft(signedInUserId.value, {
    tweetText: tweetText.value,
    discordWebhookUrl: discordWebhookUrl.value,
    selectedAccountId: selectedAccountId.value,
  })
}

const clearComposerDraft = (userId = signedInUserId.value) => {
  if (!userId) {
    return
  }

  clearTweetDraft(userId)
}

const loadAccounts = async () => {
  errorMessage.value = ""

  try {
    await accountStore.loadAccounts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "アカウント一覧を取得できませんでした。"
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

const handleDiscordWebhookInput = (event: Event) => {
  discordWebhookUrl.value = (event.target as HTMLElement & { value?: string }).value || ""
  if (!isDiscordWebhookInvalid.value) {
    hasTriedSubmit.value = false
  }
}

const openFilePicker = () => {
  fileInput.value?.click()
}

const generateCodeVerifier = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

const generateCodeChallenge = async (verifier: string) => {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

const startXOAuth = async () => {
  if (!isSignedIn.value) {
    return
  }

  statusMessage.value = ""
  errorMessage.value = ""

  try {
    const response = await fetch("/api/x/auth/start")
    const data = await response.json<{ clientId?: string; redirectUri?: string; error?: string }>()

    if (!response.ok) {
      throw new Error(data.error || "X 認証を開始できませんでした。")
    }

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    sessionStorage.setItem("x_oauth_code_verifier", codeVerifier)
    sessionStorage.setItem("x_oauth_state", state)

    const params = new URLSearchParams({
      response_type: "code",
      client_id: data.clientId || "",
      redirect_uri: data.redirectUri || "",
      scope: X_OAUTH_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    window.location.href = `https://twitter.com/i/oauth2/authorize?${params}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "X 認証を開始できませんでした。"
  }
}

const isSigningInWithGoogle = ref(false)

const signInWithGoogle = async () => {
  isSigningInWithGoogle.value = true
  await authClient.signIn.social({
    provider: "google",
    callbackURL: window.location.origin,
  })
}

const signOut = async () => {
  if (accountMenu.value) {
    accountMenu.value.open = false
  }
  await authClient.signOut()
}

const toggleAccountMenu = () => {
  if (!accountMenu.value) {
    return
  }

  accountMenu.value.open = !accountMenu.value.open
}

const handleFileSelection = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).filter((file) => file.type.startsWith("image/"))
  const slots = Math.max(0, 4 - selectedImages.value.length)
  const images = files.slice(0, slots).map((file) => ({
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
  }))

  selectedImages.value = [...selectedImages.value, ...images]
  input.value = ""
}

const removeImage = (imageId: string) => {
  const image = selectedImages.value.find((item) => item.id === imageId)
  if (image) {
    URL.revokeObjectURL(image.url)
  }

  selectedImages.value = selectedImages.value.filter((item) => item.id !== imageId)
}

const postTweet = async () => {
  hasTriedSubmit.value = true

  if (!canPost.value) {
    if (isAccountMissing.value) {
      errorMessage.value = "投稿アカウントは必須です。"
    } else if (isTweetMissing.value) {
      errorMessage.value = "本文は必須です。"
    } else if (isDiscordWebhookInvalid.value) {
      errorMessage.value = "Discord ウェブフックはURL形式で入力してください。"
    }
    return
  }

  isPosting.value = true
  statusMessage.value = ""
  errorMessage.value = ""

  try {
    const formData = new FormData()
    formData.append("accountId", selectedAccountId.value)
    formData.append("text", tweetText.value.trim())
    if (discordWebhookUrl.value.trim()) {
      formData.append("discordWebhookUrl", discordWebhookUrl.value.trim())
    }
    selectedImages.value.forEach((image) => formData.append("images", image.file))

    const response = await fetch("/api/tweets", { method: "POST", body: formData })
    const data = await response.json<{ id?: string; error?: string }>()

    if (!response.ok) {
      throw new Error(data.error || "投稿に失敗しました。")
    }

    statusMessage.value = data.id ? `投稿しました: ${data.id}` : "投稿しました。"
    resetComposerAfterPost()
    persistComposerDraft()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "投稿に失敗しました。"
  } finally {
    isPosting.value = false
  }
}

watch(
  isSignedIn,
  async (signedIn) => {
    if (signedIn) {
      lastSignedInUserId.value = signedInUserId.value
      await loadAccounts()
      restoreComposerDraft()
      return
    }

    clearComposerDraft(lastSignedInUserId.value)
    lastSignedInUserId.value = ""
    accountStore.clearAccounts()
    resetComposerForm()
  },
  { immediate: true },
)

watch(
  [tweetText, discordWebhookUrl, selectedAccountId],
  () => {
    if (isSignedIn.value) {
      persistComposerDraft()
    }
  },
)

onBeforeUnmount(() => {
  clearSelectedImages()
})
</script>

<template>
  <main class="page-shell" aria-label="Tweet page">
    <NavBar title="XCOMPOSER">
      <template #actions>
        <template v-if="isAuthResolved">
        <md-filled-tonal-button
          v-if="isSignedIn"
          id="google-account-button"
          class="google-account-button"
          type="button"
          @click="toggleAccountMenu"
        >
          <img
            v-if="session.data?.user?.image"
            class="google-avatar"
            :src="session.data.user.image"
            :alt="session.data.user.name"
          />
          <svg v-else class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 8.6-4.8 8.6-7.3 0-.5-.1-.9-.1-1.3Z"/>
            <path fill="#4285F4" d="M20.5 12c0-.5-.1-.9-.1-1.3H12v3.9h4.8c-.2 1.1-.9 2-1.8 2.6v2.2h2.9c1.7-1.6 2.6-4 2.6-7.4Z"/>
            <path fill="#FBBC05" d="M6.4 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V8.1H3.4C2.9 9.2 2.6 10.5 2.6 12s.3 2.8.8 3.9Z"/>
            <path fill="#34A853" d="M12 21.3c2.5 0 4.6-.8 6.1-2.2l-2.9-2.2c-.8.6-1.8 1-3.2 1-2.4 0-4.5-1.6-5.3-3.8H3.6v2.3c1.5 3 4.6 4.9 8.4 4.9Z"/>
          </svg>
        </md-filled-tonal-button>
        <md-menu
          ref="accountMenu"
          anchor="google-account-button"
          positioning="popover"
          quick
          class="account-menu"
        >
        <md-menu-item @click="signOut">
          <div slot="headline">ログアウト</div>
        </md-menu-item>
        </md-menu>
        </template>
      </template>
    </NavBar>

    <LoginScreen
      v-if="isAuthResolved && !isSignedIn"
      :is-loading="isSigningInWithGoogle"
      @login="signInWithGoogle"
    />

    <section v-else-if="isAuthResolved" class="compose-surface">
      <header class="page-header">
        <h1>ポストを作成</h1>
      </header>

      <form class="compose-form" @submit.prevent="postTweet">
        <md-outlined-select
          class="account-select"
          label="投稿者アカウント"
          required
          :value="selectedAccountId"
          :disabled="!isSignedIn || isLoadingAccounts || isPosting"
          :data-empty="!accounts.length"
          :error="shouldShowAccountError"
          :supporting-text="accountSupportingText"
          @change="handleAccountChange"
        >
          <md-select-option
            v-for="account in accounts"
            :key="account.id"
            :value="account.id"
            :display-text="account.username ? `${account.label} @${account.username}` : account.label"
          >
            <img v-if="account.image" slot="start" class="account-option__avatar" :src="account.image" :alt="account.label" />
            <div slot="headline">{{ account.label }}</div>
            <div v-if="account.username" slot="supporting-text">@{{ account.username }}</div>
          </md-select-option>
        </md-outlined-select>

        <md-filled-tonal-button class="add-account-button" type="button" :disabled="isComposerDisabled" @click="startXOAuth">
          Xアカウントを追加
        </md-filled-tonal-button>

        <md-outlined-text-field
          class="tweet-input"
          type="textarea"
          label="本文"
          required
          rows="8"
          :value="tweetText"
          :disabled="isComposerDisabled"
          :error="shouldShowTweetError"
          :supporting-text="tweetSupportingText"
          @input="handleTextInput"
        ></md-outlined-text-field>

        <div class="stack-section">
          <div class="media-action">
            <md-filled-tonal-icon-button type="button" :disabled="!isSignedIn || selectedImages.length >= 4 || isPosting" @click="openFilePicker">
              <svg class="image-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M5 21q-.825 0-1.412-.587Q3 19.825 3 19V5q0-.825.588-1.412Q4.175 3 5 3h14q.825 0 1.413.588Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5Zm1-2h12l-3.75-5-3 4L9 13Zm-1 2V5Z" />
              </svg>
            </md-filled-tonal-icon-button>
            <span>画像 {{ selectedImages.length }}/4</span>
          </div>
        </div>

        <input ref="fileInput" class="file-input" type="file" accept="image/*" multiple :disabled="!isSignedIn" @change="handleFileSelection" />

        <div v-if="selectedImages.length" class="image-grid">
          <figure v-for="image in selectedImages" :key="image.id" class="image-preview">
            <img :src="image.url" :alt="image.file.name" />
            <md-filled-tonal-button type="button" :disabled="isPosting" @click="removeImage(image.id)">削除</md-filled-tonal-button>
          </figure>
        </div>

        <hr class="compose-divider" />

        <md-outlined-text-field
          class="discord-webhook-input"
          type="url"
          label="Discord ウェブフック"
          :value="discordWebhookUrl"
          :disabled="isComposerDisabled"
          :error="shouldShowDiscordWebhookError"
          :supporting-text="discordWebhookSupportingText"
          @input="handleDiscordWebhookInput"
        ></md-outlined-text-field>

        <div v-if="errorMessage" class="message message-error">{{ errorMessage }}</div>
        <div v-if="statusMessage" class="message message-success">{{ statusMessage }}</div>

        <md-filled-button class="post-button" type="submit" :disabled="!isSignedIn || !canPost">
          <md-circular-progress v-if="isPosting" slot="icon" indeterminate></md-circular-progress>
          投稿する
        </md-filled-button>
      </form>
    </section>

    <Footer />
  </main>
</template>

<style scoped>
.page-shell {
  box-sizing: border-box;
  min-height: 100vh;
}

.compose-surface {
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 20px auto 0;
  padding: 0 20px;
}

.page-header {
  margin-bottom: 28px;
}

h1 {
  margin: 0;
  color: var(--md-sys-color-on-surface);
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1.1;
  font-weight: 500;
}

.page-header p:last-child {
  margin: 12px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.7;
}

.compose-form,
.stack-section {
  display: flex;
  flex-direction: column;
}

.compose-form {
  gap: 18px;
}

.stack-section {
  align-items: flex-start;
  gap: 12px;
}

.compose-divider {
  width: 100%;
  margin: 4px 0;
  border: 0;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

md-outlined-select,
md-outlined-text-field,
.post-button {
  width: 100%;
}

.account-select[data-empty="true"] {
  --md-outlined-select-input-text-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 62%, transparent);
  --md-outlined-select-label-text-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 62%, transparent);
  --md-outlined-select-outline-color: color-mix(in srgb, var(--md-sys-color-outline) 48%, transparent);
  --md-outlined-select-trailing-icon-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 48%, transparent);
}

.selected-account,
.media-action {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.875rem;
}

.account-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}


.account-option__avatar {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  object-fit: cover;
  flex: 0 0 auto;
}

.media-action {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.image-icon {
  width: 24px;
  height: 24px;
}

.google-account-button {
  min-width: 40px;
  padding-inline: 8px;
}

.google-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.google-avatar {
  width: 24px;
  height: 24px;
  display: block;
  border-radius: 999px;
  object-fit: cover;
}

.file-input {
  display: none;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 120px));
  gap: 12px;
}

.image-preview {
  position: relative;
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--md-sys-color-surface-container);
  width: 120px;
  height: 120px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-preview md-filled-tonal-button {
  position: absolute;
  right: 8px;
  bottom: 8px;
}

.message {
  padding: 14px 16px;
  border-radius: 16px;
  font-size: 0.875rem;
  line-height: 1.6;
}

.message-error {
  color: #410002;
  background: #ffdad6;
}

.message-success {
  color: var(--md-sys-color-on-primary-container);
  background: var(--md-sys-color-primary-container);
}

md-circular-progress {
  --md-circular-progress-size: 18px;
  --md-circular-progress-active-indicator-color: currentColor;
}
</style>
