export type XTokens = {
  accessTokens: string[]
  refreshTokens: string[]
}

export const getXTokens = async (db: D1Database, userId: string): Promise<XTokens | null> => {
  const row = await db
    .prepare(`SELECT "xAccessTokens", "xRefreshTokens" FROM "user" WHERE "id" = ?1`)
    .bind(userId)
    .first<{ xAccessTokens: string; xRefreshTokens: string }>()

  if (!row) return null

  return {
    accessTokens: JSON.parse(row.xAccessTokens) as string[],
    refreshTokens: JSON.parse(row.xRefreshTokens) as string[],
  }
}

export const updateXToken = async (
  db: D1Database,
  userId: string,
  tokenIndex: number,
  accessToken: string,
  refreshToken: string,
) => {
  const tokens = await getXTokens(db, userId)
  if (!tokens) throw new Error("ユーザーが見つかりません。")

  tokens.accessTokens[tokenIndex] = accessToken
  tokens.refreshTokens[tokenIndex] = refreshToken

  await db
    .prepare(`UPDATE "user" SET "xAccessTokens" = ?1, "xRefreshTokens" = ?2, "updatedAt" = ?3 WHERE "id" = ?4`)
    .bind(JSON.stringify(tokens.accessTokens), JSON.stringify(tokens.refreshTokens), new Date().toISOString(), userId)
    .run()
}

export const appendXToken = async (
  db: D1Database,
  userId: string,
  accessToken: string,
  refreshToken: string,
) => {
  const tokens = await getXTokens(db, userId)
  if (!tokens) throw new Error("ユーザーが見つかりません。")

  tokens.accessTokens.push(accessToken)
  tokens.refreshTokens.push(refreshToken)

  await db
    .prepare(`UPDATE "user" SET "xAccessTokens" = ?1, "xRefreshTokens" = ?2, "updatedAt" = ?3 WHERE "id" = ?4`)
    .bind(JSON.stringify(tokens.accessTokens), JSON.stringify(tokens.refreshTokens), new Date().toISOString(), userId)
    .run()
}
