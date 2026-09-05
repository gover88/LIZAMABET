'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { hasSupabase, supabase } from './lib/supabase';

const sportMap = {
  football: { label: 'Fútbol', icon: '⚽' },
  tennis: { label: 'Tenis', icon: '🎾' },
  basketball: { label: 'Baloncesto', icon: '🏀' },
};

const defaultSettings = {
  hero_title: 'Pronósticos analizados con estadísticas que importan',
  hero_subtitle: 'Datos, valor esperado y seguimiento en vivo para tomar decisiones mejor informadas.',
  primary_color: '#83ff35',
  accent_color: '#c9ff52',
  donation_text: 'LizamaBet es gratuito. Si deseas apoyar su mantenimiento y nuevas funciones, puedes realizar una donación voluntaria.',
};

const fallbackLeagues = {
  football: ['Primera División Chile', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Champions League', 'Copa Libertadores', 'Copa Sudamericana'],
  tennis: ['ATP', 'WTA', 'Grand Slams', 'ATP Masters 1000', 'ATP 500', 'WTA 1000'],
  basketball: ['NBA', 'EuroLeague', 'ACB', 'Basketball Champions League'],
};

function groupByLeague(matches) {
  const map = new Map();
  for (const m of matches) {
    const key = m.league || 'Otras competiciones';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return map;
}

export default function Home() {
  const [sport, setSport] = useState('football');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceOk, setSourceOk] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState('Todas');
  const [filter, setFilter] = useState('Hoy');
  const [settings, setSettings] = useState(defaultSettings);
  const [customLeagues, setCustomLeagues] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.primary_color);
    document.documentElement.style.setProperty('--accent', settings.accent_color);
  }, [settings]);

  useEffect(() => {
    if (!hasSupabase) return;
    (async () => {
      const { data } = await supabase.from('site_settings').select('key,value');
      if (data?.length) {
        const incoming = Object.fromEntries(data.map(x => [x.key, x.value]));
        setSettings(s => ({ ...s, ...incoming }));
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasSupabase) {
      setCustomLeagues([]);
      return;
    }
    (async () => {
      const { data } = await supabase.from('leagues')
        .select('name,sport,active,featured')
        .eq('sport', sport)
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('name');
      setCustomLeagues(data || []);
    })();
  }, [sport]);

  async function loadMatches() {
    setLoading(true);
    try {
      const r = await fetch(`/api/sportscore?sport=${sport}`, { cache: 'no-store' });
      const d = await r.json();
      setMatches(d.matches || []);
      setSourceOk(Boolean(d.ok));
    } catch {
      setMatches([]);
      setSourceOk(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedLeague('Todas');
    loadMatches();
    const id = setInterval(loadMatches, 60000);
    return () => clearInterval(id);
  }, [sport]);

  const leagueNames = useMemo(() => {
    const live = [...new Set(matches.map(m => m.league).filter(Boolean))];
    const configured = customLeagues.map(x => x.name);
    const merged = [...new Set([...configured, ...live, ...fallbackLeagues[sport]])];
    return merged.filter(x => x.toLowerCase().includes(search.toLowerCase()));
  }, [matches, customLeagues, sport, search]);

  const grouped = useMemo(() => groupByLeague(
    selectedLeague === 'Todas' ? matches : matches.filter(m => m.league === selectedLeague)
  ), [matches, selectedLeague]);

  return (
    <main>
      <header className="topbar">
        <div className="brandWrap">
          <img src="/logo.png" className="brandLogo" alt="LizamaBet" />
        </div>
        <nav className="topActions">
          <a href="#deportes">Deportes</a>
          <a href="#combos">Combos</a>
          <Link href="/admin" className="adminLink">🔐 Admin</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">LIZAMABET · DATOS DEPORTIVOS</span>
          <h1>{settings.hero_title}</h1>
          <p>{settings.hero_subtitle}</p>
          <div className="heroBadges">
            <span>📡 SportScore</span><span>📊 Probabilidad</span><span>💎 Valor esperado</span>
          </div>
        </div>
        <div className="heroCard">
          <div className="pulse"></div>
          <strong>Análisis responsable</strong>
          <p>Las probabilidades son estimaciones y no garantizan resultados.</p>
        </div>
      </section>

      <section id="deportes" className="section">
        <div className="sectionHead">
          <div>
            <span className="eyebrow">EXPLORAR</span>
            <h2>Deportes y ligas</h2>
          </div>
          <div className={`source ${sourceOk ? 'ok' : 'bad'}`}>
            {sourceOk ? '● SportScore conectado' : '● SportScore sin conexión'}
          </div>
        </div>

        <div className="sportTabs">
          {Object.entries(sportMap).map(([key, item]) => (
            <button key={key} className={sport === key ? 'active' : ''} onClick={() => setSport(key)}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="leagueLayout">
          <aside className="leaguePanel">
            <div className="leagueTitle">Ligas / Torneos</div>
            <input className="searchInput" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar liga..." />
            <button className={selectedLeague === 'Todas' ? 'league activeLeague' : 'league'} onClick={() => setSelectedLeague('Todas')}>
              ⭐ Todas
            </button>
            {leagueNames.map(name => (
              <button key={name} className={selectedLeague === name ? 'league activeLeague' : 'league'} onClick={() => setSelectedLeague(name)}>
                {name}
              </button>
            ))}
          </aside>

          <div className="matchesArea">
            <div className="filters">
              {['En vivo', 'Hoy', 'Próximos'].map(x => (
                <button key={x} className={filter === x ? 'filter activeFilter' : 'filter'} onClick={() => setFilter(x)}>{x}</button>
              ))}
              <button className="refresh" onClick={loadMatches}>↻ Actualizar</button>
            </div>

            {loading ? <div className="empty">Cargando partidos…</div> :
              matches.length === 0 ? <div className="empty">
                No hay partidos disponibles desde SportScore para este deporte en este momento.
                <small>LizamaBet no inventará partidos ni resultados cuando la fuente no responda.</small>
              </div> :
              [...grouped.entries()].map(([league, games]) => (
                <div key={league} className="leagueBlock">
                  <div className="leagueHeader">{league}<span>{games.length} partido(s)</span></div>
                  {games.map(game => (
                    <article className="matchCard" key={game.id}>
                      <div>
                        <span className="status">{game.status || 'Programado'} {game.minute ? `· ${game.minute}'` : ''}</span>
                        <h3>{game.home} <b>{game.homeScore ?? '-'}</b></h3>
                        <h3>{game.away} <b>{game.awayScore ?? '-'}</b></h3>
                      </div>
                      <div className="analysis">
                        <span>Mercados y modelo</span>
                        <strong>Próximamente</strong>
                        <small>Se habilitarán al conectar probabilidades y cuotas reales.</small>
                      </div>
                    </article>
                  ))}
                </div>
              ))
            }
          </div>
        </div>
      </section>

      <section id="combos" className="section">
        <span className="eyebrow">COMBINADAS</span>
        <h2>Combos LizamaBet</h2>
        <div className="comboGrid">
          <div className="combo"><span>🛡️</span><h3>Conservadora</h3><strong>Objetivo 2.00+</strong><p>Selecciones de mayor confianza.</p></div>
          <div className="combo"><span>💣</span><h3>Bomba del Día</h3><strong>Objetivo 3.00+</strong><p>Valor con riesgo intermedio.</p></div>
          <div className="combo"><span>🚀</span><h3>Arriesgada</h3><strong>Objetivo 5.00+</strong><p>Mayor cuota y mayor incertidumbre.</p></div>
        </div>
      </section>

      <section className="donation">
        <div><span className="eyebrow">COMUNIDAD</span><h2>Apoya LizamaBet</h2><p>{settings.donation_text}</p></div>
        <a className="donateBtn" href={process.env.NEXT_PUBLIC_MERCADOPAGO_URL || 'https://mpago.la/1dqB5EM'} target="_blank" rel="noreferrer">💚 Donar con Mercado Pago</a>
      </section>

      <footer>
        <div>LizamaBet · 18+ · Juega con responsabilidad</div>
        <a href="https://sportscore.com/" target="_blank" rel="noreferrer">Powered by SportScore</a>
      </footer>
    </main>
  );
}
