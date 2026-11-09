/* What a host tells the parts about itself. The kit's guideline and the
   business console draw the same parts with different class names (.btn-secondary
   here, .btn.secondary there), so a part never spells a host class: it asks.

     NFCEditorKit.configure({ buttonSecondary: 'btn secondary', input: '' });

   An empty string means "this host styles the bare element". Words are the
   parts' English defaults; a host may replace any of them with
   configure({ words: { saved: '...' } }). */

export const CLASSES = {
  button: 'btn btn-primary',
  buttonSecondary: 'btn btn-secondary',
  buttonGhost: 'btn btn-ghost',
  buttonSmall: 'btn-sm',
  buttonIcon: 'btn btn-icon',
  buttonDanger: 'btn btn-danger btn-quiet btn-sm',
  field: 'field',
  fieldLabel: 'field-label',
  fieldHint: 'field-hint',
  fieldError: 'field-error',
  input: 'input',
  textarea: 'textarea',
  select: 'select',
  switchRow: 'switch-row',
  switchInput: 'switch',
  switchLabel: 'switch-label',
  pill: 'pill',
  pillWarning: 'pill pill-warning',
  stepper: 'stepper',
  stepperButton: '',
  rowMenu: 'row-menu',
  rowMenuPanel: 'menu',
  rowMenuSeparator: 'menu-sep',
  rowMenuDanger: 'is-danger',
  /* The page's one confirm dialog, by selector, because a host ships its own. */
  confirmDialog: 'dialog[data-confirm-dialog]',
  confirmTitle: '.dialog-title',
  confirmDetail: '.dialog-text',
  confirmGo: '[data-confirm-go]',
};

export const WORDS = {
  close: 'Close',
  cancel: 'Cancel',
  undo: 'Undo',
  signIn: 'Sign in',
  remove: 'Remove',
  rowName: 'row',
  heldBack: 'Not on the page yet',
  repeaterFull: 'At most {max}.',
  removeItem: 'Remove {name}',
  removeAsk: 'Remove {name}?',
  ratingLess: 'Lower {name}',
  ratingMore: 'Raise {name}',
  priceInvalid: 'Use a price like 12.50.',
  priceTooHigh: 'That price is too high.',
  urlInvalid: 'Use a link that starts with https://.',
  moveItem: 'Move {name}',
  actionsFor: 'Actions for {name}',
  moveLifted: '{name}, lifted. Position {position} of {total}.',
  moveMoved: 'Moved to position {position} of {total}.',
  moveDropped: '{name}, dropped.',
  moveCancelled: 'Move cancelled.',
  status_saving: 'Saving\u2026',
  status_saved: 'Saved',
  status_retrying: 'Not saved, retrying',
  status_failed: 'Not saved',
  status_updated: 'Updated from another device',
  status_signedOut: 'Signed out. Sign in again to keep editing.',
  status_readOnly: "You can't change this page.",
};

const classes = { ...CLASSES };
const words = { ...WORDS };

export function configure(options = {}) {
  const { words: more, ...rest } = options;
  for (const key of Object.keys(rest)) {
    if (!(key in CLASSES)) throw new Error(`NFCEditorKit.configure: unknown option ${key}`);
    classes[key] = rest[key];
  }
  if (more) Object.assign(words, more);
}

export const cls = name => classes[name];
export const word = name => words[name];
/* A word with its {placeholders} filled in: "{name}, lifted." */
export const say = (name, values = {}) =>
  String(words[name]).replace(/\{(\w+)\}/g, (_, key) => (values[key] === undefined ? '' : values[key]));
