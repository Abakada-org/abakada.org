/**
 * Abakada - Unified Filter & Search Module
 * Enterprise-grade search with integrated filtering, shared state management,
 * and real-time synchronization across all filter controls
 */

const Search = (function () {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_QUERY_LENGTH: 100,
        DEBOUNCE_MS: 200,
        MIN_SEARCH_LENGTH: 1,
        FUZZY_THRESHOLD: 0.6
    };

    // Unified Filter State - Single source of truth
    const state = {
        query: '',
        category: 'all',
        platforms: [],
        tags: [],
        isInitialized: false
    };

    // Internal state
    let tools = [];
    let onResultsCallback = null;
    let lastProcessedKey = null;
    let searchIndex = new Map();

    // Event subscribers for state changes
    const subscribers = new Set();

    /**
     * Initialize search with tools data
     */
    function init(toolsData, onResults) {
        try {
            if (state.isInitialized) {
                console.warn('[Search] Already initialized');
                return;
            }

            if (!Array.isArray(toolsData)) {
                tools = [];
            } else {
                tools = toolsData.filter(tool => 
                    tool && typeof tool === 'object' && tool.id && tool.name
                );
            }

            buildSearchIndex();
            onResultsCallback = typeof onResults === 'function' ? onResults : null;
            setupEventListeners();
            state.isInitialized = true;

            console.log(`[Search] Initialized with ${tools.length} tools`);
        } catch (error) {
            console.error('[Search] Initialization failed:', error);
            state.isInitialized = true;
            tools = [];
        }
    }

    /**
     * Build search index for performance
     * Includes alternatives_to array for "Alternative to X" searches
     */
    function buildSearchIndex() {
        searchIndex.clear();
        tools.forEach(tool => {
            const searchText = [
                tool.name || '',
                tool.tagline || '',
                tool.description || '',
                tool.license || '',
                ...(tool.tags || []),
                ...(tool.platforms || []),
                ...(tool.alternatives_to || [])  // Include alternatives for search
            ].join(' ').toLowerCase();
            
            searchIndex.set(tool.id, {
                text: searchText,
                words: searchText.split(/\s+/).filter(w => w.length > 1),
                alternatives: (tool.alternatives_to || []).map(a => a.toLowerCase())
            });
        });
    }

    /**
     * Set up event listeners for search input
     */
    function setupEventListeners() {
        try {
            const searchInput = document.getElementById('search-input');
            const clearBtn = document.getElementById('search-clear');

            if (searchInput) {
                searchInput.addEventListener('input', debounce(handleSearchInput, CONFIG.DEBOUNCE_MS));
                searchInput.addEventListener('keydown', handleKeydown);
                searchInput.setAttribute('maxlength', CONFIG.MAX_QUERY_LENGTH);
                searchInput.setAttribute('autocomplete', 'off');
                searchInput.setAttribute('spellcheck', 'false');
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', clearSearch);
            }
        } catch (error) {
            console.error('[Search] Event listener setup failed:', error);
        }
    }

    /**
     * Sanitize search query
     */
    function sanitizeQuery(input) {
        if (input == null) return '';
        let query = String(input)
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
        
        if (query.length > CONFIG.MAX_QUERY_LENGTH) {
            query = query.substring(0, CONFIG.MAX_QUERY_LENGTH);
        }
        return query.toLowerCase();
    }

    /**
     * Handle search input event
     */
    function handleSearchInput(e) {
        try {
            const rawValue = e?.target?.value ?? '';
            state.query = sanitizeQuery(rawValue);
            
            updateSearchInputUI(rawValue.length > 0);
            showLoadingState();
            performSearch();
            notifyStateChange();
        } catch (error) {
            console.error('[Search] Search handler failed:', error);
            notifyResults(tools);
        }
    }

    /**
     * Update search input UI elements
     */
    function updateSearchInputUI(hasValue) {
        const clearBtn = document.getElementById('search-clear');
        const searchInput = document.getElementById('search-input');
        
        if (clearBtn) {
            clearBtn.style.opacity = hasValue ? '1' : '0';
            clearBtn.style.visibility = hasValue ? 'visible' : 'hidden';
            clearBtn.setAttribute('aria-hidden', !hasValue);
        }
        
        if (searchInput) {
            searchInput.setAttribute('aria-expanded', hasValue ? 'true' : 'false');
        }
    }

    function showLoadingState() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.classList.add('searching');
    }

    function hideLoadingState() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.classList.remove('searching');
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            clearSearch();
            e.target.blur();
        }
    }

    /**
     * Clear search query only
     */
    function clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        state.query = '';
        lastProcessedKey = null;
        updateSearchInputUI(false);
        performSearch();
        notifyStateChange();
        searchInput?.focus();
    }

    /**
     * Set search query programmatically
     */
    function setQuery(query) {
        const searchInput = document.getElementById('search-input');
        state.query = sanitizeQuery(query);
        
        if (searchInput) {
            searchInput.value = query;
        }
        
        updateSearchInputUI(query.length > 0);
        performSearch();
        notifyStateChange();
    }

    /**
     * Set category filter
     */
    function setCategory(category) {
        state.category = typeof category === 'string' ? category : 'all';
        performSearch();
        notifyStateChange();
    }

    /**
     * Set platforms filter (replace all)
     */
    function setPlatforms(platforms) {
        state.platforms = Array.isArray(platforms) ? [...platforms] : [];
        performSearch();
        notifyStateChange();
    }

    /**
     * Toggle a single platform filter
     */
    function togglePlatform(platform) {
        const index = state.platforms.indexOf(platform);
        if (index === -1) {
            state.platforms.push(platform);
        } else {
            state.platforms.splice(index, 1);
        }
        performSearch();
        notifyStateChange();
    }

    /**
     * Set tags filter (replace all)
     */
    function setTags(tags) {
        state.tags = Array.isArray(tags) ? [...tags] : [];
        performSearch();
        notifyStateChange();
    }

    /**
     * Toggle a single tag filter
     */
    function toggleTag(tag) {
        const index = state.tags.indexOf(tag);
        if (index === -1) {
            state.tags.push(tag);
        } else {
            state.tags.splice(index, 1);
        }
        performSearch();
        notifyStateChange();
    }

    /**
     * Clear platform and tag filters only (not search query)
     */
    function clearFilters() {
        state.platforms = [];
        state.tags = [];
        performSearch();
        notifyStateChange();
    }

    /**
     * Reset all filters including search query and category
     */
    function resetAll() {
        const searchInput = document.getElementById('search-input');
        
        // Reset all state
        state.query = '';
        state.category = 'all';
        state.platforms = [];
        state.tags = [];
        lastProcessedKey = null;
        
        // Update search input
        if (searchInput) {
            searchInput.value = '';
        }
        updateSearchInputUI(false);
        
        performSearch();
        notifyStateChange();
    }

    /**
     * Perform the actual search/filter operation
     */
    function performSearch() {
        try {
            const searchKey = `${state.query}|${state.category}|${state.platforms.join(',')}|${state.tags.join(',')}`;
            
            // Skip if nothing changed
            if (searchKey === lastProcessedKey) {
                hideLoadingState();
                return;
            }
            lastProcessedKey = searchKey;

            let results = tools.slice();

            // Filter by category
            if (state.category && state.category !== 'all') {
                results = results.filter(tool => tool?.category === state.category);
            }

            // Filter by platforms (OR logic - tool matches if it has ANY selected platform)
            if (state.platforms.length > 0) {
                results = results.filter(tool => {
                    const toolPlatforms = tool?.platforms || [];
                    return state.platforms.some(p => toolPlatforms.includes(p));
                });
            }

            // Filter by tags (OR logic - tool matches if it has ANY selected tag)
            if (state.tags.length > 0) {
                results = results.filter(tool => {
                    const toolTags = tool?.tags || [];
                    return state.tags.some(t => toolTags.includes(t));
                });
            }

            // Filter by search query
            if (state.query && state.query.length >= CONFIG.MIN_SEARCH_LENGTH) {
                const queryWords = state.query.split(/\s+/).filter(w => w.length > 0);
                
                results = results.map(tool => {
                    const score = calculateMatchScore(tool, queryWords);
                    return { tool, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(item => item.tool);
            }

            hideLoadingState();
            notifyResults(results);
            announceResults(results.length, state.query);

        } catch (error) {
            console.error('[Search] Search execution failed:', error);
            hideLoadingState();
            notifyResults(tools);
        }
    }

    /**
     * Calculate match score for a tool against query words
     * Enhanced to boost scores for "Alternative to X" matches
     */
    function calculateMatchScore(tool, queryWords) {
        if (!tool || queryWords.length === 0) return 0;

        const indexed = searchIndex.get(tool.id);
        if (!indexed) return 0;

        let totalScore = 0;
        const lowerName = (tool.name || '').toLowerCase();
        const lowerTagline = (tool.tagline || '').toLowerCase();

        for (const word of queryWords) {
            let wordScore = 0;

            if (lowerName === word) {
                wordScore = 100;
            } else if (lowerName.startsWith(word)) {
                wordScore = 80;
            } else if (lowerName.includes(word)) {
                wordScore = 60;
            } else if (lowerTagline.startsWith(word)) {
                wordScore = 40;
            } else if (lowerTagline.includes(word)) {
                wordScore = 30;
            } else if (indexed.alternatives && indexed.alternatives.some(alt => alt.includes(word))) {
                // Boost score for "Alternative to" matches (e.g., searching "Photoshop" finds GIMP)
                wordScore = 70;
            } else if (indexed.text.includes(word)) {
                wordScore = 20;
            } else {
                const fuzzyScore = fuzzyMatch(word, indexed.words);
                if (fuzzyScore > CONFIG.FUZZY_THRESHOLD) {
                    wordScore = Math.floor(fuzzyScore * 15);
                }
            }

            if (wordScore === 0) return 0;
            totalScore += wordScore;
        }

        return totalScore;
    }

    /**
     * Fuzzy match a query word against indexed words
     */
    function fuzzyMatch(query, words) {
        let bestScore = 0;
        
        for (const word of words) {
            if (word.length < 2) continue;
            
            if (word.startsWith(query)) return 1;
            
            const distance = levenshteinDistance(query, word.substring(0, query.length + 2));
            const maxLen = Math.max(query.length, word.length);
            const similarity = 1 - (distance / maxLen);
            
            if (similarity > bestScore) bestScore = similarity;
        }
        
        return bestScore;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Notify callback with search results
     */
    function notifyResults(results) {
        if (onResultsCallback) {
            onResultsCallback(results, {
                query: state.query,
                category: state.category,
                platforms: [...state.platforms],
                tags: [...state.tags],
                total: tools.length,
                hasQuery: state.query.length > 0,
                hasFilters: state.platforms.length > 0 || state.tags.length > 0,
                hasActiveFilters: state.query.length > 0 || state.platforms.length > 0 || state.tags.length > 0 || state.category !== 'all'
            });
        }
    }

    /**
     * Announce results to screen readers
     */
    function announceResults(count, query) {
        let announcer = document.getElementById('search-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'search-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }

        let message;
        const filterCount = state.platforms.length + state.tags.length;
        
        if (query && query.length > 0) {
            message = count === 0
                ? `No tools found for "${query}"`
                : `${count} tool${count === 1 ? '' : 's'} found for "${query}"`;
        } else if (filterCount > 0) {
            message = `${count} tool${count === 1 ? '' : 's'} matching ${filterCount} filter${filterCount === 1 ? '' : 's'}`;
        } else {
            message = `Showing ${count} tool${count === 1 ? '' : 's'}`;
        }

        announcer.textContent = message;
    }

    /**
     * Subscribe to state changes
     */
    function subscribe(callback) {
        if (typeof callback === 'function') {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
        return () => {};
    }

    /**
     * Notify all subscribers of state change
     */
    function notifyStateChange() {
        const currentState = getState();
        subscribers.forEach(callback => {
            try {
                callback(currentState);
            } catch (error) {
                console.error('[Search] Subscriber error:', error);
            }
        });
        
        // Dispatch custom event for external listeners
        window.dispatchEvent(new CustomEvent('filterStateChanged', { 
            detail: currentState 
        }));
    }

    /**
     * Highlight matching text in search results
     */
    function highlightMatch(text, query) {
        if (!text || !query) return escapeHtml(text || '');

        const escapedText = escapeHtml(String(text));
        const words = query.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length === 0) return escapedText;

        let result = escapedText;
        words.forEach(word => {
            const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
            result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
        });

        return result;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegExp(string) {
        return String(string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Get current filter state (immutable copy)
     */
    function getState() {
        return {
            query: state.query,
            category: state.category,
            platforms: [...state.platforms],
            tags: [...state.tags],
            resultsCount: tools.length,
            isInitialized: state.isInitialized,
            hasQuery: state.query.length > 0,
            hasFilters: state.platforms.length > 0 || state.tags.length > 0,
            hasActiveFilters: state.query.length > 0 || state.platforms.length > 0 || state.tags.length > 0 || state.category !== 'all'
        };
    }

    /**
     * Check if any filters are active
     */
    function hasActiveFilters() {
        return state.query.length > 0 || 
               state.platforms.length > 0 || 
               state.tags.length > 0 || 
               state.category !== 'all';
    }

    /**
     * Reset module (for testing)
     */
    function reset() {
        tools = [];
        state.query = '';
        state.category = 'all';
        state.platforms = [];
        state.tags = [];
        state.isInitialized = false;
        onResultsCallback = null;
        lastProcessedKey = null;
        searchIndex.clear();
        subscribers.clear();
    }

    return {
        init,
        setQuery,
        setCategory,
        setPlatforms,
        togglePlatform,
        setTags,
        toggleTag,
        clearFilters,
        clearSearch,
        resetAll,
        getState,
        hasActiveFilters,
        highlightMatch,
        performSearch,
        subscribe,
        reset
    };
})();

window.Search = Search;
