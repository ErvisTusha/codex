#!/bin/bash

echo "Testing Codex GUI Application..."

cd /home/runner/work/codex/codex/codex-gui

echo "1. Checking package.json structure..."
if [ -f "package.json" ]; then
    echo "✓ package.json exists"
    node -e "JSON.parse(require('fs').readFileSync('package.json')); console.log('✓ package.json is valid JSON');"
else
    echo "✗ package.json missing"
    exit 1
fi

echo ""
echo "2. Checking main application files..."
files=("main.js" "preload.js" "src/app.js" "src/index.html" "src/styles.css")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        exit 1
    fi
done

echo ""
echo "3. Checking service files..."
services=("src/services/codex-service.js" "src/services/settings-manager.js")
for service in "${services[@]}"; do
    if [ -f "$service" ]; then
        echo "✓ $service exists"
    else
        echo "✗ $service missing"
        exit 1
    fi
done

echo ""
echo "4. Checking component files..."
components=("src/components/file-explorer.js" "src/components/terminal.js")
for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo "✓ $component exists"
    else
        echo "✗ $component missing"
        exit 1
    fi
done

echo ""
echo "5. Validating Node.js syntax..."
for jsfile in main.js preload.js src/app.js src/services/*.js src/components/*.js; do
    if [ -f "$jsfile" ]; then
        node -c "$jsfile" && echo "✓ $jsfile syntax valid" || (echo "✗ $jsfile syntax error" && exit 1)
    fi
done

echo ""
echo "6. Checking dependencies..."
if [ -f "package-lock.json" ]; then
    echo "✓ Dependencies are locked with package-lock.json"
else
    echo "⚠ No package-lock.json - run npm install to generate"
fi

echo ""
echo "7. Testing Electron availability..."
if [ -f "node_modules/.bin/electron" ]; then
    echo "✓ Electron is installed"
else
    echo "⚠ Electron not found - run npm install"
fi

echo ""
echo "✅ All tests passed! Codex GUI application is properly structured."
echo ""
echo "To run the application:"
echo "  npm install  # Install dependencies (if needed)"
echo "  npm start    # Start the application"
echo ""
echo "To build for distribution:"
echo "  npm run build        # Build for current platform"
echo "  npm run build:win    # Build for Windows"
echo "  npm run build:mac    # Build for macOS"
echo "  npm run build:linux  # Build for Linux"