import { z } from "zod";

export const MAX_URL_LENGTH = 2048;

export const convertRequestSchema = z.object({
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
  format: z.enum(["pdf", "docx", "md"]),
});

export type ConvertRequest = z.infer<typeof convertRequestSchema>;

export function parseHttpUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  return parsed;
}
