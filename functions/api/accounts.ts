import type { Env } from "../lib/env"
import { createAuth } from "../lib/auth"
import { json } from "../lib/http"
import { getXMe, withTokenRefresh } from "../lib/x"
import type { XAccount } from "../lib/x"

type AccountOption = {
  id: string
  label: string
  username?: string
  image?: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  const row = await env.DB
    .prepare(`SELECT "xAccessTokens", "xRefreshTokens" FROM "user" WHERE "id" = ?1`)
    .bind(session.user.id)
    .first<{ xAccessTokens: string; xRefreshTokens: string }>()

  if (!row) {
    return json({ accounts: [] })
  }

  const accessTokens = JSON.parse(row.xAccessTokens) as string[]
  const refreshTokens = JSON.parse(row.xRefreshTokens) as string[]
  const clientId = env.X_CLIENT_ID || ""
  const clientSecret = env.X_CLIENT_SECRET || ""

  const settled = await Promise.allSettled(
    accessTokens.map(async (accessToken, index) => {
      const account: XAccount = {
        userId: session.user.id,
        tokenIndex: index,
        accessToken,
        refreshToken: refreshTokens[index] || null,
      }

      const me = await withTokenRefresh(env.DB, account, clientId, clientSecret, getXMe)

      return {
        id: String(index),
        label: me.name,
        username: me.username,
        image: me.profile_image_url,
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
