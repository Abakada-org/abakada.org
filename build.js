const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: terserMinify } = require('terser');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Store hash mappings for cache-busting
const hashMap = {};

/**
 * Generate content hash for cache-busting
 */
function generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}

/**
 * Add hash to filename: app.js -> app.a1b2c3d4.js
 */
function addHashToFilename(filename, hash) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    return `${base}.${hash}${ext}`;
}

async function build() {
    console.log('Starting build...');

    // 1. Clean dist directory
    console.log('Cleaning dist directory...');
    await fs.emptyDir(distDir);

    // 2. Copy assets (except CSS and JS which we'll process separately)
    console.log('Copying assets...');
    await fs.copy(path.join(srcDir, 'assets'), path.join(distDir, 'assets'));

    // 2.1 Copy config and doc files
    console.log('Copying config & doc files...');
    try {
        await fs.copy(path.join(srcDir, 'robots.txt'), path.join(distDir, 'robots.txt'));
        await fs.copy(path.join(srcDir, 'sitemap.xml'), path.join(distDir, 'sitemap.xml'));
        await fs.copy(path.join(srcDir, 'site.webmanifest'), path.join(distDir, 'site.webmanifest'));
        await fs.copy(path.join(srcDir, 'browserconfig.xml'), path.join(distDir, 'browserconfig.xml'));
        await fs.copy(path.join(srcDir, '.htaccess'), path.join(distDir, '.htaccess'));
        await fs.copy(path.join(srcDir, 'README.md'), path.join(distDir, 'README.md'));
        await fs.copy(path.join(srcDir, 'LICENSE'), path.join(distDir, 'LICENSE'));
        await fs.copy(path.join(srcDir, 'CONTRIBUTING.md'), path.join(distDir, 'CONTRIBUTING.md'));
    } catch (e) {
        console.warn('Warning: Some files not found or could not be copied:', e.message);
    }

    // 3. Minify CSS with cache-busting
    console.log('Minifying CSS with cache-busting...');
    const cssDir = path.join(distDir, 'assets', 'css');
    if (await fs.pathExists(cssDir)) {
        const cssFiles = await fs.readdir(cssDir);
        for (const file of cssFiles) {
            if (file.endsWith('.css')) {
                const filePath = path.join(cssDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const output = new CleanCSS().minify(content);
                const hash = generateHash(output.styles);
                const hashedFilename = addHashToFilename(file, hash);
                
                // Write hashed file
                await fs.writeFile(path.join(cssDir, hashedFilename), output.styles);
                // Remove original
                await fs.remove(filePath);
                
                // Store mapping
                hashMap[`assets/css/${file}`] = `assets/css/${hashedFilename}`;
                console.log(`  ${file} -> ${hashedFilename}`);
            }
        }
    }

    // 4. Minify JS with cache-busting
    console.log('Minifying JS with cache-busting...');
    const jsDir = path.join(distDir, 'assets', 'js');
    if (await fs.pathExists(jsDir)) {
        const jsFiles = await fs.readdir(jsDir);
        for (const file of jsFiles) {
            if (file.endsWith('.js')) {
                const filePath = path.join(jsDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                try {
                    const result = await terserMinify(content);
                    if (result.code) {
                        const hash = generateHash(result.code);
                        const hashedFilename = addHashToFilename(file, hash);
                        
                        // Write hashed file
                        await fs.writeFile(path.join(jsDir, hashedFilename), result.code);
                        // Remove original
                        await fs.remove(filePath);
                        
                        // Store mapping
                        hashMap[`assets/js/${file}`] = `assets/js/${hashedFilename}`;
                        console.log(`  ${file} -> ${hashedFilename}`);
                    }
                } catch (e) {
                    console.error(`  Error minifying ${file}:`, e.message);
                }
            }
        }
    }

    // 5. Minify JSON (recursively in assets/data)
    console.log('Minifying JSON...');
    const dataDir = path.join(distDir, 'assets', 'data');
    async function minifyJsonInDir(dir) {
        if (!await fs.pathExists(dir)) return;
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await minifyJsonInDir(filePath);
            } else if (file.endsWith('.json')) {
                const content = await fs.readFile(filePath, 'utf8');
                try {
                    const minified = JSON.stringify(JSON.parse(content));
                    await fs.writeFile(filePath, minified);
                    console.log(`  Minified ${path.relative(dataDir, filePath)}`);
                } catch (e) {
                    console.error(`  Error minifying ${file}:`, e.message);
                }
            }
        }
    }
    await minifyJsonInDir(dataDir);

    // 6. Process HTML files - update asset references and minify
    console.log('Processing HTML files...');
    const htmlFiles = [
        'index.html', 
        '404.html', 
        '500.html', 
        'about.html', 
        'contact.html', 
        'privacy.html', 
        'faq.html',
        'sitemap.html'
    ];

    for (const htmlFile of htmlFiles) {
        const srcPath = path.join(srcDir, htmlFile);
        if (await fs.pathExists(srcPath)) {
            let html = await fs.readFile(srcPath, 'utf8');
            
            // Replace asset references with hashed versions
            for (const [original, hashed] of Object.entries(hashMap)) {
                html = html.replace(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), hashed);
            }
            
            // Minify HTML
            const minifiedHtml = await minify(html, {
                removeAttributeQuotes: true,
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true
            });
            
            await fs.writeFile(path.join(distDir, htmlFile), minifiedHtml);
            console.log(`  Processed ${htmlFile}`);
        }
    }

    // 7. Write hash manifest for debugging/deployment
    console.log('Writing asset manifest...');
    await fs.writeFile(
        path.join(distDir, 'asset-manifest.json'),
        JSON.stringify(hashMap, null, 2)
    );

    console.log('\nBuild complete! Output in ./dist');
    console.log(`\nAsset hashes generated:`);
    Object.entries(hashMap).forEach(([orig, hashed]) => {
        console.log(`  ${orig} -> ${hashed}`);
    });
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
