"use server"

export type SignInState =
  | { ok: true; username: string }
  | { error: string }
  | null

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!username || !password) {
    return { error: "Username and password are required." }
  }

  const expectedUser = process.env.ADMIN_USERNAME
  const expectedPass = process.env.ADMIN_PASSWORD

  if (!expectedUser || !expectedPass) {
    return {
      error:
        "Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env",
    }
  }

  if (username !== expectedUser || password !== expectedPass) {
    return { error: "Invalid username or password." }
  }

  return { ok: true, username }
}
