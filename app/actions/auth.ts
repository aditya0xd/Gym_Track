"use server";

import { cookies } from "next/headers";

import {
  createAccessToken,
  createRefreshToken,
  TokenPayload,
  verifyRefreshToken,
} from "@/app/lib/jwt";

const demoEmail = (process.env.DEMO_AUTH_EMAIL ?? "admin@gym.local").toLowerCase();
const demoPassword = process.env.DEMO_AUTH_PASSWORD ?? "GymPass123!";

const demoUser: TokenPayload = {
  sub: "gym-admin-user",
  email: demoEmail,
  name: "Gym Admin",
  role: "owner",
};

type AuthResponse = {
  success: boolean;
  message: string;
};

function buildCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function setTokenCookies(accessToken: string, refreshToken: string) {
  const cookieStore = cookies();
  cookieStore.set("gym_access_token", accessToken, buildCookieOptions(15 * 60));
  cookieStore.set("gym_refresh_token", refreshToken, buildCookieOptions(7 * 24 * 60 * 60));
}

export async function login(formData: FormData): Promise<AuthResponse> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword.trim() : "";

  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  if (email !== demoEmail || password !== demoPassword) {
    return { success: false, message: "Invalid credentials. Try the demo credentials instead." };
  }

  const payload: TokenPayload = {
    ...demoUser,
    email,
  };

  const accessToken = await createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);

  setTokenCookies(accessToken, refreshToken);

  return { success: true, message: "Access and refresh tokens minted." };
}

export async function refreshTokens(): Promise<AuthResponse> {
  const refreshToken = cookies().get("gym_refresh_token")?.value;

  if (!refreshToken) {
    return { success: false, message: "Refresh token missing." };
  }

  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    return { success: false, message: "Refresh token invalid or expired." };
  }

  const newAccessToken = await createAccessToken(payload);
  const newRefreshToken = await createRefreshToken(payload);

  setTokenCookies(newAccessToken, newRefreshToken);

  return { success: true, message: "Tokens refreshed." };
}

export async function logout(): Promise<AuthResponse> {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  const cookieStore = cookies();
  cookieStore.set("gym_access_token", "", cookieOptions);
  cookieStore.set("gym_refresh_token", "", cookieOptions);

  return { success: true, message: "Session cookies cleared." };
}
