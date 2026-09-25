# @nfccool/design

The shared design system behind every NFC.cool web presence: the marketing site,
the business card service, and MomentoMarks.

One rule: **same skeleton, own accent.** Layout, spacing, typography, component
shapes and motion are identical across brands. Colour is the only thing a brand
owns.

```bash
npm run build   # regenerate CSS from src/tokens.json
npm test        # contrast, literal, breakpoint, parity and drift guards
open site/index.html   # the guideline, one page per section
```

`src/tokens.json` is the source of truth. `src/tokens.css`, `src/brands/*.css`,
`src/email.css` and `src/email/palette.js` are generated from it and must not be
hand-edited.

Mail: `import { renderEmail } from '@nfccool/design/email.js'` turns a heading
and a list of blocks into `{ html, text }` in the NFC.cool mail style
(recipe 5 in RECIPES.md; the guideline's Email page shows it in both themes).

Read [docs/GUIDELINE.md](docs/GUIDELINE.md) before changing anything, and
[docs/RECIPES.md](docs/RECIPES.md) before building a page: it has the complete
markup for a console list page, a console form page, an empty state and a
marketing page, so a page is assembled rather than designed.
