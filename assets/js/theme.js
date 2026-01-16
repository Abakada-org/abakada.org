/**
 * Abakada - Theme Module
 * Handles light/dark mode switching with system preference detection
 */

const Theme = (function () {
    const STORAGE_KEY = 'abakada-theme';
    const THEMES = ['light', 'dark', 'auto'];

    let currentTheme = 'auto';
    let systemPreference = 'light';

    /**
     * Initialize the theme module
     */
    function init() {
        // Detect system preference
        detectSystemPreference();

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleSystemChange);

        // Load saved theme or use auto
        currentTheme = getSavedTheme() || 'auto';
        applyTheme(currentTheme);
        updateThemeUI();
    }

    /**
     * Get saved theme from localStorage
     */
    function getSavedTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return THEMES.includes(saved) ? saved : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Detect system color scheme preference
     */
    function detectSystemPreference() {
        systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    /**
     * Handle system preference change
     */
    function handleSystemChange(e) {
        systemPreference = e.matches ? 'dark' : 'light';

        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    }

    /**
     * Apply theme to document
     */
    function applyTheme(theme) {
        const html = document.documentElement;

        // Add transition class for smooth theme change
        html.classList.add('theme-transitioning');

        // Determine actual theme to apply
        const actualTheme = theme === 'auto' ? systemPreference : theme;

        // Remove existing theme attribute and apply new one
        html.removeAttribute('data-theme');

        if (actualTheme === 'dark' || (theme === 'auto' && systemPreference === 'dark')) {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.setAttribute('data-theme', 'light');
        }

        // Update theme-aware logos
        updateLogos(actualTheme);

        // Remove transition class after animation
        setTimeout(() => {
            html.classList.remove('theme-transitioning');
        }, 300);
    }

    /**
     * Update logo images based on theme
     */
    function updateLogos(theme) {
        const isDark = theme === 'dark';
        const logoSrc = isDark
            ? 'assets/logo/logo-dark-background.svg'
            : 'assets/logo/logo-light-background.svg';

        // Update header logo
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
            headerLogo.src = logoSrc;
        }

        // Update footer logo
        const footerLogo = document.getElementById('footer-logo');
        if (footerLogo) {
            footerLogo.src = logoSrc;
        }
    }

    /**
     * Set theme and save preference
     */
    function setTheme(theme) {
        if (!THEMES.includes(theme)) return;

        currentTheme = theme;

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            console.warn('Could not save theme preference');
        }

        applyTheme(theme);
        updateThemeUI();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    /**
     * Update theme toggle UI
     */
    function updateThemeUI() {
        document.querySelectorAll('.theme-toggle__btn').forEach(btn => {
            const btnTheme = btn.dataset.theme;
            btn.classList.toggle('active', btnTheme === currentTheme);
        });
    }

    /**
     * Toggle between light and dark (skip auto)
     */
    function toggle() {
        const actualTheme = currentTheme === 'auto' ? systemPreference : currentTheme;
        setTheme(actualTheme === 'light' ? 'dark' : 'light');
    }

    /**
     * Get current theme setting
     */
    function getCurrentTheme() {
        return currentTheme;
    }

    /**
     * Get actual applied theme (resolves 'auto')
     */
    function getAppliedTheme() {
        return currentTheme === 'auto' ? systemPreference : currentTheme;
    }

    return {
        init,
        setTheme,
        toggle,
        getCurrentTheme,
        getAppliedTheme
    };
})();

// Export for use in other modules
window.Theme = Theme;
