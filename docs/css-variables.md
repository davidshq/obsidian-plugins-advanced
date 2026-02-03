# Obsidian CSS Variables Reference

This document contains a comprehensive reference of Obsidian's standard CSS variables that can be used in plugin development. These variables automatically adapt to the current theme (light or dark mode) and ensure consistent styling across Obsidian.

## Text Colors

### Primary Text Colors
- `--text-normal`: Primary text color for normal content
- `--text-muted`: Muted/secondary text color for less prominent content
- `--text-faint`: Very faint text color for subtle information
- `--text-accent`: Accent color for highlighted text

### Status Text Colors
- `--text-success`: Success message text color
- `--text-warning`: Warning message text color
- `--text-error`: Error message text color

### Text on Accent Backgrounds
- `--text-on-accent`: Text color to use on accent-colored backgrounds (when accent is dark)
- `--text-on-accent-inverted`: Text color to use on accent-colored backgrounds (when accent is light)

## Background Colors

### Primary Backgrounds
- `--background-primary`: Main background color
- `--background-secondary`: Secondary background color (e.g., for panels, cards)
- `--background-tertiary`: Tertiary background color (for nested elements)

### Background Modifiers
- `--background-modifier-border`: Border color for separating elements
- `--background-modifier-hover`: Background color on hover states
- `--background-modifier-active`: Background color for active/pressed states
- `--background-modifier-active-hover`: Background color for active elements on hover
- `--background-modifier-form-field`: Background color for form input fields
- `--background-modifier-form-field-highlighted`: Background color for highlighted form fields

## Interactive Elements

### Interactive Colors
- `--interactive-normal`: Default color for interactive elements (buttons, links)
- `--interactive-hover`: Color for interactive elements on hover
- `--interactive-accent`: Accent color for interactive elements (focus, active states)
- `--interactive-accent-hover`: Accent color for interactive elements on hover

## Links

- `--link-color`: Color for links
- `--link-color-hover`: Color for links on hover
- `--link-color-external`: Color for external links
- `--link-color-external-hover`: Color for external links on hover

## Code Blocks

- `--code-background`: Background color for code blocks
- `--code-normal`: Text color for code
- `--code-comment`: Color for code comments
- `--code-function`: Color for function names in code
- `--code-keyword`: Color for keywords in code
- `--code-operator`: Color for operators in code
- `--code-property`: Color for properties in code
- `--code-punctuation`: Color for punctuation in code
- `--code-string`: Color for strings in code
- `--code-tag`: Color for HTML/XML tags in code
- `--code-value`: Color for values in code

## Typography

- `--font-text`: Font family for body text
- `--font-text-size`: Font size for body text
- `--font-monospace`: Font family for monospace text (code, etc.)
- `--font-ui`: Font family for UI elements
- `--font-ui-size`: Font size for UI elements
- `--font-ui-small`: Small font size for UI elements
- `--font-ui-smallest`: Smallest font size for UI elements
- `--line-height-normal`: Normal line height
- `--line-height-tight`: Tight line height

## Borders and Dividers

- `--border-width`: Standard border width
- `--border-radius`: Standard border radius
- `--border-radius-s`: Small border radius
- `--border-radius-m`: Medium border radius
- `--border-radius-l`: Large border radius

## Shadows

- `--shadow-s`: Small shadow
- `--shadow-m`: Medium shadow
- `--shadow-l`: Large shadow

## Scrollbars

- `--scrollbar-active-thumb-bg`: Active scrollbar thumb background
- `--scrollbar-bg`: Scrollbar background
- `--scrollbar-thumb-bg`: Scrollbar thumb background
- `--scrollbar-thumb-bg-hover`: Scrollbar thumb background on hover

## Icons

- `--icon-color`: Default icon color
- `--icon-color-hover`: Icon color on hover
- `--icon-color-active`: Icon color when active
- `--icon-opacity`: Default icon opacity
- `--icon-opacity-hover`: Icon opacity on hover
- `--icon-opacity-active`: Icon opacity when active

## Tables

- `--table-border-color`: Border color for table cells
- `--table-header-background`: Background color for table headers
- `--table-header-text`: Text color for table headers
- `--table-row-background-hover`: Background color for table rows on hover
- `--table-row-background-alt`: Alternating row background color

## Checkboxes and Toggles

- `--checkbox-border-color`: Border color for checkboxes
- `--checkbox-border-color-hover`: Border color for checkboxes on hover
- `--checkbox-border-color-active`: Border color for active checkboxes
- `--checkbox-marker-color`: Color for checkbox checkmark
- `--checkbox-bg`: Background color for checkboxes
- `--checkbox-bg-hover`: Background color for checkboxes on hover
- `--checkbox-bg-active`: Background color for active checkboxes

## Input Fields

- `--input-border-color`: Border color for input fields
- `--input-border-color-hover`: Border color for input fields on hover
- `--input-border-color-active`: Border color for active input fields
- `--input-bg`: Background color for input fields
- `--input-bg-hover`: Background color for input fields on hover
- `--input-text-color`: Text color for input fields
- `--input-placeholder-color`: Placeholder text color for input fields

## Buttons

- `--button-bg`: Background color for buttons
- `--button-bg-hover`: Background color for buttons on hover
- `--button-bg-active`: Background color for active buttons
- `--button-text-color`: Text color for buttons
- `--button-text-color-hover`: Text color for buttons on hover
- `--button-text-color-active`: Text color for active buttons

## Tags

- `--tag-color`: Background color for tags
- `--tag-color-hover`: Background color for tags on hover
- `--tag-text-color`: Text color for tags
- `--tag-text-color-hover`: Text color for tags on hover
- `--tag-border-color`: Border color for tags
- `--tag-border-color-hover`: Border color for tags on hover
- `--tag-padding-x`: Horizontal padding for tags
- `--tag-padding-y`: Vertical padding for tags
- `--tag-radius`: Border radius for tags

## Callouts

- `--callout-border-width`: Border width for callouts
- `--callout-border-opacity`: Border opacity for callouts
- `--callout-radius`: Border radius for callouts
- `--callout-padding`: Padding for callouts
- `--callout-title-padding`: Padding for callout titles
- `--callout-content-padding`: Padding for callout content

## Graph View

- `--graph-node`: Color for graph nodes
- `--graph-node-focused`: Color for focused graph nodes
- `--graph-node-tag`: Color for tag nodes in graph
- `--graph-node-attachment`: Color for attachment nodes in graph
- `--graph-line`: Color for graph lines
- `--graph-line-highlight`: Color for highlighted graph lines
- `--graph-text`: Text color in graph view
- `--graph-bg`: Background color for graph view

## Canvas

- `--canvas-color`: Background color for canvas
- `--canvas-text`: Text color for canvas elements
- `--canvas-shadow`: Shadow for canvas elements

## Workspace

- `--workspace-background-translucent`: Translucent background for workspace
- `--workspace-accent-cyan`: Cyan accent color
- `--workspace-accent-green`: Green accent color
- `--workspace-accent-orange`: Orange accent color
- `--workspace-accent-pink`: Pink accent color
- `--workspace-accent-purple`: Purple accent color
- `--workspace-accent-red`: Red accent color
- `--workspace-accent-yellow`: Yellow accent color

## Ribbon

- `--ribbon-background`: Background color for ribbon
- `--ribbon-background-collapsed`: Background color for collapsed ribbon
- `--ribbon-background-hover`: Background color for ribbon on hover

## Status Bar

- `--status-bar-background`: Background color for status bar
- `--status-bar-text-color`: Text color for status bar
- `--status-bar-border-color`: Border color for status bar

## Title Bar

- `--titlebar-background`: Background color for title bar
- `--titlebar-background-focused`: Background color for focused title bar
- `--titlebar-text-color`: Text color for title bar
- `--titlebar-text-color-focused`: Text color for focused title bar

## Tab Bar

- `--tab-background-active`: Background color for active tabs
- `--tab-background-active-focused`: Background color for active focused tabs
- `--tab-text-color`: Text color for tabs
- `--tab-text-color-active`: Text color for active tabs
- `--tab-text-color-focused`: Text color for focused tabs
- `--tab-divider-color`: Divider color between tabs

## Sidebar

- `--sidebar-background`: Background color for sidebar
- `--sidebar-text-color`: Text color for sidebar
- `--sidebar-border-color`: Border color for sidebar

## File Explorer

- `--nav-item-color`: Color for navigation items
- `--nav-item-color-hover`: Color for navigation items on hover
- `--nav-item-color-active`: Color for active navigation items
- `--nav-item-background-hover`: Background color for navigation items on hover
- `--nav-item-background-active`: Background color for active navigation items
- `--nav-collapse-icon-color`: Color for collapse/expand icons
- `--nav-indentation-guide-color`: Color for indentation guides

## Search Results

- `--search-result-background`: Background color for search results
- `--search-result-background-hover`: Background color for search results on hover
- `--search-result-text-color`: Text color for search results
- `--search-result-text-color-highlight`: Text color for highlighted search matches

## Modals

- `--modal-background`: Background color for modals
- `--modal-border-color`: Border color for modals
- `--modal-shadow`: Shadow for modals
- `--modal-radius`: Border radius for modals

## Prompts

- `--prompt-background`: Background color for prompts
- `--prompt-border-color`: Border color for prompts
- `--prompt-shadow`: Shadow for prompts
- `--prompt-radius`: Border radius for prompts

## Notices

- `--notice-background`: Background color for notices
- `--notice-border-color`: Border color for notices
- `--notice-text-color`: Text color for notices

## Animations

- `--animation-duration`: Standard animation duration
- `--animation-duration-fast`: Fast animation duration
- `--animation-duration-slow`: Slow animation duration
- `--animation-easing`: Standard animation easing function
- `--animation-easing-in`: Easing function for animations starting
- `--animation-easing-out`: Easing function for animations ending
- `--animation-easing-in-out`: Easing function for animations starting and ending

## Spacing

- `--size-2-1`: Small spacing unit (2px)
- `--size-2-2`: Small spacing unit (4px)
- `--size-2-3`: Small spacing unit (6px)
- `--size-4-1`: Medium spacing unit (4px)
- `--size-4-2`: Medium spacing unit (8px)
- `--size-4-3`: Medium spacing unit (12px)
- `--size-4-4`: Medium spacing unit (16px)
- `--size-4-5`: Medium spacing unit (20px)
- `--size-4-6`: Medium spacing unit (24px)
- `--size-4-7`: Medium spacing unit (28px)
- `--size-4-8`: Medium spacing unit (32px)
- `--size-4-9`: Medium spacing unit (36px)
- `--size-4-10`: Medium spacing unit (40px)

## Z-Index Layers

- `--layer-popover`: Z-index for popovers
- `--layer-modal`: Z-index for modals
- `--layer-notice`: Z-index for notices
- `--layer-menu`: Z-index for menus
- `--layer-tooltip`: Z-index for tooltips

## Usage Examples

### Basic Text Styling
```css
.my-plugin-text {
  color: var(--text-normal);
}

.my-plugin-muted-text {
  color: var(--text-muted);
}

.my-plugin-error-text {
  color: var(--text-error);
}
```

### Background Styling
```css
.my-plugin-container {
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.my-plugin-card {
  background: var(--background-secondary);
}

.my-plugin-card:hover {
  background: var(--background-modifier-hover);
}
```

### Interactive Elements
```css
.my-plugin-button {
  background: var(--interactive-normal);
  color: var(--text-on-accent);
}

.my-plugin-button:hover {
  background: var(--interactive-hover);
}

.my-plugin-button:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}
```

### Code Blocks
```css
.my-plugin-code {
  background: var(--code-background);
  color: var(--code-normal);
  font-family: var(--font-monospace);
  padding: 0.5rem;
  border-radius: var(--border-radius);
}
```

### Links
```css
.my-plugin-link {
  color: var(--link-color);
  text-decoration: none;
}

.my-plugin-link:hover {
  color: var(--link-color-hover);
  text-decoration: underline;
}
```

## Notes

- All CSS variables automatically adapt to the current theme (light/dark mode)
- Variables are theme-aware and will change based on the user's selected theme
- Some variables may not be available in all Obsidian versions
- Always test your plugin with different themes to ensure compatibility
- Use semantic variable names (e.g., `--text-normal` instead of hardcoded colors) for better theme support

## Variables Used in This Plugin

Based on `src/styles.css`, this plugin uses the following CSS variables:

- `--background-primary`
- `--background-secondary`
- `--background-modifier-border`
- `--background-modifier-hover`
- `--text-normal`
- `--text-muted`
- `--text-error`
- `--text-on-accent`
- `--interactive-normal`
- `--interactive-hover`
- `--interactive-accent`
- `--link-color`
- `--code-background`
- `--font-monospace`

## References

- [Obsidian Plugin Development Documentation](https://docs.obsidian.md/Plugins/Getting+started)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- Obsidian's internal CSS variable definitions (inspect Obsidian's UI with browser dev tools)
