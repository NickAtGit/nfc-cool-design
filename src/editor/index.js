/* The public API of dist/editor-kit.js: window.NFCEditorKit is `kit`. A part
   that is not listed here is not there for a host. */
import { configure } from './config.js';
import { ask } from './confirm.js';
import { blockRow } from './row.js';
import { sheet } from './sheet.js';
import { sortable } from './sortable.js';
import { reorder } from './sortable-core.js';
import { split } from './split.js';
import { autosaveStatus } from './status.js';
import { undoToast } from './undo.js';

export const kit = {
  configure,
  ask,
  autosaveStatus,
  blockRow,
  reorder,
  sheet,
  sortable,
  split,
  undoToast,
};
