const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://youth-chat-web.onrender.com";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pulse_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("pulse_token", token);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  // ⚡ FIX: Agar body object format me hai toh use stringify kar do automatically
  let requestBody = init.body;
  if (requestBody && typeof requestBody === "object" && !(requestBody instanceof String)) {
    requestBody = JSON.stringify(requestBody);
  }

  // ⚡ FIX: URL ke aage automated '/api' add kar rahe hain taaki route match ho sake
  const finalUrl = `${API_URL}/api${path}`;

  const res = await fetch(finalUrl, {
    ...init,
    body: requestBody,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_URL };
