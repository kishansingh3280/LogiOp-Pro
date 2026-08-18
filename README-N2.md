LogiOp NATIVE — N2 setup (LIVE backend ke saath)

1) Branch (pehle se hai to sirf checkout):
   cd ~/logiop-pro && git checkout native

2) Extract (App.js replace hoga — native branch par hi):
   tar -xzf /sdcard/Download/logiop-native-n2.tar.gz -C ~/logiop-pro

3) Deps (ek baar):
   npx expo install expo-linear-gradient react-native-svg expo-secure-store

4) Metro:
   npx expo start

5) Play Store se "Expo Go" install karo. Expo Go -> "Enter URL manually" ->
   exp://127.0.0.1:8081
   (split-screen: Termux + Expo Go — save karte hi live update)

6) App me login: kishan / logiop123 -> Parties LIVE backend se.

7) Commit:
   git add -A && git commit -m "N2: native shell + LIVE backend (login, parties, ledger)" && git push -u origin native
