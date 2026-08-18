LogiOp NATIVE — N1 setup (tablet/Termux)

1) Branch banao (purani hybrid app master par surakshit):
   cd ~/logiop-pro && git checkout -b native

2) Ye files copy karo (tar extract):
   tar -xzf /sdcard/Download/logiop-native-n1.tar.gz -C ~/logiop-pro
   (App.js replace hoga — native branch par hi)

3) Deps:
   npx expo install expo-linear-gradient react-native-svg

4) Metro chalao:
   npx expo start
   (QR mat scan karo — same tablet hai)

5) Play Store se "Expo Go" install karo. Expo Go kholo ->
   "Enter URL manually" -> exp://127.0.0.1:8081
   Split-screen: ek taraf Termux, ek taraf Expo Go — save karte hi live update.

6) Commit:
   git add -A && git commit -m "N1: native shell (aurora, rail, dashboard)" && git push -u origin native
