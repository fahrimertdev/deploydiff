import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// ─── IPv4 helpers ────────────────────────────────────────────────────────────

function ipv4ToUint32(ip: string): number {
  return ip.split(".").reduce((acc, part) => ((acc << 8) | parseInt(part, 10)) >>> 0, 0) >>> 0;
}

interface Cidr4 { base: number; mask: number }

function cidr4(ip: string, bits: number): Cidr4 {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { base: ipv4ToUint32(ip) & mask, mask };
}

const BLOCKED_V4: Cidr4[] = [
  cidr4("127.0.0.0",   8),   // loopback
  cidr4("10.0.0.0",    8),   // RFC-1918
  cidr4("172.16.0.0", 12),   // RFC-1918
  cidr4("192.168.0.0",16),   // RFC-1918
  cidr4("169.254.0.0",16),   // link-local / cloud metadata (AWS 169.254.169.254, GCP)
  cidr4("100.64.0.0", 10),   // Carrier-grade NAT (Alibaba metadata: 100.100.100.200)
  cidr4("0.0.0.0",     8),   // "this network"
  cidr4("240.0.0.0",   4),   // reserved
  cidr4("192.0.2.0",  24),   // TEST-NET-1 (documentation)
  cidr4("198.51.100.0",24),  // TEST-NET-2
  cidr4("203.0.113.0",24),   // TEST-NET-3
];

function isBlockedV4(ip: string): boolean {
  const addr = ipv4ToUint32(ip);
  return BLOCKED_V4.some(({ base, mask }) => (addr & mask) >>> 0 === base);
}

// ─── IPv6 helpers ────────────────────────────────────────────────────────────

function expandIPv6(ip: string): string {
  const sides = ip.split("::");
  if (sides.length === 2) {
    const left  = sides[0] ? sides[0].split(":") : [];
    const right = sides[1] ? sides[1].split(":") : [];
    const fill  = 8 - left.length - right.length;
    return [...left, ...Array(fill).fill("0"), ...right].join(":");
  }
  return ip;
}

/** Return the first `bits` bits of an IPv6 address as a zero-padded hex string. */
function ipv6Prefix(ip: string, bits: number): string {
  const groups = expandIPv6(ip).split(":").map((g) => parseInt(g || "0", 16));
  // Pack into bytes and extract `bits` prefix bits
  let remaining = bits;
  let byteIdx = 0;
  const bytes: number[] = [];
  for (const group of groups) {
    bytes.push((group >> 8) & 0xff, group & 0xff);
  }
  const prefixBytes: number[] = [];
  while (remaining > 0) {
    const b = bytes[byteIdx++] ?? 0;
    const keep = Math.min(remaining, 8);
    const mask = (0xff << (8 - keep)) & 0xff;
    prefixBytes.push(b & mask);
    remaining -= keep;
  }
  return prefixBytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // ::1 — loopback
  if (lower === "::1" || expandIPv6(lower) === "0:0:0:0:0:0:0:1") return true;

  // fc00::/7 — ULA (unique local): first byte is fc or fd
  const prefix7 = ipv6Prefix(lower, 7);
  // 0xfc = 11111100, mask 7 bits → 11111110 = 0xfe, so fc and fd both match
  const firstByte = parseInt(prefix7.slice(0, 2), 16);
  if ((firstByte & 0xfe) === 0xfc) return true;

  // fe80::/10 — link-local
  const prefix10 = ipv6Prefix(lower, 10);
  // 0xfe80 >> 6 = 0x3fa = 1111111010, first 10 bits of fe80
  const first10 = (parseInt(prefix10.slice(0, 2), 16) << 2) | (parseInt(prefix10.slice(2, 4), 16) >> 6);
  if (first10 === 0x3fa) return true;

  // ::ffff:0:0/96 — IPv4-mapped (any IPv4 inside is already checked separately)
  if (/^::ffff:/i.test(lower) || /^0:0:0:0:0:ffff:/i.test(expandIPv6(lower))) return true;

  return false;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

/**
 * Validates that `rawUrl` is safe to use as a capture target.
 *
 * Checks:
 * 1. Parses as a valid URL
 * 2. Scheme is http or https
 * 3. Hostname is not a bare IP in a blocked range
 * 4. DNS resolution does not yield a blocked IP
 *
 * Throws `UrlValidationError` with a user-safe message on failure.
 */
export async function validateUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlValidationError("Invalid URL format.");
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new UrlValidationError("Only http and https URLs are allowed.");
  }

  const hostname = parsed.hostname;

  // If the hostname is already a literal IP, check it directly
  if (net.isIPv4(hostname)) {
    if (isBlockedV4(hostname)) {
      throw new UrlValidationError("The URL resolves to a private or reserved address and cannot be used.");
    }
    return;
  }
  if (net.isIPv6(hostname)) {
    if (isBlockedV6(hostname)) {
      throw new UrlValidationError("The URL resolves to a private or reserved address and cannot be used.");
    }
    return;
  }

  // Resolve hostname via DNS and verify all returned IPs
  let addresses: string[];
  try {
    const results = await dns.lookup(hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new UrlValidationError(`Cannot resolve hostname: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new UrlValidationError(`Cannot resolve hostname: ${hostname}`);
  }

  for (const ip of addresses) {
    const blocked = net.isIPv6(ip) ? isBlockedV6(ip) : isBlockedV4(ip);
    if (blocked) {
      throw new UrlValidationError("The URL resolves to a private or reserved address and cannot be used.");
    }
  }
}
