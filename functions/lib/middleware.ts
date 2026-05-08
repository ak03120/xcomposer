import { createAuth } from "./auth"
import { json } from "./http"
import type { Env } from "./env"

type Session = {
  user: { id: string; name: string; email: string; image?: string | null }
}

export const requireSession = async (request: Request, env: Env): Promise<Session | Response> => {
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return json({ error: "認証が必要です。" }, { status: 401 })
  }

  return session as Session
}
