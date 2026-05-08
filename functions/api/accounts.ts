import type { Env } from "../lib/env"
import { createAuth } from "../lib/auth"
import { json } from "../lib/http"
import { getXMe, withTokenRefresh } from "../lib/x"
import type { XAccount } from "../lib/x"
import { getXTokens } from "../lib/x-token-store"

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

  const tokens = await getXTokens(env.DB, session.user.id)

  if (!tokens) {
    return json({ accounts: [] })
  }

  const { accessTokens, refreshTokens } = tokens
  const clientId = env.X_CLIENT_ID || ""
  const clientSecret = env.X_CLIENT_SECRET || ""

  const accounts: AccountOption[] = []
  for (const [index, accessToken] of accessTokens.entries()) {
    try {
      const account: XAccount = {
        userId: session.user.id,
        tokenIndex: index,
        accessToken,
        refreshToken: refreshTokens[index] || null,
      }

      const me = await withTokenRefresh(env.DB, account, clientId, clientSecret, getXMe)

      accounts.push({
        id: String(index),
        label: me.name,
        username: me.username,
        image: me.profile_image_url,
      } satisfies AccountOption)
    } catch {
      // ignored
    }
  }

  return json({ accounts })
}
