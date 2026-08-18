// src/components/Aurora.js — north-pole sky, 60fps native driver par
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

function Blob({ colors, size, start, drift, dur }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, drift[0]] });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, drift[1]] });
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return (
    <Animated.View
      style={{
        position: 'absolute', left: start[0], top: start[1],
        width: size, height: size, borderRadius: size / 2,
        opacity: 0.32, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}>
      <LinearGradient colors={colors} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2 }} />
    </Animated.View>
  );
}

function Stars() {
  // halke twinkling stars — 24 dots, opacity loops
  const stars = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H * 0.7,
      s: Math.random() < 0.85 ? 1.6 : 2.4, d: 1400 + Math.random() * 2600,
      key: 'st' + i,
    })), []);
  return stars.map((s) => <Twinkle key={s.key} {...s} />);
}
function Twinkle({ x, y, s, d }) {
  const v = useRef(new Animated.Value(Math.random())).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: d, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.15, duration: d, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y, width: s, height: s,
      borderRadius: s, backgroundColor: '#D6E4FF', opacity: v,
    }} />
  );
}

export default function Aurora() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />
      <Stars />
      <Blob colors={['#0EA5E9', 'transparent']} size={W * 0.9} start={[-W * 0.25, -H * 0.12]} drift={[60, 40]} dur={9000} />
      <Blob colors={['#8B5CF6', 'transparent']} size={W * 0.8} start={[W * 0.45, H * 0.18]} drift={[-70, 30]} dur={11000} />
      <Blob colors={['#10B981', 'transparent']} size={W * 0.7} start={[W * 0.1, H * 0.55]} drift={[50, -45]} dur={13000} />
      <Blob colors={['#FF4A6E', 'transparent']} size={W * 0.45} start={[W * 0.65, -H * 0.05]} drift={[-40, 35]} dur={10000} />
      {/* ice pane — glass feel bina blur ke (native perf) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,14,0.62)' }]} />
    </View>
  );
}
