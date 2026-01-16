# Abakada Icon System

## Overview

The Abakada platform uses a centralized inline SVG icon system optimized for performance, accessibility, and visual consistency across 1000+ tools in 45 categories.

## Architecture

### Icon Registry (`assets/js/icons.js`)

Centralized icon definitions with:
- **Version**: 1.0.0 (for cache busting)
- **Collections**: Category, Platform, UI, Status icons
- **Consistent sizing**: 24x24 viewBox
- **WCAG-compliant**: 2px stroke width for visibility

### Icon Collections

| Collection | Count | Purpose |
|------------|-------|---------|
| Category | 45+ | Tool cards, navigation |
| Platform | 7 | Filter chips (Windows, macOS, Linux, Web, iOS, Android, Self-hosted) |
| UI | 15+ | Buttons, navigation, interface |
| Status | 6 | Health indicators, badges |

## Category Icons (45 Categories)

### Productivity Group
- `document-01` - Document Processing
- `note-01` - Note-taking
- `kanban` - Project Management
- `message-01` - Communication
- `pen-01` - Writing & Publishing

### Creative Group
- `paint-brush-01` - Design & Images
- `book-open-01` - Desktop Publishing
- `hierarchy-square-01` - Visualization
- `layout-01` - Content Management
- `cube-01` - 3D & CAD
- `camera-01` - Photography

### Data & Research Group
- `chart-bar-line` - Data Processing
- `calculator` - Mathematics
- `book-bookmark` - Reference Management
- `brain-01` - AI & Machine Learning
- `flask-01` - Scientific Computing

### Security Group
- `lock-01` - Encryption
- `key-01` - Password Management
- `shield-01` - Privacy
- `shield-check-01` - Security Tools

### Media Group
- `play-circle` - Media Players & Editors
- `book-02` - E-book Management
- `music-01` - Audio Production
- `video-01` - Video Production
- `gamepad-01` - Gaming

### Utilities Group
- `folder-01` - File Tools
- `globe-02` - Geographic
- `heart-01` - Health & Wellness
- `wallet-01` - Personal Finance
- `graduation-hat-01` - Education & Teaching
- `network-01` - Networking
- `robot-01` - Automation
- `archive-01` - Backup & Recovery
- `home-01` - Home Lab & Self-Hosting

### Development Group
- `code-01` - Development Tools
- `server-01` - DevOps & Infrastructure
- `database-01` - Database Tools
- `activity-01` - Monitoring & Observability
- `check-circle-01` - Testing & QA
- `api-01` - API Development
- `smartphone-01` - Mobile Development
- `browser-01` - Web Development
- `layers-01` - Virtualization

### Business Group
- `shopping-cart-01` - E-commerce
- `users-01` - CRM & Sales

## Theme Support

### Light Theme Colors
All 45 categories have dedicated CSS variables:
```css
--category-doc: #03AABF;
--category-development: #2196F3;
--category-ai-ml: #673AB7;
/* ... etc */
```

### Dark Theme Colors
Optimized for dark mode visibility:
```css
--category-doc: #2DD4E4;
--category-development: #64B5F6;
--category-ai-ml: #B388FF;
/* ... etc */
```

## Accessibility Features

1. **WCAG Compliance**
   - Minimum 4.5:1 contrast ratio
   - 2px stroke width for visibility
   - High contrast mode support

2. **Screen Reader Support**
   - `aria-hidden="true"` on decorative icons
   - Semantic labeling via parent elements

3. **Keyboard Navigation**
   - Focus states preserved on icon containers
   - No pointer events on icons themselves

4. **Reduced Motion**
   - All icon animations respect `prefers-reduced-motion`

## High-DPI Support

- Optimized rendering for Retina displays
- `shape-rendering: geometricPrecision`
- Anti-aliased text rendering

## Usage

### In JavaScript
```javascript
// Get full SVG element
IconRegistry.getIcon('code-01', 'category');

// Get path only (for inline use)
IconRegistry.getIconPath('code-01', 'category');

// Check if icon exists
IconRegistry.hasIcon('code-01', 'category');

// List all icons in collection
IconRegistry.listIcons('category');
```

### In CSS
```css
/* Category icon backgrounds */
.card__icon--development { background: var(--category-development); }

/* Icon sizing classes */
.icon--sm { width: 16px; height: 16px; }
.icon--md { width: 20px; height: 20px; }
.icon--lg { width: 24px; height: 24px; }
```

## Performance

- **No external requests**: All icons inline
- **Minimal footprint**: ~15KB for entire icon system
- **Cache-friendly**: Version-controlled registry
- **Tree-shakeable**: Modular collection structure

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

## Maintenance

To add new icons:
1. Add SVG path to appropriate collection in `icons.js`
2. Add CSS variable for category color in `themes.css`
3. Add CSS class for icon background in `components.css`
4. Update this documentation
