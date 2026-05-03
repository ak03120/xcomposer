import { insertAccount } from "../../lib/d1"

type Env = {
  DB: D1Database
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as {
    googleSub?: string
    accessToken?: string
    refreshToken?: string
  }

  if (!body.googleSub || !body.accessToken) {
    return json({ error: "googleSub と accessToken は必須です。" }, { status: 400 })
  }

  const account = await insertAccount(env.DB, {
    googleSub: body.googleSub,
    xAccessTokens: [body.accessToken],
    xRefreshTokens: body.refreshToken ? [body.refreshToken] : [],
  })

  return json({ account }, { status: 201 })
}
