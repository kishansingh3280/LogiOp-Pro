// src/screens/Soon.js — placeholder (agle N-phases mein bharenge)
import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../components/UI';
import { C } from '../theme';

export default function Soon({ name }) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: C.tx, fontSize: 22, fontWeight: '800', marginBottom: 14 }}>{name}</Text>
      <Card style={{ padding: 34, alignItems: 'center' }} glow={C.cyan}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>🚧</Text>
        <Text style={{ color: C.tx2, fontSize: 13 }}>Ye section native migration ke agle phase mein aayega.</Text>
      </Card>
    </View>
  );
}
