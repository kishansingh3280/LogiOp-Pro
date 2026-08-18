// src/components/UI.js — core primitives (ice cards, KPI, chips)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { C, R, F } from '../theme';

export function Card({ children, style, glow }) {
  return (
    <View style={[{
      backgroundColor: C.glass, borderRadius: R.card,
      borderWidth: 1, borderColor: C.line, overflow: 'hidden',
    }, style]}>
      {glow ? (
        <LinearGradient colors={[glow + '30', 'transparent']}
          start={{ x: 0.9, y: 0 }} end={{ x: 0.4, y: 0.7 }}
          style={{ position: 'absolute', right: 0, top: 0, width: 160, height: 90 }} />
      ) : null}
      {children}
    </View>
  );
}

export function Lbl({ children, style }) {
  return <Text style={[F.lbl, style]}>{children}</Text>;
}

export function SectionTitle({ children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
      <Text style={[F.lbl, { fontSize: 10.5 }]}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
    </View>
  );
}

export function Chip({ label, on, color = C.cyan, onPress }) {
  return (
    <Pressable
      onPress={() => { onPress && onPress(); Haptics.selectionAsync().catch(() => {}); }}
      style={{
        paddingHorizontal: 15, paddingVertical: 9, borderRadius: R.chip,
        borderWidth: 1, borderColor: on ? color + '90' : C.line,
        backgroundColor: on ? color + '22' : 'rgba(255,255,255,0.04)',
      }}>
      <Text style={{ color: on ? C.tx : C.tx2, fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export function CountUp({ to, pre = '', suf = '', style }) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / 1100, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [to]);
  return <Text style={style}>{pre}{val.toLocaleString('en-IN')}{suf}</Text>;
}

export function KPI({ label, value, pre, suf, sub, color }) {
  return (
    <Card glow={color} style={{ flex: 1, minWidth: 150, padding: 15 }}>
      <Lbl>{label}</Lbl>
      <CountUp to={value} pre={pre} suf={suf}
        style={{ color: C.tx, fontSize: 22, fontWeight: '800', marginTop: 6 }} />
      {sub ? <Text style={{ color: C.tx3, fontSize: 11, marginTop: 3 }}>{sub}</Text> : null}
    </Card>
  );
}

export function Avatar({ name, size = 34 }) {
  const cols = ['#EF5350', '#EC407A', '#AB47BC', '#7E57C2', '#5C6BC0', '#42A5F5', '#29B3D0',
    '#26A69A', '#66BB6A', '#9CCC65', '#FFA726', '#FF7043', '#8D6E63', '#78909C'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: cols[h % cols.length],
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.44 }}>
        {name.trim()[0].toUpperCase()}
      </Text>
    </View>
  );
}
