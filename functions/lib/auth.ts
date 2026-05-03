import { betterAuth } from "better-auth"

type Env = {
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

const defaultBaseUrl = "http://localhost:5173"
const defaultSecret = "xcomposer-dev-secret-please-change-me"

export const createAuth = (env: Env) =>
  betterAuth({
    baseURL: env.BETTER_AUTH_URL || defaultBaseUrl,
    secret: env.BETTER_AUTH_SECRET || defaultSecret,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      },
    },
  })
