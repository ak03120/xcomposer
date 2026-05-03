type Env = {
  X_ACCOUNTS?: string
}

type AccountConfig = {
  id: string
  label: string
  username?: string
  bearerToken?: string
}

type XUploadResponse = {
  data?: {
    id?: string
  }
  errors?: unknown
}

type XTweetResponse = {
  data?: {
    id?: string
    text?: string
  }
  errors?: unknown
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  })

const parseAccounts = (env: Env) => {
  if (!env.X_ACCOUNTS) {
    return []
  }

  const accounts = JSON.parse(env.X_ACCOUNTS) as AccountConfig[]
  return accounts.filter((account) => account.id && account.label && account.bearerToken)
}

const fileToBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return btoa(binary)
}

const uploadImage = async (file: File, bearerToken: string) => {
  const response = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearerToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      media: await fileToBase64(file),
      media_category: "tweet_image",
      media_type: file.type || "image/png",
    }),
  })
  const data = await response.json<XUploadResponse>()

  if (!response.ok || !data.data?.id) {
    throw new Error("画像アップロードに失敗しました。")
  }

  return data.data.id
}

const createTweet = async (text: string, mediaIds: string[], bearerToken: string) => {
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearerToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
    }),
  })
  const data = await response.json<XTweetResponse>()

  if (!response.ok || !data.data?.id) {
    throw new Error("X への投稿に失敗しました。")
  }

  return data.data
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let accounts: AccountConfig[]

  try {
    accounts = parseAccounts(env)
  } catch {
    return json({ error: "X_ACCOUNTS の JSON を読み取れませんでした。" }, { status: 500 })
  }

  const formData = await request.formData()
  const accountId = formData.get("accountId")
  const bearerToken = formData.get("bearerToken")
  const text = formData.get("text")
  const images = formData.getAll("images").filter((value): value is File => value instanceof File)

  if (typeof accountId !== "string" || typeof text !== "string" || !accountId || !text.trim()) {
    return json({ error: "アカウントと本文を指定してください。" }, { status: 400 })
  }

  if (text.length > 280) {
    return json({ error: "本文は 280 文字以内にしてください。" }, { status: 400 })
  }

  if (images.length > 4) {
    return json({ error: "画像は最大 4 枚までです。" }, { status: 400 })
  }

  const account = accounts.find((item) => item.id === accountId)
  const token = account?.bearerToken || (typeof bearerToken === "string" ? bearerToken : "")

  if (!token) {
    return json({ error: "指定されたアカウントが見つかりません。" }, { status: 404 })
  }

  try {
    const mediaIds = await Promise.all(images.map((image) => uploadImage(image, token)))
    const tweet = await createTweet(text.trim(), mediaIds, token)
    return json({ id: tweet.id, text: tweet.text, mediaIds })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "投稿に失敗しました。" }, { status: 502 })
  }
}
