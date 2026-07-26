import { MOBILE_API_BASE } from "../../src/auth/authApi";

export async function changePasswordRequest(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await fetch(`${MOBILE_API_BASE}/api/change-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error || `Error al cambiar contraseña (${response.status})`);
  }
}
