# ADR-003: View Management Pattern

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** architecture, views, lifecycle, obsidian-api

## Context

The plugin needs to display plugin lists and details in Obsidian's workspace. We need to decide how to structure views, manage their lifecycle, and handle user interactions.

## Decision

We will use **Obsidian's ItemView pattern** with:

1. **Two View Types**: List view and detail view
2. **View Registration**: Register views in main plugin class
3. **Lifecycle Management**: Proper cleanup in `onOpen()` and `onClose()`
4. **View State**: Persist user preferences (display mode, filters)
5. **Event Handling**: Use `registerDomEvent()` for automatic cleanup

## View Architecture

### View Types

**PluginListView:**
- Displays grid/list of all plugins
- Handles search, filtering, sorting
- Pagination for performance
- Opens detail view on plugin click

**PluginDetailView:**
- Shows detailed plugin information
- Displays README content
- Handles install/uninstall actions
- Navigation back to list view

### View Lifecycle

```typescript
onOpen() {
  // Initialize view
  // Create DOM elements
  // Register event listeners
  // Load data
}

onClose() {
  // Cleanup event listeners
  // Cancel pending operations
  // Clear references
}
```

### View Location Options

Users can configure where views open:
- **Right Sidebar**: Default, familiar location
- **Main Editor**: Full-width view
- **New Window**: Popout window (desktop only)

## Consequences

### Positive

- **Obsidian Integration**: Uses native Obsidian APIs
- **Lifecycle Management**: Automatic cleanup via Obsidian's view system
- **Flexibility**: Multiple view locations supported
- **State Persistence**: User preferences saved automatically

### Negative

- **Obsidian Dependency**: Tightly coupled to Obsidian's view system
- **Complexity**: Multiple view types to maintain

### Mitigations

- Clear documentation of view lifecycle
- Proper cleanup in `onClose()` to prevent memory leaks
- Use `registerDomEvent()` for automatic event cleanup

## Implementation Notes

### Event Listener Management

- **Standard Events**: Use `registerDomEvent()` for automatic cleanup
- **Debounced Handlers**: Track manually and remove in `onClose()`
- **AbortController**: Cancel pending async operations on view close

### View State

- Display mode (grid/list) persisted in settings
- Search filters persisted per session
- View location preference saved in settings

### Memory Management

- Track all event listeners that need manual cleanup
- Cancel AbortControllers on view close
- Clear DOM references to prevent leaks

## References

- DEVELOPMENT.md: View Management Patterns section
- DEVELOPMENT.md: Memory Management & Lifecycle section
- Git changes: Accessibility improvements in views

