import type { Env } from "../../../lib/env"
import { json } from "../../../lib/http"
import { requireSession } from "../../../lib/middleware"

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session

  const baseUrl = env.BETTER_AUTH_URL || "http://localhost:5173"

  return json({
    clientId: env.X_CLIENT_ID || "",
    redirectUri: `${baseUrl}/login/x/callback`,
  })
}
