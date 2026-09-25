/* Types for @nfccool/design/email.js. Hand-written beside the module, because
   consumers install by commit and run no build. */

/** A run of inline text: plain, bold, or a link (http(s) or mailto only). */
export type EmailRun = string | { text: string; strong?: boolean } | { text: string; href: string };
/** A paragraph's content: one string, or runs for bold words and inline links. */
export type EmailInline = string | EmailRun[];

export type EmailBlock =
  /** A paragraph of body copy. `\n` becomes a line break. */
  | { type: 'text'; text: EmailInline }
  /** The one action. A bulletproof button, Outlook desktop included. */
  | { type: 'button'; label: string; href: string }
  /** "Or copy this link:" and the raw URL, breakable anywhere. Put it after the button. */
  | { type: 'link-fallback'; href: string; label?: string }
  /** Muted small print: "if you did not ask for this", a deadline. */
  | { type: 'note'; text: EmailInline }
  /** A title set apart on its own panel: an album's name. */
  | { type: 'quote'; text: EmailInline }
  /** A hairline between the action and the small print. */
  | { type: 'divider' };

export interface EmailOptions {
  /** The big line at the top of the card. Also the document title unless `title` is given. */
  heading: string;
  /** The ordered content of the card. */
  blocks: EmailBlock[];
  /** The grey line an inbox shows after the subject. Hidden in the mail itself. */
  preheader?: string;
  /** The HTML document's <title>. Defaults to `heading`. */
  title?: string;
  /** Absolute http(s) URL of the folder that hosts EMAIL_ASSETS. Without it the header is the brand name in bold text. */
  assetBaseUrl?: string;
  brand?: {
    /** The wordmark's alt text, and the text header without an assetBaseUrl. Defaults to "NFC.cool". */
    name?: string;
    /** false: always the text header, even with an assetBaseUrl (a brand that is not NFC.cool). */
    wordmark?: boolean;
    /** Makes the header a link. */
    href?: string;
  };
  footer?: {
    /** The product line, e.g. "Moments by NFC.cool". */
    product?: string;
    /** Why this person got this mail. */
    reason?: EmailInline;
    /** A postal address, where the law asks for one. */
    address?: string;
    /** Terms, Privacy, Unsubscribe. */
    links?: { label: string; href: string }[];
  };
  /** BCP 47 language tag for the document. Default "en". */
  lang?: string;
  /** Text direction. "rtl" flips every side. Default "ltr". */
  dir?: 'ltr' | 'rtl';
}

/** Render one mail: send `html` and `text` together as multipart/alternative.
 *  Throws a TypeError on a link that is not http(s) or mailto, or an unknown block. */
export function renderEmail(options: EmailOptions): { html: string; text: string };

/** The header wordmark's files and display size (the PNGs are 2x). */
export const WORDMARK: Readonly<{ onLight: string; onDark: string; width: number; height: number }>;
/** Every file a consumer hosts at `assetBaseUrl`. They ship in this package as `@nfccool/design/email/<file>`. */
export const EMAIL_ASSETS: readonly string[];

export function escapeHtml(value: unknown): string;
/** Returns the link if it is http(s) or mailto, otherwise throws a TypeError. */
export function safeHref(href: unknown): string;

/** One block's markup, styled as renderEmail styles it. For generators that assemble a mail outside JavaScript. */
export function renderBlock(block: EmailBlock, options?: { dir?: 'ltr' | 'rtl' }): string;
/** The space in px above `block` when `prev` comes before it (null for the first block). */
export function blockGap(block: EmailBlock, prev: EmailBlock | null): number;
