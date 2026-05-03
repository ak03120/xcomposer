import { createAuth } from "../../lib/auth"

type Env = {
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  return auth.handler(request)
}
