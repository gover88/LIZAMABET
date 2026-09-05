'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasSupabase, supabase } from '../lib/supabase';

const editable = [
  ['hero_title', 'Título principal'],
  ['hero_subtitle', 'Subtítulo principal'],
  ['primary_color', 'Color principal'],
  ['accent_color', 'Color secundario'],
  ['donation_text', 'Texto de donaciones'],
];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState({});
  const [leagues, setLeagues] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!hasSupabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !hasSupabase) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
      setIsAdmin(Boolean(admin));
      if (admin) {
        const { data: s } = await supabase.from('site_settings').select('key,value');
        setSettings(Object.fromEntries((s || []).map(x => [x.key, x.value])));
        const { data: l } = await supabase.from('leagues').select('*').order('sport').order('name');
        setLeagues(l || []);
      }
    })();
  }, [session]);

  async function login(e) {
    e.preventDefault();
    setMessage('');
    if (!hasSupabase) return setMessage('Primero configura Supabase en .env.local / Vercel.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  async function saveSettings() {
    const rows = editable.map(([key]) => ({ key, value: settings[key] || '' }));
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    setMessage(error ? error.message : 'Configuración guardada correctamente.');
  }

  async function toggleLeague(id, value) {
    const { error } = await supabase.from('leagues').update({ active: value }).eq('id', id);
    if (!error) setLeagues(x => x.map(l => l.id === id ? { ...l, active: value } : l));
  }

  async function addLeague() {
    const name = prompt('Nombre de la liga o torneo:');
    if (!name) return;
    const sport = prompt('Deporte: football, tennis o basketball', 'football');
    if (!['football','tennis','basketball'].includes(sport)) return alert('Deporte no válido');
    const { data, error } = await supabase.from('leagues').insert({ name, sport, active: true }).select().single();
    if (error) setMessage(error.message); else setLeagues(x => [...x, data]);
  }

  if (!hasSupabase) {
    return <main className="adminPage"><div className="adminBox"><h1>🔐 Panel Admin</h1><p>El proyecto está listo, pero falta conectar Supabase.</p><p>Copia las variables de <code>.env.example</code> a Vercel o a <code>.env.local</code>.</p><Link href="/">← Volver a LizamaBet</Link></div></main>;
  }

  if (!session) {
    return <main className="adminPage"><form className="loginBox" onSubmit={login}>
      <img src="/logo.png" alt="LizamaBet" />
      <h1>Panel Administrador</h1>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo administrador" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required />
      <button type="submit">Ingresar</button>
      {message && <p className="msg">{message}</p>}
      <Link href="/">← Volver</Link>
    </form></main>;
  }

  if (!isAdmin) {
    return <main className="adminPage"><div className="adminBox"><h1>Acceso restringido</h1><p>La cuenta inició sesión, pero no está registrada como administradora.</p><button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button></div></main>;
  }

  return <main className="adminPage">
    <div className="adminTop"><div><span className="eyebrow">LIZAMABET</span><h1>Panel de Administración</h1></div><div><Link href="/">Ver web</Link><button onClick={() => supabase.auth.signOut()}>Salir</button></div></div>

    <section className="adminGrid">
      <div className="adminCard">
        <h2>🎨 Apariencia y textos</h2>
        {editable.map(([key, label]) => <label key={key}>{label}
          {key.includes('color') ? <input type="color" value={settings[key] || '#83ff35'} onChange={e => setSettings(s => ({...s, [key]: e.target.value}))} /> :
          key.includes('subtitle') || key.includes('donation') ? <textarea value={settings[key] || ''} onChange={e => setSettings(s => ({...s, [key]: e.target.value}))} /> :
          <input value={settings[key] || ''} onChange={e => setSettings(s => ({...s, [key]: e.target.value}))} />}
        </label>)}
        <button onClick={saveSettings}>Guardar cambios</button>
        {message && <p className="msg">{message}</p>}
      </div>

      <div className="adminCard">
        <div className="cardHead"><h2>🏆 Deportes y ligas</h2><button onClick={addLeague}>+ Añadir liga</button></div>
        <div className="leagueAdminList">
          {leagues.map(l => <div key={l.id}><span><b>{l.name}</b><small>{l.sport}</small></span><label className="switchLine"><input type="checkbox" checked={l.active} onChange={e => toggleLeague(l.id, e.target.checked)} /> Activa</label></div>)}
        </div>
      </div>

      <div className="adminCard">
        <h2>📌 Recomendaciones incorporadas</h2>
        <p>La base de datos ya está preparada para contenido editable, ligas, pronósticos, combos e historial administrativo.</p>
        <p>La seguridad de escritura está controlada por RLS en Supabase: los visitantes pueden leer el contenido público, pero solo usuarios incluidos en <code>admins</code> pueden modificarlo.</p>
      </div>
    </section>
  </main>;
}
