export type TweetDraft = {
  tweetText: string
  selectedAccountId: string
  selectedDiscordWebhookId: string
}

const DRAFT_STORAGE_KEY_PREFIX = "xcomposer:tweet-draft:v1"

const isTweetDraft = (value: unknown): value is TweetDraft => {
  if (!value || typeof value !== "object") {
    return false
  }

  const draft = value as Record<string, unknown>
  return typeof draft.tweetText === "string"
    && typeof draft.selectedAccountId === "string"
}

const getTweetDraftKey = (userId: string) => `${DRAFT_STORAGE_KEY_PREFIX}:${userId}`

export const loadTweetDraft = (userId: string): TweetDraft | null => {
  const storedValue = localStorage.getItem(getTweetDraftKey(userId))

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    if (!isTweetDraft(parsedValue)) {
      return null
    }

    return {
      tweetText: parsedValue.tweetText,
      selectedAccountId: parsedValue.selectedAccountId,
      selectedDiscordWebhookId: parsedValue.selectedDiscordWebhookId || "",
    }
  } catch {
    return null
  }
}

export const saveTweetDraft = (userId: string, draft: TweetDraft) => {
  localStorage.setItem(getTweetDraftKey(userId), JSON.stringify(draft))
}

export const clearTweetDraft = (userId: string) => {
  localStorage.removeItem(getTweetDraftKey(userId))
}
