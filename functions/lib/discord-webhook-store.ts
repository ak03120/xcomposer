import { ulid } from "ulidx"

export type DiscordWebhook = {
  id: string
  url: string
}

export const parseDiscordWebhooks = (value: string | null | undefined): DiscordWebhook[] => {
  if (!value) {
    return []
  }

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

export const getUserWebhooks = async (db: D1Database, userId: string): Promise<DiscordWebhook[]> => {
  const row = await db
    .prepare(`SELECT "dWebhooks" FROM "user" WHERE "id" = ?1`)
    .bind(userId)
    .first<{ dWebhooks?: string | null }>()

  return row ? parseDiscordWebhooks(row.dWebhooks) : []
}

export const addWebhook = async (db: D1Database, userId: string, url: string): Promise<DiscordWebhook[]> => {
  const webhooks = await getUserWebhooks(db, userId)
  const nextWebhooks = [...webhooks, { id: ulid(), url }]

  await db
    .prepare(`UPDATE "user" SET "dWebhooks" = ?1, "updatedAt" = ?2 WHERE "id" = ?3`)
    .bind(JSON.stringify(nextWebhooks), new Date().toISOString(), userId)
    .run()

  return nextWebhooks
}
