# AGENTS.md

## Overview

Apache ECharts is a TypeScript-first charting library. Most runtime code lives in `src/`, while build scripts, test utilities, and packaging logic live alongside it in dedicated top-level folders.

One thing worth knowing early is that this repo is assembled through explicit registration and curated entry files. New runtime code often needs to be connected not only in its local module, but also through public exports or bundle entry files before it becomes part of a user-facing build.

## Contributor Docs

When a task touches contribution workflow, prefer the repo's own contributor-facing documents over this summary:

- `CONTRIBUTING.md` for general contribution guidance
- `https://github.com/apache/echarts/wiki/How-to-make-a-pull-request` for PR workflow, test expectations, and git message conventions
- `https://github.com/apache/echarts/wiki/How-to-setup-the-dev-environment` for local setup and zrender-linked development
- `https://github.com/apache/echarts/wiki/Security-Checklist-for-Code-Contributors` for security-sensitive API and API-design checks
- `.github/pull_request_template.md` for PR structure
- `.github/workflows/` for CI expectations

This file is only a short orientation note. If there is any conflict, the repo's dedicated contributor docs should win.

A few stable rules from the PR wiki are especially worth keeping in mind:

- In non-release PRs, avoid committing `dist/`, `i18n/`, and `ssr/client/dist/`.
- Follow the repo's PR template when opening or updating a pull request.
- Git messages follow the repo convention: `<type>(<scope>): <subject>. close #<issue_id>`, with the issue-closing suffix omitted when there is no related issue.
- If you need to work on linked `zrender` code, the dev-environment wiki recommends using an absolute symlink at `node_modules/zrender` instead of `npm link`, because the watch flow depends on that setup.
- Be cautious with security-sensitive web APIs such as `innerHTML`, arbitrary DOM selectors, `eval`-like execution, raw style injection, and navigation-related APIs. If a feature must allow that kind of behavior, the security checklist expects clear documentation warnings.

## Project Layout

- `src/`: built-in charts, components, coordinate systems, models, renderers, features, themes, and i18n source
- `src/export/*.ts`: public modular export surfaces
- `src/echarts.all.ts`, `src/echarts.common.ts`, `src/echarts.simple.ts`, `src/echarts.ts`: main bundle entry files
- `extension-src/`: separately packaged extensions
- `ssr/client/src/`: SSR client source
- `build/`: build, packaging, prepublish, and generation scripts
- `test/ut/spec/`: Jest unit tests
- `test/*.html`: browser-based rendering and interaction cases

## Source And Generated Files

In general, `src/` is the main source of truth for built-in library behavior.

Some top-level files and folders are generated or packaging-oriented:

- `i18n/*.js` and `i18n/*-obj.js` are generated from `src/i18n/*.ts`
- `lib/`, `types/`, `extension/`, `ssr/client/lib/`, `ssr/client/types/`, and root `index*.js` are produced by the build/prepublish flow
- `dist/` contains build output

The top-level `theme/*.js` files are packaged theme sources rather than normal `src/theme/` runtime modules, so they are best treated separately from the generated locale/build artifacts above.

## Exports And Entry Files

This repo exposes functionality at a few different layers:

- local runtime modules under `src/`
- modular public exports under `src/export/*.ts`
- bundled entry files under `src/echarts*.ts`

Because of that structure, changes to charts, components, renderers, or features sometimes need corresponding updates in exports or entry files to show up in the expected public build.

## Testing

The repository uses two main testing styles:

- Jest tests in `test/ut/spec/` for logic-heavy behavior such as models, utilities, data transforms, and API behavior
- HTML cases in `test/` for rendering, layout, interaction, and visual regressions

For local development, `npm run dev` starts the watch build and opens the `test/` directory. New HTML cases can be scaffolded with `npm run mktest`.

## Common Checks

- `npm run checktype`
- `npm run lint`
- `npm test`
- `npm run test:dts:fast`
- `npm run dev`

## Style Notes

This repository consistently keeps ASF license headers in source and test files, and the codebase style is stable: single quotes, semicolons, and 4-space indentation are the norm. Small changes that follow nearby patterns tend to fit best here.
