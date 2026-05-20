import { cookies } from "next/headers";

import { API_URL } from "./config";

export type SessionUser = {
  username: string;
  role: string | null;
};

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  const response = await fetch(`${API_URL}/api/auth/session`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SessionUser>;
}