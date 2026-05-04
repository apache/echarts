# Agent Instructions

This file applies to the entire repository.

## Fix Completion Requirements

- Every bug fix must include an HTML test case, usually under `test/`, that reproduces or verifies the fixed behavior.
- Prefer updating an existing relevant HTML test when it clearly covers the scenario; otherwise add a focused new HTML test.
- Every completed fix must include screenshot evidence from the HTML test case in the final report.
- The screenshot should show the fixed state clearly enough for visual review. When the fix is interaction-dependent, capture the relevant interaction state after reproducing it.
- If a screenshot or HTML test case cannot be produced, the final report must explain the blocker and the closest verification that was performed.

## Verification

- Run the smallest relevant automated checks for the changed area.
- For visual or rendering fixes, open the HTML test case in a browser and capture a screenshot before claiming completion.

## Generated Files

- Do not manually modify files under `dist/`; they are generated automatically when publishing to npm.
