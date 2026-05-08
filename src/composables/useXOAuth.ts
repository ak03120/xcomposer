import { ulid } from "ulidx"

const X_OAUTH_SCOPES = "tweet.read tweet.write tweet.moderate.write users.read follows.read follows.write offline.access space.read mute.read mute.write like.read like.write list.read list.write block.read block.write bookmark.read bookmark.write media.write"

const generateCodeVerifier = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

const generateCodeChallenge = async (verifier: string) => {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

export const useXOAuth = () => {
  const startXOAuth = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/x/auth/start")
      const data = await response.json<{ clientId?: string; redirectUri?: string; error?: string }>()

      if (!response.ok) {
        throw new Error(data.error || "X 認証を開始できませんでした。")
      }

      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const state = ulid()

      sessionStorage.setItem("x_oauth_code_verifier", codeVerifier)
      sessionStorage.setItem("x_oauth_state", state)

      const params = new URLSearchParams({
        response_type: "code",
        client_id: data.clientId || "",
        redirect_uri: data.redirectUri || "",
        scope: X_OAUTH_SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      })

      window.location.href = `https://twitter.com/i/oauth2/authorize?${params}`
      return null
    } catch (error) {
      return error instanceof Error ? error.message : "X 認証を開始できませんでした。"
    }
  }

  return { startXOAuth }
}
