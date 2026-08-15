import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as NavigationBar from 'expo-navigation-bar';
import HTML from './html';

const BRIDGE = `
window.__NATIVE = true;
navigator.vibrate = function(p){
  try{ window.ReactNativeWebView.postMessage(JSON.stringify({t:'vibe', p:p})); }catch(e){}
  return true;
};
true;`;

export default function App(){
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState('Pehchaan zaroori hai…');

  useEffect(()=>{ // Immersive: nav bar gayab, swipe par wapas
    NavigationBar.setVisibilityAsync('hidden').catch(()=>{});
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(()=>{});
  },[]);

  useEffect(()=>{ (async ()=>{
    try{
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if(has && enrolled){
        const r = await LocalAuthentication.authenticateAsync({
          promptMessage: 'LogiOp Pro — fingerprint se login',
          cancelLabel: 'Radd karein',
        });
        if(r.success){ Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setOk(true); return; }
        setMsg('Pehchaan nahi hui — app band karke dobara kholein');
      } else { setOk(true); }
    }catch(e){ setOk(true); }
  })(); },[]);

  const onMsg = (e)=>{
    try{
      const d = JSON.parse(e.nativeEvent.data);
      if(d.t==='vibe'){
        const p = d.p;
        if(Array.isArray(p)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if(p<=5) Haptics.selectionAsync();
        else if(p<=12) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }catch(err){}
  };

  if(!ok) return (
    <View style={s.gate}><Text style={s.gateTxt}>{msg}</Text></View>
  );

  return (
    <View style={{flex:1, backgroundColor:'#060812'}}>
      <StatusBar hidden />
      <WebView
        source={{ html: HTML }}
        originWhitelist={["*"]}
        injectedJavaScriptBeforeContentLoaded={BRIDGE}
        onMessage={onMsg}
        allowsFullscreenVideo
        domStorageEnabled
        javaScriptEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        style={{flex:1, backgroundColor:'#060812'}}
      />
    </View>
  );
}
const s = StyleSheet.create({
  gate:{flex:1,backgroundColor:'#060812',alignItems:'center',justifyContent:'center'},
  gateTxt:{color:'#98a0c4',fontSize:15}
});
