import { computed, ref } from "vue"
import { defineStore } from "pinia"

export type Account = {
  id: string
  label: string
  username?: string
  image?: string
  bearerToken?: string
  refreshToken?: string
  tokenIndex?: number
  source: "env" | "local"
}

type ApiAccount = {
  id: string
  label: string
  username?: string
  image?: string
  bearerToken?: string
  refreshToken?: string
  tokenIndex?: number
}

export const useAccountsStore = defineStore("accounts", () => {
  const envAccounts = ref<Account[]>([])
  const localAccounts = ref<Account[]>([])
  const selectedAccountId = ref("")
  const isLoading = ref(false)

  const accounts = computed(() => [...envAccounts.value, ...localAccounts.value])
  const selectedAccount = computed(() => accounts.value.find((account) => account.id === selectedAccountId.value))

  const loadAccounts = async () => {
    isLoading.value = true

    try {
      const response = await fetch("/api/accounts")
      const contentType = response.headers.get("content-type") || ""

      if (response.status === 404 || !contentType.includes("application/json")) {
        envAccounts.value = []
        return
      }

      const data = await response.json<{ accounts?: ApiAccount[]; error?: string }>()

      if (!response.ok) {
        throw new Error(data.error || "アカウント一覧を取得できませんでした。")
      }

      envAccounts.value = (data.accounts || []).map((account) => ({ ...account, source: "env" }))
    } finally {
      isLoading.value = false
    }
  }

  const addLocalAccount = (input: { authToken: string }) => {
    const tokenSuffix = input.authToken.slice(-6)
    const account: Account = {
      id: `local-${crypto.randomUUID()}`,
      label: `auth_token ...${tokenSuffix}`,
      bearerToken: input.authToken,
      tokenIndex: 0,
      source: "local",
    }

    localAccounts.value = [...localAccounts.value, account]
    selectedAccountId.value = account.id
  }

  const clearAccounts = () => {
    envAccounts.value = []
    localAccounts.value = []
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
    addLocalAccount,
    clearAccounts,
    clearSelectedAccount,
  }
})
