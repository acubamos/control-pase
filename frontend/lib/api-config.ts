export const API_CONFIG = {
  //BASE_URL: process.env.NEXT_PUBLIC_API_URL || "https://apicp.acubamos.cu/api",
  BASE_URL: "https://apicp.acubamos.cu/api",
  TIMEOUT: 10000,
  ENDPOINTS: {
    ENTRIES: "/entries",
    AUTH: "/auth",
    UPLOAD: "/entries",
  },
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token")
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : {
        "Content-Type": "application/json",
      }
}

