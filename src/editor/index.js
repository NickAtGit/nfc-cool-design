/* The public API of dist/editor-kit.js: window.NFCEditorKit is `kit`. A part
   that is not listed here is not there for a host. */
import { configure } from './config.js';
import { ask } from './confirm.js';
import { formatPrice, parsePrice, priceField } from './price.js';
import { ratingField } from './rating.js';
import { repeater } from './repeater.js';
import { blockRow } from './row.js';
import { segmented } from './segmented.js';
import { sheet } from './sheet.js';
import { sortable } from './sortable.js';
import { reorder } from './sortable-core.js';
import { split } from './split.js';
import { autosaveStatus } from './status.js';
import { undoToast } from './undo.js';
import { normalizeUrl, urlField } from './url.js';

export const kit = {
  configure,
  ask,
  autosaveStatus,
  blockRow,
  formatPrice,
  normalizeUrl,
  parsePrice,
  priceField,
  ratingField,
  reorder,
  repeater,
  segmented,
  sheet,
  sortable,
  split,
  undoToast,
  urlField,
};
