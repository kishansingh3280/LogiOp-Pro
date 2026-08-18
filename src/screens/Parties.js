// src/screens/Parties.js — LIVE parties + ledger (backend se)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Lbl, Avatar } from '../components/UI';
import { C } from '../theme';
import { api } from '../api';

const FLAG = { TH: '🇹🇭', Thailand: '🇹🇭', IN: '🇮🇳', India: '🇮🇳', MY: '🇲🇾', CN: '🇨🇳' };
const fI = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const fT = (n) => '฿' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const inp = {
  backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.line,
  borderRadius: 10, color: C.tx, fontSize: 13, paddingHorizontal: 12,
  paddingVertical: 9, marginBottom: 8,
};
function GBtn({ label, press }) {
  return (
    <Pressable onPress={press} style={{ borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
      <LinearGradient colors={['#35D8F2', '#8B7CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: '#06070C', fontWeight: '900', fontSize: 13 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function Parties() {
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);      // chuni hui party
  const [led, setLed] = useState(null);      // uski ledger entries
  const [busy, setBusy] = useState(false);
  const [pForm, setPForm] = useState(false);
  const [pName, setPName] = useState(''); const [pCity, setPCity] = useState('');
  const [pCountry, setPCountry] = useState('Thailand'); const [pRole, setPRole] = useState('customer');
  const [eForm, setEForm] = useState(false);
  const [eLabel, setELabel] = useState(''); const [eAmt, setEAmt] = useState('');
  const [eCur, setECur] = useState('THB'); const [eSide, setESide] = useState('debit');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try { setList(await api('/api/parties') || []); }
    catch (e) { setList([]); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveParty = async () => {
    setMsg('');
    if (!pName.trim()) { setMsg('Naam chahiye'); return; }
    try {
      await api('/api/parties', { method: 'POST', body: {
        name: pName.trim(), roles: [pRole],
        address: { city: pCity.trim(), country: pCountry } } });
      setMsg('✓ Party ban gayi'); setPForm(false); setPName(''); setPCity('');
      load();
    } catch (e) { setMsg('✗ ' + String(e.message || e)); }
  };

  const saveEntry = async () => {
    setMsg('');
    if (!(+eAmt > 0)) { setMsg('Amount chahiye'); return; }
    try {
      await api('/api/ledger', { method: 'POST', body: {
        book: 'kachcha', party_id: sel._id || sel.id,
        date: new Date().toISOString().slice(0, 10),
        side: eSide, currency: eCur, amount: +eAmt,
        narration: eLabel.trim() || 'entry' } });
      setMsg('✓ Entry save'); setEForm(false); setELabel(''); setEAmt('');
      open(sel);
    } catch (e) { setMsg('✗ ' + String(e.message || e)); }
  };

  const open = async (p) => {
    setSel(p); setLed(null);
    try {
      const rows = await api('/api/ledger?party_id=' + (p._id || p.id) + '&limit=200');
      setLed(rows || []);
    } catch (e) { setLed([]); }
  };

  // ---------- party detail + ledger ----------
  if (sel) {
    let inr = 0, thb = 0;
    (led || []).forEach((e) => {
      const s = e.side === 'credit' ? -1 : 1;             // debit = lena = +
      if (e.currency === 'INR') inr += s * (+e.amount || 0);
      if (e.currency === 'THB') thb += s * (+e.amount || 0);
    });
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Pressable onPress={() => setSel(null)}>
          <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 13 }}>‹ Parties</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={sel.name || '?'} size={44} />
          <View>
            <Text style={{ color: C.tx, fontSize: 20, fontWeight: '800' }}>
              {sel.name} {FLAG[(sel.country || (sel.address && sel.address.country)) || ''] || ''}
            </Text>
            <Text style={{ color: C.tx3, fontSize: 11 }}>
              {(sel.roles || []).join(' · ') || 'party'} · {(sel.address && sel.address.city) || ''}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card glow={inr >= 0 ? C.rose : C.lime} style={{ flex: 1, padding: 14 }}>
            <Lbl>INR</Lbl>
            <Text style={{ color: inr >= 0 ? C.rose : C.lime, fontSize: 19, fontWeight: '800', marginTop: 4 }}>
              {fI(inr)} {inr >= 0 ? 'lena' : 'dena'}
            </Text>
          </Card>
          <Card glow={thb >= 0 ? C.rose : C.lime} style={{ flex: 1, padding: 14 }}>
            <Lbl>THB</Lbl>
            <Text style={{ color: thb >= 0 ? C.rose : C.lime, fontSize: 19, fontWeight: '800', marginTop: 4 }}>
              {fT(thb)} {thb >= 0 ? 'lena' : 'dena'}
            </Text>
          </Card>
        </View>
        <Pressable onPress={() => setEForm(!eForm)}>
          <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 13 }}>
            {eForm ? '✕ Band' : '+ Entry likho'}
          </Text>
        </Pressable>
        {eForm && (
          <Card style={{ padding: 14 }} glow={C.cyan}>
            <TextInput style={inp} placeholder="kya hua (jaise: ฿ aaya Kasikorn)"
              placeholderTextColor={C.tx3} value={eLabel} onChangeText={setELabel} />
            <TextInput style={inp} placeholder="amount" placeholderTextColor={C.tx3}
              keyboardType="numeric" value={eAmt} onChangeText={setEAmt} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['THB', 'INR'].map((c) => (
                <Pressable key={c} onPress={() => setECur(c)} style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  borderWidth: 1, borderColor: eCur === c ? C.cyan : C.line }}>
                  <Text style={{ color: eCur === c ? C.tx : C.tx3, fontWeight: '800', fontSize: 11 }}>{c}</Text>
                </Pressable>
              ))}
              {[['debit', 'LENA bana (+)'], ['credit', 'DIYA / mila (−)']].map(([s, l]) => (
                <Pressable key={s} onPress={() => setESide(s)} style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  borderWidth: 1, borderColor: eSide === s ? C.lime : C.line }}>
                  <Text style={{ color: eSide === s ? C.tx : C.tx3, fontWeight: '800', fontSize: 11 }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <GBtn label="Entry save · backend" press={saveEntry} />
          </Card>
        )}
        {msg ? <Text style={{ color: msg[0] === '✓' ? C.lime : C.rose, fontSize: 12 }}>{msg}</Text> : null}
        <Card style={{ padding: 14 }} glow={C.violet}>
          <Lbl>LEDGER</Lbl>
          {led === null ? <ActivityIndicator color={C.cyan} style={{ marginTop: 14 }} /> :
            led.length === 0 ?
              <Text style={{ color: C.tx3, fontSize: 12, marginTop: 10 }}>Abhi koi entry nahi — fresh khata.</Text> :
              led.map((e, i) => {
                const s = e.side === 'credit' ? -1 : 1;
                const amt = s * (+e.amount || 0);
                return (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 9,
                    borderBottomWidth: i < led.length - 1 ? 1 : 0, borderBottomColor: C.line,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.tx, fontSize: 12.5, fontWeight: '600' }}>
                        {e.narration || e.ref_type || 'entry'}
                      </Text>
                      <Text style={{ color: C.tx3, fontSize: 10.5 }}>
                        {String(e.date || '').slice(0, 10)}{e.bank ? ' · ' + e.bank : ''}
                        {e.transfer_rate ? ' · rate ' + e.transfer_rate : ''}
                      </Text>
                    </View>
                    <Text style={{ color: amt >= 0 ? C.rose : C.lime, fontWeight: '800', fontSize: 13 }}>
                      {e.currency === 'THB' ? fT(amt) : fI(amt)}
                    </Text>
                  </View>
                );
              })}
        </Card>
      </ScrollView>
    );
  }

  // ---------- parties list ----------
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.cyan} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: C.tx, fontSize: 22, fontWeight: '800', flex: 1 }}>Parties</Text>
        <Pressable onPress={() => setPForm(!pForm)}>
          <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 13 }}>
            {pForm ? '✕ Band' : '+ Nayi party'}
          </Text>
        </Pressable>
      </View>
      {pForm && (
        <Card style={{ padding: 14 }} glow={C.cyan}>
          <TextInput style={inp} placeholder="party ka naam" placeholderTextColor={C.tx3}
            value={pName} onChangeText={setPName} />
          <TextInput style={inp} placeholder="city" placeholderTextColor={C.tx3}
            value={pCity} onChangeText={setPCity} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {['Thailand', 'India', 'Malaysia', 'China'].map((c) => (
              <Pressable key={c} onPress={() => setPCountry(c)} style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                borderWidth: 1, borderColor: pCountry === c ? C.cyan : C.line }}>
                <Text style={{ color: pCountry === c ? C.tx : C.tx3, fontWeight: '700', fontSize: 11 }}>{c}</Text>
              </Pressable>
            ))}
            {['customer', 'carrier', 'supplier'].map((r) => (
              <Pressable key={r} onPress={() => setPRole(r)} style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                borderWidth: 1, borderColor: pRole === r ? C.lime : C.line }}>
                <Text style={{ color: pRole === r ? C.tx : C.tx3, fontWeight: '700', fontSize: 11 }}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <GBtn label="Party banao · backend" press={saveParty} />
        </Card>
      )}
      {!sel && msg ? <Text style={{ color: msg[0] === '✓' ? C.lime : C.rose, fontSize: 12 }}>{msg}</Text> : null}
      {list === null ? <ActivityIndicator color={C.cyan} style={{ marginTop: 30 }} /> :
        list.length === 0 ?
          <Card style={{ padding: 26, alignItems: 'center' }} glow={C.cyan}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📒</Text>
            <Text style={{ color: C.tx2, fontSize: 13, textAlign: 'center' }}>
              Abhi koi party nahi — fresh start.{'\n'}OPSI se ya app se pehli party banaiye.
            </Text>
          </Card> :
          list.map((p) => (
            <Pressable key={p._id || p.id} onPress={() => open(p)}>
              <Card style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={p.name || '?'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.tx, fontSize: 14.5, fontWeight: '700' }}>
                    {p.name} {FLAG[(p.country || (p.address && p.address.country)) || ''] || ''}
                  </Text>
                  <Text style={{ color: C.tx3, fontSize: 11 }}>
                    {(p.roles || []).join(' · ') || 'party'}{(p.address && p.address.city) ? ' · ' + p.address.city : ''}
                  </Text>
                </View>
                <Text style={{ color: C.tx3, fontSize: 16 }}>›</Text>
              </Card>
            </Pressable>
          ))}
    </ScrollView>
  );
}
