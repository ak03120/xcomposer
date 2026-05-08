import type { Env } from "../../../lib/env"
import { json } from "../../../lib/http"
import { requireSession } from "../../../lib/middleware"
import { getXMe } from "../../../lib/x"
import { appendXToken } from "../../../lib/x-token-store"

type XTokenResponse = {
  access_token?: string
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session

  const body = (await request.json()) as {
    code?: string
    codeVerifier?: string
  }

  if (!body.code || !body.codeVerifier) {
    return json({ error: "code と codeVerifier は必須です。" }, { status: 400 })
  }

  const baseUrl = env.BETTER_AUTH_URL || "http://localhost:5173"
  const credentials = btoa(`${env.X_CLIENT_ID || ""}:${env.X_CLIENT_SECRET || ""}`)

  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: body.code,
      redirect_uri: `${baseUrl}/login/x/callback`,
      code_verifier: body.codeVerifier,
    }),
  })

  const tokenData = (await tokenResponse.json()) as XTokenResponse

  if (!tokenResponse.ok || !tokenData.access_token) {
    return json(
      { error: tokenData.error_description || "X トークン取得に失敗しました。" },
      { status: 502 },
    )
  }

  await getXMe(tokenData.access_token)

  try {
    await appendXToken(env.DB, session.user.id, tokenData.access_token, tokenData.refresh_token || "")
  } catch {
    return json({ error: "ユーザーが見つかりません。" }, { status: 404 })
  }

  return json({ ok: true })
}
