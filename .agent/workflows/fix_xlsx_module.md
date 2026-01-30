Fix 'xlsx' module not found error
- Verified 'xlsx' was missing from package.json but 'xlsx-js-style' was present.
- Updated import in `utils/excelExport.ts` from `import * as XLSX from 'xlsx'` to `import * as XLSX from 'xlsx-js-style'`.
- Verified type checking passed with `npx tsc --noEmit`.
