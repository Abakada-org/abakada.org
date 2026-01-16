#!/usr/bin/env node
/**
 * Abakada Icon Linting System
 * CI-ready validation for icon uniqueness and semantic compliance
 * 
 * Usage:
 *   node scripts/lint-icons.js          # Run validation
 *   node scripts/lint-icons.js --fix    # Auto-fix issues where possible
 *   node scripts/lint-icons.js --ci     # CI mode (exit code 1 on failure)
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Paths
  iconsPath: path.join(__dirname, '..', 'assets', 'js', 'icons.js'),
  toolsPath: path.join(__dirname, '..', 'assets', 'data', 'tools.json'),
  
  // Validation thresholds
  maxSimilarityWarning: 0.95, // Only warn if icons are >95% similar (structural)
  
  // Icon naming conventions
  categoryIconSuffix: '-01',
  statusIconPrefix: 'status-',
  
  // Required icon collections
  requiredCollections: ['CATEGORY_ICONS', 'PLATFORM_ICONS', 'UI_ICONS', 'STATUS_ICONS']
};

// ============================================================================
// ICON UNIQUENESS MAP - Enforced one-to-one relationships
// ============================================================================

const ICON_UNIQUENESS_MAP = {
  // Each category MUST have a unique icon
  // Format: categoryId -> iconId
  'doc-processing': 'document-01',
  'data-processing': 'chart-bar-01',
  'design': 'paint-brush-01',
  'desktop-publishing': 'book-open-01',
  'ebook': 'book-02',
  'encryption': 'lock-01',
  'file': 'folder-01',
  'geographic': 'globe-02',
  'health': 'heart-01',
  'media': 'play-circle-01',
  'math': 'calculator-01',
  'notes': 'note-01',
  'password': 'key-01',
  'finance': 'wallet-01',
  'privacy': 'shield-01',
  'project': 'kanban-01',
  'reference': 'book-bookmark-01',
  'visualization': 'hierarchy-square-01',
  'education': 'graduation-hat-01',
  'development': 'code-01',
  'devops': 'server-01',
  'database': 'database-01',
  'networking': 'network-01',
  'communication': 'message-01',
  'automation': 'robot-01',
  'ai-ml': 'brain-01',
  'gaming': 'gamepad-01',
  'backup': 'archive-01',
  'monitoring': 'activity-01',
  'cms': 'layout-01',
  'ecommerce': 'shopping-cart-01',
  'crm': 'users-01',
  'science': 'flask-01',
  'audio': 'music-01',
  'video': 'video-01',
  '3d': 'cube-01',
  'photography': 'camera-01',
  'writing': 'pen-01',
  'testing': 'check-circle-01',
  'api': 'api-01',
  'mobile': 'smartphone-01',
  'web': 'browser-01',
  'virtualization': 'layers-01',
  'homelab': 'home-01',
  'security-tools': 'shield-check-01'
};

// ============================================================================
// LINTER CLASS
// ============================================================================

class IconLinter {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  /**
   * Load and parse icons.js
   */
  loadIcons() {
    const content = fs.readFileSync(CONFIG.iconsPath, 'utf8');
    
    // Extract icon collections
    const collections = {};
    
    for (const collectionName of CONFIG.requiredCollections) {
      const regex = new RegExp(`const ${collectionName} = \\{([\\s\\S]*?)\\};`, 'm');
      const match = content.match(regex);
      
      if (match) {
        // Parse icon entries
        const icons = {};
        const iconRegex = /'([^']+)':\s*'([^']+)'/g;
        let iconMatch;
        
        while ((iconMatch = iconRegex.exec(match[1])) !== null) {
          icons[iconMatch[1]] = iconMatch[2];
        }
        
        collections[collectionName] = icons;
      } else {
        this.errors.push(`Missing collection: ${collectionName}`);
      }
    }
    
    return collections;
  }

  /**
   * Load categories from tools.json
   */
  loadCategories() {
    const content = fs.readFileSync(CONFIG.toolsPath, 'utf8');
    const data = JSON.parse(content);
    return data.categories || [];
  }

  /**
   * Rule 1: Each category must have exactly one unique icon
   */
  checkUniqueMapping(categories, icons) {
    const usedIcons = new Map();
    
    for (const category of categories) {
      const icon = category.icon;
      
      // Check for duplicate usage
      if (usedIcons.has(icon)) {
        this.errors.push(
          `[DUPLICATE] Icon "${icon}" used by both "${usedIcons.get(icon)}" and "${category.id}"`
        );
      } else {
        usedIcons.set(icon, category.id);
      }
      
      // Check against uniqueness map
      const expectedIcon = ICON_UNIQUENESS_MAP[category.id];
      if (expectedIcon && icon !== expectedIcon) {
        this.errors.push(
          `[MISMATCH] Category "${category.id}" uses "${icon}" but should use "${expectedIcon}"`
        );
        this.fixes.push({
          type: 'category-icon',
          categoryId: category.id,
          current: icon,
          expected: expectedIcon
        });
      }
      
      // Check icon exists in registry
      if (!icons.CATEGORY_ICONS[icon]) {
        this.errors.push(
          `[MISSING] Icon "${icon}" for category "${category.id}" not found in CATEGORY_ICONS`
        );
      }
    }
  }

  /**
   * Rule 2: No cross-collection duplicates
   */
  checkCrossCollectionDuplicates(collections) {
    const allIcons = new Map();
    
    for (const [collectionName, icons] of Object.entries(collections)) {
      for (const [iconName, iconPath] of Object.entries(icons)) {
        const key = `${collectionName}:${iconName}`;
        
        // Check for same path in different collections
        for (const [existingKey, existingPath] of allIcons) {
          if (existingPath === iconPath && !existingKey.startsWith(collectionName)) {
            this.warnings.push(
              `[CROSS-DUP] "${iconName}" in ${collectionName} has same path as "${existingKey}"`
            );
          }
        }
        
        allIcons.set(key, iconPath);
      }
    }
  }

  /**
   * Rule 3: Icon naming conventions
   */
  checkNamingConventions(collections) {
    // Category icons should end with -01
    for (const iconName of Object.keys(collections.CATEGORY_ICONS || {})) {
      if (iconName !== 'box' && !iconName.endsWith('-01') && !iconName.endsWith('-02')) {
        this.warnings.push(
          `[NAMING] Category icon "${iconName}" should follow naming convention (e.g., "${iconName}-01")`
        );
      }
    }
    
    // Status icons should start with status-
    for (const iconName of Object.keys(collections.STATUS_ICONS || {})) {
      if (!iconName.startsWith('status-')) {
        this.warnings.push(
          `[NAMING] Status icon "${iconName}" should start with "status-"`
        );
      }
    }
  }

  /**
   * Rule 4: All categories in tools.json must have icons defined
   */
  checkCategoryCompleteness(categories, icons) {
    for (const category of categories) {
      if (!category.icon) {
        this.errors.push(
          `[INCOMPLETE] Category "${category.id}" has no icon defined`
        );
      }
    }
    
    // Check for orphaned icons (defined but not used)
    const usedIcons = new Set(categories.map(c => c.icon));
    for (const iconName of Object.keys(icons.CATEGORY_ICONS || {})) {
      if (iconName !== 'box' && !usedIcons.has(iconName)) {
        this.warnings.push(
          `[ORPHAN] Icon "${iconName}" is defined but not used by any category`
        );
      }
    }
  }

  /**
   * Rule 5: Visual family consistency
   */
  checkVisualFamilies(categories) {
    const familyGroups = {
      'book': ['desktop-publishing', 'ebook', 'reference'],
      'shield': ['privacy', 'security-tools'],
      'document': ['doc-processing', 'notes']
    };
    
    // Ensure icons in same family are visually distinct
    for (const [family, categoryIds] of Object.entries(familyGroups)) {
      const icons = categoryIds.map(id => {
        const cat = categories.find(c => c.id === id);
        return cat ? { id, icon: cat.icon } : null;
      }).filter(Boolean);
      
      // Check for same icon in family
      const iconSet = new Set(icons.map(i => i.icon));
      if (iconSet.size < icons.length) {
        this.errors.push(
          `[FAMILY] Visual family "${family}" has duplicate icons: ${icons.map(i => `${i.id}:${i.icon}`).join(', ')}`
        );
      }
    }
  }

  /**
   * Run all lint rules
   */
  lint() {
    console.log('🔍 Abakada Icon Linter\n');
    console.log('═'.repeat(50));
    
    const collections = this.loadIcons();
    const categories = this.loadCategories();
    
    console.log(`\n📊 Found ${Object.keys(collections.CATEGORY_ICONS || {}).length} category icons`);
    console.log(`📊 Found ${categories.length} categories\n`);
    
    // Run rules
    console.log('Running lint rules...\n');
    
    this.checkUniqueMapping(categories, collections);
    this.checkCrossCollectionDuplicates(collections);
    this.checkNamingConventions(collections);
    this.checkCategoryCompleteness(categories, collections);
    this.checkVisualFamilies(categories);
    
    // Report
    console.log('═'.repeat(50));
    console.log('📋 LINT RESULTS\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All checks passed!\n');
      return { success: true, errors: 0, warnings: 0 };
    }
    
    if (this.errors.length > 0) {
      console.log(`❌ Errors (${this.errors.length}):\n`);
      this.errors.forEach(err => console.log(`   • ${err}`));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings (${this.warnings.length}):\n`);
      this.warnings.forEach(warn => console.log(`   • ${warn}`));
      console.log('');
    }
    
    if (this.fixes.length > 0) {
      console.log(`🔧 Auto-fixable issues (${this.fixes.length}):\n`);
      this.fixes.forEach(fix => {
        console.log(`   • ${fix.type}: ${fix.categoryId} (${fix.current} → ${fix.expected})`);
      });
      console.log('\n   Run with --fix to apply fixes\n');
    }
    
    return {
      success: this.errors.length === 0,
      errors: this.errors.length,
      warnings: this.warnings.length,
      fixes: this.fixes
    };
  }

  /**
   * Apply auto-fixes
   */
  applyFixes() {
    if (this.fixes.length === 0) {
      console.log('No fixes to apply.');
      return;
    }
    
    // Load tools.json
    const content = fs.readFileSync(CONFIG.toolsPath, 'utf8');
    let data = JSON.parse(content);
    
    // Apply category icon fixes
    for (const fix of this.fixes) {
      if (fix.type === 'category-icon') {
        const category = data.categories.find(c => c.id === fix.categoryId);
        if (category) {
          console.log(`Fixing: ${fix.categoryId} icon ${fix.current} → ${fix.expected}`);
          category.icon = fix.expected;
        }
      }
    }
    
    // Write back
    fs.writeFileSync(CONFIG.toolsPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Applied ${this.fixes.length} fixes to tools.json`);
  }
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const linter = new IconLinter();
  
  const result = linter.lint();
  
  if (args.includes('--fix') && linter.fixes.length > 0) {
    linter.applyFixes();
  }
  
  if (args.includes('--ci')) {
    process.exit(result.success ? 0 : 1);
  }
}

module.exports = { IconLinter, ICON_UNIQUENESS_MAP };

if (require.main === module) {
  main();
}
