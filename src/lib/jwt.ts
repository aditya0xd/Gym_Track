"use server";

import "server-only";
import { jwtVerify, SignJWT } from "jose";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "gym-demo-access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "gym-demo-refresh-secret";

const encoder = new TextEncoder();
const accessKey = encoder.encode(ACCESS_TOKEN_SECRET);
const refreshKey = encoder.encode(REFRESH_TOKEN_SECRET);

export type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

async function signToken(payload: TokenPayload, key: Uint8Array, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function createAccessToken(payload: TokenPayload) {
  return signToken(payload, accessKey, "15m");
}

export async function createRefreshToken(payload: TokenPayload) {
  return signToken(payload, refreshKey, "7d");
}

async function verifyToken(token: string, key: Uint8Array) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as TokenPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export async function verifyAccessToken(token?: string) {
  if (!token) return null;
  return verifyToken(token, accessKey);
}

export async function verifyRefreshToken(token?: string) {
  if (!token) return null;
  return verifyToken(token, refreshKey);
}
