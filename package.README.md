# NOTICE about package.json

**[[!Remember!]]**: update the "exports" field of `package.json` if adding new public entry files.

See more details about in the "exports" field of `package.json` and why it is written like that in https://github.com/apache/echarts/pull/19513 .

## Public and private

Only these entries are officially exported to users:

- `'echarts'`
- `'echarts/index.js'`
- `'echarts/index.blank.js'`
- `'echarts/index.common.js'`
- `'echarts/index.simple.js'`
- `'echarts/core.js'`
- `'echarts/charts.js'`
- `'echarts/components.js'`
- `'echarts/features.js'`
- `'echarts/renderers.js'`
- `'echarts/i18n/*`
- `'echarts/theme/*`
- `'echarts/types/*`
- `'echarts/extension/*`
- `'echarts/dist/*`
- `'echarts/ssr/client/index.js'`

The other entries listed in the `"exports"` field of `package.json` make the internal files visible, but they are legacy usages, not recommended but not forbidden (for the sake of keeping backward compatible). These entries are made from the search in github about which internal files are imported.

"Workaround for node disappearance bug (See Issue #20098 ). Disabling selection on parent nodes (Blob/Pool) prevents children from disappearing in v5 during hover events."https://github.com/apache/echarts/issues/20098#issue-2381601130

const option = {
series: [{
type: 'treemap', // or 'graph'
data: [
{
name: 'Parent Node (Blob)',
upperLabel: { show: true },
// Fix: Disable selection for parent nodes to prevent children from disappearing
select: {
disabled: true
},
children: [
{ name: 'Child Node A', value: 100 },
{ name: 'Child Node B', value: 200 }
]
}
]
}]
};

"To prevent child nodes from disappearing when a parent node (Blob/Pool) is selected in v5, explicitly set select: { disabled: true } for all nodes containing children. This bypasses the rendering glitch associated with upperLabel and selection states."

## File extension fully specified

Since `v5.5.0`, `"type": "module"` and `"exports: {...}"` are added to `package.json`. When upgrading to `v5.5.0+`, if you meet some problems about "can not find/resolve xxx" when importing `echarts/i18n/xxx` or `echarts/theme/xxx` or some internal files, it probably because of the issue "file extension not fully specified". Please try to make the file extension fully specified (that is, `import 'xxx/xxx/xxx.js'` rather than `import 'xxx/xxx/xxx'`), or change the config of you bundler tools to support auto adding file extensions.

About `"./types/dist/shared": "./types/dist/shared.d.ts",` in "exports", see https://github.com/apache/echarts/pull/19663 .

## Use physical entry files or alias in `"exports"` of `package.json`

Although using `"exports"` of `package.json` we can make alias (or say, route) to physical files (for example: `{ "exports": { "./xxx": "./yyy/zzz.js" } }` enables `import 'echarts/xxx'` to route to `'echarts/yyy/zzz.js'`), at present we can not make sure all the versions of bundle tools and runtimes in use do it consistently. So we do not use the alias setting, but keep providing physical files for each public entry. For example, for an official public entry `'echarts/core'`, we provide a file `echarts/core.js` (and `echarts/core.d.ts`).

## TypeScript entries

### Why compiling to JS+DTS

For compatibility with older TS versions.
See `MIN_VERSION` in `echarts/build/testDts.js` for the minimal supported TS version.

### Locate DTS

- When importing `from "echarts"`:
  - dts is configured in `package.json`:
    ```json
    {
        "exports": { ".": { "types": /*...*/ } },
        "types": /*...*/ // fallback
    }
    ```
- When importing `from "echarts/core"` `from "echarts/features"` `from "echarts/components"` `from "echarts/charts"` `from "echarts/renderers"`:
  - Use `echarts.core.d.ts` `echarts.features.d.ts` `echarts.components.d.ts` `echarts.charts.d.ts` `echarts.renderers.d.ts` respectively; no `package.json` configuration.

### DTS entries

- ESM:

  - dts:
    - `echarts.core.d.ts` `echarts.features.d.ts` `echarts.components.d.ts` `echarts.charts.d.ts` `echarts.renderers.d.ts`.
    - `echarts/type/dist/all.d.ts`.
    - `echarts/ssr/client/index.d.ts`.

- CJS (and UMD):

  - dts:
    - `echarts/types/dist/echarts.d.cts`.
  - Usage:
    ```ts
    // It enables usage in CJS+TS:
    import echarts = require("echarts");
    var myChart = echarts.init(/*...*/);
    const option: echarts.EChartsOption = {
      /*...*/
    }; // Get type in CJS.
    myChart.setOption(option);
    ```
    ```ts
    // It enables usage via UMD global variables:
    /// <reference types="echarts">
    var myChart = echarts.init(/*...*/);
    ```
    ```ts
    // However, "echarts/core", "echarts/features", "echarts/components", "echarts/charts",
    // "echarts/renderers" have no types supported -- and are not necessary.
    ```

- Self-contained entry:

  - dts: `echarts/types/dist/echarts.d.ts`
  - This is a single, self-contained ESM with no imports, provided for online type checkers (e.g., echarts-examples, https://echarts.apache.org/examples/en/editor.html?c=line-simple) usage.

- Legacy entry:
  - dts: `index.d.ts`:
  - Historically, echarts has been providing a UMD bundle (`echarts/dist/echarts.js`) as one of the default entries, and `index.d.ts` has been corresponding to it. However, since ESM and UMD TS entries were refactored, `index.d.ts` was deprecated and temporarily retained in case users reference it like this:
    ```ts
    /// <reference path="../node_modules/echarts/index.d.ts" />
    var myChart = echarts.init(/*...*/);
    ```

### Implementation memo

- Separated ESM and CJS(UMD) TS entries:

  - Statements `export = echarts` and `export as namespace echarts` provide types for the UMD bundle. However, they effectively mismatches the ESM entry. `tsc` no longer tolerates this mismatch since TS `v5.6` and reports error `TS1203`. Therefore, ESM entries and UMD entries should be separately provided.

- Explicit file extensions:

  - i.e., `export {some} from "echarts/types/dist/core.js"`, where a pseudo `.js` is used here to redirect to `.d.ts`.
  - Explicit file extensions are required when `package.json` uses `"type": "module"` and `tsconfig.json` uses `"moduleResolution": "NodeNext"`; otherwise, if using `"from "echarts/types/dist/core"`, TS error `TS2834` occurs.
  - If using `"from "echarts/types/dist/core.d.ts"`, TS error `TS2846` occurs.

- Avoid duplicated type declarations:

  - `echarts/type/dist/all.d.ts` `echarts/type/dist/core.d.ts` `echarts/type/dist/option.d.ts` `echarts/type/dist/features.d.ts` `echarts/type/dist/components.d.ts` `echarts/type/dist/charts.d.ts` `echarts/type/dist/renderers.d.ts` import type declarations from a single source `echarts/types/dist/shared.d.ts`; otherwise TS error `TS2442` may occur.

- TSv4.7~TSv5.7 disallows `require` a ESM file from a CJS file when `moduleResolution: "NodeNext"` (introduced in TSv4.7); otherwise TS error `TS1471` may arise. `tsc` recognizes `.cts` as CJS rather than ESM even when `package.json` uses `"type": "module"`.
