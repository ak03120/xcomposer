import type { Env } from "../lib/env"
import { createAuth } from "../lib/auth"
import { json } from "../lib/http"
import { ulid } from "ulidx"

type DiscordWebhook = {
  id: string
  url: string
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

const parseDiscordWebhooks = (value: string) => {
  const parsedValue = JSON.parse(value) as unknown
  if (!Array.isArray(parsedValue)) {
    return []
  }

  return parsedValue.filter((item): item is DiscordWebhook => {
    if (!item || typeof item !== "object") {
      return false
    }

    const webhook = item as Record<string, unknown>
    return typeof webhook.id === "string" && typeof webhook.url === "string"
  })
}

const getUserWebhooks = async (db: D1Database, userId: string) => {
  const row = await db
    .prepare(`SELECT "dWebhooks" FROM "user" WHERE "id" = ?1`)
    .bind(userId)
    .first<{ dWebhooks: string }>()

  return row ? parseDiscordWebhooks(row.dWebhooks) : []
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

  const webhooks = await getUserWebhooks(env.DB, session.user.id)
  const nextWebhooks = [...webhooks, { id: ulid(), url }]

  await env.DB
    .prepare(`UPDATE "user" SET "dWebhooks" = ?1, "updatedAt" = ?2 WHERE "id" = ?3`)
    .bind(JSON.stringify(nextWebhooks), new Date().toISOString(), session.user.id)
    .run()

  return json({ webhooks: nextWebhooks })
}
