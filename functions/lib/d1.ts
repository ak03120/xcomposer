import { ulid } from "ulidx"

export const createIsoTimestamp = () => new Date().toISOString()

export const createUlid = () => ulid()

export const createTimestampFields = () => {
  const now = createIsoTimestamp()

  return {
    createdAt: now,
    updatedAt: now,
  }
}

export const createUpdatedTimestampField = () => ({
  updatedAt: createIsoTimestamp(),
})

type D1DatabaseLike = D1Database

export type AccountRecord = {
  id: string
  googleSub: string
  xAccessTokens: string[]
  xRefreshTokens: string[]
  createdAt: string
  updatedAt: string
}

export const serializeTokens = (xTokens: string[]) => JSON.stringify(xTokens)

export const parseTokens = (value: string) => JSON.parse(value) as string[]

export const buildAccountRecord = (input: { googleSub: string; xAccessTokens: string[]; xRefreshTokens: string[] }): AccountRecord => {
  const timestamps = createTimestampFields()

  return {
    id: createUlid(),
    googleSub: input.googleSub,
    xAccessTokens: input.xAccessTokens,
    xRefreshTokens: input.xRefreshTokens,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  }
}

export const insertAccount = async (
  db: D1DatabaseLike,
  input: { googleSub: string; xAccessTokens: string[]; xRefreshTokens: string[] },
) => {
  const account = buildAccountRecord(input)

  await db
    .prepare(
      `
        INSERT INTO accounts (id, google_sub, x_access_tokens, x_refresh_tokens, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      `,
    )
    .bind(
      account.id,
      account.googleSub,
      serializeTokens(account.xAccessTokens),
      serializeTokens(account.xRefreshTokens),
      account.createdAt,
      account.updatedAt,
    )
    .run()

  return account
}

export const getAccountByGoogleSub = async (db: D1DatabaseLike, googleSub: string) => {
  const result = await db
    .prepare(
      `
        SELECT id, google_sub, x_access_tokens, x_refresh_tokens, created_at, updated_at
        FROM accounts
        WHERE google_sub = ?1
        LIMIT 1
      `,
    )
    .bind(googleSub)
    .first<{
      id: string
      google_sub: string
      x_access_tokens: string
      x_refresh_tokens: string
      created_at: string
      updated_at: string
    }>()

  if (!result) {
    return null
  }

  return {
    id: result.id,
    googleSub: result.google_sub,
    xAccessTokens: parseTokens(result.x_access_tokens),
    xRefreshTokens: parseTokens(result.x_refresh_tokens),
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  } satisfies AccountRecord
}
