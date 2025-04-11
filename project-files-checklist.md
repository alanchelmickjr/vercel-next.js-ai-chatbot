# Project Files Checklist

## Documentation Requirements

Each file in this project must contain the following elements:

1. **Copyright Notice** - The following copyright notice must be at the top of EACH document:
   ```
   /*
    * Created by Alan Helmick aka: crackerJack and Claude 3.7 via Roo
    * All rights applicable beyond open source reserved
    * Copyright Mira AI LLC 2025
    */
   ```

2. **Document Header** - A complete header that clearly describes:
   - The document's purpose
   - Functionality overview
   - Usage instructions

3. **Inline Comments** - Appropriate inline comments explaining:
   - Code functionality
   - Logic flow
   - Complex sections

These requirements are essential for proper open source distribution, maintaining code quality standards, and protecting intellectual property rights.

## Checklist Legend
- [ ] File exists
- [ ] Copyright notice added
- [ ] Document header added
- [ ] Inline comments added

## Root Directory
- [ ] .env.example
- [ ] .eslintrc.json
- [ ] .gitignore
- [ ] biome.jsonc
- [ ] components.json
- [ ] drizzle.config.ts
- [ ] LICENSE
- [ ] middleware.ts
- [ ] myriad.md
- [ ] next-env.d.ts
- [ ] next.config.ts
- [ ] package.json
- [ ] playwright.config.ts
- [ ] pnpm-lock.yaml
- [ ] postcss.config.mjs
- [ ] README.md
- [ ] tailwind.config.ts
- [ ] tsconfig.json

## App Directory
- [ ] app/favicon.ico
- [ ] app/globals.css
- [ ] app/layout.tsx

### App/(auth)
- [ ] app/(auth)/actions.ts
- [ ] app/(auth)/auth.config.ts
- [ ] app/(auth)/auth.ts

#### App/(auth)/api/auth/[...nextauth]
- [ ] app/(auth)/api/auth/[...nextauth]/route.ts

#### App/(auth)/login
- [ ] app/(auth)/login/page.tsx

#### App/(auth)/register
- [ ] app/(auth)/register/page.tsx

### App/(chat)
- [ ] app/(chat)/actions.ts
- [ ] app/(chat)/layout.tsx
- [ ] app/(chat)/opengraph-image.png
- [ ] app/(chat)/page.tsx
- [ ] app/(chat)/twitter-image.png

#### App/(chat)/api/chat
- [ ] app/(chat)/api/chat/route.ts

#### App/(chat)/api/document
- [ ] app/(chat)/api/document/route.ts

#### App/(chat)/api/files/upload
- [ ] app/(chat)/api/files/upload/route.ts

#### App/(chat)/api/history
- [ ] app/(chat)/api/history/route.ts

#### App/(chat)/api/suggestions
- [ ] app/(chat)/api/suggestions/route.ts

#### App/(chat)/api/vote
- [ ] app/(chat)/api/vote/route.ts

#### App/(chat)/chat/[id]
- [ ] app/(chat)/chat/[id]/page.tsx

### App/api
#### App/api/memory
- [ ] app/api/memory/route.ts

#### App/api/prompts
- [ ] app/api/prompts/public/route.ts
- [ ] app/api/prompts/rate/route.ts
- [ ] app/api/prompts/save/route.ts
- [ ] app/api/prompts/suggestions/route.ts
- [ ] app/api/prompts/visibility/route.ts

#### App/api/registry
- [ ] app/api/registry/route.ts
- [ ] app/api/registry/models/route.ts
- [ ] app/api/registry/models/[id]/route.ts

#### App/api/subscription
- [ ] app/api/subscription/limits/route.ts

#### App/api/token-usage
- [ ] app/api/token-usage/route.ts

#### App/api/tools
- [ ] app/api/tools/approval/route.ts
- [ ] app/api/tools/chat/route.ts
- [ ] app/api/tools/events/route.ts
- [ ] app/api/tools/execute/route.ts
- [ ] app/api/tools/mcp/route.ts
- [ ] app/api/tools/mcp/events/route.ts
- [ ] app/api/tools/memory/route.ts
- [ ] app/api/tools/pipeline/calls/route.ts
- [ ] app/api/tools/pipeline/chat/route.ts
- [ ] app/api/tools/pipeline/status/route.ts
- [ ] app/api/tools/status/route.ts

#### App/api/user
- [ ] app/api/user/api-keys/route.ts

## Artifacts Directory
- [ ] artifacts/actions.ts

### Artifacts/code
- [ ] artifacts/code/client.tsx
- [ ] artifacts/code/server.ts

### Artifacts/image
- [ ] artifacts/image/client.tsx
- [ ] artifacts/image/server.ts

### Artifacts/sheet
- [ ] artifacts/sheet/client.tsx
- [ ] artifacts/sheet/server.ts

### Artifacts/text
- [ ] artifacts/text/client.tsx
- [ ] artifacts/text/server.ts

## Components Directory
- [ ] components/app-sidebar.tsx
- [ ] components/artifact-actions.tsx
- [ ] components/artifact-close-button.tsx
- [ ] components/artifact-messages.tsx
- [ ] components/artifact.tsx
- [ ] components/auth-form.tsx
- [ ] components/chat-header.tsx
- [ ] components/chat-tool-pipelines.tsx
- [ ] components/chat.tsx
- [ ] components/code-block.tsx
- [ ] components/code-editor.tsx
- [ ] components/console.tsx
- [ ] components/create-artifact.tsx
- [ ] components/current-model-display.tsx
- [ ] components/data-stream-handler.tsx
- [ ] components/diffview.tsx
- [ ] components/document-preview.tsx
- [ ] components/document-skeleton.tsx
- [ ] components/document.tsx
- [ ] components/error-banner.tsx
- [ ] components/error-boundary.tsx
- [ ] components/folding-icon-display.tsx
- [ ] components/icon-category-display.tsx
- [ ] components/icon-provider-display.tsx
- [ ] components/icon-quick-model-selector.tsx
- [ ] components/icons.tsx
- [ ] components/image-editor.tsx
- [ ] components/markdown.tsx
- [ ] components/mcp-tool-display.tsx
- [ ] components/message-actions.tsx
- [ ] components/message-editor.tsx
- [ ] components/message-reasoning.tsx
- [ ] components/message.tsx
- [ ] components/messages.tsx
- [ ] components/minimal-model-display.tsx
- [ ] components/model-badge.tsx
- [ ] components/model-category-selector-base.tsx
- [ ] components/multimodal-input.tsx
- [ ] components/overview.tsx
- [ ] components/preview-attachment.tsx
- [ ] components/prompt-marketplace.tsx
- [ ] components/quick-model-selector.tsx
- [ ] components/sheet-editor.tsx
- [ ] components/sidebar-history.tsx
- [ ] components/sidebar-prompt-library.tsx
- [ ] components/sidebar-toggle.tsx
- [ ] components/sidebar-user-nav.tsx
- [ ] components/sign-out-form.tsx
- [ ] components/submit-button.tsx
- [ ] components/suggested-actions.tsx
- [ ] components/suggestion.tsx
- [ ] components/text-editor.tsx
- [ ] components/theme-provider.tsx
- [ ] components/theme-toggle.tsx
- [ ] components/toast.tsx
- [ ] components/tool-approval-inline.tsx
- [ ] components/tool-approval.tsx
- [ ] components/tool-execution-display.tsx
- [ ] components/tool-pipeline-display.tsx
- [ ] components/toolbar.tsx
- [ ] components/use-scroll-to-bottom.ts
- [ ] components/user-model-preferences.tsx
- [ ] components/version-footer.tsx
- [ ] components/visibility-selector.tsx
- [ ] components/weather.tsx

### Components/admin
- [ ] components/admin/category-manager.tsx
- [ ] components/admin/model-manager.tsx

### Components/ui
- [ ] components/ui/alert-dialog.tsx
- [ ] components/ui/alert.tsx
- [ ] components/ui/badge.tsx
- [ ] components/ui/button.tsx
- [ ] components/ui/card.tsx
- [ ] components/ui/dialog.tsx
- [ ] components/ui/dropdown-menu.tsx
- [ ] components/ui/input.tsx
- [ ] components/ui/label.tsx
- [ ] components/ui/progress.tsx

## Docs Directory
- [ ] docs/01-quick-start.md
- [ ] docs/02-update-models.md
- [ ] docs/03-artifacts.md
- [ ] docs/04-migrate-to-parts.md
- [ ] docs/app-directory-documentation.md
- [ ] docs/artifacts-directory-documentation.md
- [ ] docs/components-directory-documentation.md
- [ ] docs/debug-plan-summary.md
- [ ] docs/dynamic-providers-implementation.md
- [ ] docs/feature-flags-implementation.md
- [ ] docs/finetunechatprovidermodels.md
- [ ] docs/hooks-and-lib-directory-documentation.md
- [ ] docs/human-in-the-loop.md
- [ ] docs/implementation-progress.md
- [ ] docs/implementation-summary.md
- [ ] docs/master-project-documentation-update.md
- [ ] docs/master-project-documentation.md
- [ ] docs/model-registry-standardization-plan.md
- [ ] docs/model-system-updates.md
- [ ] docs/prompt-suggestions-implementation-update.md
- [ ] docs/prompt-suggestions-implementation.md
- [ ] docs/public-tests-and-config-documentation.md
- [ ] docs/refined-implementation-plan.md
- [ ] docs/registryimplementationfinal.md
- [ ] docs/server-client-separation-fix.md
- [ ] docs/talkverse-fix-implementation-plan.md
- [ ] docs/tool-management-system-plan.md
- [ ] docs/user-api-keys-implementation.md
- [ ] docs/user-model-preferences-implementation.md

## Hooks Directory
- [ ] hooks/use-artifact.ts
- [ ] hooks/use-chat-visibility.ts
- [ ] hooks/use-error-handler.ts
- [ ] hooks/use-mcp-events.ts
- [ ] hooks/use-mcp-tools.ts
- [ ] hooks/use-mobile.tsx
- [x] hooks/use-preferences.ts
- [ ] hooks/use-registry.ts
- [ ] hooks/use-tool-approval.ts
- [ ] hooks/use-tool-events.ts
- [ ] hooks/use-tool-state.ts

## Lib Directory
- [ ] lib/client-cookie.ts
- [ ] lib/constants.ts
- [ ] lib/error-utils.ts
- [ ] lib/feature-flags.ts
- [ ] lib/user-api-keys.ts
- [ ] lib/utils.ts

### Lib/ai
- [ ] lib/ai/dynamic-tag-parser.ts
- [ ] lib/ai/enhanced-ai-sdk.ts
- [ ] lib/ai/prompts.ts
- [ ] lib/ai/provider-defaults.ts
- [ ] lib/ai/provider-registry.ts
- [ ] lib/ai/token-tracker.ts
- [ ] lib/ai/types.ts

#### Lib/ai/tools
- [ ] lib/ai/tools/create-document.ts
- [ ] lib/ai/tools/delete-file.ts
- [x] lib/ai/tools/get-weather.ts
- [ ] lib/ai/tools/memory-tool.ts
- [ ] lib/ai/tools/request-suggestions.ts
- [ ] lib/ai/tools/update-document.ts

### Lib/artifacts
- [ ] lib/artifacts/server.ts

### Lib/db
- [ ] lib/db/client-model-management.ts
- [ ] lib/db/connection.ts
- [ ] lib/db/generate-prompts.ts
- [ ] lib/db/generated-prompts.json
- [ ] lib/db/migrate.ts
- [ ] lib/db/model-management-actions.ts
- [ ] lib/db/model-management-client.ts
- [ ] lib/db/model-management-types.ts
- [ ] lib/db/model-management.ts
- [ ] lib/db/queries.ts
- [ ] lib/db/rating-functions.ts
- [ ] lib/db/schema-memory.ts
- [ ] lib/db/schema-models.ts
- [ ] lib/db/schema-prompt-suggestions.ts
- [ ] lib/db/schema-token-usage.ts
- [ ] lib/db/schema-tool-state.ts
- [ ] lib/db/schema.ts
- [ ] lib/db/seed-models.ts
- [ ] lib/db/seed-prompts.ts

#### Lib/db/helpers
- [ ] lib/db/helpers/01-core-to-parts.ts

#### Lib/db/migrations/meta
- [ ] lib/db/migrations/meta/_journal.json

#### Lib/db/queries
- [ ] lib/db/queries/chat.ts
- [ ] lib/db/queries/documents.ts
- [ ] lib/db/queries/index.ts
- [ ] lib/db/queries/model-management.ts
- [ ] lib/db/queries/prompt-suggestions.ts
- [ ] lib/db/queries/tool-state.ts
- [ ] lib/db/queries/user-auth.ts
- [ ] lib/db/queries/user-prompt-history.ts

### Lib/editor
- [ ] lib/editor/config.ts
- [ ] lib/editor/diff.js
- [ ] lib/editor/functions.tsx
- [ ] lib/editor/react-renderer.tsx
- [ ] lib/editor/suggestions.tsx

### Lib/memory
- [ ] lib/memory/memory-manager.ts

### Lib/tools
- [ ] lib/tools/cleanup-service.ts
- [ ] lib/tools/hitl-client.ts
- [ ] lib/tools/hitl-utils.ts
- [x] lib/tools/mcp-tool-client.ts
- [ ] lib/tools/tool-manager.ts
- [ ] lib/tools/tool-wrapper.ts

### Lib/vercel-kv
- [ ] lib/vercel-kv/client.ts
- [ ] lib/vercel-kv/tool-state-cache.ts

## Public Directory
- [ ] public/favicon.ico

### Public/fonts
- [ ] public/fonts/geist-mono.woff2
- [ ] public/fonts/geist.woff2

### Public/images
- [ ] public/images/demo-thumbnail.png
- [ ] public/images/mouth of the seine, monet.jpg

## SQL Directory
- [ ] sql/memory_tables.sql
- [ ] sql/tool_management_tables.sql

## Tests Directory
- [ ] tests/artifacts.test.ts
- [ ] tests/auth.setup.ts
- [ ] tests/auth.test.ts
- [ ] tests/chat.test.ts
- [ ] tests/reasoning.setup.ts
- [ ] tests/reasoning.test.ts

### Tests/pages
- [ ] tests/pages/artifact.ts
- [ ] tests/pages/chat.ts

### Tests/prompts
- [ ] tests/prompts/basic.ts
- [ ] tests/prompts/utils.ts