import { notifyUnauthorized } from "@/lib/auth/session-events";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData && {
        "Content-Type": "application/json",
      }),
      ...options.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | T
    | null;

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      const refreshedAccessToken = await notifyUnauthorized();

      if (refreshedAccessToken) {
        const retryHeaders = new Headers(options.headers);
        if (!isFormData) {
          retryHeaders.set("Content-Type", "application/json");
        }
        retryHeaders.set("Authorization", `Bearer ${refreshedAccessToken}`);

        const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        });
        const retryPayload = (await retryResponse.json().catch(() => null)) as
          | ApiResponse<T>
          | T
          | null;

        if (retryResponse.ok) {
          if (
            retryPayload &&
            typeof retryPayload === "object" &&
            "data" in retryPayload
          ) {
            return retryPayload.data as T;
          }

          return retryPayload as T;
        }
      }
    }

    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Request failed";

    throw new ApiError(message, response.status);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}
