// ==========================
// Firma/verificación de JWT propios (HS256)
// ==========================
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../config/env.js";

const enc = new TextEncoder();
const secretKey = enc.encode(ENV.JWT_SECRET);

export async function signAccessToken(payload) {
  // payload mínimo: { sub, email, name, role }
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ENV.JWT_EXPIRES_IN)
    .sign(secretKey);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, secretKey);
  return payload;
}

// Para generar JWT_SECRET seguro (mínimo 24 chars):
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"