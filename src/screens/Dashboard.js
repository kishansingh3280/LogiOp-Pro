// src/screens/Dashboard.js — LIVE Mission Control (backend se)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card, KPI, Lbl } from '../components/UI';
import { C } from '../theme';
import { api } from '../api';

const fI = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const fT = (n) => '฿' + Math.round(Math.abs(n)).toLocaleString('en-IN');

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [parties, led, invs, ships] = await Promise.all([
        api('/api/parties').catch(() => []),
        api('/api/ledger?limit=500').catch(() => []),
        api('/api/invoices').catch(() => []),
        api('/api/shipments').catch(() => []),
      ]);
      let inr = 0, thb = 0;
      (led || []).forEach((e) => {
        const s = e.side === 'credit' ? -1 : 1;
        if (e.currency === 'INR') inr += s * (+e.amount || 0);
        if (e.currency === 'THB') thb += s * (+e.amount || 0);
      });
      setD({
        parties: (parties || []).length,
        entries: (led || []).length,
        invoices: (invs || []).length,
        shipments: (ships || []).length,
        inr, thb,
      });
    } catch (e) { setD(null); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.cyan} />}>
      <View style={{ paddingVertical: 6 }}>
        <Text style={{ color: C.tx, fontSize: 24, fontWeight: '800' }}>
          Namaste, Kishan ji 🫡
        </Text>
        <Text style={{ color: C.tx2, fontSize: 12.5, marginTop: 4 }}>
          Native app · LIVE backend · asli hisaab.
        </Text>
        <Text style={{ color: C.tx3, fontSize: 11, marginTop: 8 }}>{dateStr}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <KPI label="PARTIES" value={d ? d.parties : 0} color={C.cyan} sub="backend mein" />
        <KPI label="LEDGER ENTRIES" value={d ? d.entries : 0} color={C.violet} sub="asli khata" />
        <KPI label="INVOICES" value={d ? d.invoices : 0} color={C.gold} sub="kachcha + pakka" />
        <KPI label="SHIPMENTS" value={d ? d.shipments : 0} color={C.lime} sub="packing lists" />
      </View>

      <Card style={{ padding: 15 }} glow={C.gold}>
        <Lbl>NET POSITION (poora ledger)</Lbl>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
          <View>
            <Text style={{ color: C.tx3, fontSize: 10, letterSpacing: 1 }}>INR</Text>
            <Text style={{ color: (d && d.inr >= 0) ? C.rose : C.lime, fontSize: 22, fontWeight: '800' }}>
              {d ? fI(d.inr) : '₹0'} {d && d.inr < 0 ? 'dena' : 'lena'}
            </Text>
          </View>
          <View>
            <Text style={{ color: C.tx3, fontSize: 10, letterSpacing: 1 }}>THB</Text>
            <Text style={{ color: (d && d.thb >= 0) ? C.rose : C.lime, fontSize: 22, fontWeight: '800' }}>
              {d ? fT(d.thb) : '฿0'} {d && d.thb < 0 ? 'dena' : 'lena'}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ padding: 15 }} glow={C.cyan}>
        <Lbl>AAJ SE SHURU</Lbl>
        <Text style={{ color: C.tx2, fontSize: 12.5, lineHeight: 20, marginTop: 8 }}>
          Parties → + Nayi party banaiye{'\n'}
          Party kholiye → + Entry se hisaab likhiye{'\n'}
          Invoices → + Naya invoice{'\n'}
          Neeche kheenchne par sab refresh hota hai.
        </Text>
      </Card>

      <Text style={{ color: C.tx3, fontSize: 10, textAlign: 'center', letterSpacing: 1, marginTop: 4 }}>
        LOGIOP NATIVE · N3 · LIVE
      </Text>
    </ScrollView>
  );
}
