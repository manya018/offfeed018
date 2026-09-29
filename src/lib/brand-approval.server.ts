const PUBLIC_APP_URL = "https://offfeed018.lovable.app";

type ApprovalPayload = {
  applicationId: string;
  expiresAt: number;
};

const encode = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const decode = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const getKey = async () => {
  const secret = process.env["BRAND_APPROVAL_SECRET"];
  if (!secret) throw new Error("Brand approval security is not configured.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
};

export async function createBrandApprovalToken(applicationId: string): Promise<string> {
  const payload: ApprovalPayload = { applicationId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${encode(new Uint8Array(signature))}`;
}

export async function verifyBrandApprovalToken(token: string): Promise<ApprovalPayload | null> {
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await getKey(), decode(encodedSignature), new TextEncoder().encode(encodedPayload));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(encodedPayload))) as ApprovalPayload;
    if (!payload.applicationId || !Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const getBrandReviewUrl = (token: string) => `${PUBLIC_APP_URL}/brand-review?token=${encodeURIComponent(token)}`;