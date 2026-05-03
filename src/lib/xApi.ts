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

export const postTweetToX = async (input: { text: string; images: File[]; bearerToken: string }) => {
  const mediaIds = await Promise.all(input.images.map((image) => uploadImage(image, input.bearerToken)))
  return createTweet(input.text, mediaIds, input.bearerToken)
}
