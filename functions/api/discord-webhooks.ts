import type { Env } from "../lib/env"
import { createAuth } from "../lib/auth"
import { json } from "../lib/http"
import { addWebhook, getUserWebhooks } from "../lib/discord-webhook-store"

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  return json({ webhooks: await getUserWebhooks(env.DB, session.user.id) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await request.json()) as { url?: string }
  const url = body.url?.trim() || ""

  if (!url || !isHttpUrl(url)) {
    return json({ error: "Discord ウェブフックはURL形式で入力してください。" }, { status: 400 })
  }

  return json({ webhooks: await addWebhook(env.DB, session.user.id, url) })
}
