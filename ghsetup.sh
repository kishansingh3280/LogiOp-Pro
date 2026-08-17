#!/data/data/com.termux/files/usr/bin/bash
# ghsetup.sh — GitHub Actions par muft APK build ka setup
#
# Chalane ka tareeqa:
#   cd ~/logiop-pro && bash ghsetup.sh
#
# Ye teen kaam karta hai:
#   1. .gitignore banata hai (node_modules/android/ios/dist ko git se bahar
#      rakhta hai — warna repo 500 MB ka ho jaata aur push kabhi na hota)
#   2. .github/workflows/android.yml banata hai — GitHub par APK build karega
#   3. Batata hai aage kya karna hai

set -e
cd ~/logiop-pro

# ---------- 1. gitignore ----------
cat > .gitignore <<'EOF'
node_modules/
android/
ios/
dist/
.expo/
*.bak
*.bak[0-9]*
html_chk.mjs
tmp_chk.js
EOF

# node_modules waghairah pehle se git mein hain to unhe hata do
# (file disk par rahegi, sirf git tracking se niklegi)
git rm -r --cached node_modules android ios dist .expo > /dev/null 2>&1 || true

# ---------- 2. workflow ----------
mkdir -p .github/workflows
cat > .github/workflows/android.yml <<'EOF'
name: Android APK

on:
  workflow_dispatch:
  push:
    branches: [ master, main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Install deps
        run: npm install --legacy-peer-deps

      - name: Prebuild android
        run: npx expo prebuild --platform android --clean

      - name: Build APK
        run: cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: logiop-apk
          path: android/app/build/outputs/apk/release/*.apk
EOF

echo ""
echo "OK — .gitignore aur .github/workflows/android.yml ban gaye."
echo ""
echo "AB YE KARIYE:"
echo "1. github.com par ek PRIVATE repo banaiye, naam: logiop-pro"
echo "2. Settings > Developer settings > Personal access tokens se"
echo "   ek token banaiye (repo + workflow permission ke saath)"
echo "3. Phir ye chalaiye (USERNAME aur TOKEN apne daaliye):"
echo ""
echo "   cd ~/logiop-pro"
echo "   git add -A && git commit -m 'github actions setup'"
echo "   git remote add origin https://USERNAME:TOKEN@github.com/USERNAME/logiop-pro.git"
echo "   git push -u origin master"
echo ""
echo "Push hote hi GitHub khud APK banana shuru kar dega."
echo "Repo > Actions tab > build khulne par neeche 'logiop-apk' download."
