import { betterAuth } from "better-auth"
import { kyselyAdapter } from "@better-auth/kysely-adapter"
import { Kysely } from "kysely"
import { D1Dialect } from "kysely-d1"

type Env = {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

const defaultBaseUrl = "http://localhost:5173"
const defaultSecret = "xcomposer-dev-secret-please-change-me"

export const createAuth = (env: Env) => {
  const db = new Kysely({ dialect: new D1Dialect({ database: env.DB }) })

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL || defaultBaseUrl,
    secret: env.BETTER_AUTH_SECRET || defaultSecret,
    database: kyselyAdapter(db, { type: "sqlite" }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      },
    },
  })
}
