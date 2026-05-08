import { onBeforeUnmount, ref } from "vue"
import { ulid } from "ulidx"

type SelectedImage = {
  id: string
  file: File
  url: string
}

export const useImagePicker = () => {
  const selectedImages = ref<SelectedImage[]>([])
  const fileInput = ref<HTMLInputElement | null>(null)

  const clearSelectedImages = () => {
    selectedImages.value.forEach((image) => URL.revokeObjectURL(image.url))
    selectedImages.value = []
  }

  const openFilePicker = () => {
    fileInput.value?.click()
  }

  const handleFileSelection = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || []).filter((file) => file.type.startsWith("image/"))
    const slots = Math.max(0, 4 - selectedImages.value.length)
    const images = files.slice(0, slots).map((file) => ({
      id: ulid(),
      file,
      url: URL.createObjectURL(file),
    }))

    selectedImages.value = [...selectedImages.value, ...images]
    input.value = ""
  }

  const removeImage = (imageId: string) => {
    const image = selectedImages.value.find((item) => item.id === imageId)
    if (image) {
      URL.revokeObjectURL(image.url)
    }

    selectedImages.value = selectedImages.value.filter((item) => item.id !== imageId)
  }

  onBeforeUnmount(() => {
    clearSelectedImages()
  })

  return {
    selectedImages,
    fileInput,
    clearSelectedImages,
    openFilePicker,
    handleFileSelection,
    removeImage,
  }
}
