import type { Env } from "../../../lib/env"
import { createAuth } from "../../../lib/auth"
import { json } from "../../../lib/http"
import { getXMe } from "../../../lib/x"

type XTokenResponse = {
  access_token?: string
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

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

  const row = await env.DB
    .prepare(`SELECT "xAccessTokens", "xRefreshTokens" FROM "user" WHERE "id" = ?1`)
    .bind(session.user.id)
    .first<{ xAccessTokens: string; xRefreshTokens: string }>()

  if (!row) {
    return json({ error: "ユーザーが見つかりません。" }, { status: 404 })
  }

  const accessTokens = JSON.parse(row.xAccessTokens) as string[]
  const refreshTokens = JSON.parse(row.xRefreshTokens) as string[]

  accessTokens.push(tokenData.access_token)
  refreshTokens.push(tokenData.refresh_token || "")

  await env.DB
    .prepare(`UPDATE "user" SET "xAccessTokens" = ?1, "xRefreshTokens" = ?2, "updatedAt" = ?3 WHERE "id" = ?4`)
    .bind(JSON.stringify(accessTokens), JSON.stringify(refreshTokens), new Date().toISOString(), session.user.id)
    .run()

  return json({ ok: true })
}
