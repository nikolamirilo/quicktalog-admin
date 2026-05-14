"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { clearAuth, getStoredUsername } from "@/lib/auth"

const Header = () => {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    setUsername(getStoredUsername())
  }, [])

  const handleSignOut = () => {
    clearAuth()
    router.replace("/login")
  }

  return (
    <div className="border-b border-gray-200 bg-white/60 backdrop-blur dark:border-gray-800 dark:bg-gray-900/60">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Quicktalog"
              width={200}
              height={100}
              priority
              className="h-14 w-auto"
            />
          </div>
          {username && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
