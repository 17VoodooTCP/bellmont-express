export const ATTACHMENT_PREFIX = "BELLMONT_ATTACHMENT:";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;

/* Types a browser can show by itself. HEIC is accepted for upload (phones
   take it) but most browsers can't display it, so it is offered as a download. */
const VIEWABLE_IMAGE = /^image\/(png|jpe?g|gif|webp)$/i;

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

/** True for images the browser can render inline. */
export const isViewableImage = (att: ChatAttachment) => VIEWABLE_IMAGE.test(att.type);

/** True for the types we will ever hand to the browser as a file. */
export const isAllowedType = (att: ChatAttachment) => ALLOWED_ATTACHMENT_MIME.test(att.type);

/**
 * The attachment as a Blob, typed by its validated MIME rather than whatever
 * the data URL claims. Anything outside the allow-list is refused: a blob URL
 * runs with this site's origin, so an HTML or SVG "attachment" opened in a tab
 * could run script as the site. Images and PDFs cannot.
 */
export function attachmentBlob(att: ChatAttachment): Blob | null {
  if (!isAllowedType(att)) return null;
  const match = /^data:[^;,]*(;base64)?,([\s\S]*)$/.exec(att.data);
  if (!match) return null;
  try {
    const payload = match[2] ?? "";
    let bytes: Uint8Array;
    if (match[1]) {
      const bin = atob(payload);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload));
    }
    return new Blob([bytes as BlobPart], { type: att.type.toLowerCase() });
  } catch {
    return null;
  }
}

/** A filename safe to hand to the browser's download, keeping its extension. */
export function safeFilename(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 120);
  return cleaned || "attachment";
}

export function formatBytes(n?: number) {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
