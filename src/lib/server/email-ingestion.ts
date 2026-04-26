import "server-only";

import {
  simpleParser,
  type AddressObject,
  type Attachment,
  type EmailAddress,
  type ParsedMail,
} from "mailparser";

const REPLY_PREFIX_RE = /^(?:(?:re|fw|fwd|aw)\s*:\s*)+/i;
const INLINE_IMAGE_RE = /^\[[^\]]+\.(?:png|jpe?g|gif|bmp|webp|tiff?)\]$/i;
const TRUST_BANNER_RE =
  /^You don't often get email from .+?Learn why this is important:?\s*<?https?:\/\/[^\s>]+>?\s*$/i;
const ATTACHMENT_PLACEHOLDER_RE =
  /^<[^>]+\.(?:ics|png|jpe?g|gif|bmp|webp|pdf|docx?|xlsx?)>$/i;
const TAG_RE = /<[^>]+>/g;

export async function extractEmailText(buffer: Buffer): Promise<string> {
  const parsed = await simpleParser(buffer, {
    skipHtmlToText: true,
    skipTextToHtml: true,
  });

  return renderEmailForIngestion(parsed);
}

function renderEmailForIngestion(email: ParsedMail): string {
  const { bodyText, bodySource } = chooseBody(email);
  const attachmentLines = formatAttachmentLines(email.attachments);

  return [
    `# ${email.subject || "(No Subject)"}`,
    "",
    "## Metadata",
    `- **Canonical Thread Subject:** ${normalizeSubject(email.subject)}`,
    `- **From:** ${formatAddresses(email.from)}`,
    `- **To:** ${formatAddresses(email.to)}`,
    `- **Cc:** ${formatAddresses(email.cc)}`,
    `- **Date:** ${email.date ? email.date.toISOString() : "Unknown"}`,
    `- **Message ID:** ${cleanMessageId(email.messageId) || "(missing)"}`,
    `- **In-Reply-To:** ${cleanMessageId(email.inReplyTo) || "(none)"}`,
    `- **References:** ${formatReferences(email.references)}`,
    `- **Body Source:** ${bodySource}`,
    "",
    "## Message",
    "",
    bodyText,
    "",
    "## Attachments",
    ...attachmentLines,
  ].join("\n");
}

function normalizeSubject(subject: string | undefined): string {
  const normalized = (subject || "(No Subject)").replace(REPLY_PREFIX_RE, "").trim();
  return normalized || "(No Subject)";
}

function formatAddresses(addresses: AddressObject | AddressObject[] | undefined): string {
  if (!addresses) return "(none)";

  const addressObjects = Array.isArray(addresses) ? addresses : [addresses];
  const formatted = addressObjects
    .flatMap((addressObject) => addressObject.value)
    .flatMap(formatEmailAddress)
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(", ") : "(none)";
}

function formatEmailAddress(address: EmailAddress): string[] {
  if (address.group) {
    return address.group.flatMap(formatEmailAddress);
  }

  const name = address.name?.trim();
  const email = address.address?.trim();

  if (name && email) return [`${name} <${email}>`];
  if (email) return [email];
  if (name) return [name];
  return [];
}

function cleanMessageId(value: string | undefined): string {
  return value?.trim().replace(/^<|>$/g, "") ?? "";
}

function formatReferences(references: string | string[] | undefined): string {
  if (!references) return "(none)";
  const formatted = (Array.isArray(references) ? references : [references])
    .map(cleanMessageId)
    .filter(Boolean)
    .join(", ");
  return formatted || "(none)";
}

function chooseBody(email: ParsedMail): { bodyText: string; bodySource: string } {
  const textBody = cleanBody(email.text ?? "");
  if (textBody) {
    return { bodyText: textBody, bodySource: "text/plain" };
  }

  if (typeof email.html === "string" && email.html.trim()) {
    const htmlBody = htmlToMarkdown(email.html);
    if (htmlBody) {
      return { bodyText: htmlBody, bodySource: "text/html" };
    }
  }

  return { bodyText: "_(No message content found)_", bodySource: "empty" };
}

function cleanBody(text: string): string {
  const normalized = normalizeEmbeddedUrls(
    text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\ufeff/g, "").replace(/\xa0/g, " "),
  );

  const cleanedLines = normalized
    .split("\n")
    .filter((line) => {
      const stripped = line.trim();
      return (
        !TRUST_BANNER_RE.test(stripped) &&
        !INLINE_IMAGE_RE.test(stripped) &&
        !ATTACHMENT_PLACEHOLDER_RE.test(stripped)
      );
    })
    .map((line) => line.trimEnd());

  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeEmbeddedUrls(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/([^<\n|]+?)<(https?:\/\/[^>\n]+)>/g, (_match, label: string, url: string) => {
          const normalizedLabel = label.replace(/\s+/g, " ").trim().replace(/[\s:?-]+$/g, "");
          return normalizedLabel ? `${normalizedLabel}: <${url}>` : `<${url}>`;
        })
        .replace(/\s*\|\s*/g, " | ")
        .trimEnd(),
    )
    .join("\n");
}

function htmlToMarkdown(html: string): string {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, inner: string) => {
    const heading = cleanBody(stripHtmlTags(inner));
    return heading ? `\n\n${"#".repeat(Math.min(Number(level), 6))} ${heading}\n\n` : "\n\n";
  });

  text = text.replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote, href: string, inner: string) => {
    const label = cleanBody(stripHtmlTags(inner));
    const decodedHref = decodeHtmlEntities(href);
    if (!label || label === decodedHref) return `<${decodedHref}>`;
    return `[${label}](${decodedHref})`;
  });

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<\/?(ul|ol|div|section|article|header|footer|table|thead|tbody|tr)\b[^>]*>/gi, "\n")
    .replace(/<img\b[^>]*alt=(["'])(.*?)\1[^>]*>/gi, "![$2]")
    .replace(TAG_RE, "");

  return cleanBody(decodeHtmlEntities(text));
}

function stripHtmlTags(value: string): string {
  return decodeHtmlEntities(value.replace(TAG_RE, ""));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function formatAttachmentLines(attachments: Attachment[]): string[] {
  if (attachments.length === 0) return ["- None"];

  return attachments.map((attachment, index) => {
    const filename = attachment.filename || `attachment-${index + 1}`;
    const flags = [
      attachment.related ? "inline" : "",
      attachment.contentId ? `content-id=${cleanMessageId(attachment.contentId)}` : "",
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` | ${flags.join("; ")}` : "";

    return `- \`${filename}\` | ${attachment.contentType} | ${formatSize(attachment.size)}${suffix}`;
  });
}

function formatSize(size: number): string {
  let value = size;
  for (const unit of ["B", "KB", "MB", "GB"]) {
    if (value < 1024 || unit === "GB") {
      return `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }

  return `${value.toFixed(1)} GB`;
}
