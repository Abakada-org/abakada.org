/**
 * Abakada - Enterprise Internationalization Module
 * Handles language switching, translation loading, interpolation, and real-time text replacement
 */

const I18n = (function () {
    const STORAGE_KEY = 'abakada-language';
    const DEFAULT_LANG = 'en';
    const SUPPORTED_LANGS = ['en', 'tl', 'ilo', 'bis'];

    let currentLang = DEFAULT_LANG;
    let translations = {};
    let isInitialized = false;
    let observers = [];

    /**
     * Initialize the i18n module
     */
    async function init() {
        if (isInitialized) return;
        
        currentLang = getSavedLanguage() || detectBrowserLanguage();
        await loadTranslations(currentLang);
        applyTranslations();
        updateLanguageUI();
        setupMutationObserver();
        isInitialized = true;
    }

    /**
     * Get saved language from localStorage
     */
    function getSavedLanguage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return SUPPORTED_LANGS.includes(saved) ? saved : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect browser language preference
     */
    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();

        // Map Filipino variants to Tagalog
        if (langCode === 'fil' || langCode === 'tl') return 'tl';
        if (langCode === 'ilo') return 'ilo';
        if (langCode === 'ceb' || langCode === 'bis') return 'bis';

        return SUPPORTED_LANGS.includes(langCode) ? langCode : DEFAULT_LANG;
    }

    /**
     * Load translations for a specific language
     */
    async function loadTranslations(lang) {
        try {
            const basePath = window.ABAKADA_BASE_PATH || './';
            const response = await fetch(basePath + `assets/data/translations/${lang}.json`);
            if (!response.ok) throw new Error('Failed to load translations');
            translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            if (lang !== DEFAULT_LANG) {
                await loadTranslations(DEFAULT_LANG);
            }
        }
    }

    /**
     * Apply translations to all elements with data-i18n attributes
     */
    function applyTranslations() {
        // Standard text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const params = el.getAttribute('data-i18n-params');
            const translation = t(key, null, params ? JSON.parse(params) : null);
            
            if (translation) {
                const attr = el.getAttribute('data-i18n-attr');
                if (attr) {
                    el.setAttribute(attr, translation);
                } else {
                    el.textContent = translation;
                }
            }
        });

        // HTML content (use with caution)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translation = t(key);
            if (translation) {
                el.innerHTML = translation;
            }
        });

        // Placeholder attributes
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) {
                el.setAttribute('placeholder', translation);
            }
        });

        // Aria-label attributes
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = t(key);
            if (translation) {
                el.setAttribute('aria-label', translation);
            }
        });

        // Title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) {
                el.setAttribute('title', translation);
            }
        });

        // Update document attributes
        document.documentElement.lang = currentLang;
        
        // Update page title if specified
        const titleKey = document.querySelector('meta[name="i18n-title"]')?.content;
        if (titleKey) {
            const titleTranslation = t(titleKey);
            if (titleTranslation) document.title = titleTranslation;
        }
    }

    /**
     * Setup mutation observer for dynamic content
     */
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.hasAttribute?.('data-i18n') || 
                            node.querySelector?.('[data-i18n]')) {
                            needsUpdate = true;
                        }
                    }
                });
            });
            if (needsUpdate) {
                requestAnimationFrame(applyTranslations);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Get a nested value from an object using dot notation
     */
    function getNestedValue(obj, path) {
        if (!obj || !path) return null;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    /**
     * Get a translation by key with optional interpolation
     * @param {string} key - Translation key (dot notation)
     * @param {string} fallback - Fallback text if key not found
     * @param {Object} params - Parameters for interpolation {{param}}
     */
    function t(key, fallback = '', params = null) {
        let translation = getNestedValue(translations, key);
        
        if (!translation) {
            return fallback || key;
        }

        // Handle interpolation {{param}}
        if (params && typeof translation === 'string') {
            Object.keys(params).forEach(param => {
                translation = translation.replace(
                    new RegExp(`{{${param}}}`, 'g'),
                    params[param]
                );
            });
        }

        return translation;
    }

    /**
     * Get plural form of translation
     * @param {string} key - Base translation key
     * @param {number} count - Count for pluralization
     * @param {Object} params - Additional parameters
     */
    function tp(key, count, params = {}) {
        const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
        return t(pluralKey, t(key), { ...params, count });
    }

    /**
     * Change the current language
     */
    async function setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;

        currentLang = lang;

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            console.warn('Could not save language preference');
        }

        await loadTranslations(lang);
        applyTranslations();
        updateLanguageUI();

        // Notify observers
        observers.forEach(callback => callback(lang));

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { lang, translations } 
        }));
    }

    /**
     * Subscribe to language changes
     */
    function subscribe(callback) {
        observers.push(callback);
        return () => {
            observers = observers.filter(cb => cb !== callback);
        };
    }

    /**
     * Update language selector UI
     */
    function updateLanguageUI() {
        // Update button text
        const langBtn = document.querySelector('.lang-selector__btn span');
        if (langBtn) {
            langBtn.textContent = currentLang.toUpperCase();
        }

        // Update active states
        document.querySelectorAll('.lang-selector__option').forEach(option => {
            const isActive = option.dataset.lang === currentLang;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-selected', isActive);
        });

        // Update language names in dropdown
        document.querySelectorAll('.lang-selector__option').forEach(option => {
            const langCode = option.dataset.lang;
            const langName = t(`languages.${langCode}`, option.textContent);
            if (langName) option.textContent = langName;
        });
    }

    /**
     * Get current language code
     */
    function getCurrentLanguage() {
        return currentLang;
    }

    /**
     * Get all supported languages
     */
    function getSupportedLanguages() {
        return [...SUPPORTED_LANGS];
    }

    /**
     * Get all translations object
     */
    function getTranslations() {
        return { ...translations };
    }

    /**
     * Check if a translation key exists
     */
    function has(key) {
        return getNestedValue(translations, key) !== null;
    }

    /**
     * Format number according to locale
     */
    function formatNumber(num) {
        try {
            return new Intl.NumberFormat(currentLang).format(num);
        } catch {
            return num.toString();
        }
    }

    /**
     * Format date according to locale
     */
    function formatDate(date, options = {}) {
        try {
            const d = date instanceof Date ? date : new Date(date);
            return new Intl.DateTimeFormat(currentLang, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            }).format(d);
        } catch {
            return date.toString();
        }
    }

    return {
        init,
        setLanguage,
        t,
        tp,
        has,
        getCurrentLanguage,
        getSupportedLanguages,
        getTranslations,
        subscribe,
        formatNumber,
        formatDate
    };
})();

window.I18n = I18n;
