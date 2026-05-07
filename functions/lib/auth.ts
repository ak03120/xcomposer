import { betterAuth } from "better-auth"
import { kyselyAdapter } from "@better-auth/kysely-adapter"
import { Kysely } from "kysely"
import { D1Dialect } from "kysely-d1"
import { ulid } from "ulidx"

type Env = {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  G_CLIENT_ID?: string
  G_CLIENT_SECRET?: string
}

const defaultBaseUrl = "http://localhost:5173"
const defaultSecret = "11618423-d4c7-41c8-b4a1-c45d0ab4badf"

export const createAuth = (env: Env) => {
  const db = new Kysely({ dialect: new D1Dialect({ database: env.DB }) })

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL || defaultBaseUrl,
    secret: env.BETTER_AUTH_SECRET || defaultSecret,
    database: kyselyAdapter(db, { type: "sqlite" }),
    session: {
      expiresIn: 3600 * 24 * 30,
    },
    advanced: {
      database: {
        generateId: () => ulid(),
      },
    },
    socialProviders: {
      google: {
        clientId: env.G_CLIENT_ID || "",
        clientSecret: env.G_CLIENT_SECRET || "",
      },
    },
  })
}
