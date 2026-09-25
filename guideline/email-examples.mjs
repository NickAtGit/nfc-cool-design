/* The mails the guideline renders, and build/email-shots.mjs photographs.
   Real MomentoMarks copy, as the product sends it: data only, because a
   template is data. No em dashes in any of it (a MomentoMarks rule the
   examples follow; the renderer does not impose it). */
const footer = {
  product: 'Moments by NFC.cool',
  links: [
    { label: 'Terms', href: 'https://moments.example.com/terms' },
    { label: 'Privacy', href: 'https://moments.example.com/privacy' },
  ],
};
const link = 'https://moments.example.com/auth/verify?token=4f9c2a7e1b8d4c3a9e6f0b2d5a7c1e8f';

export const EXAMPLES = {
  'sign-in': {
    title: 'A sign-in link',
    options: {
      preheader: 'This link works once and expires in 15 minutes.',
      heading: 'Sign in to Moments',
      blocks: [
        { type: 'text', text: 'Tap the button below to sign in. It works once and expires in 15 minutes.' },
        { type: 'button', label: 'Sign in', href: link },
        { type: 'link-fallback', href: link },
        { type: 'note', text: 'If you did not ask for this, you can ignore this email. Nobody can sign in without the link.' },
      ],
      footer: { ...footer, reason: 'You got this because someone asked to sign in to Moments with this address.' },
    },
  },
  'pending-review': {
    title: 'A notification',
    options: {
      preheader: '3 new memories are waiting for your review.',
      heading: 'New memories are waiting for your review',
      blocks: [
        { type: 'text', text: '3 new memories were added to your album:' },
        { type: 'quote', text: 'Lisbon, summer 2026' },
        { type: 'text', text: 'Nothing shows in the album until you approve it. Open the Moments app to approve or reject them, or look first on the web.' },
        { type: 'button', label: 'View the album', href: 'https://moments.example.com/a/lisbon-summer-2026/review' },
      ],
      footer: { ...footer, reason: 'You got this because you own this album. You can turn these emails off in the app, under Settings.' },
    },
  },
  'password-reset': {
    title: 'A password reset',
    options: {
      preheader: 'This link works once and expires in an hour.',
      heading: 'Set a new password',
      blocks: [
        { type: 'text', text: 'Somebody, hopefully you, asked to set a new password for this account. Tap the button to choose one. It works once and expires in an hour.' },
        { type: 'button', label: 'Choose a new password', href: link.replace('verify', 'reset') },
        { type: 'link-fallback', href: link.replace('verify', 'reset') },
        { type: 'divider' },
        { type: 'note', text: ['If you did not ask for this, you can ignore this email: your password stays as it is. Questions? Write to ', { text: 'support@nfc.cool', href: 'mailto:support@nfc.cool' }, '.'] },
      ],
      footer: { ...footer, reason: 'You got this because someone asked to reset the password for this address.' },
    },
  },
};
