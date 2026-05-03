import { computed, ref } from "vue"
import { defineStore } from "pinia"

export type Account = {
  id: string
  label: string
  username?: string
  image?: string
}

export const useAccountsStore = defineStore("accounts", () => {
  const accounts = ref<Account[]>([])
  const selectedAccountId = ref("")
  const isLoading = ref(false)

  const selectedAccount = computed(() => accounts.value.find((a) => a.id === selectedAccountId.value))

  const loadAccounts = async () => {
    isLoading.value = true

    try {
      const response = await fetch("/api/accounts")
      const contentType = response.headers.get("content-type") || ""

      if (response.status === 404 || !contentType.includes("application/json")) {
        accounts.value = []
        return
      }

      const data = await response.json<{ accounts?: Account[]; error?: string }>()

      if (!response.ok) {
        throw new Error(data.error || "アカウント一覧を取得できませんでした。")
      }

      accounts.value = data.accounts || []
    } finally {
      isLoading.value = false
    }
  }

  const clearAccounts = () => {
    accounts.value = []
    selectedAccountId.value = ""
  }

  const clearSelectedAccount = () => {
    selectedAccountId.value = ""
  }

  return {
    accounts,
    selectedAccount,
    selectedAccountId,
    isLoading,
    loadAccounts,
    clearAccounts,
    clearSelectedAccount,
  }
})
