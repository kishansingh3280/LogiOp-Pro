// src/screens/Login.js — pehli baar backend login (JWT SecureStore mein)
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';
import { login } from '../api';

export default function Login({ onDone }) {
  const [u, setU] = useState('kishan');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr(''); setBusy(true);
    try { await login(u.trim(), p); onDone(); }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };

  const input = {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.line,
    borderRadius: 12, color: C.tx, fontSize: 14, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 10,
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{
        width: '100%', maxWidth: 380, borderRadius: 22, padding: 2, overflow: 'hidden',
      }}>
        <LinearGradient colors={['#35D8F2', '#8B7CFF', '#B9F24C']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ backgroundColor: 'rgba(10,15,26,0.98)', borderRadius: 20, padding: 22 }}>
          <Text style={{ color: C.tx, fontSize: 20, fontWeight: '800' }}>LogiOp login</Text>
          <Text style={{ color: C.tx3, fontSize: 12, marginTop: 4, marginBottom: 16 }}>
            Backend se LIVE judne ke liye
          </Text>
          <TextInput style={input} value={u} onChangeText={setU}
            placeholder="username" placeholderTextColor={C.tx3} autoCapitalize="none" />
          <TextInput style={input} value={p} onChangeText={setP}
            placeholder="password" placeholderTextColor={C.tx3} secureTextEntry />
          <Pressable onPress={go} disabled={busy} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
            <LinearGradient colors={['#35D8F2', '#B9F24C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 13, alignItems: 'center' }}>
              {busy ? <ActivityIndicator color="#06070C" /> :
                <Text style={{ color: '#06070C', fontWeight: '900', fontSize: 14 }}>Login · LIVE</Text>}
            </LinearGradient>
          </Pressable>
          <Text style={{ color: C.rose, fontSize: 11, marginTop: 10, minHeight: 14 }}>{err}</Text>
        </View>
      </View>
    </View>
  );
}
