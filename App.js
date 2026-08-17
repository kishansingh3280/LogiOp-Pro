import React, { useRef, useEffect } from 'react';
import { View, StatusBar, BackHandler, Vibration, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import html from './html.js';

// expo-navigation-bar optional — na ho to bhi app chale
let NavigationBar = null;
try { NavigationBar = require('expo-navigation-bar'); } catch (e) {}

export default function App() {
  const webRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'android' && NavigationBar) {
      try {
        NavigationBar.setVisibilityAsync('hidden');
        NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (e) {}
    }
  }, []);

  // Hardware back / back-gesture → pehle app ke andar band karo, exit sirf dashboard se
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webRef.current) {
        webRef.current.injectJavaScript('window.__appBack && window.__appBack(); true;');
        return true; // hum sambhalenge — HTML bolega kab exit karna hai
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const onMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.t === 'hap' && Array.isArray(msg.p)) {
        Vibration.vibrate(msg.p);
      } else if (msg.t === 'exit') {
        BackHandler.exitApp();
      }
    } catch (err) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#05060d' }}>
      <StatusBar hidden />
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
        scalesPageToFit={false}
        textZoom={100}
        allowFileAccess
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onPermissionRequest={(e)=>{try{e.nativeEvent&&e.grant&&e.grant()}catch(err){}}}
        allowUniversalAccessFromFileURLs
        injectedJavaScriptBeforeContentLoaded={'window.__NATIVE=true; true;'}
        style={{ flex: 1, backgroundColor: '#05060d' }}
      />
    </View>
  );
}
