/**
 * Static Page Initialization
 * Shared initialization script for static pages (about, contact, faq, privacy, sitemap)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Update copyright year
    const yearEl = document.getElementById('copyright-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Initialize i18n
    await I18n.init();

    // Initialize theme
    Theme.init();

    // Language selector logic
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

    // Theme toggle logic
    document.querySelectorAll('.theme-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            Theme.setTheme(btn.dataset.theme);
        });
    });
});
