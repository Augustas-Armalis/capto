import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const hex = env.encryptionKey;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("bad ciphertext");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const dec = createDecipheriv(ALG, getKey(), iv);
  dec.setAuthTag(tag);
  return Buffer.concat([dec.update(ct), dec.final()]).toString("utf8");
}
