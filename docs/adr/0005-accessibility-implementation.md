# ADR-005: Accessibility Implementation

**Status:** Accepted  
**Date:** 2025-01-27  
**Deciders:** Development Team  
**Tags:** accessibility, a11y, wcag, aria

## Context

The plugin needs to be accessible to users with disabilities, including those using screen readers, keyboard navigation, and other assistive technologies. Obsidian plugins should follow WCAG 2.1 guidelines.

## Decision

We will implement **comprehensive accessibility features** following WCAG 2.1 Level AA guidelines:

1. **ARIA Labels**: All interactive elements have descriptive labels
2. **Keyboard Navigation**: Full keyboard support for all interactions
3. **Focus Management**: Proper focus indicators and management
4. **Screen Reader Support**: Live regions for dynamic content
5. **Semantic HTML**: Proper heading hierarchy and roles

## Accessibility Features

### ARIA Implementation

**Interactive Elements:**
- Buttons: `aria-label` for icon-only buttons
- Inputs: `aria-label` and proper label association
- Cards: `role="button"` with `tabindex="0"` and `aria-label`
- Toggle buttons: `aria-pressed` state
- Status updates: `aria-live` regions

**Example:**
```typescript
const card = container.createDiv("plugin-card");
card.setAttribute("role", "button");
card.setAttribute("tabindex", "0");
card.setAttribute("aria-label", `Plugin: ${plugin.name} by ${plugin.author}`);
```

### Keyboard Navigation

**Supported Keys:**
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and cards
- **Escape**: Close modals/views (where applicable)
- **Arrow Keys**: Navigate lists (where applicable)

**Implementation:**
```typescript
this.registerDomEvent(card, "keydown", (evt: KeyboardEvent) => {
  if (evt.key === "Enter" || evt.key === " ") {
    evt.preventDefault();
    this.openPluginDetail(plugin);
  }
});
```

### Focus Management

- Visible focus indicators in CSS
- Initial focus on search input when view opens
- Focus return after modal actions
- Focus trap in modals (where applicable)

### Screen Reader Support

**Live Regions:**
- `aria-live="polite"`: Status updates (loading, counts)
- `aria-live="assertive"`: Error messages
- `role="status"`: Status messages
- `role="alert"`: Error alerts

**Example:**
```typescript
const statusEl = container.createDiv("status");
statusEl.setAttribute("role", "status");
statusEl.setAttribute("aria-live", "polite");
statusEl.setAttribute("aria-atomic", "true");
```

### Semantic HTML

- Proper heading hierarchy (h1, h2, h3)
- Label associations with form controls
- Button groups with `role="group"`
- Regions with appropriate roles

## Consequences

### Positive

- **Inclusivity**: Accessible to users with disabilities
- **Legal Compliance**: Meets WCAG 2.1 guidelines
- **Better UX**: Improved usability for all users
- **Future-Proof**: Easier to maintain and extend

### Negative

- **Development Time**: Additional implementation effort
- **Code Complexity**: More attributes and event handlers
- **Testing**: Requires accessibility testing tools

### Mitigations

- Document accessibility patterns in DEVELOPMENT.md
- Use consistent patterns across the codebase
- Test with screen readers during development

## Implementation Notes

### ARIA Attributes Added

- `aria-label`: Descriptive labels for all interactive elements
- `aria-pressed`: Toggle button states
- `aria-live`: Dynamic content updates
- `role`: Semantic roles for custom elements
- `aria-hidden`: Decorative icons hidden from screen readers

### Keyboard Support

- All cards are keyboard accessible
- All buttons support keyboard activation
- Search input receives initial focus
- Escape key handling where appropriate

### Focus Indicators

CSS ensures visible focus indicators:
```css
button:focus-visible,
input:focus-visible,
.plugin-card:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}
```

## References

- Git changes: Accessibility improvements throughout views
- DEVELOPMENT.md: Accessibility Best Practices section
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

