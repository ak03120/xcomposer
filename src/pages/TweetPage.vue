<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import AddAccountDialog from "@/components/AddAccountDialog.vue"
import Footer from "@/components/Footer.vue"
import NavBar from "@/components/NavBar.vue"
import { authClient } from "@/lib/auth-client"
import { postTweetToX } from "@/lib/xApi"
import { useAccountsStore } from "@/stores/accounts"

type SelectedImage = {
  id: string
  file: File
  url: string
}

type AddAccountDialogExpose = {
  open: () => void
}

const maxTweetLength = 280
const tweetText = ref("")
const selectedImages = ref<SelectedImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isPosting = ref(false)
const hasTriedSubmit = ref(false)
const statusMessage = ref("")
const errorMessage = ref("")
const accountStore = useAccountsStore()
const { accounts, selectedAccount, selectedAccountId, isLoading: isLoadingAccounts } = storeToRefs(accountStore)
const accountDialog = ref<AddAccountDialogExpose | null>(null)
const accountMenu = ref<(HTMLElement & { open?: boolean }) | null>(null)
const session = authClient.useSession()
const isAuthResolved = computed(() => !session.value.isPending)
const isSignedIn = computed(() => Boolean(session.value.data?.user))
const isComposerDisabled = computed(() => !isSignedIn.value || isPosting.value)

const remainingCharacters = computed(() => maxTweetLength - tweetText.value.length)
const characterCountText = computed(() => `${tweetText.value.length}/${maxTweetLength}`)
const isAccountMissing = computed(() => !selectedAccountId.value)
const isTweetMissing = computed(() => tweetText.value.trim().length === 0)
const shouldShowAccountError = computed(() => hasTriedSubmit.value && isAccountMissing.value)
const shouldShowTweetError = computed(() => hasTriedSubmit.value && (isTweetMissing.value || remainingCharacters.value < 0))
const accountSupportingText = computed(() => {
  if (!isSignedIn.value) {
    return "ログインしていません"
  }

  if (isSignedIn.value && !accounts.value.length) {
    return "投稿アカウントがありません"
  }

  if (shouldShowAccountError.value) {
    return "投稿アカウントは必須です"
  }

  return ""
})
const tweetSupportingText = computed(() => {
  if (shouldShowTweetError.value && isTweetMissing.value) {
    return "本文は必須です"
  }

  return characterCountText.value
})
const canPost = computed(() => Boolean(selectedAccountId.value) && tweetText.value.trim().length > 0 && remainingCharacters.value >= 0 && !isPosting.value)

const loadAccounts = async () => {
  errorMessage.value = ""

  try {
    await accountStore.loadAccounts()
    accountStore.clearSelectedAccount()
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

const openFilePicker = () => {
  fileInput.value?.click()
}

const openAccountDialog = () => {
  if (!isSignedIn.value) {
    return
  }

  statusMessage.value = ""
  errorMessage.value = ""
  accountDialog.value?.open()
}

const addAccount = (authToken: string) => {
  accountStore.addLocalAccount({
    authToken,
  })
  statusMessage.value = "アカウントを追加しました。"
  errorMessage.value = ""
}

const signInWithGoogle = async () => {
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
    }
    return
  }

  isPosting.value = true
  statusMessage.value = ""
  errorMessage.value = ""

  const bearerToken = selectedAccount.value?.bearerToken

  if (!bearerToken) {
    errorMessage.value = "このアカウントにはブラウザから投稿するためのトークンがありません。"
    isPosting.value = false
    return
  }

  try {
    const tweet = await postTweetToX({
      text: tweetText.value.trim(),
      images: selectedImages.value.map((image) => image.file),
      bearerToken,
    })

    statusMessage.value = tweet.id ? `投稿しました: ${tweet.id}` : "投稿しました。"
    tweetText.value = ""
    selectedImages.value.forEach((image) => URL.revokeObjectURL(image.url))
    selectedImages.value = []
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
      await loadAccounts()
      return
    }

    accountStore.clearAccounts()
    selectedImages.value.forEach((image) => URL.revokeObjectURL(image.url))
    selectedImages.value = []
    tweetText.value = ""
    hasTriedSubmit.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  selectedImages.value.forEach((image) => URL.revokeObjectURL(image.url))
})
</script>

<template>
  <main class="page-shell" aria-label="Tweet page">
    <NavBar title="XCOMPOSER">
      <template #actions>
        <template v-if="isAuthResolved">
        <md-filled-tonal-button
          v-if="!isSignedIn"
          class="nav-auth-button"
          type="button"
          @click="signInWithGoogle"
        >
          Googleでログイン
        </md-filled-tonal-button>
        <md-filled-tonal-button
          v-else
          id="google-account-button"
          class="google-account-button"
          aria-label="Google アカウントメニュー"
          type="button"
          @click="toggleAccountMenu"
        >
          <img
            v-if="session.data?.user?.image"
            class="google-avatar"
            :src="session.data.user.image"
            :alt="session.data.user.name || 'Google account'"
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
        >
          <md-menu-item @click="signOut">
            <div slot="headline">ログアウト</div>
          </md-menu-item>
        </md-menu>
        </template>
      </template>
    </NavBar>

    <section class="compose-surface">
      <header class="page-header">
        <h1>ツイートを作成</h1>
        <p>アカウントを選択し、本文と画像を添えて X に投稿します。</p>
      </header>

      <form class="compose-form" @submit.prevent="postTweet">
        <md-outlined-select
          class="account-select"
          label="投稿アカウント"
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
          >
            <div slot="headline" class="account-option">
              <img
                v-if="account.image"
                class="account-option__avatar"
                :src="account.image"
                :alt="account.label"
              />
              <span>{{ account.label }}</span>
            </div>
            <div v-if="account.username" slot="supporting-text">@{{ account.username }}</div>
          </md-select-option>
        </md-outlined-select>

        <div class="stack-section">
          <md-filled-tonal-button class="add-account-button" type="button" :disabled="isComposerDisabled" @click="openAccountDialog">
            アカウントを追加
          </md-filled-tonal-button>
          <span v-if="selectedAccount" class="selected-account">
            {{ selectedAccount.label }}<span v-if="selectedAccount.username"> / @{{ selectedAccount.username }}</span>
          </span>
        </div>

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
            <md-filled-tonal-icon-button type="button" aria-label="画像を追加" :disabled="!isSignedIn || selectedImages.length >= 4 || isPosting" @click="openFilePicker">
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
            <md-filled-tonal-button type="button" @click="removeImage(image.id)">削除</md-filled-tonal-button>
          </figure>
        </div>

        <div v-if="errorMessage" class="message message-error">{{ errorMessage }}</div>
        <div v-if="statusMessage" class="message message-success">{{ statusMessage }}</div>

        <md-filled-button class="post-button" type="submit" :disabled="!isSignedIn || !canPost">
          <md-circular-progress v-if="isPosting" slot="icon" indeterminate></md-circular-progress>
          投稿する
        </md-filled-button>
      </form>
    </section>

    <Footer />
    <AddAccountDialog ref="accountDialog" @add="addAccount" />
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
