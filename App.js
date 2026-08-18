// App.js — LogiOp Pro NATIVE (N2: LIVE backend)
import React, { useState, useCallback, useEffect } from 'react';
import { View, useWindowDimensions, StatusBar, BackHandler, ActivityIndicator } from 'react-native';
import Aurora from './src/components/Aurora';
import Rail from './src/components/Rail';
import Dashboard from './src/screens/Dashboard';
import Parties from './src/screens/Parties';
import Invoices from './src/screens/Invoices';
import Login from './src/screens/Login';
import Soon from './src/screens/Soon';
import { loadToken } from './src/api';

const NAMES = {
  dash: 'Dashboard', parties: 'Parties', catalog: 'Catalog', invoices: 'Invoices',
  ship: 'Shipments', movement: 'Movement', ledger: 'Ledger', vault: 'Vault',
  warehouse: 'Warehouse', settings: 'Settings',
};

export default function App() {
  const [auth, setAuth] = useState(null);   // null = checking, false = login, true = in
  const [page, setPage] = useState('dash');
  const [stack, setStack] = useState(['dash']);
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  useEffect(() => { loadToken().then((t) => setAuth(!!t)); }, []);

  const go = useCallback((p) => {
    setPage(p);
    setStack((s) => (s[s.length - 1] === p ? s : [...s, p]));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      let handled = false;
      setStack((s) => {
        if (s.length > 1) {
          const ns = s.slice(0, -1);
          setPage(ns[ns.length - 1]);
          handled = true;
          return ns;
        }
        return s;
      });
      return handled;
    });
    return () => sub.remove();
  }, []);

  const body = auth === null
    ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#35D8F2" size="large" />
      </View>
    : auth === false
      ? <Login onDone={() => setAuth(true)} />
      : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Rail page={page} go={go} wide={wide} />
          <View style={{ flex: 1 }}>
            {page === 'dash' ? <Dashboard /> :
             page === 'parties' ? <Parties /> :
             page === 'invoices' ? <Invoices /> :
             <Soon name={NAMES[page] || page} />}
          </View>
        </View>
      );

  return (
    <View style={{ flex: 1, backgroundColor: '#05070D' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Aurora />
      <View style={{ flex: 1, paddingTop: StatusBar.currentHeight || 0 }}>
        {body}
      </View>
    </View>
  );
}
