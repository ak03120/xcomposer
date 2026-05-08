import type { Env } from "../lib/env"
import { createAuth } from "../lib/auth"
import { json } from "../lib/http"
import { getXMe, withTokenRefresh } from "../lib/x"
import type { XAccount } from "../lib/x"
import { parseDiscordWebhooks } from "../lib/discord-webhook-store"

type XUploadResponse = {
  data?: { id?: string }
  errors?: unknown
}

type XTweetResponse = {
  data?: { id?: string; text?: string }
  errors?: unknown
}

type XProfile = {
  name: string
  username: string
  profile_image_url?: string
}

const uploadImage = async (file: File, accessToken: string): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  const res = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      media: btoa(binary),
      media_type: file.type || "image/png",
      media_category: "tweet_image",
    }),
  })
  const data = await res.json<XUploadResponse>()

  if (!res.ok || !data.data?.id) {
    throw new Error(`画像アップロードに失敗しました。(${res.status}) ${JSON.stringify(data)}`)
  }

  return data.data.id
}

const createTweet = async (text: string, mediaIds: string[], accessToken: string): Promise<{ id: string; text?: string }> => {
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
    }),
  })
  const data = await response.json<XTweetResponse>()

  if (!response.ok || !data.data?.id) {
    throw new Error("X への投稿に失敗しました。")
  }

  return { id: data.data.id, text: data.data.text }
}

const notifyDiscordWebhook = async (webhookUrl: string, tweetId: string, profile: XProfile) => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      content: `https://x.com/i/status/${tweetId}`,
      username: `${profile.name} (@${profile.username})`,
      ...(profile.profile_image_url ? { avatar_url: profile.profile_image_url } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord ウェブフックへの通知に失敗しました。(${response.status}) ${errorText}`)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  const formData = await request.formData()
  const accountId = formData.get("accountId")
  const text = formData.get("text")
  const discordWebhookId = formData.get("discordWebhookId")
  const images = formData.getAll("images").filter((v): v is File => v instanceof File)

  if (typeof accountId !== "string" || !accountId) {
    return json({ error: "accountId は必須です。" }, { status: 400 })
  }

  if (typeof text !== "string" || !text.trim()) {
    return json({ error: "本文は必須です。" }, { status: 400 })
  }

  if (text.length > 280) {
    return json({ error: "本文は 280 文字以内にしてください。" }, { status: 400 })
  }

  if (images.length > 4) {
    return json({ error: "画像は最大 4 枚までです。" }, { status: 400 })
  }

  if (discordWebhookId !== null && typeof discordWebhookId !== "string") {
    return json({ error: "Discord ウェブフックが不正です。" }, { status: 400 })
  }

  const tokenIndex = parseInt(accountId, 10)

  if (isNaN(tokenIndex)) {
    return json({ error: "accountId が不正です。" }, { status: 400 })
  }

  const row = await env.DB
    .prepare(`SELECT "xAccessTokens", "xRefreshTokens", "dWebhooks" FROM "user" WHERE "id" = ?1`)
    .bind(session.user.id)
    .first<{ xAccessTokens: string; xRefreshTokens: string; dWebhooks?: string }>()

  if (!row) {
    return json({ error: "ユーザーが見つかりません。" }, { status: 404 })
  }

  const accessTokens = JSON.parse(row.xAccessTokens) as string[]
  const refreshTokens = JSON.parse(row.xRefreshTokens) as string[]
  const accessToken = accessTokens[tokenIndex]
  const discordWebhookUrl = typeof discordWebhookId === "string" && discordWebhookId
    ? parseDiscordWebhooks(row.dWebhooks || "[]").find((webhook) => webhook.id === discordWebhookId)?.url
    : undefined

  if (!accessToken) {
    return json({ error: "指定されたアカウントが見つかりません。" }, { status: 404 })
  }

  if (typeof discordWebhookId === "string" && discordWebhookId && !discordWebhookUrl) {
    return json({ error: "指定されたDiscord ウェブフックが見つかりません。" }, { status: 404 })
  }

  const account: XAccount = {
    userId: session.user.id,
    tokenIndex,
    accessToken,
    refreshToken: refreshTokens[tokenIndex] || null,
  }

  try {
    const clientId = env.X_CLIENT_ID || ""
    const clientSecret = env.X_CLIENT_SECRET || ""
    const tweet = await withTokenRefresh(env.DB, account, clientId, clientSecret, async (token) => {
      const mediaIds = await Promise.all(images.map((image) => uploadImage(image, token)))
      return createTweet(text.trim(), mediaIds, token)
    })

    if (discordWebhookUrl) {
      const profile = await withTokenRefresh(env.DB, account, clientId, clientSecret, getXMe)
      await notifyDiscordWebhook(discordWebhookUrl, tweet.id, profile)
    }

    return json({ id: tweet.id, text: tweet.text })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "投稿に失敗しました。" }, { status: 502 })
  }
}
