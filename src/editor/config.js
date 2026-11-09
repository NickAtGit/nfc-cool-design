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
