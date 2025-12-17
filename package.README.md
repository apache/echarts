# NOTICE about package.json

**[[!Remember!]]**: update the "exports" field of `package.json` if adding new public entry files.

See more details about in the "exports" field of `package.json` and why it is written like that in https://github.com/apache/echarts/pull/19513 .

## Public and private

Only these entries are officially exported to users:
+ `'echarts'`
+ `'echarts/index.js'`
+ `'echarts/index.blank.js'`
+ `'echarts/index.common.js'`
+ `'echarts/index.simple.js'`
+ `'echarts/core.js'`
+ `'echarts/charts.js'`
+ `'echarts/components.js'`
+ `'echarts/features.js'`
+ `'echarts/renderers.js'`
+ `'echarts/i18n/*`
+ `'echarts/theme/*`
+ `'echarts/types/*`
+ `'echarts/extension/*`
+ `'echarts/dist/*`
+ `'echarts/ssr/client/index.js'`

The other entries listed in the `"exports"` field of `package.json` make the internal files visible, but they are legacy usages, not recommended but not forbidden (for the sake of keeping backward compatible). These entries are made from the search in github about which internal files are imported.


## File extension fully specified

Since `v5.5.0`, `"type": "module"` and `"exports: {...}"` are added to `package.json`. When upgrading to `v5.5.0+`, if you meet some problems about "can not find/resolve xxx" when importing `echarts/i18n/xxx` or `echarts/theme/xxx` or some internal files, it probably because of the issue "file extension not fully specified". Please try to make the file extension fully specified (that is, `import 'xxx/xxx/xxx.js'` rather than `import 'xxx/xxx/xxx'`), or change the config of you bundler tools to support auto adding file extensions.

About `"./types/dist/shared": "./types/dist/shared.d.ts",` in "exports", see https://github.com/apache/echarts/pull/19663 .


## Use physical entry file or alias in `"exports"` of `package.json`

Although using `"exports"` of `package.json` we can make alias (or say, route) to physical file (for example: `{ "exports": { "./xxx": "./yyy/zzz.js" } }` enables `import 'echarts/xxx'` to route to `'echarts/yyy/zzz.js'`), at present we can not make sure all the versions of bundle tools and runtimes in use do it consistently. So we do not use the alias setting, but keep providing physical file for each public entry. For example, for an official public entry `'echarts/core'`, we provide a file `echarts/core.js` (and `echarts/core.d.ts`).

