export const ATTACHMENT_PREFIX = "BELLMONT_ATTACHMENT:";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;

const LEGACY_PREFIXES = [ATTACHMENT_PREFIX, "§ATT§", "Â§ATTÂ§"];

export type ChatAttachment = { name: string; type: string; data: string; size?: number };

export function encodeAttachment(attachment: ChatAttachment) {
  return ATTACHMENT_PREFIX + JSON.stringify(attachment);
}

export function parseAttachment(message: string): ChatAttachment | null {
  const prefix = LEGACY_PREFIXES.find((candidate) => message.startsWith(candidate));
  if (!prefix) return null;
  try {
    const attachment = JSON.parse(message.slice(prefix.length)) as ChatAttachment;
    if (!attachment?.name || !attachment?.data || !attachment?.type) return null;
    return attachment;
  } catch {
    return null;
  }
}
