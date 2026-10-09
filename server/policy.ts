import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export const ALLOWED_DOMAINS = [
  "example.com",
  "info.cern.ch",
  "www.w3.org",
  "w3.org",
  "www.wikipedia.org",
  "en.wikipedia.org",
  "upload.wikimedia.org",
  "developer.mozilla.org",
  "github.com",
  "raw.githubusercontent.com",
] as const;
export class ProxyError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export type Resolver = (
  host: string,
) => Promise<{ address: string; family: number }[]>;
export const resolvePublic: Resolver = (host) =>
  lookup(host, { all: true, verbatim: true });
export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export function validateURL(raw: string): URL {
  if (typeof raw !== "string" || raw.length > 2048)
    throw new ProxyError("Enter a public URL of at most 2048 characters.", 400);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProxyError("That URL is not valid.", 400);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new ProxyError(
      "Only public HTTP/HTTPS URLs on standard ports, without credentials, are supported.",
      403,
    );
  if (
    !ALLOWED_DOMAINS.includes(url.hostname as (typeof ALLOWED_DOMAINS)[number])
  )
    throw new ProxyError(
      "This website requires direct access. Choose an approved reading destination.",
      403,
    );
  if (
    /(?:^|\/)(?:login|logout|signin|signup|sign-in|auth|oauth|account|session)(?:\/|$|\?)/i.test(
      decodeURIComponent(url.pathname),
    ) ||
    [...url.searchParams.keys()].some((k) =>
      /password|token|secret|session|auth|code|key/i.test(k),
    )
  )
    throw new ProxyError(
      "Authentication and sensitive URLs must be opened on the official website.",
      403,
    );
  url.hash = "";
  return url;
}
export async function validateDestination(
  raw: string,
  resolve: Resolver = resolvePublic,
) {
  const url = validateURL(raw);
  let records: Awaited<ReturnType<Resolver>>;
  try {
    records = await resolve(url.hostname);
  } catch {
    throw new ProxyError(
      "The public destination could not be resolved. Check your network configuration.",
    );
  }
  if (!records.length || records.some((r) => !isPublicAddress(r.address)))
    throw new ProxyError(
      "The destination must resolve exclusively to public addresses.",
      403,
    );
  return { url, address: records[0].address, family: records[0].family };
}
