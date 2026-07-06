import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ConversionError } from "@/lib/errors";
import { parseHttpUrl } from "@/lib/validation";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata.goog"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".in-addr.arpa"];

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const host = ip.toLowerCase();
  if (host === "::" || host === "::1") return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(host)) return true;
  if (host.startsWith("::ffff:")) {
    const mapped = host.slice(7);
    return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true;
  }
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  return BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = parseHttpUrl(raw);
  if (!url) throw new ConversionError("INVALID_URL", `unparseable or non-http url`);

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) {
    throw new ConversionError("INVALID_URL", `blocked hostname: ${host}`);
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new ConversionError("INVALID_URL", `private address: ${host}`);
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ConversionError("INVALID_URL", `unresolvable hostname: ${host}`);
  }
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new ConversionError("INVALID_URL", `hostname resolves to a private address: ${host}`);
  }
  return url;
}
