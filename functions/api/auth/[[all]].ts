import type { Env } from "../../lib/env"
import { createAuth } from "../../lib/auth"

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  return auth.handler(request)
}
