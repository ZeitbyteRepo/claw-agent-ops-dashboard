# INST001 - api.ts Config System Refactor

**Date**: 2026-03-08
**Task**: #418 - Refactor api.ts to use config system
**Status**: ✅ Complete

## Problem

During INST001-VALIDATE, discovered that task #412 was marked "done" but api.ts still used hardcoded API_BASE logic instead of the config system. This meant the frontend wouldn't respect custom `apiBase` from dashboard.config.json.

## Solution Implemented

### 1. Created apiClient.tsx

New file: `frontend/src/apiClient.tsx`

- **ApiClientProvider**: React context provider that wraps the app
- **useApiClient()**: Hook that returns configured API client with apiBase from config
- **Complete API coverage**: All endpoints (tasks, plans, dispatches, agents, streams, config, SSE)
- **Uses config system**: Gets apiBase from useApiBase() hook which reads from dashboard.config.json

### 2. Updated api.ts

Refactored existing api.ts with:

- **createApiClient(apiBase)**: Factory function to create API client with custom base URL
- **Legacy exports preserved**: All existing functions still work for backward compatibility
- **Deprecation notices**: Added JSDoc comments marking legacy functions as deprecated
- **Enhanced SSE support**: Updated SSEOptions interface to support all options used by components
- **Fixed NodeJS.Timeout types**: Changed to `ReturnType<typeof setTimeout>` for browser compatibility

### 3. Updated App.tsx

Wrapped app with ApiClientProvider:

```tsx
<ConfigProvider>
  <ApiClientProvider>
    <AppContent />
  </ApiClientProvider>
</ConfigProvider>
```

## Migration Path

### For New Code
```tsx
import { useApiClient } from './apiClient';

function MyComponent() {
  const api = useApiClient();
  
  const tasks = await api.fetchTasks();
}
```

### For Existing Code
Existing code continues to work with legacy imports:

```tsx
import { fetchTasks } from './api'; // Still works, uses hardcoded API_BASE
```

To migrate:
1. Import useApiClient from apiClient.tsx
2. Replace direct function calls with api.method()
3. Remove legacy api imports

## Testing

Build test shows:
- ✅ api.ts compiles with deprecated functions
- ✅ apiClient.tsx compiles and integrates with config system
- ✅ SSEOptions supports all component requirements
- ⚠️ 5 pre-existing TypeScript errors in other files (unrelated to this refactor)

## Files Changed

1. **frontend/src/apiClient.tsx** (NEW) - Config-based API client
2. **frontend/src/api.ts** - Added createApiClient factory + enhanced types
3. **frontend/src/App.tsx** - Wrapped with ApiClientProvider

## Impact

- **Backward compatible**: Existing code continues to work
- **Config-aware**: New code can use dashboard.config.json apiBase
- **Clean migration path**: Gradual adoption possible
- **Type-safe**: Full TypeScript support

## Next Steps

To fully migrate to config-based API:
1. Update components one-by-one to use useApiClient()
2. Remove deprecated legacy functions once all components migrated
3. Fix the 5 pre-existing TypeScript errors (separate task)
