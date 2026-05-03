import { createAuth } from "../lib/auth"
import { getAccountByGoogleSub } from "../lib/d1"

type Env = {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

type XMeResponse = {
  data?: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
}

type AccountOption = {
  id: string
  label: string
  username?: string
  image?: string
  bearerToken: string
  refreshToken?: string
  tokenIndex: number
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  })

const getXMe = async (accessToken: string) => {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error("X アカウント情報の取得に失敗しました。")
  }

  const data = (await response.json()) as XMeResponse

  if (!data.data?.id) {
    throw new Error("X アカウント情報が不正です。")
  }

  return data.data
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  const accountRecord = await getAccountByGoogleSub(env.DB, session.user.id)

  if (!accountRecord) {
    return json({ accounts: [] })
  }

  const pairs = accountRecord.xAccessTokens.map((accessToken, index) => ({
    accessToken,
    refreshToken: accountRecord.xRefreshTokens[index] || "",
  }))

  const settled = await Promise.allSettled(
    pairs.map(async ({ accessToken }, index) => {
      const me = await getXMe(accessToken)

      return {
        id: `${accountRecord.id}-${index}`,
        label: me.name,
        username: me.username,
        image: me.profile_image_url,
        bearerToken: accessToken,
        refreshToken: accountRecord.xRefreshTokens[index] || undefined,
        tokenIndex: index,
      } satisfies AccountOption
    }),
  )

  const accounts: AccountOption[] = []

  for (const result of settled) {
    if (result.status === "fulfilled") {
      accounts.push(result.value)
    }
  }

  return json({ accounts })
}
