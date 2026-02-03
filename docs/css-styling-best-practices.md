# Obsidian Plugin CSS Styling Best Practices

This document outlines best practices for styling Obsidian plugins, based on official Obsidian documentation and patterns observed in popular community plugins.

## Table of Contents

1. [Core Principles](#core-principles)
2. [CSS Variables](#css-variables)
3. [Naming Conventions](#naming-conventions)
4. [Theme Compatibility](#theme-compatibility)
5. [Accessibility](#accessibility)
6. [Performance](#performance)
7. [Organization and Structure](#organization-and-structure)
8. [Common Patterns](#common-patterns)
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
10. [Testing and Validation](#testing-and-validation)

## Core Principles

### 1. Always Use CSS Variables

**✅ DO:** Use Obsidian's CSS variables for all colors, spacing, and theme-aware properties.

```css
/* ✅ Good: Theme-aware styling */
.my-plugin-container {
  background: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
}

/* ❌ Bad: Hardcoded colors */
.my-plugin-container {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cccccc;
}
```

**Why:** Obsidian provides over 400 CSS variables that automatically adapt to themes (light/dark mode) and user preferences. Using variables ensures your plugin looks consistent across all themes.

### 2. Prefer CSS Classes Over Inline Styles

**✅ DO:** Define styles in your `styles.css` file and apply classes in TypeScript.

```typescript
// ✅ Good: Use CSS classes
const container = this.containerEl.createDiv("my-plugin-container");
container.addClass("my-plugin-card");

// ❌ Bad: Inline styles
const container = this.containerEl.createDiv();
container.style.backgroundColor = "#ffffff";
container.style.color = "#000000";
```

**Why:** 
- Better separation of concerns
- Easier to maintain and update
- Allows users to override styles via CSS snippets
- Works better with Obsidian's theming system
- ESLint rule `obsidian/no-static-styles-assignment` enforces this

### 3. Semantic Variable Names

**✅ DO:** Use semantic variable names that describe purpose, not appearance.

```css
/* ✅ Good: Semantic naming */
.my-plugin-button-primary {
  background: var(--interactive-normal);
  color: var(--text-on-accent);
}

.my-plugin-button-secondary {
  background: var(--background-modifier-border);
  color: var(--text-normal);
}

/* ❌ Bad: Appearance-based naming */
.my-plugin-button-blue {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}
```

**Why:** Semantic naming makes your CSS more maintainable and allows themes to properly style your plugin.

## CSS Variables

### Essential Variables to Know

#### Text Colors
- `--text-normal`: Primary text color
- `--text-muted`: Secondary/muted text
- `--text-faint`: Very subtle text
- `--text-accent`: Accent-colored text
- `--text-error`: Error messages
- `--text-warning`: Warning messages
- `--text-success`: Success messages
- `--text-on-accent`: Text on accent backgrounds

#### Backgrounds
- `--background-primary`: Main background
- `--background-secondary`: Secondary background (panels, cards)
- `--background-modifier-border`: Border color
- `--background-modifier-hover`: Hover state background
- `--background-modifier-active`: Active state background

#### Interactive Elements
- `--interactive-normal`: Default interactive element color
- `--interactive-hover`: Hover state
- `--interactive-accent`: Accent color (focus, active)
- `--interactive-accent-hover`: Accent hover state

#### Links
- `--link-color`: Link color
- `--link-color-hover`: Link hover color
- `--link-color-external`: External link color

#### Code
- `--code-background`: Code block background
- `--code-normal`: Code text color
- `--font-monospace`: Monospace font family

See [CSS Variables Reference](./css-variables.md) for a complete list.

### Variable Usage Patterns

```css
/* Container with theme-aware styling */
.plugin-container {
  background: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--border-radius);
  padding: var(--size-4-4);
}

/* Interactive button */
.plugin-button {
  background: var(--interactive-normal);
  color: var(--text-on-accent);
  border: none;
  border-radius: var(--border-radius);
  padding: var(--size-4-2) var(--size-4-4);
  transition: background 0.2s;
}

.plugin-button:hover {
  background: var(--interactive-hover);
}

.plugin-button:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

/* Card with hover effect */
.plugin-card {
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--border-radius);
  padding: var(--size-4-4);
  transition: all 0.2s;
}

.plugin-card:hover {
  background: var(--background-modifier-hover);
  border-color: var(--interactive-normal);
}
```

## Naming Conventions

### Class Naming Patterns

Popular plugins use consistent naming conventions. Recommended patterns:

#### BEM-like Structure (Block Element Modifier)

```css
/* Block: Main component */
.plugin-browser-container { }

/* Element: Part of component */
.plugin-browser-header { }
.plugin-browser-search { }
.plugin-browser-list { }

/* Modifier: Variation of element */
.plugin-browser-card { }
.plugin-browser-card--active { }
.plugin-browser-card--disabled { }
```

#### Prefix-Based Structure

Some plugins use prefixes to organize classes:

- `.plugin-*`: Plugin-specific classes (recommended)
- `.o-*`: Object classes
- `.c-*`: Component classes
- `.u-*`: Utility classes

**Example:**
```css
/* Plugin-specific prefix */
.plugin-browser-container { }
.plugin-browser-header { }

/* Component classes */
.c-button { }
.c-button--primary { }

/* Utility classes */
.u-hidden { }
.u-text-center { }
```

### Naming Best Practices

1. **Use descriptive names**: `plugin-card` not `card`
2. **Use kebab-case**: `plugin-browser-container` not `pluginBrowserContainer`
3. **Be consistent**: Stick to one naming pattern throughout
4. **Avoid abbreviations**: `plugin-button` not `plugin-btn` (unless widely understood)
5. **Use modifiers**: `plugin-card-active` or `plugin-card--active` for variations

## Theme Compatibility

### Testing Across Themes

Always test your plugin with:
- **Light mode**: Default light theme
- **Dark mode**: Default dark theme
- **Popular themes**: Minimal, Dracula, Catppuccin, etc.
- **High contrast themes**: For accessibility

### Common Theme Issues

#### Issue: Hardcoded Colors
```css
/* ❌ Bad: Breaks in dark themes */
.error-message {
  color: #ff0000;
  background: #ffffff;
}

/* ✅ Good: Theme-aware */
.error-message {
  color: var(--text-error);
  background: var(--background-primary);
}
```

#### Issue: Insufficient Contrast
```css
/* ❌ Bad: May not have enough contrast */
.muted-text {
  color: var(--text-faint);
  background: var(--background-primary);
}

/* ✅ Good: Use appropriate text color */
.muted-text {
  color: var(--text-muted);
  background: var(--background-primary);
}
```

#### Issue: Border Visibility
```css
/* ❌ Bad: Border may be invisible */
.container {
  border: 1px solid var(--background-primary);
}

/* ✅ Good: Use modifier border */
.container {
  border: 1px solid var(--background-modifier-border);
}
```

### Responsive Design

Consider mobile and tablet users:

```css
/* Base styles */
.plugin-container {
  padding: 1rem;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .plugin-container {
    padding: 0.5rem;
  }
  
  .plugin-grid {
    grid-template-columns: 1fr;
  }
  
  .plugin-button {
    width: 100%;
  }
}
```

## Accessibility

### Focus Indicators

Always provide visible focus indicators:

```css
/* ✅ Good: Visible focus indicators */
button:focus-visible,
input:focus-visible,
select:focus-visible,
.plugin-card:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

/* ❌ Bad: No focus indicator */
button:focus {
  outline: none;
}
```

### Color Contrast

Ensure sufficient contrast ratios:
- Normal text: 4.5:1 contrast ratio minimum
- Large text: 3:1 contrast ratio minimum
- Interactive elements: Clear visual distinction

```css
/* ✅ Good: Uses theme variables (already tested for contrast) */
.plugin-text {
  color: var(--text-normal);
  background: var(--background-primary);
}

/* ❌ Bad: Custom colors may not meet contrast requirements */
.plugin-text {
  color: #888888;
  background: #ffffff;
}
```

### Semantic HTML

Use semantic HTML elements:

```typescript
// ✅ Good: Semantic elements
container.createEl("button", { text: "Click me" });
container.createEl("input", { type: "text" });
container.createEl("label", { text: "Name:" });

// ❌ Bad: Divs styled as buttons
const button = container.createDiv("button");
button.textContent = "Click me";
```

## Performance

### Efficient Selectors

Use efficient CSS selectors:

```css
/* ✅ Good: Specific class selector */
.plugin-card { }

/* ❌ Bad: Overly specific selector */
div.plugin-container > div.plugin-list > div.plugin-card { }
```

### Avoid Expensive Properties

Some CSS properties trigger expensive operations:

```css
/* ⚠️ Use sparingly: Triggers layout recalculation */
.element {
  width: calc(100% - 20px);
  height: calc(100vh - 50px);
}

/* ✅ Prefer: Use transform for animations */
.element {
  transform: translateX(10px);
  transition: transform 0.2s;
}
```

### Minimize Repaints

Group style changes:

```typescript
// ✅ Good: Batch DOM updates
requestAnimationFrame(() => {
  element.style.width = "100px";
  element.style.height = "100px";
  element.style.opacity = "0.5";
});

// ❌ Bad: Multiple repaints
element.style.width = "100px";
element.style.height = "100px";
element.style.opacity = "0.5";
```

## Organization and Structure

### File Organization

Structure your CSS logically:

```css
/**
 * Plugin Name Styles
 * 
 * Table of Contents:
 * 1. Variables (if custom)
 * 2. Base/Reset styles
 * 3. Layout components
 * 4. UI components
 * 5. States (hover, active, disabled)
 * 6. Utilities
 * 7. Responsive/Media queries
 */

/* ============================================
   1. Variables
   ============================================ */
:root {
  --plugin-spacing: 1rem;
  --plugin-border-radius: 4px;
}

/* ============================================
   2. Base Styles
   ============================================ */
.plugin-container {
  /* ... */
}

/* ============================================
   3. Layout Components
   ============================================ */
.plugin-header { }
.plugin-body { }
.plugin-footer { }

/* ============================================
   4. UI Components
   ============================================ */
.plugin-button { }
.plugin-input { }
.plugin-card { }

/* ============================================
   5. States
   ============================================ */
.plugin-button:hover { }
.plugin-button:active { }
.plugin-button:disabled { }

/* ============================================
   6. Utilities
   ============================================ */
.plugin-hidden { display: none !important; }
.plugin-text-center { text-align: center; }

/* ============================================
   7. Responsive
   ============================================ */
@media (max-width: 768px) {
  /* ... */
}
```

### Comments

Use comments to organize and document:

```css
/* Container */
.plugin-container {
  /* Styles */
}

/* Header section */
.plugin-header {
  /* Styles */
}

/* Search input */
.plugin-search-input {
  /* Styles */
}
```

## Common Patterns

### Button Styles

```css
.plugin-button {
  padding: var(--size-4-2) var(--size-4-4);
  border: none;
  border-radius: var(--border-radius);
  background: var(--interactive-normal);
  color: var(--text-on-accent);
  font-size: var(--font-ui-size);
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.plugin-button:hover:not(:disabled) {
  background: var(--interactive-hover);
}

.plugin-button:active:not(:disabled) {
  transform: scale(0.98);
}

.plugin-button:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

.plugin-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button variants */
.plugin-button--secondary {
  background: var(--background-modifier-border);
  color: var(--text-normal);
}

.plugin-button--secondary:hover {
  background: var(--background-modifier-hover);
}
```

### Input Styles

```css
.plugin-input {
  padding: var(--size-4-2) var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--border-radius);
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: var(--font-ui-size);
  font-family: var(--font-text);
}

.plugin-input:focus {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  border-color: var(--interactive-accent);
}

.plugin-input::placeholder {
  color: var(--text-muted);
}

.plugin-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Card Styles

```css
.plugin-card {
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--border-radius);
  padding: var(--size-4-4);
  transition: all 0.2s;
}

.plugin-card:hover {
  background: var(--background-modifier-hover);
  border-color: var(--interactive-normal);
  box-shadow: var(--shadow-s);
}

.plugin-card:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  border-color: var(--interactive-accent);
}
```

### Loading States

```css
.plugin-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--size-4-6);
  color: var(--text-muted);
}

.plugin-loading::before {
  content: "";
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--background-modifier-border);
  border-top-color: var(--interactive-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--size-4-2);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Error States

```css
.plugin-error {
  padding: var(--size-4-3);
  background: var(--background-primary);
  border-left: 3px solid var(--text-error);
  color: var(--text-error);
  border-radius: var(--border-radius);
}
```

## Anti-Patterns to Avoid

### 1. Overusing `!important`

```css
/* ❌ Bad: Unnecessary !important */
.plugin-text {
  color: var(--text-normal) !important;
}

/* ✅ Good: Only when necessary */
.plugin-hidden {
  display: none !important; /* Necessary override */
}
```

**When to use `!important`:**
- Utility classes that need to override other styles
- Critical overrides that must not be changed
- Always document why `!important` is needed

### 2. Deep Nesting

```css
/* ❌ Bad: Too deeply nested */
.plugin-container .plugin-list .plugin-item .plugin-title .plugin-icon { }

/* ✅ Good: Flat structure */
.plugin-icon { }
```

### 3. Inline Styles in TypeScript

```typescript
// ❌ Bad: Inline styles
element.style.backgroundColor = "#ffffff";
element.style.color = "#000000";

// ✅ Good: CSS classes
element.addClass("plugin-container");
```

### 4. Hardcoded Values

```css
/* ❌ Bad: Hardcoded spacing */
.plugin-container {
  padding: 16px;
  margin: 8px;
}

/* ✅ Good: Use variables or consistent values */
.plugin-container {
  padding: var(--size-4-4);
  margin: var(--size-4-2);
}
```

### 5. Theme-Specific Styles

```css
/* ❌ Bad: Theme-specific */
.theme-dark .plugin-container {
  background: #1e1e1e;
}

.theme-light .plugin-container {
  background: #ffffff;
}

/* ✅ Good: Theme-aware variables */
.plugin-container {
  background: var(--background-primary);
}
```

### 6. Missing Focus States

```css
/* ❌ Bad: No focus indicator */
.plugin-button:focus {
  outline: none;
}

/* ✅ Good: Visible focus indicator */
.plugin-button:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}
```

## Testing and Validation

### Checklist

Before releasing your plugin, verify:

- [ ] All colors use CSS variables
- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] Tested with popular themes (Minimal, Dracula, etc.)
- [ ] All interactive elements have focus indicators
- [ ] Sufficient color contrast for accessibility
- [ ] Responsive design works on mobile/tablet
- [ ] No hardcoded colors or values
- [ ] No unnecessary `!important` declarations
- [ ] CSS is organized and commented
- [ ] Class names follow consistent naming convention

### Testing Tools

1. **Browser DevTools**: Inspect CSS variables and computed styles
2. **Obsidian Theme Switcher**: Test with different themes
3. **Accessibility Checker**: Verify contrast ratios
4. **Mobile Testing**: Test on mobile devices or responsive mode

### Common Issues and Solutions

#### Issue: Styles Not Applying

**Solution:** Check CSS specificity and ensure classes are correctly applied:

```typescript
// ✅ Good: Explicit class application
element.addClass("plugin-container");

// Check in DevTools that class is present
```

#### Issue: Theme Colors Not Working

**Solution:** Verify you're using CSS variables, not hardcoded colors:

```css
/* Check: Are you using var(--variable-name)? */
color: var(--text-normal); /* ✅ */
color: #000000; /* ❌ */
```

#### Issue: Styles Overridden by Theme

**Solution:** Increase specificity or use more specific selectors:

```css
/* If needed, increase specificity */
.plugin-container.plugin-container {
  /* Styles */
}

/* Or use :where() for lower specificity */
:where(.plugin-container) {
  /* Styles */
}
```

## Examples from Popular Plugins

### Dataview Plugin Pattern

```css
/* Uses plugin-specific prefix */
.dataview { }
.dataview-list-item { }
.dataview-list-item-embed { }
```

### Templater Plugin Pattern

```css
/* Component-based naming */
.templater-template { }
.templater-template-header { }
.templater-template-content { }
```

### Tasks Plugin Pattern

```css
/* Semantic naming with plugin prefix */
.tasks-list-item { }
.tasks-list-item-checkbox { }
.tasks-list-item-text { }
```

## References

- [Obsidian CSS Variables Reference](./css-variables.md) - Complete list of CSS variables
- [Obsidian Theme Migration Guide](https://obsidian.md/blog/1-0-theme-migration-guide/) - Official Obsidian documentation
- [Obsidian Help: CSS Snippets](https://help.obsidian.md/snippets) - Official documentation
- [Obsidian.css Styleguide](https://obsidian.charliewil.co/styleguide) - Community style guide
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards

## Summary

Key takeaways:

1. **Always use CSS variables** for theme compatibility
2. **Use semantic class names** with consistent naming conventions
3. **Test across themes** (light, dark, popular themes)
4. **Ensure accessibility** (focus indicators, contrast)
5. **Organize CSS** logically with comments
6. **Avoid anti-patterns** (hardcoded values, excessive `!important`)
7. **Follow common patterns** from popular plugins
8. **Test thoroughly** before release

By following these best practices, your plugin will:
- Work seamlessly across all Obsidian themes
- Provide a consistent user experience
- Be easier to maintain and update
- Meet accessibility standards
- Follow community conventions
