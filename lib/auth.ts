export const AUTH_KEY = "admin-auth"
export const USER_KEY = "admin-user"

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(AUTH_KEY) === "1"
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(USER_KEY)
}

export function setAuthenticated(username: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_KEY, "1")
  window.localStorage.setItem(USER_KEY, username)
}

export function clearAuth(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_KEY)
  window.localStorage.removeItem(USER_KEY)
}
