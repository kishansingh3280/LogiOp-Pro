// src/components/Rail.js — sidebar rail (flush-left, ice slate)
import React from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C } from '../theme';

const ITEMS = [
  ['dash', '▦', 'Dashboard'],
  ['parties', '👥', 'Parties'],
  ['catalog', '🗂', 'Catalog'],
  ['invoices', '🧾', 'Invoices'],
  ['ship', '📦', 'Shipments'],
  ['movement', '✈️', 'Movement'],
  ['ledger', '📒', 'Ledger'],
  ['vault', '🪙', 'Vault'],
  ['warehouse', '🏬', 'Warehouse'],
  ['settings', '⚙️', 'Settings'],
];

export default function Rail({ page, go, wide }) {
  return (
    <View style={{
      width: wide ? 200 : 74, backgroundColor: 'rgba(10,15,26,0.94)',
      borderRightWidth: 1, borderRightColor: C.line, paddingTop: 14,
    }}>
      {/* logo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 14 }}>
        <Image source={require('../../assets/icon.png')}
          style={{ width: 40, height: 40, borderRadius: 11 }} />
        {wide ? (
          <View>
            <Text style={{ color: C.tx, fontWeight: '800', fontSize: 15 }}>LogiOp <Text style={{ color: C.cyan, fontSize: 10 }}>Pro</Text></Text>
            <Text style={{ color: C.tx3, fontSize: 8.5, letterSpacing: 1.4 }}>POWERED BY OPSI</Text>
          </View>
        ) : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {ITEMS.map(([id, ic, label]) => {
          const on = page === id;
          return (
            <Pressable key={id}
              onPress={() => { go(id); Haptics.selectionAsync().catch(() => {}); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 11,
                marginHorizontal: 10, marginVertical: 3,
                paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14,
                backgroundColor: on ? 'rgba(53,216,242,0.13)' : 'transparent',
                borderWidth: 1, borderColor: on ? 'rgba(53,216,242,0.4)' : 'transparent',
              }}>
              <Text style={{ fontSize: 16 }}>{ic}</Text>
              {wide ? (
                <Text style={{ color: on ? C.tx : C.tx2, fontWeight: on ? '800' : '600', fontSize: 13 }}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {/* OPSI perch — N6 mein asli bot yahan baithega */}
      <View style={{ alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.line }}>
        <View style={{
          width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: C.cyan + '70',
          alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(53,216,242,0.08)',
        }}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        {wide ? <Text style={{ color: C.tx3, fontSize: 9.5, marginTop: 6 }}>OPSI · N6 mein zinda</Text> : null}
      </View>
    </View>
  );
}
