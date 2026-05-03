import { createRouter, createWebHistory } from "vue-router"
import LoginXCallbackPage from "@/pages/LoginXCallbackPage.vue"
import TweetPage from "@/pages/TweetPage.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "tweet",
      component: TweetPage,
    },
    {
      path: "/login/x/callback",
      name: "login-x-callback",
      component: LoginXCallbackPage,
    },
  ],
})

export default router
