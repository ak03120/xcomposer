import type { Env } from "../lib/env"
import { json } from "../lib/http"
import { requireSession } from "../lib/middleware"
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
  const session = await requireSession(request, env)
  if (session instanceof Response) return session

  return json({ webhooks: await getUserWebhooks(env.DB, session.user.id) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session


  const body = (await request.json()) as { url?: string }
  const url = body.url?.trim() || ""

  if (!url || !isHttpUrl(url)) {
    return json({ error: "Discord ウェブフックはURL形式で入力してください。" }, { status: 400 })
  }

  return json({ webhooks: await addWebhook(env.DB, session.user.id, url) })
}
