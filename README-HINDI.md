# LogiOp Pro — APK banane ka aasan raasta (tablet se hi)

## Ek baar ka setup (~15 min)
1. **expo.dev** par free account banao (Google se sign-in chalega)
2. Tablet par **Termux** install karo (F-Droid se — Play wala purana hai)
3. Termux kholkar, ek-ek line:
```
pkg update -y && pkg install -y nodejs-lts git unzip
```
4. Yeh zip Termux ke ghar mein le jao aur kholo:
```
cd ~ && unzip /sdcard/Download/LogiOp-Pro-Expo.zip -d .
cd logiop-pro
npm install -g eas-cli
eas login
```
(`eas login` mein expo.dev wala email/password)

## APK banana (har baar sirf 2 line)
```
eas init --non-interactive
eas update:configure
eas build -p android --profile preview
```
- Build **Expo ke cloud par** hota hai (~10-15 min) — tablet par kuch heavy nahi chalta
- Khatam hote hi **download link** milta hai — kholo, APK install karo

## OTA update (naya APK NAHI chahiye)
UI/logic mein koi bhi change ho — main naya `html.js` de dunga, phir bas:
```
eas update --branch preview -m "naya UI"
```
App agli baar khulte hi khud update ho jayega.

## Agar build mein version error aaye
Poora error copy karke Claude ko bhej do — package.json ek minute mein theek ho jayega.
