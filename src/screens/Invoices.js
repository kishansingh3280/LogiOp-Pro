// src/screens/Invoices.js — LIVE invoices: list + naya invoice (backend POST)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Lbl } from '../components/UI';
import { C } from '../theme';
import { api } from '../api';

const fI = (n) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const inp = {
  backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.line,
  borderRadius: 10, color: C.tx, fontSize: 13, paddingHorizontal: 12,
  paddingVertical: 9, marginBottom: 8,
};

export default function Invoices() {
  const [list, setList] = useState(null);
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState(false);
  // form state
  const [book, setBook] = useState('k');
  const [co, setCo] = useState('SE');
  const [pid, setPid] = useState('');
  const [lines, setLines] = useState([{ name: '', qty: '', rate: '' }]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [invs, ps] = await Promise.all([
        api('/api/invoices').catch(() => []),
        api('/api/parties').catch(() => []),
      ]);
      setList(invs || []); setParties(ps || []);
    } catch (e) { setList([]); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setMsg('');
    const good = lines.filter((l) => l.name && +l.qty > 0 && +l.rate > 0);
    if (!pid) { setMsg('Party chuniye'); return; }
    if (!good.length) { setMsg('Kam se kam ek item (naam/qty/rate)'); return; }
    try {
      const d = await api('/api/invoices', { method: 'POST', body: {
        book: book === 'p' ? 'pakka' : 'kachcha',
        company: book === 'p' ? (co === 'AW' ? 'Awadh Enterprise' : 'Singh Exports') : null,
        party_id: pid,
        date: new Date().toISOString().slice(0, 10),
        lines: good.map((l) => ({
          item_name: l.name, quantity: +l.qty, unit: 'pcs', rate: +l.rate,
          gst_percent: book === 'p' ? 5 : 0 })),
      }});
      setMsg('✓ Ban gaya: ' + ((d && (d.number || d.no)) || ''));
      setForm(false); setLines([{ name: '', qty: '', rate: '' }]); setPid('');
      load();
    } catch (e) { setMsg('✗ ' + String(e.message || e)); }
  };

  const Tog = ({ on, label, press }) => (
    <Pressable onPress={press} style={{
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8,
      borderWidth: 1, borderColor: on ? C.cyan : C.line,
      backgroundColor: on ? 'rgba(53,216,242,0.15)' : 'rgba(255,255,255,0.04)' }}>
      <Text style={{ color: on ? C.tx : C.tx3, fontWeight: '800', fontSize: 11 }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.cyan} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: C.tx, fontSize: 22, fontWeight: '800', flex: 1 }}>Invoices</Text>
        <Pressable onPress={() => setForm(!form)} style={{ borderRadius: 999, overflow: 'hidden' }}>
          <LinearGradient colors={['#35D8F2', '#B9F24C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: 16, paddingVertical: 9 }}>
            <Text style={{ color: '#06070C', fontWeight: '900', fontSize: 12 }}>
              {form ? '✕ Band' : '+ Naya invoice'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {form && (
        <Card style={{ padding: 14 }} glow={C.cyan}>
          <Lbl>NAYA INVOICE</Lbl>
          <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 6 }}>
            <Tog on={book === 'k'} label="KACHCHA · cash" press={() => setBook('k')} />
            <Tog on={book === 'p'} label="PAKKA · GST" press={() => setBook('p')} />
          </View>
          {book === 'p' && (
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Tog on={co === 'SE'} label="Singh Exports" press={() => setCo('SE')} />
              <Tog on={co === 'AW'} label="Awadh Enterprise" press={() => setCo('AW')} />
            </View>
          )}
          <Text style={{ color: C.tx3, fontSize: 10, letterSpacing: 1, marginTop: 6, marginBottom: 6 }}>PARTY</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {parties.map((p) => (
              <Tog key={p._id || p.id} on={pid === (p._id || p.id)} label={p.name}
                press={() => setPid(p._id || p.id)} />
            ))}
            {!parties.length &&
              <Text style={{ color: C.tx3, fontSize: 11 }}>Pehle Parties me party banaiye</Text>}
          </View>
          <Text style={{ color: C.tx3, fontSize: 10, letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>ITEMS</Text>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput style={[inp, { flex: 2 }]} placeholder="item" placeholderTextColor={C.tx3}
                value={l.name} onChangeText={(v) => { const n = [...lines]; n[i] = { ...l, name: v }; setLines(n); }} />
              <TextInput style={[inp, { flex: 1 }]} placeholder="qty" placeholderTextColor={C.tx3}
                keyboardType="numeric" value={l.qty}
                onChangeText={(v) => { const n = [...lines]; n[i] = { ...l, qty: v }; setLines(n); }} />
              <TextInput style={[inp, { flex: 1 }]} placeholder="rate ₹" placeholderTextColor={C.tx3}
                keyboardType="numeric" value={l.rate}
                onChangeText={(v) => { const n = [...lines]; n[i] = { ...l, rate: v }; setLines(n); }} />
            </View>
          ))}
          <Pressable onPress={() => setLines([...lines, { name: '', qty: '', rate: '' }])}>
            <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 12, marginBottom: 10 }}>+ item jodo</Text>
          </Pressable>
          <Pressable onPress={save} style={{ borderRadius: 12, overflow: 'hidden' }}>
            <LinearGradient colors={['#35D8F2', '#8B7CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#06070C', fontWeight: '900', fontSize: 13 }}>Invoice banao · backend</Text>
            </LinearGradient>
          </Pressable>
        </Card>
      )}
      {msg ? <Text style={{ color: msg[0] === '✓' ? C.lime : C.rose, fontSize: 12 }}>{msg}</Text> : null}

      {list === null ? null : list.length === 0 ? (
        <Card style={{ padding: 26, alignItems: 'center' }} glow={C.gold}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>🧾</Text>
          <Text style={{ color: C.tx2, fontSize: 13 }}>Abhi koi invoice nahi — pehla banaiye.</Text>
        </Card>
      ) : list.map((v) => {
        const p = parties.find((x) => (x._id || x.id) === v.party_id);
        return (
          <Card key={v._id || v.id} style={{ padding: 13, flexDirection: 'row', alignItems: 'center' }}
            glow={v.book === 'pakka' ? C.violet : C.gold}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.tx, fontWeight: '800', fontSize: 13.5 }}>
                {v.number || 'INV'} · {(p && p.name) || ''}
              </Text>
              <Text style={{ color: C.tx3, fontSize: 10.5 }}>
                {String(v.date || '').slice(0, 10)} · {v.book}{v.company ? ' · ' + v.company : ''}
              </Text>
            </View>
            <Text style={{ color: C.tx, fontWeight: '800', fontSize: 14 }}>{fI(v.grand_total)}</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}
