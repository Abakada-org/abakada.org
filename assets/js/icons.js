/**
 * Abakada - Centralized Icon Registry
 * Production-ready icon system with versioning, accessibility, and theme support
 * 
 * @version 1.0.0
 * @license MIT
 * 
 * Features:
 * - Centralized SVG icon definitions
 * - Consistent sizing (24x24 viewBox)
 * - WCAG-compliant stroke widths
 * - Light/dark theme compatible
 * - Semantic naming convention
 * - Cache-friendly structure
 */

const IconRegistry = (function() {
  'use strict';

  // Registry version for cache busting
  const VERSION = '1.0.0';

  // Default icon attributes for accessibility and consistency
  const DEFAULT_ATTRS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false'
  };

  /**
   * Category Icons - Used for tool cards and navigation
   * All icons follow a consistent 24x24 grid with 2px stroke
   */
  const CATEGORY_ICONS = {
    // Productivity Group
    'document-01': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    'note-01': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
    'kanban-01': '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
    'message-01': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'pen-01': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>',

    // Creative Group
    'paint-brush-01': '<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
    'book-open-01': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'hierarchy-square-01': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    'layout-01': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    'cube-01': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    'camera-01': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',

    // Data & Research Group
    'chart-bar-01': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'calculator-01': '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>',
    'book-bookmark-01': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8v5l-4-2-4 2V7z"/>',
    'brain-01': '<path d="M12 2a4 4 0 0 0-4 4c0 1.1.45 2.1 1.17 2.83L12 12l2.83-3.17A4 4 0 0 0 12 2z"/><path d="M12 12v10"/><path d="M8 14c-2 0-4 1-4 3s2 3 4 3"/><path d="M16 14c2 0 4 1 4 3s-2 3-4 3"/>',
    'flask-01': '<path d="M9 3h6v5l4 9H5l4-9V3z"/><line x1="9" y1="3" x2="15" y2="3"/>',

    // Security Group
    'lock-01': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'key-01': '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    'shield-01': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'shield-check-01': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',

    // Media Group
    'play-circle-01': '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    'book-02': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    'music-01': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'video-01': '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    'gamepad-01': '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>',

    // Utilities Group
    'folder-01': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    'globe-02': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'heart-01': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    'wallet-01': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    'graduation-hat-01': '<path d="M22 10l-10-5L2 10l10 5 10-5z"/><path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"/><path d="M22 10v6"/>',
    'network-01': '<rect x="9" y="9" width="6" height="6"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M2 12h7"/><path d="M15 12h7"/>',
    'robot-01': '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="3"/><path d="M12 8v3"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
    'archive-01': '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
    'home-01': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',

    // Development Group
    'code-01': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'server-01': '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    'database-01': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    'activity-01': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'check-circle-01': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'api-01': '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
    'smartphone-01': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    'browser-01': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>',
    'layers-01': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',

    // Business Group
    'shopping-cart-01': '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    'users-01': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',

    // Fallback
    'box': '<rect x="3" y="3" width="18" height="18" rx="2"/>'
  };

  /**
   * Platform Icons - Used for filter chips
   */
  const PLATFORM_ICONS = {
    'windows': '<path d="M3 5.5L10 4.5V11.5H3V5.5Z"/><path d="M11 4.3L21 3V11.5H11V4.3Z"/><path d="M3 12.5H10V19.5L3 18.5V12.5Z"/><path d="M11 12.5H21V21L11 19.7V12.5Z"/>',
    'macos': '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M2 14h20"/><path d="M9 18v2"/><path d="M15 18v2"/><path d="M7 20h10"/>',
    'linux': '<circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M12 4V2"/><path d="M9 6.5L7.5 5"/><path d="M15 6.5L16.5 5"/>',
    'web': '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'ios': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4"/><circle cx="12" cy="18" r="1"/>',
    'android': '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/><circle cx="9" cy="6" r="0.5" fill="currentColor"/><circle cx="15" cy="6" r="0.5" fill="currentColor"/><path d="M6 4L8 6"/><path d="M18 4L16 6"/>',
    'self-hosted': '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><circle cx="7" cy="6.5" r="1"/><circle cx="7" cy="17.5" r="1"/><path d="M11 6.5h6"/><path d="M11 17.5h6"/>'
  };

  /**
   * UI Icons - Used for buttons, navigation, and interface elements
   * NOTE: These are intentionally different from category icons to avoid collision
   */
  const UI_ICONS = {
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    'close': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'menu': '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    'monitor': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'refresh': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    'github': '<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>'
  };

  /**
   * Status Icons - Used for health indicators and badges
   * NOTE: Unique paths to avoid collision with other collections
   */
  const STATUS_ICONS = {
    'status-check': '<path d="M20 6L9 17l-5-5"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 2"/>',
    'status-x': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    'status-alert': '<path d="M12 2L2 22h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'status-info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/>',
    'status-shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/><path d="M12 8v6"/>',
    'status-lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1" fill="currentColor"/>'
  };

  /**
   * Get SVG element with proper attributes
   * @param {string} iconName - Name of the icon
   * @param {string} collection - Icon collection (category, platform, ui, status)
   * @param {Object} options - Custom attributes
   * @returns {string} Complete SVG element
   */
  function getIcon(iconName, collection = 'category', options = {}) {
    let iconPath;
    
    switch (collection) {
      case 'platform':
        iconPath = PLATFORM_ICONS[iconName];
        break;
      case 'ui':
        iconPath = UI_ICONS[iconName];
        break;
      case 'status':
        iconPath = STATUS_ICONS[iconName];
        break;
      case 'category':
      default:
        iconPath = CATEGORY_ICONS[iconName];
    }

    if (!iconPath) {
      console.warn(`Icon "${iconName}" not found in ${collection} collection`);
      iconPath = CATEGORY_ICONS['box']; // Fallback
    }

    const attrs = { ...DEFAULT_ATTRS, ...options };
    const attrString = Object.entries(attrs)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case for HTML attributes
        const htmlKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${htmlKey}="${value}"`;
      })
      .join(' ');

    return `<svg ${attrString}>${iconPath}</svg>`;
  }

  /**
   * Get icon path only (for inline use)
   * @param {string} iconName - Name of the icon
   * @param {string} collection - Icon collection
   * @returns {string} SVG path content
   */
  function getIconPath(iconName, collection = 'category') {
    switch (collection) {
      case 'platform':
        return PLATFORM_ICONS[iconName] || CATEGORY_ICONS['box'];
      case 'ui':
        return UI_ICONS[iconName] || CATEGORY_ICONS['box'];
      case 'status':
        // Support both prefixed and unprefixed names for backward compatibility
        return STATUS_ICONS[iconName] || STATUS_ICONS['status-' + iconName] || CATEGORY_ICONS['box'];
      case 'category':
      default:
        return CATEGORY_ICONS[iconName] || CATEGORY_ICONS['box'];
    }
  }

  /**
   * Check if icon exists
   * @param {string} iconName - Name of the icon
   * @param {string} collection - Icon collection
   * @returns {boolean}
   */
  function hasIcon(iconName, collection = 'category') {
    switch (collection) {
      case 'platform':
        return iconName in PLATFORM_ICONS;
      case 'ui':
        return iconName in UI_ICONS;
      case 'status':
        return iconName in STATUS_ICONS;
      case 'category':
      default:
        return iconName in CATEGORY_ICONS;
    }
  }

  /**
   * Get all icon names in a collection
   * @param {string} collection - Icon collection
   * @returns {string[]}
   */
  function listIcons(collection = 'category') {
    switch (collection) {
      case 'platform':
        return Object.keys(PLATFORM_ICONS);
      case 'ui':
        return Object.keys(UI_ICONS);
      case 'status':
        return Object.keys(STATUS_ICONS);
      case 'category':
      default:
        return Object.keys(CATEGORY_ICONS);
    }
  }

  // Public API
  return {
    VERSION,
    getIcon,
    getIconPath,
    hasIcon,
    listIcons,
    // Direct access to collections for advanced use
    CATEGORY_ICONS,
    PLATFORM_ICONS,
    UI_ICONS,
    STATUS_ICONS
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IconRegistry;
}
