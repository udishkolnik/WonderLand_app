#!/usr/bin/env node

/**
 * Fix Favicon SSL Issues
 * Updates all HTML files to use relative paths for favicons
 */

const fs = require('fs');
const path = require('path');

function fixFaviconInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Fix absolute favicon paths
        if (content.includes('href="/favicon.svg"')) {
            content = content.replace(/href="\/favicon\.svg"/g, 'href="favicon.svg"');
            modified = true;
        }

        if (content.includes('href="/favicon.ico"')) {
            content = content.replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"');
            modified = true;
        }

        if (content.includes('href="/favicon.ico"')) {
            content = content.replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed favicon paths in: ${filePath}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

function findHtmlFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                traverse(fullPath);
            } else if (stat.isFile() && item.endsWith('.html')) {
                files.push(fullPath);
            }
        }
    }
    
    traverse(dir);
    return files;
}

function main() {
    console.log('🔧 Fixing Favicon SSL Issues');
    console.log('============================\n');

    const appDir = path.join(__dirname, 'app');
    const websiteDir = path.join(__dirname, 'website');

    let totalFixed = 0;

    // Fix app HTML files
    if (fs.existsSync(appDir)) {
        console.log('📱 Fixing app HTML files...');
        const appFiles = findHtmlFiles(appDir);
        
        for (const file of appFiles) {
            if (fixFaviconInFile(file)) {
                totalFixed++;
            }
        }
    }

    // Fix website HTML files
    if (fs.existsSync(websiteDir)) {
        console.log('🌐 Fixing website HTML files...');
        const websiteFiles = findHtmlFiles(websiteDir);
        
        for (const file of websiteFiles) {
            if (fixFaviconInFile(file)) {
                totalFixed++;
            }
        }
    }

    console.log(`\n✅ Fixed favicon paths in ${totalFixed} files`);
    console.log('🎉 All favicon SSL issues should now be resolved!');
}

if (require.main === module) {
    main();
}

module.exports = { fixFaviconInFile, findHtmlFiles };
