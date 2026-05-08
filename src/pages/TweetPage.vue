<script setup lang="ts">
import { watch } from "vue"
import { ref } from "vue"
import AccountMenu from "@/components/AccountMenu.vue"
import AddDiscordWebhookDialog from "@/components/AddDiscordWebhookDialog.vue"
import Footer from "@/components/Footer.vue"
import LoginScreen from "@/components/LoginScreen.vue"
import NavBar from "@/components/NavBar.vue"
import { getDiscordWebhookLabel } from "@/lib/discord-webhook"
import { useAuth } from "@/composables/useAuth"
import { useImagePicker } from "@/composables/useImagePicker"
import { useTweetComposer } from "@/composables/useTweetComposer"
import { useXOAuth } from "@/composables/useXOAuth"

const { selectedImages, fileInput, clearSelectedImages, openFilePicker, handleFileSelection, removeImage } = useImagePicker()
const { session: _session, lastSignedInUserId, isAuthResolved, isSignedIn, signedInUserId, sessionUser, isSigningInWithGoogle, signInWithGoogle, signOut } = useAuth()
const { startXOAuth: startXOAuthFlow } = useXOAuth()
const {
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
  statusMessage,
  postedTweetUrl,
  errorMessage,
  isAccountMissing,
  shouldShowAccountError,
  shouldShowTweetError,
  accountSupportingText,
  tweetSupportingText,
  canPost,
  isComposerDisabled,
  resetComposerForm,
  restoreComposerDraft,
  clearComposerDraft,
  loadAccounts,
  handleAccountChange,
  handleTextInput,
  handleDiscordWebhookChange,
  postTweet,
} = useTweetComposer(isSignedIn, signedInUserId, selectedImages, clearSelectedImages)

const discordWebhookDialog = ref<InstanceType<typeof AddDiscordWebhookDialog> | null>(null)
const discordWebhookSelect = ref<HTMLElement | null>(null)

const openDiscordWebhookDialog = () => {
  discordWebhookDialog.value?.open()
}

const addDiscordWebhook = async (url: string) => {
  statusMessage.value = ""
  postedTweetUrl.value = ""
  errorMessage.value = ""

  try {
    await discordWebhooksStore.addWebhook(url)
    statusMessage.value = "Discord ウェブフックを保存しました。"
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Discord ウェブフックを保存できませんでした。"
  }
}

const startXOAuth = async () => {
  if (!isSignedIn.value) return
  statusMessage.value = ""
  postedTweetUrl.value = ""
  errorMessage.value = ""
  const err = await startXOAuthFlow()
  if (err) errorMessage.value = err
}


watch(
  isSignedIn,
  async (signedIn) => {
    if (signedIn) {
      lastSignedInUserId.value = signedInUserId.value
      restoreComposerDraft()
      await loadAccounts()
      return
    }

    clearComposerDraft(lastSignedInUserId.value)
    lastSignedInUserId.value = ""
    accountStore.clearAccounts()
    discordWebhooksStore.clearWebhooks()
    resetComposerForm()
  },
  { immediate: true },
)
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

        <md-outlined-select
          ref="discordWebhookSelect"
          class="discord-webhook-select"
          label="Discord ウェブフック"
          :value="selectedDiscordWebhookId"
          :disabled="isComposerDisabled || isLoadingDiscordWebhooks"
          @change="handleDiscordWebhookChange"
        >
          <md-select-option value="" display-text="送信しない">
            <div slot="headline">送信しない</div>
          </md-select-option>
          <md-select-option
            v-for="webhook in discordWebhooks"
            :key="webhook.id"
            :value="webhook.id"
            :display-text="getDiscordWebhookLabel(webhook.url)"
          >
            <div slot="headline" class="discord-webhook-option__headline">{{ getDiscordWebhookLabel(webhook.url) }}</div>
          </md-select-option>
        </md-outlined-select>

        <md-filled-tonal-button class="add-discord-webhook-button" type="button" :disabled="isComposerDisabled" @click="openDiscordWebhookDialog">
          Discord ウェブフックを追加
        </md-filled-tonal-button>

        <div v-if="errorMessage" class="message message-error">{{ errorMessage }}</div>
        <div v-if="statusMessage" class="message message-success">
          <span>{{ statusMessage }}</span>
          <md-filled-tonal-button v-if="postedTweetUrl" :href="postedTweetUrl" target="_blank" rel="noopener">
            ツイートを表示
          </md-filled-tonal-button>
        </div>

        <md-filled-button class="post-button" type="submit" :disabled="!isSignedIn || !canPost">
          <md-circular-progress v-if="isPosting" slot="icon" indeterminate></md-circular-progress>
          投稿する
        </md-filled-button>
      </form>
    </section>

    <Footer />

    <AddDiscordWebhookDialog ref="discordWebhookDialog" @add="addDiscordWebhook" />
  </main>
</template>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.compose-surface {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 40px;
}

.page-header {
  width: 100%;
  max-width: 600px;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.compose-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 600px;
}

.account-select {
  width: 100%;
}

.account-option__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.add-account-button {
  align-self: flex-start;
}

.tweet-input {
  width: 100%;
  resize: vertical;
}

.stack-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-icon {
  width: 24px;
  height: 24px;
}

.file-input {
  display: none;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.image-preview {
  position: relative;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
}

.compose-divider {
  border: none;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  margin: 0;
}

.discord-webhook-select {
  width: 100%;
}

.discord-webhook-option__headline {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.add-discord-webhook-button {
  align-self: flex-start;
}

.message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.message-error {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.message-success {
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.post-button {
  align-self: flex-end;
}

</style>
