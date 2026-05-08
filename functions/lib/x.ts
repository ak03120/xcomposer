import { updateXToken } from "./x-token-store"

type XMeResponse = {
  data?: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
}

class XApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "XApiError"
    this.status = status
  }
}

export const getXMe = async (accessToken: string) => {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: { authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new XApiError("X アカウント情報の取得に失敗しました。", response.status)
  }

  const data = (await response.json()) as XMeResponse

  if (!data.data?.id) {
    throw new Error("X アカウント情報が不正です。")
  }

  return data.data
}

type XTokenRefreshResponse = {
  access_token?: string
  refresh_token?: string
  error?: string
  error_description?: string
}

export type XAccount = {
  userId: string
  tokenIndex: number
  accessToken: string
  refreshToken: string | null
}

export const refreshXToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })
  const data = (await response.json()) as XTokenRefreshResponse

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "トークンの更新に失敗しました。")
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
  }
}

export const withTokenRefresh = async <T>(
  db: D1Database,
  account: XAccount,
  clientId: string,
  clientSecret: string,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> => {
  try {
    return await fn(account.accessToken)
  } catch (error) {
    if (!(error instanceof XApiError) || error.status !== 401) {
      throw error
    }

    if (!account.refreshToken) {
      throw new Error("アクセストークンが無効で、リフレッシュトークンもありません。")
    }

    const refreshed = await refreshXToken(account.refreshToken, clientId, clientSecret)
    await updateXToken(db, account.userId, account.tokenIndex, refreshed.accessToken, refreshed.refreshToken)

    return fn(refreshed.accessToken)
  }
}
