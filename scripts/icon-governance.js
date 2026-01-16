#!/usr/bin/env node
/**
 * Abakada Icon Governance System
 * 
 * Enforces global icon uniqueness and semantic relevance across all categories.
 * Implements deterministic ID mapping, collision detection, and visual differentiation rules.
 * 
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// ICON TAXONOMY MAPPING - Deterministic one-to-one relationships
// ============================================================================

/**
 * Master Icon Taxonomy
 * Each category has exactly ONE icon with semantic justification
 * Format: categoryId -> { icon, semanticReason, visualFamily, primaryShape }
 */
const ICON_TAXONOMY = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTIVITY GROUP - Document/Task-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'doc-processing': {
    icon: 'document-01',
    semanticReason: 'Document with folded corner represents file processing',
    visualFamily: 'document',
    primaryShape: 'rectangle-folded',
    distinctiveFeature: 'folded corner at top-right'
  },
  'notes': {
    icon: 'note-01',
    semanticReason: 'Notepad with lines represents quick note-taking',
    visualFamily: 'document',
    primaryShape: 'rectangle-lined',
    distinctiveFeature: 'horizontal lines inside, smaller fold'
  },
  'project': {
    icon: 'kanban-01',
    semanticReason: 'Kanban board columns represent project workflow',
    visualFamily: 'grid',
    primaryShape: 'columns',
    distinctiveFeature: 'three vertical divisions'
  },
  'communication': {
    icon: 'message-01',
    semanticReason: 'Speech bubble represents messaging/chat',
    visualFamily: 'bubble',
    primaryShape: 'rounded-rectangle-tail',
    distinctiveFeature: 'tail pointing down-left'
  },
  'writing': {
    icon: 'pen-01',
    semanticReason: 'Fountain pen represents creative writing',
    visualFamily: 'tool',
    primaryShape: 'diagonal-pen',
    distinctiveFeature: 'ink splash pattern'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATIVE GROUP - Art/Design-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'design': {
    icon: 'paint-brush-01',
    semanticReason: 'Paintbrush represents artistic design work',
    visualFamily: 'tool',
    primaryShape: 'brush-stroke',
    distinctiveFeature: 'brush tip with paint blob'
  },
  'desktop-publishing': {
    icon: 'book-open-01',
    semanticReason: 'Open book represents published layouts',
    visualFamily: 'book',
    primaryShape: 'open-book',
    distinctiveFeature: 'two pages spread open'
  },
  'visualization': {
    icon: 'hierarchy-square-01',
    semanticReason: 'Four squares represent diagrams/mind maps',
    visualFamily: 'grid',
    primaryShape: 'quad-squares',
    distinctiveFeature: 'four equal squares in 2x2'
  },
  'cms': {
    icon: 'layout-01',
    semanticReason: 'Layout grid represents content management',
    visualFamily: 'grid',
    primaryShape: 'layout-grid',
    distinctiveFeature: 'header + sidebar layout'
  },
  '3d': {
    icon: 'cube-01',
    semanticReason: '3D cube represents three-dimensional modeling',
    visualFamily: 'geometric',
    primaryShape: 'isometric-cube',
    distinctiveFeature: 'perspective lines to center'
  },
  'photography': {
    icon: 'camera-01',
    semanticReason: 'Camera represents photo capture/editing',
    visualFamily: 'device',
    primaryShape: 'camera-body',
    distinctiveFeature: 'lens circle in center'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA & RESEARCH GROUP - Analysis/Science-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'data-processing': {
    icon: 'chart-bar-01',
    semanticReason: 'Bar chart represents data analysis',
    visualFamily: 'chart',
    primaryShape: 'vertical-bars',
    distinctiveFeature: 'three bars of different heights'
  },
  'math': {
    icon: 'calculator-01',
    semanticReason: 'Calculator represents mathematical computation',
    visualFamily: 'device',
    primaryShape: 'calculator-body',
    distinctiveFeature: 'display screen at top'
  },
  'reference': {
    icon: 'book-bookmark-01',
    semanticReason: 'Book with bookmark represents citations/references',
    visualFamily: 'book',
    primaryShape: 'closed-book-marked',
    distinctiveFeature: 'bookmark ribbon inside'
  },
  'ai-ml': {
    icon: 'brain-01',
    semanticReason: 'Brain represents artificial intelligence',
    visualFamily: 'organic',
    primaryShape: 'brain-lobes',
    distinctiveFeature: 'neural pathway lines'
  },
  'science': {
    icon: 'flask-01',
    semanticReason: 'Erlenmeyer flask represents scientific research',
    visualFamily: 'lab',
    primaryShape: 'conical-flask',
    distinctiveFeature: 'narrow neck, wide base'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY GROUP - Protection-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'encryption': {
    icon: 'lock-01',
    semanticReason: 'Padlock represents encryption/locking data',
    visualFamily: 'security',
    primaryShape: 'padlock',
    distinctiveFeature: 'shackle loop at top'
  },
  'password': {
    icon: 'key-01',
    semanticReason: 'Key represents password/authentication',
    visualFamily: 'security',
    primaryShape: 'key-shape',
    distinctiveFeature: 'circular head with teeth'
  },
  'privacy': {
    icon: 'shield-01',
    semanticReason: 'Shield represents privacy protection',
    visualFamily: 'security',
    primaryShape: 'shield-plain',
    distinctiveFeature: 'pointed bottom, no internal marks'
  },
  'security-tools': {
    icon: 'shield-check-01',
    semanticReason: 'Shield with checkmark represents security verification',
    visualFamily: 'security',
    primaryShape: 'shield-checked',
    distinctiveFeature: 'checkmark inside shield'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA GROUP - Entertainment/Content-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'media': {
    icon: 'play-circle-01',
    semanticReason: 'Play button represents media playback',
    visualFamily: 'media-control',
    primaryShape: 'circle-play',
    distinctiveFeature: 'triangle inside circle'
  },
  'ebook': {
    icon: 'book-02',
    semanticReason: 'Closed book represents e-book library',
    visualFamily: 'book',
    primaryShape: 'closed-book',
    distinctiveFeature: 'spine visible, no bookmark'
  },
  'audio': {
    icon: 'music-01',
    semanticReason: 'Musical notes represent audio production',
    visualFamily: 'media-control',
    primaryShape: 'music-notes',
    distinctiveFeature: 'connected eighth notes'
  },
  'video': {
    icon: 'video-01',
    semanticReason: 'Video camera represents video production',
    visualFamily: 'device',
    primaryShape: 'camcorder',
    distinctiveFeature: 'viewfinder triangle on right'
  },
  'gaming': {
    icon: 'gamepad-01',
    semanticReason: 'Game controller represents gaming',
    visualFamily: 'device',
    primaryShape: 'controller',
    distinctiveFeature: 'd-pad and buttons'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES GROUP - System/Tool-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'file': {
    icon: 'folder-01',
    semanticReason: 'Folder represents file organization',
    visualFamily: 'container',
    primaryShape: 'folder-tab',
    distinctiveFeature: 'tab at top-left'
  },
  'geographic': {
    icon: 'globe-02',
    semanticReason: 'Globe represents geographic/mapping',
    visualFamily: 'sphere',
    primaryShape: 'globe-lines',
    distinctiveFeature: 'latitude/longitude lines'
  },
  'health': {
    icon: 'heart-01',
    semanticReason: 'Heart represents health/wellness',
    visualFamily: 'organic',
    primaryShape: 'heart',
    distinctiveFeature: 'classic heart shape'
  },
  'finance': {
    icon: 'wallet-01',
    semanticReason: 'Wallet represents personal finance',
    visualFamily: 'container',
    primaryShape: 'wallet-fold',
    distinctiveFeature: 'card slot visible'
  },
  'education': {
    icon: 'graduation-hat-01',
    semanticReason: 'Graduation cap represents education',
    visualFamily: 'apparel',
    primaryShape: 'mortarboard',
    distinctiveFeature: 'tassel hanging'
  },
  'networking': {
    icon: 'network-01',
    semanticReason: 'Network nodes represent connectivity',
    visualFamily: 'diagram',
    primaryShape: 'cross-nodes',
    distinctiveFeature: 'center square with four arms'
  },
  'automation': {
    icon: 'robot-01',
    semanticReason: 'Robot represents automation/bots',
    visualFamily: 'character',
    primaryShape: 'robot-face',
    distinctiveFeature: 'antenna and eyes'
  },
  'backup': {
    icon: 'archive-01',
    semanticReason: 'Archive box represents backup storage',
    visualFamily: 'container',
    primaryShape: 'archive-box',
    distinctiveFeature: 'lid separate from body'
  },
  'homelab': {
    icon: 'home-01',
    semanticReason: 'House represents home server/self-hosting',
    visualFamily: 'building',
    primaryShape: 'house',
    distinctiveFeature: 'roof peak and door'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPMENT GROUP - Code/Infrastructure-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'development': {
    icon: 'code-01',
    semanticReason: 'Code brackets represent programming',
    visualFamily: 'symbol',
    primaryShape: 'angle-brackets',
    distinctiveFeature: 'opposing chevrons'
  },
  'devops': {
    icon: 'server-01',
    semanticReason: 'Server rack represents infrastructure',
    visualFamily: 'hardware',
    primaryShape: 'server-stack',
    distinctiveFeature: 'two stacked units with LEDs'
  },
  'database': {
    icon: 'database-01',
    semanticReason: 'Database cylinder represents data storage',
    visualFamily: 'hardware',
    primaryShape: 'cylinder-stack',
    distinctiveFeature: 'elliptical top, stacked layers'
  },
  'monitoring': {
    icon: 'activity-01',
    semanticReason: 'Heartbeat line represents system monitoring',
    visualFamily: 'chart',
    primaryShape: 'pulse-line',
    distinctiveFeature: 'ECG-style peaks'
  },
  'testing': {
    icon: 'check-circle-01',
    semanticReason: 'Checkmark in circle represents test passing',
    visualFamily: 'status',
    primaryShape: 'circle-check',
    distinctiveFeature: 'checkmark inside circle'
  },
  'api': {
    icon: 'api-01',
    semanticReason: 'Code with arrows represents API endpoints',
    visualFamily: 'symbol',
    primaryShape: 'brackets-arrows',
    distinctiveFeature: 'chevrons with connecting line'
  },
  'mobile': {
    icon: 'smartphone-01',
    semanticReason: 'Smartphone represents mobile development',
    visualFamily: 'device',
    primaryShape: 'phone-portrait',
    distinctiveFeature: 'home button dot at bottom'
  },
  'web': {
    icon: 'browser-01',
    semanticReason: 'Browser window represents web development',
    visualFamily: 'window',
    primaryShape: 'browser-frame',
    distinctiveFeature: 'address bar at top'
  },
  'virtualization': {
    icon: 'layers-01',
    semanticReason: 'Stacked layers represent virtual machines',
    visualFamily: 'stack',
    primaryShape: 'diamond-layers',
    distinctiveFeature: 'three stacked parallelograms'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS GROUP - Commerce/Organization-oriented icons
  // ═══════════════════════════════════════════════════════════════════════════
  'ecommerce': {
    icon: 'shopping-cart-01',
    semanticReason: 'Shopping cart represents e-commerce',
    visualFamily: 'commerce',
    primaryShape: 'cart',
    distinctiveFeature: 'wheels and basket'
  },
  'crm': {
    icon: 'users-01',
    semanticReason: 'Multiple users represent customer relationships',
    visualFamily: 'people',
    primaryShape: 'user-group',
    distinctiveFeature: 'overlapping user silhouettes'
  }
};

// ============================================================================
// VISUAL DIFFERENTIATION RULES
// ============================================================================

/**
 * Visual families define shape language categories
 * Icons within the same family must have distinct primary shapes
 */
const VISUAL_FAMILIES = {
  'document': ['rectangle-folded', 'rectangle-lined'],
  'book': ['open-book', 'closed-book', 'closed-book-marked'],
  'security': ['padlock', 'key-shape', 'shield-plain', 'shield-checked'],
  'grid': ['columns', 'quad-squares', 'layout-grid'],
  'device': ['calculator-body', 'camera-body', 'camcorder', 'controller', 'phone-portrait'],
  'chart': ['vertical-bars', 'pulse-line'],
  'container': ['folder-tab', 'wallet-fold', 'archive-box'],
  'media-control': ['circle-play', 'music-notes'],
  'symbol': ['angle-brackets', 'brackets-arrows'],
  'hardware': ['server-stack', 'cylinder-stack'],
  'sphere': ['globe-lines'],
  'organic': ['brain-lobes', 'heart'],
  'lab': ['conical-flask'],
  'tool': ['brush-stroke', 'diagonal-pen'],
  'bubble': ['rounded-rectangle-tail'],
  'geometric': ['isometric-cube'],
  'window': ['browser-frame'],
  'stack': ['diamond-layers'],
  'building': ['house'],
  'apparel': ['mortarboard'],
  'diagram': ['cross-nodes'],
  'character': ['robot-face'],
  'commerce': ['cart'],
  'people': ['user-group'],
  'status': ['circle-check']
};

// ============================================================================
// ICON HASH GENERATION - For collision detection
// ============================================================================

/**
 * Generate a perceptual hash for an SVG path
 * Used to detect near-identical icons
 */
function generateIconHash(svgPath) {
  // Normalize the path by removing whitespace variations
  const normalized = svgPath
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
    .toLowerCase();
  
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
}

/**
 * Extract geometric features from SVG path for similarity analysis
 */
function extractGeometricFeatures(svgPath) {
  const features = {
    hasCircle: /<circle|r="\d/.test(svgPath),
    hasRect: /<rect|width="\d/.test(svgPath),
    hasPath: /<path/.test(svgPath),
    hasLine: /<line/.test(svgPath),
    hasPolyline: /<polyline/.test(svgPath),
    hasPolygon: /<polygon/.test(svgPath),
    hasEllipse: /<ellipse/.test(svgPath),
    elementCount: (svgPath.match(/<(path|circle|rect|line|polyline|polygon|ellipse)/g) || []).length
  };
  
  return features;
}

/**
 * Calculate similarity score between two icons (0-1)
 */
function calculateSimilarity(icon1Path, icon2Path) {
  const features1 = extractGeometricFeatures(icon1Path);
  const features2 = extractGeometricFeatures(icon2Path);
  
  let matchCount = 0;
  let totalFeatures = 0;
  
  for (const key of Object.keys(features1)) {
    if (typeof features1[key] === 'boolean') {
      totalFeatures++;
      if (features1[key] === features2[key]) matchCount++;
    }
  }
  
  // Element count similarity
  const countDiff = Math.abs(features1.elementCount - features2.elementCount);
  const countSimilarity = 1 / (1 + countDiff);
  
  return (matchCount / totalFeatures * 0.7) + (countSimilarity * 0.3);
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

class IconGovernanceValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.iconHashes = new Map();
    this.categoryIconMap = new Map();
  }

  /**
   * Load icon definitions from registry
   */
  loadIconRegistry() {
    const iconsPath = path.join(__dirname, '..', 'assets', 'js', 'icons.js');
    const content = fs.readFileSync(iconsPath, 'utf8');
    
    // Extract CATEGORY_ICONS object
    const match = content.match(/const CATEGORY_ICONS = \{([\s\S]*?)\};/);
    if (!match) {
      this.errors.push('Could not parse CATEGORY_ICONS from icons.js');
      return {};
    }
    
    // Parse icon definitions (simplified extraction)
    const icons = {};
    const iconMatches = content.matchAll(/'([^']+)':\s*'([^']+)'/g);
    for (const m of iconMatches) {
      icons[m[1]] = m[2];
    }
    
    return icons;
  }

  /**
   * Load category definitions from tools.json
   */
  loadCategories() {
    const toolsPath = path.join(__dirname, '..', 'assets', 'data', 'tools.json');
    const content = fs.readFileSync(toolsPath, 'utf8');
    const data = JSON.parse(content);
    return data.categories || [];
  }

  /**
   * Validate one-to-one icon mapping
   */
  validateUniqueMapping(categories) {
    const iconUsage = new Map();
    
    for (const category of categories) {
      const icon = category.icon;
      
      if (iconUsage.has(icon)) {
        this.errors.push(
          `DUPLICATE ICON: "${icon}" is used by both "${iconUsage.get(icon)}" and "${category.id}"`
        );
      } else {
        iconUsage.set(icon, category.id);
      }
      
      this.categoryIconMap.set(category.id, icon);
    }
    
    return iconUsage;
  }

  /**
   * Validate against taxonomy rules
   */
  validateTaxonomy(categories) {
    for (const category of categories) {
      const taxonomy = ICON_TAXONOMY[category.id];
      
      if (!taxonomy) {
        this.warnings.push(
          `MISSING TAXONOMY: Category "${category.id}" has no taxonomy definition`
        );
        continue;
      }
      
      if (category.icon !== taxonomy.icon) {
        this.errors.push(
          `TAXONOMY MISMATCH: Category "${category.id}" uses "${category.icon}" but taxonomy specifies "${taxonomy.icon}"`
        );
      }
    }
  }

  /**
   * Validate visual family differentiation
   */
  validateVisualDifferentiation() {
    const familyUsage = new Map();
    
    for (const [categoryId, taxonomy] of Object.entries(ICON_TAXONOMY)) {
      const family = taxonomy.visualFamily;
      const shape = taxonomy.primaryShape;
      
      if (!familyUsage.has(family)) {
        familyUsage.set(family, new Map());
      }
      
      const familyShapes = familyUsage.get(family);
      
      if (familyShapes.has(shape)) {
        this.errors.push(
          `SHAPE COLLISION: Categories "${familyShapes.get(shape)}" and "${categoryId}" ` +
          `both use shape "${shape}" in family "${family}"`
        );
      } else {
        familyShapes.set(shape, categoryId);
      }
    }
  }

  /**
   * Detect perceptually similar icons
   */
  detectSimilarIcons(icons) {
    const iconList = Object.entries(icons);
    const similarPairs = [];
    
    for (let i = 0; i < iconList.length; i++) {
      for (let j = i + 1; j < iconList.length; j++) {
        const [name1, path1] = iconList[i];
        const [name2, path2] = iconList[j];
        
        const similarity = calculateSimilarity(path1, path2);
        
        if (similarity > 0.85) {
          similarPairs.push({
            icon1: name1,
            icon2: name2,
            similarity: (similarity * 100).toFixed(1) + '%'
          });
          
          this.warnings.push(
            `HIGH SIMILARITY: "${name1}" and "${name2}" are ${(similarity * 100).toFixed(1)}% similar`
          );
        }
      }
    }
    
    return similarPairs;
  }

  /**
   * Generate icon hashes for collision detection
   */
  generateHashes(icons) {
    const hashes = new Map();
    
    for (const [name, path] of Object.entries(icons)) {
      const hash = generateIconHash(path);
      
      if (hashes.has(hash)) {
        this.errors.push(
          `HASH COLLISION: "${name}" has same hash as "${hashes.get(hash)}" (hash: ${hash})`
        );
      } else {
        hashes.set(hash, name);
      }
      
      this.iconHashes.set(name, hash);
    }
    
    return hashes;
  }

  /**
   * Run all validations
   */
  validate() {
    console.log('🔍 Abakada Icon Governance Validator\n');
    console.log('═'.repeat(60));
    
    // Load data
    const icons = this.loadIconRegistry();
    const categories = this.loadCategories();
    
    console.log(`\n📊 Loaded ${Object.keys(icons).length} icons and ${categories.length} categories\n`);
    
    // Run validations
    console.log('1️⃣  Validating unique icon mapping...');
    this.validateUniqueMapping(categories);
    
    console.log('2️⃣  Validating taxonomy compliance...');
    this.validateTaxonomy(categories);
    
    console.log('3️⃣  Validating visual differentiation...');
    this.validateVisualDifferentiation();
    
    console.log('4️⃣  Generating icon hashes...');
    this.generateHashes(icons);
    
    console.log('5️⃣  Detecting similar icons...');
    this.detectSimilarIcons(icons);
    
    // Report results
    console.log('\n' + '═'.repeat(60));
    console.log('📋 VALIDATION RESULTS\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validations passed! Icon system is compliant.\n');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log(`❌ ERRORS (${this.errors.length}):\n`);
      this.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${this.warnings.length}):\n`);
      this.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
      console.log('');
    }
    
    return this.errors.length === 0;
  }

  /**
   * Generate governance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      summary: {
        totalCategories: this.categoryIconMap.size,
        totalIcons: this.iconHashes.size,
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT'
      },
      taxonomy: ICON_TAXONOMY,
      visualFamilies: VISUAL_FAMILIES,
      iconHashes: Object.fromEntries(this.iconHashes),
      categoryMapping: Object.fromEntries(this.categoryIconMap),
      issues: {
        errors: this.errors,
        warnings: this.warnings
      }
    };
    
    return report;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const validator = new IconGovernanceValidator();
  
  if (args.includes('--report')) {
    // Generate JSON report
    validator.validate();
    const report = validator.generateReport();
    const reportPath = path.join(__dirname, '..', 'icon-governance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  } else if (args.includes('--ci')) {
    // CI mode - exit with error code if validation fails
    const isValid = validator.validate();
    process.exit(isValid ? 0 : 1);
  } else {
    // Default - run validation
    validator.validate();
  }
}

// Export for use as module
module.exports = {
  IconGovernanceValidator,
  ICON_TAXONOMY,
  VISUAL_FAMILIES,
  generateIconHash,
  calculateSimilarity
};

// Run if called directly
if (require.main === module) {
  main();
}
