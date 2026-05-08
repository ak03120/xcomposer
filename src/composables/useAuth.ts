import { computed, ref } from "vue"
import { authClient } from "@/lib/auth-client"

export const useAuth = () => {
  const session = authClient.useSession()
  const lastSignedInUserId = ref("")
  const isSigningInWithGoogle = ref(false)

  const isAuthResolved = computed(() => !session.value.isPending)
  const isSignedIn = computed(() => Boolean(session.value.data?.user))
  const signedInUserId = computed(() => session.value.data?.user?.id || "")
  const sessionUser = computed(() => session.value.data?.user ?? null)

  const signInWithGoogle = async () => {
    isSigningInWithGoogle.value = true
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    })
  }

  const signOut = async () => {
    await authClient.signOut()
  }

  return {
    session,
    lastSignedInUserId,
    isAuthResolved,
    isSignedIn,
    signedInUserId,
    sessionUser,
    isSigningInWithGoogle,
    signInWithGoogle,
    signOut,
  }
}
