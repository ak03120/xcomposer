import type { Env } from "../../../lib/env"
import { createAuth } from "../../../lib/auth"
import { json } from "../../../lib/http"

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  const baseUrl = env.BETTER_AUTH_URL || "http://localhost:5173"

  return json({
    clientId: env.X_CLIENT_ID || "",
    redirectUri: `${baseUrl}/login/x/callback`,
  })
}
