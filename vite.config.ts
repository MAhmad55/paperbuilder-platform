import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Bundle headroom: split the big third-party libs out of the
        // entry chunk so each loads only when a route needs it.
        // - vendor: React + router + i18next (every route needs these).
        // - forms: react-hook-form + zod (public auth/request pages only).
        // - table: @tanstack/react-table + table-core (Table users only).
        // - core: shell + services + mock data + i18n + utils. The entry
        //   imports these (AppShell, AuthContext, translations), so this
        //   chunk is eager — it is split out only so the entry chunk
        //   itself stays small and the split is explicit, not accidental.
        // - ui: the design system + lucide icons (also eager via the
        //   shell's Drawer/Avatar/Toast and the skeleton fallback).
        // - admin / school / teacher / shared / public / showcase: one
        //   lazy chunk per route group, so a visit loads its group only.
        //   Shared code gets its own core/ui chunks on purpose: without
        //   them Rollup collapses everything shared into whichever
        //   group chunk it meets first (the public one), so teacher and
        //   admin visits would drag the landing page's code along.
        //   (Grouping also keeps the chunk count low: dozens of tiny
        //   per-page chunks cost ~0.5 KB of wrapper each plus a fresh
        //   gzip dictionary per file, which measurably grows the sum of
        //   all emitted JS.) Anything else (e.g. scheduler) follows its
        //   importer, so Rollup still shares it between chunks that
        //   use it.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers') ||
              id.includes('node_modules/zod/')
            ) {
              return 'forms'
            }
            if (id.includes('@tanstack/')) return 'table'
            if (id.includes('lucide-react')) return 'ui'
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('react-router') ||
              id.includes('react-i18next') ||
              id.includes('node_modules/i18next/')
            ) {
              return 'vendor'
            }
            return undefined
          }
          if (
            id.includes('/shell/') ||
            id.includes('/services/') ||
            id.includes('/mock/') ||
            id.includes('/i18n/') ||
            id.includes('/utils/')
          ) {
            return 'core'
          }
          if (id.includes('/design-system/')) return 'ui'
          // SystemStatePage is a shared system-state page (RequireRole's
          // no-permission state, /session-expired, 404, and the shared
          // SystemStates demo render it) — not a public page. Keeping it
          // in the public chunk would make every shared route drag the
          // public chunk (and its zod forms chunk) along.
          if (id.includes('/pages/SystemStatePage')) return 'shared'
          // pages/school/shared.tsx is a cross-group helper: teacher and
          // shared pages import its labels/demo helpers. It belongs in
          // core with the other shared code, not in the school chunk.
          if (id.includes('/pages/school/shared')) return 'core'
          if (id.includes('/pages/admin/')) return 'admin'
          if (id.includes('/pages/school/')) return 'school'
          if (id.includes('/pages/teacher/')) return 'teacher'
          if (id.includes('/pages/shared/')) return 'shared'
          if (id.includes('/pages/DesignSystemPage') || id.includes('/pages/FoundationTestPage')) {
            return 'showcase'
          }
          if (id.includes('/features/') || id.includes('/pages/')) return 'public'
          return undefined
        },
      },
    },
  },
})
