"use client"

import { useEffect } from "react"
import { useActionState } from "react"
import { useRouter } from "next/navigation"

import { setAuthenticated } from "@/lib/auth"

import { signIn, type SignInState } from "./actions"

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    null,
  )

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setAuthenticated(state.username)
      router.replace(next)
    }
  }, [state, router, next])

  const errorMessage = state && "error" in state ? state.error : undefined
  const succeeded = !!(state && "ok" in state && state.ok)

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm animate-chart-in">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-gray-400">
            Sign in
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Quicktalog admin
          </h1>
        </div>

        <form
          action={action}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700 dark:text-gray-300">
              Username
            </span>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-700"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-gray-700 dark:text-gray-300">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:focus:border-gray-600 dark:focus:ring-gray-700"
            />
          </label>

          <input type="hidden" name="next" value={next} />

          {errorMessage && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || succeeded}
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {pending
              ? "Signing in..."
              : succeeded
                ? "Redirecting..."
                : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}
