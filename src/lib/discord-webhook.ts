export const getDiscordWebhookLabel = (url: string) => {
  const match = url.match(/^https?:\/\/discord\.com\/api\/webhooks\/([^/]+)\/(.+)$/)
  if (!match) {
    return url.replace(/^https?:\/\//, "")
  }

  const [, webhookId, token] = match
  return `${webhookId}/${token.slice(0, 4)}...`
}
