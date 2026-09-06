# @nfccool/design

The shared design system behind every NFC.cool web presence: the marketing site,
the business card service, and MomentoMarks.

One rule: **same skeleton, own accent.** Layout, spacing, typography, component
shapes and motion are identical across brands. Colour is the only thing a brand
owns.

```bash
npm run build   # regenerate CSS from src/tokens.json
npm test        # contrast, literal, breakpoint, parity and drift guards
open kitchen-sink/index.html
```

`src/tokens.json` is the source of truth. `src/tokens.css`, `src/brands/*.css`
and `src/email.css` are generated from it and must not be hand-edited.

Read [docs/GUIDELINE.md](docs/GUIDELINE.md) before changing anything.
