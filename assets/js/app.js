/**
 * Abakada - Main Application
 * Enterprise-grade architecture with unified sidebar filtering system
 */

const App = (function () {
  let toolsData = { categories: [], tools: [] };
  let currentModal = null;
  let currentPage = 1;
  const ITEMS_PER_PAGE = 18;
  let currentFilteredTools = [];
  let currentCategory = 'all';
  let currentSearchQuery = '';

  // Available platforms and tags extracted from tools data
  let availablePlatforms = [];
  let availableTags = [];

  /**
   * Fix viewport height for WebView/in-app browsers
   * Sets a CSS custom property with the actual viewport height
   */
  function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // Set viewport height on load and resize
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', function() {
    setTimeout(setViewportHeight, 100);
  });

  /**
   * Project Health Indicator Helper
   * Returns health status based on last_update date
   * @param {string} dateString - ISO date string (e.g., "2025-01-10")
   * @returns {Object} { status: 'active'|'maintenance'|'stale', color: string, label: string }
   */
  function getProjectHealth(dateString) {
    if (!dateString) return null;
    
    const lastUpdate = new Date(dateString);
    const now = new Date();
    const monthsAgo = (now - lastUpdate) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsAgo < 3) {
      return { status: 'active', color: 'green', label: 'Active', tooltip: 'Actively maintained' };
    } else if (monthsAgo < 12) {
      return { status: 'maintenance', color: 'yellow', label: 'Stable', tooltip: 'In maintenance mode' };
    } else {
      return { status: 'stale', color: 'red', label: 'Stale', tooltip: 'May be unmaintained' };
    }
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date (e.g., "Jan 10, 2025")
   */
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Get license badge info
   * @param {Object} tool - Tool object with is_foss and license_type
   * @returns {Object} { class: string, label: string, icon: string }
   */
  function getLicenseBadgeInfo(tool) {
    if (tool.is_foss === true) {
      return {
        class: 'badge--foss',
        label: 'Open Source',
        sublabel: tool.license_type || tool.license,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>'
      };
    } else if (tool.is_foss === false) {
      return {
        class: 'badge--proprietary',
        label: tool.license_type === 'Freeware' ? 'Freeware' : 'Proprietary',
        sublabel: tool.license_type || tool.license,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      };
    }
    // Fallback for tools without is_foss flag - infer from license
    const fossLicenses = ['MIT', 'GPL', 'LGPL', 'Apache', 'BSD', 'MPL', 'AGPL', 'CC0', 'Unlicense'];
    const isFoss = fossLicenses.some(l => (tool.license || '').toUpperCase().includes(l.toUpperCase()));
    return {
      class: isFoss ? 'badge--foss' : 'badge--proprietary',
      label: isFoss ? 'Open Source' : 'Freeware',
      sublabel: tool.license,
      icon: isFoss 
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    };
  }

  /**
   * Initialize the application
   */
  async function init() {
    try {
      // Set dynamic copyright year
      const yearEl = document.getElementById('copyright-year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();
      
      await loadToolsData();
      await I18n.init();
      Theme.init();
      Search.init(toolsData.tools, handleSearchResults);

      // Extract unique platforms and tags
      extractFiltersData();
      
      renderSidebarNav();
      renderFilters();
      renderFeaturedTools();
      currentFilteredTools = toolsData.tools;
      renderPaginatedTools();
      updateStats();

      setupEventListeners();
      initFeaturedCarousel();
      handleHashChange();
      
      // Subscribe to filter state changes for UI sync
      Search.subscribe(syncFilterUI);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  /**
   * Sync filter UI with current state
   * Called whenever filter state changes
   */
  function syncFilterUI(state) {
    // Update platform chips
    document.querySelectorAll('#platform-filters .filter-chip').forEach(chip => {
      const isActive = state.platforms.includes(chip.dataset.platform);
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', isActive);
    });
    
    // Update tag chips
    document.querySelectorAll('#tag-filters .filter-chip').forEach(chip => {
      const isActive = state.tags.includes(chip.dataset.tag);
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', isActive);
    });
    
    // Update clear filters button visibility
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      const hasFilters = state.hasFilters || state.hasQuery;
      clearBtn.classList.toggle('visible', hasFilters);
      clearBtn.setAttribute('aria-hidden', !hasFilters);
    }
    
    // Update active filters indicator in sidebar header
    updateActiveFiltersIndicator(state);
  }

  /**
   * Update active filters indicator
   */
  function updateActiveFiltersIndicator(state) {
    const filtersSection = document.getElementById('sidebar-filters');
    if (!filtersSection) return;
    
    const activeCount = state.platforms.length + state.tags.length + (state.hasQuery ? 1 : 0);
    
    // Add/update badge showing active filter count
    let badge = filtersSection.querySelector('.filters-active-badge');
    if (activeCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'filters-active-badge';
        const toggle = filtersSection.querySelector('.sidebar__filters-toggle');
        if (toggle) {
          toggle.appendChild(badge);
        }
      }
      badge.textContent = activeCount;
      badge.setAttribute('aria-label', `${activeCount} active filter${activeCount > 1 ? 's' : ''}`);
    } else if (badge) {
      badge.remove();
    }
  }

  /**
   * Extract unique platforms and tags from tools data
   */
  function extractFiltersData() {
    const platformsSet = new Set();
    const tagsSet = new Set();
    
    toolsData.tools.forEach(tool => {
      (tool.platforms || []).forEach(p => platformsSet.add(p));
      (tool.tags || []).forEach(t => tagsSet.add(t));
    });
    
    availablePlatforms = Array.from(platformsSet).sort();
    availableTags = Array.from(tagsSet).sort();
  }

  /**
   * Load tools data from JSON
   */
  async function loadToolsData() {
    const basePath = window.ABAKADA_BASE_PATH || './';
    const response = await fetch(basePath + 'assets/data/tools.json');
    if (!response.ok) throw new Error('Failed to load tools data');
    toolsData = await response.json();
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navOverlay = document.getElementById('nav-overlay');
    
    if (menuToggle) {
      menuToggle.addEventListener('click', toggleMobileNav);
    }
    
    if (navOverlay) {
      navOverlay.addEventListener('click', closeMobileNav);
    }

    // Language selector
    const langBtn = document.querySelector('.lang-selector__btn');
    const langDropdown = document.querySelector('.lang-selector');

    if (langBtn && langDropdown) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
      });

      document.querySelectorAll('.lang-selector__option').forEach(option => {
        option.addEventListener('click', () => {
          I18n.setLanguage(option.dataset.lang);
          langDropdown.classList.remove('open');
        });
      });

      document.addEventListener('click', () => {
        langDropdown.classList.remove('open');
      });
    }

    // Theme toggle
    document.querySelectorAll('.theme-toggle__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Theme.setTheme(btn.dataset.theme);
      });
    });

    // Tool cards - delegated event handling
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-tool-id], .featured-card[data-tool-id]');
      if (card) {
        openToolModal(card.dataset.toolId);
      }
    });

    // Modal close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') ||
        e.target.closest('.modal__close')) {
        closeModal();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (currentModal) {
          closeModal();
        } else if (document.body.classList.contains('nav-open')) {
          closeMobileNav();
        }
      }
    });

    // Hash change
    window.addEventListener('hashchange', handleHashChange);

    // Language change event
    window.addEventListener('languageChanged', () => {
      renderSidebarNav();
      updateStats();
      Search.performSearch();
    });

    // Close mobile nav on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        closeMobileNav();
      }
    });

    // Footer Quick Links - Navigate to category and scroll to tools section
    document.querySelectorAll('.footer-link--category').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.dataset.category;
        
        // Update category filter
        setActiveCategory(category);
        Search.setCategory(category);
        updateURL(category);
        
        // Scroll to tools section smoothly
        const toolsSection = document.querySelector('.section--tools');
        if (toolsSection) {
          toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /**
   * Toggle mobile navigation
   */
  function toggleMobileNav() {
    document.body.classList.toggle('nav-open');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', document.body.classList.contains('nav-open'));
    }
  }

  /**
   * Close mobile navigation
   */
  function closeMobileNav() {
    document.body.classList.remove('nav-open');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Category groups for navigation hierarchy
   */
  const CATEGORY_GROUPS = [
    {
      id: 'productivity',
      name: 'Productivity',
      icon: 'briefcase',
      categories: ['doc-processing', 'notes', 'project', 'communication', 'writing']
    },
    {
      id: 'creative',
      name: 'Creative',
      icon: 'palette',
      categories: ['design', 'desktop-publishing', 'visualization', 'cms', '3d', 'photography']
    },
    {
      id: 'data',
      name: 'Data & Research',
      icon: 'chart',
      categories: ['data-processing', 'math', 'reference', 'ai-ml', 'science']
    },
    {
      id: 'security',
      name: 'Security',
      icon: 'shield',
      categories: ['encryption', 'password', 'privacy', 'security-tools']
    },
    {
      id: 'media',
      name: 'Media',
      icon: 'play',
      categories: ['media', 'ebook', 'audio', 'video', 'gaming']
    },
    {
      id: 'utilities',
      name: 'Utilities',
      icon: 'tool',
      categories: ['file', 'geographic', 'health', 'finance', 'education', 'networking', 'automation', 'backup', 'homelab']
    },
    {
      id: 'development',
      name: 'Development',
      icon: 'code',
      categories: ['development', 'devops', 'database', 'monitoring', 'testing', 'api', 'mobile', 'web', 'virtualization']
    },
    {
      id: 'business',
      name: 'Business',
      icon: 'building',
      categories: ['ecommerce', 'crm']
    }
  ];

  /**
   * Render sidebar navigation
   */
  function renderSidebarNav() {
    const container = document.getElementById('sidebar-nav');
    if (!container) return;

    const allLabel = I18n.t('categories.all', 'All Tools');
    
    let html = `
      <button type="button" class="nav-item nav-item--all ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
        <svg class="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span class="nav-item__label">${allLabel}</span>
        <span class="nav-item__count">${toolsData.tools.length}</span>
      </button>
    `;

    CATEGORY_GROUPS.forEach(group => {
      const groupCategories = group.categories
        .map(id => toolsData.categories.find(c => c.id === id))
        .filter(Boolean);
      
      if (groupCategories.length === 0) return;

      const groupName = I18n.t(`groups.${group.id}`, group.name);
      
      html += `
        <div class="nav-group" data-group="${group.id}">
          <div class="nav-group__header" role="button" aria-expanded="true">
            <span>${groupName}</span>
            <svg class="nav-group__toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="nav-group__items">
      `;

      groupCategories.forEach(category => {
        const count = toolsData.tools.filter(t => t.category === category.id).length;
        const name = I18n.t(`categories.${category.id}`, category.name);
        const isActive = currentCategory === category.id;

        html += `
          <button type="button" class="nav-item ${isActive ? 'active' : ''}" data-category="${category.id}">
            <svg class="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${getCategoryIconPath(category.icon)}
            </svg>
            <span class="nav-item__label">${name}</span>
            <span class="nav-item__count">${count}</span>
          </button>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Add event listeners for navigation items
    container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const category = item.dataset.category;
        setActiveCategory(category);
        Search.setCategory(category);
        updateURL(category);
        closeMobileNav();
      });
    });

    // Add event listeners for group headers
    container.querySelectorAll('.nav-group__header').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest('.nav-group');
        if (group) {
          group.classList.toggle('collapsed');
          header.setAttribute('aria-expanded', !group.classList.contains('collapsed'));
        }
      });
    });

    // Update sidebar stats
    updateSidebarStats();
  }

  /**
   * Get category icon SVG path
   */
  function getCategoryIconPath(iconName) {
    const paths = {
      'document-01': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      'chart-bar-line': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
      'paint-brush-01': '<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
      'book-open-01': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      'book-02': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      'lock-01': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      'folder-01': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
      'globe-02': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      'heart-01': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      'play-circle': '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
      'calculator': '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>',
      'note-01': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
      'key-01': '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
      'wallet-01': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
      'shield-01': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      'kanban': '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
      'book-bookmark': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8v5l-4-2-4 2V7z"/>',
      'hierarchy-square-01': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      'graduation-hat-01': '<path d="M22 10l-10-5L2 10l10 5 10-5z"/><path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"/><path d="M22 10v6"/>',
      // New category icons
      'code-01': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
      'server-01': '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
      'database-01': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
      'network-01': '<rect x="9" y="9" width="6" height="6"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M2 12h7"/><path d="M15 12h7"/>',
      'message-01': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      'robot-01': '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="3"/><path d="M12 8v3"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
      'brain-01': '<path d="M12 2a4 4 0 0 0-4 4c0 1.1.45 2.1 1.17 2.83L12 12l2.83-3.17A4 4 0 0 0 12 2z"/><path d="M12 12v10"/><path d="M8 14c-2 0-4 1-4 3s2 3 4 3"/><path d="M16 14c2 0 4 1 4 3s-2 3-4 3"/>',
      'gamepad-01': '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>',
      'archive-01': '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
      'activity-01': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      'layout-01': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
      'shopping-cart-01': '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      'users-01': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'flask-01': '<path d="M9 3h6v5l4 9H5l4-9V3z"/><line x1="9" y1="3" x2="15" y2="3"/>',
      'music-01': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      'video-01': '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
      'cube-01': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      'camera-01': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      'pen-01': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>',
      'check-circle-01': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      'api-01': '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
      'smartphone-01': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
      'browser-01': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/>',
      'layers-01': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
      'home-01': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      'shield-check-01': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>'
    };
    return paths[iconName] || '<rect x="3" y="3" width="18" height="18" rx="2"/>';
  }

  /**
   * Update sidebar stats
   */
  function updateSidebarStats() {
    const toolsCount = document.getElementById('sidebar-tools-count');
    const categoriesCount = document.getElementById('sidebar-categories-count');
    
    if (toolsCount) {
      toolsCount.textContent = `${toolsData.tools.length} tools`;
    }
    if (categoriesCount) {
      categoriesCount.textContent = `${toolsData.categories.length} categories`;
    }
  }

  /**
   * Set active category
   */
  function setActiveCategory(categoryId) {
    currentCategory = categoryId;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.category === categoryId);
    });

    // Update tools title
    const toolsTitle = document.getElementById('tools-title');
    if (toolsTitle) {
      if (categoryId === 'all') {
        toolsTitle.textContent = I18n.t('tools.allTools', 'All Tools');
      } else {
        const category = toolsData.categories.find(c => c.id === categoryId);
        toolsTitle.textContent = I18n.t(`categories.${categoryId}`, category?.name || categoryId);
      }
    }
  }

  /**
   * Handle URL hash changes
   */
  function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash && toolsData.categories.find(c => c.id === hash)) {
      setActiveCategory(hash);
      Search.setCategory(hash);
    } else {
      setActiveCategory('all');
      Search.setCategory('all');
    }
  }

  /**
   * Update URL with category filter
   */
  function updateURL(category) {
    if (category === 'all') {
      history.pushState(null, '', window.location.pathname);
    } else {
      history.pushState(null, '', `#${category}`);
    }
  }

  /**
   * Handle search results from unified filter system
   */
  function handleSearchResults(results, meta) {
    currentFilteredTools = results;
    currentSearchQuery = meta.query || '';
    currentPage = 1;
    renderPaginatedToolsWithMeta(meta);
    updateToolsCount(results.length, meta.total);
  }

  /**
   * Render paginated tools with meta info
   */
  function renderPaginatedToolsWithMeta(meta = {}) {
    const tools = currentFilteredTools;
    const totalPages = Math.ceil(tools.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTools = tools.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    renderTools(paginatedTools, tools.length === 0, meta);
    renderPaginationControls(tools.length, totalPages);
  }

  /**
   * Reset all filters - unified reset function
   */
  function resetFilters() {
    currentCategory = 'all';
    currentSearchQuery = '';
    setActiveCategory('all');
    Search.resetAll();
    updateURL('all');
  }

  /**
   * Render platform and tag filters
   */
  function renderFilters() {
    const platformContainer = document.getElementById('platform-filters');
    const tagContainer = document.getElementById('tag-filters');
    const clearBtn = document.getElementById('clear-filters');
    const filtersToggle = document.querySelector('.sidebar__filters-toggle');
    const filtersSection = document.getElementById('sidebar-filters');
    
    // Platform icons mapping
    const platformIcons = {
      'windows': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5.5L10 4.5V11.5H3V5.5Z"/><path d="M11 4.3L21 3V11.5H11V4.3Z"/><path d="M3 12.5H10V19.5L3 18.5V12.5Z"/><path d="M11 12.5H21V21L11 19.7V12.5Z"/></svg>',
      'macos': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M2 14h20"/><path d="M9 18v2"/><path d="M15 18v2"/><path d="M7 20h10"/></svg>',
      'linux': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M12 4V2"/><path d="M9 6.5L7.5 5"/><path d="M15 6.5L16.5 5"/></svg>',
      'web': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      'ios': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4"/><circle cx="12" cy="18" r="1"/></svg>',
      'android': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/><circle cx="9" cy="6" r="0.5" fill="currentColor"/><circle cx="15" cy="6" r="0.5" fill="currentColor"/><path d="M6 4L8 6"/><path d="M18 4L16 6"/></svg>',
      'self-hosted': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><circle cx="7" cy="6.5" r="1"/><circle cx="7" cy="17.5" r="1"/><path d="M11 6.5h6"/><path d="M11 17.5h6"/></svg>'
    };
    
    // Count tools per platform
    const platformCounts = {};
    availablePlatforms.forEach(p => {
      platformCounts[p] = toolsData.tools.filter(t => (t.platforms || []).includes(p)).length;
    });
    
    // Render platform chips
    if (platformContainer) {
      const topPlatforms = availablePlatforms
        .sort((a, b) => platformCounts[b] - platformCounts[a])
        .slice(0, 7);
      
      platformContainer.innerHTML = topPlatforms.map(platform => `
        <button type="button" class="filter-chip" data-platform="${platform}" 
                aria-pressed="false" role="switch"
                aria-label="Filter by ${platform} platform">
          <span class="filter-chip__icon platform-icon platform-icon--${platform}">
            ${platformIcons[platform] || platformIcons['web']}
          </span>
          <span>${platform}</span>
          <span class="filter-chip__count">${platformCounts[platform]}</span>
        </button>
      `).join('');
      
      // Add click handlers
      platformContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          Search.togglePlatform(chip.dataset.platform);
        });
      });
    }
    
    // Count tools per tag
    const tagCounts = {};
    availableTags.forEach(t => {
      tagCounts[t] = toolsData.tools.filter(tool => (tool.tags || []).includes(t)).length;
    });
    
    // Render tag chips
    if (tagContainer) {
      const topTags = availableTags
        .sort((a, b) => tagCounts[b] - tagCounts[a])
        .slice(0, 8);
      
      tagContainer.innerHTML = topTags.map(tag => `
        <button type="button" class="filter-chip" data-tag="${tag}"
                aria-pressed="false" role="switch"
                aria-label="Filter by ${tag} tag">
          <span>${tag}</span>
          <span class="filter-chip__count">${tagCounts[tag]}</span>
        </button>
      `).join('');
      
      // Add click handlers
      tagContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          Search.toggleTag(chip.dataset.tag);
        });
      });
    }
    
    // Clear filters button - resets search AND filters
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        resetFilters();
      });
    }
    
    // Filters toggle
    if (filtersToggle && filtersSection) {
      filtersToggle.addEventListener('click', () => {
        filtersSection.classList.toggle('collapsed');
        filtersToggle.setAttribute('aria-expanded', !filtersSection.classList.contains('collapsed'));
      });
    }
  }

  /**
   * Featured tools IDs
   */
  const FEATURED_TOOL_IDS = ['libreoffice', 'gimp', 'obsidian', 'bitwarden', 'blender', 'vscode'];
  const FEATURED_ITEMS_PER_PAGE = 3;
  let featuredCurrentPage = 0;
  let featuredTools = [];

  /**
   * Get number of featured items per page based on viewport
   */
  function getFeaturedItemsPerPage() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }

  /**
   * Render skeleton loading cards
   */
  function renderFeaturedSkeletons() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    const count = getFeaturedItemsPerPage();
    grid.innerHTML = Array.from({ length: count }, () => `
      <article class="featured-card featured-card--skeleton" aria-hidden="true">
        <div class="featured-card__header">
          <div class="skeleton skeleton--icon"></div>
          <div class="featured-card__meta" style="flex: 1;">
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--tagline"></div>
          </div>
        </div>
        <div class="featured-card__body">
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text"></div>
        </div>
        <div class="featured-card__footer">
          <div class="skeleton skeleton--badge"></div>
        </div>
      </article>
    `).join('');
  }

  /**
   * Create featured card HTML
   */
  function createFeaturedCard(tool) {
    const category = toolsData.categories.find(c => c.id === tool.category);
    return `
      <article class="featured-card" data-tool-id="${tool.id}" tabindex="0" role="button" aria-label="${escapeHtml(tool.name)}: ${escapeHtml(tool.tagline)}">
        <div class="featured-card__header">
          <div class="featured-card__icon card__icon--${tool.category}">
            ${getIconSVG(category?.icon || 'box')}
          </div>
          <div class="featured-card__meta">
            <h3 class="featured-card__title">${escapeHtml(tool.name)}</h3>
            <p class="featured-card__tagline">${escapeHtml(tool.tagline)}</p>
          </div>
        </div>
        <div class="featured-card__body">
          <p class="featured-card__description">${escapeHtml(tool.description)}</p>
        </div>
        <div class="featured-card__footer">
          <div class="featured-card__badges">
            <span class="featured-card__badge featured-card__badge--license">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              ${escapeHtml(tool.license)}
            </span>
          </div>
          <span class="featured-card__action">
            <span>${I18n.t('featured.viewTool', 'View')}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </article>
    `;
  }

  /**
   * Render featured tools grid
   */
  function renderFeaturedTools() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    renderFeaturedSkeletons();

    featuredTools = FEATURED_TOOL_IDS
      .map(id => toolsData.tools.find(t => t.id === id))
      .filter(Boolean);

    if (featuredTools.length === 0) {
      featuredTools = toolsData.tools.slice(0, 6);
    }

    setTimeout(() => {
      renderFeaturedPage();
    }, 300);
  }

  /**
   * Render current page of featured tools
   */
  function renderFeaturedPage() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    const itemsPerPage = getFeaturedItemsPerPage();
    const totalPages = Math.ceil(featuredTools.length / itemsPerPage);
    const startIndex = featuredCurrentPage * itemsPerPage;
    const pageTools = featuredTools.slice(startIndex, startIndex + itemsPerPage);

    grid.innerHTML = pageTools.map(tool => createFeaturedCard(tool)).join('');
    updateFeaturedProgress(totalPages);
    updateFeaturedNavButtons(totalPages);

    // Add keyboard handlers for cards
    grid.querySelectorAll('.featured-card').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openToolModal(card.dataset.toolId);
        }
      });
    });
  }

  /**
   * Update featured progress dots and counter
   */
  function updateFeaturedProgress(totalPages) {
    const dotsContainer = document.getElementById('featured-dots');
    const counter = document.getElementById('featured-counter');

    if (dotsContainer) {
      dotsContainer.innerHTML = Array.from({ length: totalPages }, (_, i) => `
        <button type="button" class="featured-progress__dot ${i === featuredCurrentPage ? 'active' : ''}" 
                data-page="${i}" role="tab" aria-label="Go to page ${i + 1}" aria-selected="${i === featuredCurrentPage}">
        </button>
      `).join('');

      dotsContainer.querySelectorAll('.featured-progress__dot').forEach(dot => {
        dot.addEventListener('click', () => {
          featuredCurrentPage = parseInt(dot.dataset.page, 10);
          renderFeaturedPage();
        });
      });
    }

    if (counter) {
      counter.textContent = `${featuredCurrentPage + 1} / ${totalPages}`;
    }
  }

  /**
   * Update featured navigation buttons state
   */
  function updateFeaturedNavButtons(totalPages) {
    const prevBtn = document.getElementById('featured-prev');
    const nextBtn = document.getElementById('featured-next');

    if (prevBtn) prevBtn.disabled = featuredCurrentPage <= 0;
    if (nextBtn) nextBtn.disabled = featuredCurrentPage >= totalPages - 1;
  }

  /**
   * Initialize featured tools carousel
   */
  function initFeaturedCarousel() {
    const prevBtn = document.getElementById('featured-prev');
    const nextBtn = document.getElementById('featured-next');
    const section = document.querySelector('.featured-section');

    if (!section) return;

    prevBtn?.addEventListener('click', () => {
      if (featuredCurrentPage > 0) {
        featuredCurrentPage--;
        renderFeaturedPage();
      }
    });

    nextBtn?.addEventListener('click', () => {
      const itemsPerPage = getFeaturedItemsPerPage();
      const totalPages = Math.ceil(featuredTools.length / itemsPerPage);
      if (featuredCurrentPage < totalPages - 1) {
        featuredCurrentPage++;
        renderFeaturedPage();
      }
    });

    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newItemsPerPage = getFeaturedItemsPerPage();
        const newTotalPages = Math.ceil(featuredTools.length / newItemsPerPage);
        if (featuredCurrentPage >= newTotalPages) {
          featuredCurrentPage = Math.max(0, newTotalPages - 1);
        }
        renderFeaturedPage();
      }, 150);
    });

    // Keyboard navigation
    section.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && featuredCurrentPage > 0) {
        featuredCurrentPage--;
        renderFeaturedPage();
      } else if (e.key === 'ArrowRight') {
        const itemsPerPage = getFeaturedItemsPerPage();
        const totalPages = Math.ceil(featuredTools.length / itemsPerPage);
        if (featuredCurrentPage < totalPages - 1) {
          featuredCurrentPage++;
          renderFeaturedPage();
        }
      }
    });

    // Touch swipe support
    let touchStartX = 0;
    section.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    section.addEventListener('touchend', (e) => {
      const swipeDistance = e.changedTouches[0].screenX - touchStartX;
      const itemsPerPage = getFeaturedItemsPerPage();
      const totalPages = Math.ceil(featuredTools.length / itemsPerPage);
      
      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance < 0 && featuredCurrentPage < totalPages - 1) {
          featuredCurrentPage++;
          renderFeaturedPage();
        } else if (swipeDistance > 0 && featuredCurrentPage > 0) {
          featuredCurrentPage--;
          renderFeaturedPage();
        }
      }
    }, { passive: true });
  }

  /**
   * Render paginated tools
   */
  function renderPaginatedTools() {
    const tools = currentFilteredTools;
    const totalPages = Math.ceil(tools.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTools = tools.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    renderTools(paginatedTools, tools.length === 0);
    renderPaginationControls(tools.length, totalPages);
  }

  /**
   * Create skeleton card HTML
   */
  function createSkeletonCard() {
    return `
      <article class="card card--skeleton" aria-hidden="true">
        <div class="card__header">
          <div class="skeleton skeleton--icon"></div>
          <div class="card__content">
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--tagline"></div>
          </div>
        </div>
        <div class="card__footer">
          <div class="skeleton skeleton--tag"></div>
        </div>
      </article>
    `;
  }

  /**
   * Create empty state HTML - connected to unified filter system
   */
  function createEmptyState(query, category) {
    const state = Search.getState();
    const hasQuery = query && query.length > 0;
    const hasCategory = category && category !== 'all';
    const hasFilters = state.platforms.length > 0 || state.tags.length > 0;
    
    let title, description, icon;
    
    if (hasQuery) {
      title = I18n.t('search.noResultsFor', 'No results found');
      description = `${I18n.t('search.noResultsQuery', 'We couldn\'t find any tools matching')} <span class="empty-state__query">"${escapeHtml(query)}"</span>`;
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M8 8l6 6M14 8l-6 6"/>
      </svg>`;
    } else if (hasFilters) {
      const filterCount = state.platforms.length + state.tags.length;
      title = I18n.t('search.noFilterResults', 'No matching tools');
      description = I18n.t('search.noFilterDesc', `No tools match the selected ${filterCount} filter${filterCount > 1 ? 's' : ''}. Try adjusting your filters.`);
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        <line x1="4" y1="21" x2="20" y2="5"/>
      </svg>`;
    } else if (hasCategory) {
      const categoryObj = toolsData.categories.find(c => c.id === category);
      const categoryName = I18n.t(`categories.${category}`, categoryObj?.name || category);
      title = I18n.t('search.noCategoryTools', 'No tools in this category');
      description = I18n.t('search.noCategoryDesc', `There are no tools available in "${categoryName}" yet.`);
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>`;
    } else {
      title = I18n.t('search.noTools', 'No tools available');
      description = I18n.t('search.noToolsDesc', 'Tools will appear here once they are added.');
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>`;
    }

    const suggestions = ['LibreOffice', 'GIMP', 'Blender', 'Obsidian', 'VS Code'];
    const showClearButton = hasQuery || hasCategory || hasFilters;

    return `
      <div class="empty-state" role="status" aria-live="polite">
        <div class="empty-state__icon-wrapper">
          <div class="empty-state__icon">${icon}</div>
        </div>
        <div class="empty-state__content">
          <h3 class="empty-state__title">${title}</h3>
          <p class="empty-state__description">${description}</p>
          <div class="empty-state__actions">
            ${showClearButton ? `
              <button type="button" class="empty-state__btn" id="empty-state-clear">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                ${I18n.t('search.clearFilters', 'Clear filters')}
              </button>
            ` : ''}
            <button type="button" class="empty-state__btn empty-state__btn--primary" id="empty-state-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              ${I18n.t('search.trySearch', 'Search tools')}
            </button>
          </div>
          ${hasQuery ? `
            <div class="empty-state__suggestions">
              <p class="empty-state__suggestions-title">${I18n.t('search.suggestions', 'Try searching for')}</p>
              <div class="empty-state__suggestions-list" id="empty-state-suggestions">
                ${suggestions.map(s => `
                  <button type="button" class="empty-state__suggestion" data-query="${s}">
                    ${s}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render tool cards
   */
  function renderTools(tools, isEmpty = false, meta = {}) {
    const container = document.getElementById('tools-grid');
    if (!container) return;

    if (isEmpty || tools.length === 0) {
      container.innerHTML = createEmptyState(meta.query || currentSearchQuery, currentCategory);
      
      // Attach event listeners to empty state buttons
      const clearBtn = container.querySelector('#empty-state-clear');
      const searchBtn = container.querySelector('#empty-state-search');
      const suggestions = container.querySelectorAll('.empty-state__suggestion');
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          resetFilters();
        });
      }
      
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        });
      }
      
      suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
          const query = btn.dataset.query;
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.value = query;
          }
          Search.setQuery(query);
        });
      });
      
      const paginationContainer = document.getElementById('pagination-controls');
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    container.innerHTML = tools.map(tool => createToolCard(tool)).join('');
  }

  /**
   * Render pagination controls
   */
  function renderPaginationControls(totalItems, totalPages) {
    const container = document.getElementById('pagination-controls');
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    const pageNumbers = generatePageNumbers(currentPage, totalPages);
    const prevLabel = I18n.t('pagination.prev', 'Previous');
    const nextLabel = I18n.t('pagination.next', 'Next');

    container.innerHTML = `
      <button type="button" class="pagination__btn pagination__btn--nav" ${currentPage === 1 ? 'disabled' : ''} data-page="prev" aria-label="${prevLabel}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span class="pagination__btn-text">${prevLabel}</span>
      </button>
      <div class="pagination__pages">
        ${pageNumbers.map(page => page === '...' 
          ? '<span class="pagination__ellipsis">…</span>'
          : `<button type="button" class="pagination__btn pagination__btn--page ${page === currentPage ? 'active' : ''}" data-page="${page}" ${page === currentPage ? 'aria-current="page"' : ''}>${page}</button>`
        ).join('')}
      </div>
      <button type="button" class="pagination__btn pagination__btn--nav" ${currentPage === totalPages ? 'disabled' : ''} data-page="next" aria-label="${nextLabel}">
        <span class="pagination__btn-text">${nextLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span class="pagination__info">Page ${currentPage} of ${totalPages}</span>
    `;

    container.querySelectorAll('.pagination__btn').forEach(btn => {
      btn.addEventListener('click', handlePaginationClick);
    });
  }

  /**
   * Generate page numbers with ellipsis
   */
  function generatePageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    
    const pages = [1];
    if (current > 3) pages.push('...');
    
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
    
    if (current < total - 2) pages.push('...');
    if (!pages.includes(total)) pages.push(total);
    
    return pages;
  }

  /**
   * Handle pagination click
   */
  function handlePaginationClick(e) {
    const page = e.currentTarget.dataset.page;
    const totalPages = Math.ceil(currentFilteredTools.length / ITEMS_PER_PAGE);

    if (page === 'prev' && currentPage > 1) currentPage--;
    else if (page === 'next' && currentPage < totalPages) currentPage++;
    else if (page !== 'prev' && page !== 'next') currentPage = parseInt(page, 10);

    renderPaginatedTools();
    document.querySelector('.section--tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Create tool card HTML
   * Enhanced with: Health indicator, License badge, "Alternative to" text
   */
  function createToolCard(tool) {
    const category = toolsData.categories.find(c => c.id === tool.category);
    const categoryName = I18n.t(`categories.${tool.category}`, category?.name || tool.category);
    
    // Project Health Indicator - now with visible label
    const health = getProjectHealth(tool.last_update);
    const healthIndicator = health ? `
      <span class="health-badge health-badge--${health.status}" 
            data-tooltip="${health.tooltip} · ${formatDate(tool.last_update)}"
            aria-label="${health.label}: Last updated ${formatDate(tool.last_update)}">
        <span class="health-badge__dot"></span>
        <span class="health-badge__label">${health.label}</span>
      </span>
    ` : '';
    
    // License Badge
    const licenseBadge = getLicenseBadgeInfo(tool);
    
    // "Alternative to" text
    const alternativesText = (tool.alternatives_to && tool.alternatives_to.length > 0)
      ? `<p class="card__alternatives">Alternative to: ${tool.alternatives_to.slice(0, 2).map(a => escapeHtml(a)).join(', ')}</p>`
      : '';

    return `
      <article class="card" data-tool-id="${tool.id}" tabindex="0" role="button" aria-label="${escapeHtml(tool.name)}: ${escapeHtml(tool.tagline)}">
        <div class="card__header">
          <div class="card__icon card__icon--${tool.category}">
            ${getIconSVG(category?.icon || 'box')}
          </div>
          <div class="card__content">
            <div class="card__title-row">
              <h3 class="card__title">${escapeHtml(tool.name)}</h3>
              ${healthIndicator}
            </div>
            <p class="card__tagline">${escapeHtml(tool.tagline)}</p>
            ${alternativesText}
          </div>
        </div>
        <div class="card__footer">
          <div class="card__tags">
            <span class="card__tag card__tag--license ${licenseBadge.class}">
              ${licenseBadge.icon}
              <span>${licenseBadge.label}</span>
            </span>
            <span class="card__tag">${escapeHtml(categoryName)}</span>
          </div>
          <span class="card__action">
            <svg class="card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </article>
    `;
  }

  /**
   * Open tool detail modal
   * Enhanced with: Health indicator, License badge, "Alternative to" section, Repo link
   */
  function openToolModal(toolId) {
    const tool = toolsData.tools.find(t => t.id === toolId);
    if (!tool) return;

    const category = toolsData.categories.find(c => c.id === tool.category);
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('tool-modal');

    if (!backdrop || !modal) return;

    // Project Health Indicator
    const health = getProjectHealth(tool.last_update);
    const healthBadge = health ? `
      <span class="badge badge--health badge--health-${health.status}" title="${health.tooltip}">
        <span class="health-indicator__dot"></span>
        ${health.label}
        <span class="badge__date">(${formatDate(tool.last_update)})</span>
      </span>
    ` : '';
    
    // License Badge
    const licenseBadge = getLicenseBadgeInfo(tool);
    
    // "Alternative to" section
    const alternativesSection = (tool.alternatives_to && tool.alternatives_to.length > 0) ? `
      <div class="modal__alternatives">
        <span class="modal__alternatives-label">Alternative to:</span>
        <div class="modal__alternatives-list">
          ${tool.alternatives_to.map(alt => `<span class="badge badge--alternative">${escapeHtml(alt)}</span>`).join('')}
        </div>
      </div>
    ` : '';
    
    // Repository link
    const repoLink = tool.repo_url ? `
      <a href="${escapeHtml(tool.repo_url)}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        ${I18n.t('tools.viewRepo', 'View Repository')}
      </a>
    ` : '';

    modal.innerHTML = `
      <div class="modal__header">
        <div class="flex items-center gap-4">
          <div class="card__icon card__icon--${tool.category}">${getIconSVG(category?.icon || 'box')}</div>
          <div>
            <div class="modal__title-row">
              <h2 class="card__title" style="font-size: var(--font-size-xl);">${escapeHtml(tool.name)}</h2>
              ${health ? `<span class="health-indicator health-indicator--${health.status}" title="${health.tooltip}: ${formatDate(tool.last_update)}"><span class="health-indicator__dot"></span></span>` : ''}
            </div>
            <p class="card__tagline">${escapeHtml(tool.tagline)}</p>
          </div>
        </div>
        <button type="button" class="btn btn--icon modal__close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal__body">
        ${alternativesSection}
        <p style="margin-bottom: var(--space-6); line-height: var(--line-height-relaxed);">${escapeHtml(tool.description)}</p>
        <div class="flex flex-wrap gap-4 mb-6">
          <span class="badge ${licenseBadge.class}">
            ${licenseBadge.icon}
            <span>${licenseBadge.label}</span>
            ${licenseBadge.sublabel ? `<span class="badge__sublabel">(${escapeHtml(licenseBadge.sublabel)})</span>` : ''}
          </span>
          ${healthBadge}
        </div>
        <div class="mb-6">
          <h4 style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-2);">${I18n.t('tools.platforms', 'Platforms')}</h4>
          <div class="flex flex-wrap gap-2">${(tool.platforms || []).map(p => `<span class="badge badge--platform">${p}</span>`).join('')}</div>
        </div>
        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-2);">${I18n.t('tools.tags', 'Tags')}</h4>
          <div class="flex flex-wrap gap-2">${(tool.tags || []).map(tag => `<span class="card__tag">${escapeHtml(tag)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="modal__footer">
        ${repoLink}
        <a href="${escapeHtml(tool.website)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">
          ${I18n.t('tools.visitWebsite', 'Visit Website')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    `;

    backdrop.classList.add('active');
    modal.classList.add('active');
    currentModal = modal;
    modal.querySelector('.modal__close')?.focus();
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close modal
   */
  function closeModal() {
    document.getElementById('modal-backdrop')?.classList.remove('active');
    document.getElementById('tool-modal')?.classList.remove('active');
    currentModal = null;
    document.body.style.overflow = '';
  }

  /**
   * Update stats
   */
  function updateStats() {
    const toolsCount = document.getElementById('stats-tools');
    const categoriesCount = document.getElementById('stats-categories');
    if (toolsCount) toolsCount.textContent = toolsData.tools.length + '+';
    if (categoriesCount) categoriesCount.textContent = toolsData.categories.length;
  }

  /**
   * Update tools count display
   */
  function updateToolsCount(showing, total) {
    const countEl = document.getElementById('tools-count');
    if (countEl) {
      countEl.textContent = `${I18n.t('tools.showing', 'Showing')} ${showing} ${I18n.t('tools.of', 'of')} ${total} ${I18n.t('tools.toolsLabel', 'tools')}`;
    }
  }

  /**
   * Get SVG icon by name
   */
  function getIconSVG(iconName) {
    const icons = {
      'document-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      'chart-bar-line': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      'paint-brush-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
      'book-open-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      'book-02': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      'lock-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      'folder-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      'globe-02': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      'heart-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      'play-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
      'calculator': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>',
      'note-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
      'key-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
      'wallet-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
      'shield-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      'kanban': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
      'book-bookmark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8v5l-4-2-4 2V7z"/></svg>',
      'hierarchy-square-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      'graduation-hat-01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10l-10-5L2 10l10 5 10-5z"/><path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"/><path d="M22 10v6"/></svg>',
      'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
    };
    return icons[iconName] || icons['box'];
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  return { init, resetFilters };
})();

document.addEventListener('DOMContentLoaded', App.init);
