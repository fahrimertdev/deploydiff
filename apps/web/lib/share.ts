import { customAlphabet } from "nanoid";

// URL-safe alphabet, 12 chars → ~70 bits of entropy
const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);

export function generateShareToken(): string {
  return nanoid();
}
