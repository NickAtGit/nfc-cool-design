/* The public API of dist/editor-kit.js: window.NFCEditorKit is `kit`. A part
   that is not listed here is not there for a host. */
import { configure } from './config.js';
import { ask } from './confirm.js';

export const kit = {
  configure,
  ask,
};
