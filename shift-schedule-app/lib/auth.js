import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "session";
const alg = "HS256";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET לא קיים ב-.env.local");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken({ username, displayName, accessRole, allowedPositions }) {
  return await new SignJWT({
    username,
    displayName,
    accessRole,
    allowedPositions: allowedPositions || [],
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
