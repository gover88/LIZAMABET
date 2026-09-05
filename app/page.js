'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { hasSupabase, supabase } from './lib/supabase';

const sports = {
  football: { label: 'Fútbol', icon: '⚽', enabled: true },
  basketball: { label: 'Baloncesto', icon: '🏀', enabled: true },
  tennis: { label: 'Tenis', icon: '🎾', enabled: false },
};

const filters = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'upcoming', label: 'Próximos' },
];

const defaultSettings = {
  hero_title: 'Pronósticos analizados con estadísticas que importan',
  hero_subtitle:
    'Datos, probabilidades, estadísticas y valor esperado para tomar decisiones mejor informadas.',
  primary_color: '#83ff35',
  accent_color: '#c9ff52',
  donation_text:
    'LizamaBet es gratuito. Si deseas apoyar su mantenimiento y nuevas funciones, puedes realizar una donación voluntaria.',
};

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function flag(country) {
  const flags = {
    Chile: '🇨🇱',
    Argentina: '🇦🇷',
    Brazil: '🇧🇷',
    Spain: '🇪🇸',
    England: '🏴',
    Italy: '🇮🇹',
    Germany: '🇩🇪',
    France: '🇫🇷',
    Portugal: '🇵🇹',
    Netherlands: '🇳🇱',
    Uruguay: '🇺🇾',
    Colombia: '🇨🇴',
    Peru: '🇵🇪',
    Ecuador: '🇪🇨',
    Mexico: '🇲🇽',
    USA: '🇺🇸',
    'United States': '🇺🇸',
  };

  return flags[country] || '🌎';
}

function MatchCard({ match, sport }) {
  return (
    <article className="matchCard">
      <div style={styles.competition}>
        {match.flag ? (
          <img src={match.flag} alt="" style={styles.flag} />
        ) : (
          <span>{flag(match.country)}</span>
        )}

        <span>{match.country}</span>
        <span>•</span>
        <strong>{match.league}</strong>
      </div>

      <div style={styles.date}>
        🗓️ {formatDate(match.startTime)}
      </div>

      <div style={styles.teams}>
        <div style={styles.team}>
          {match.homeLogo ? (
            <img
              src={match.homeLogo}
              alt={match.home}
              style={styles.logo}
            />
          ) : (
            <span style={styles.fallback}>
              {sport === 'basketball' ? '🏀' : '⚽'}
            </span>
          )}

          <strong>{match.home}</strong>
        </div>

        <b style={styles.vs}>VS</b>

        <div style={styles.team}>
          {match.awayLogo ? (
            <img
              src={match.awayLogo}
              alt={match.away}
              style={styles.logo}
            />
          ) : (
            <span style={styles.fallback}>
              {sport === 'basketball' ? '🏀' : '⚽'}
            </span>
          )}

          <strong>{match.away}</strong>
        </div>
      </div>

      <div style={styles.analysis}>
        <small>ANÁLISIS LIZAMABET</small>
        <strong> Próximamente</strong>

        <p>
          Estadísticas, probabilidades, tendencias y cuotas
          estarán disponibles en la ficha del partido.
        </p>
      </div>
    </article>
  );
}

export default function Home() {
  const [sport, setSport] = useState('football');
  const [dateFilter, setDateFilter] = useState('today');
  const [matches, setMatches] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--primary',
      settings.primary_color
    );

    document.documentElement.style.setProperty(
      '--accent',
      settings.accent_color
    );
  }, [settings]);

  useEffect(() => {
    if (!hasSupabase) return;

    async function loadSettings() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('key,value');

        if (data?.length) {
          const incoming = Object.fromEntries(
            data.map(item => [item.key, item.value])
          );

          setSettings(current => ({
            ...current,
            ...incoming,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadSettings();
  }, []);

  async function loadMatches() {
    setLoading(true);
    setError('');

    try {
      const endpoint =
        sport === 'football'
          ? '/api/football'
          : '/api/basketball';

      const response = await fetch(
        `${endpoint}?mode=${dateFilter}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || 'No fue posible cargar los partidos.'
        );
      }

      setMatches(data.matches || []);
    } catch (err) {
      setMatches([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedLeague('all');

    if (sport !== 'tennis') {
      loadMatches();
    }
  }, [sport, dateFilter]);

  const competitions = useMemo(() => {
    const map = new Map();

    matches.forEach(match => {
      const key = `${match.country}-${match.league}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          country: match.country,
          league: match.league,
        });
      }
    });

    return [...map.values()].sort((a, b) =>
      `${a.country} ${a.league}`.localeCompare(
        `${b.country} ${b.league}`,
        'es'
      )
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (selectedLeague === 'all') return matches;

    return matches.filter(
      match =>
        `${match.country}-${match.league}` === selectedLeague
    );
  }, [matches, selectedLeague]);

  return (
    <main>
      <header className="topbar">
        <div className="brandWrap">
          <img
            src="/logo.png"
            className="brandLogo"
            alt="LizamaBet"
          />
        </div>

        <nav className="topActions">
          <a href="#partidos">Partidos</a>
          <a href="#pronosticos">Pronósticos</a>
          <Link href="/admin" className="adminLink">
            🔐 Admin
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">
            LIZAMABET · ANÁLISIS DEPORTIVO
          </span>

          <h1>{settings.hero_title}</h1>

          <p>{settings.hero_subtitle}</p>

          <div className="heroBadges">
            <span>📊 Estadísticas</span>
            <span>🎯 Probabilidades</span>
            <span>💎 Valor esperado</span>
            <span>💰 Cuotas reales</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="pulse" />

          <strong>Análisis responsable</strong>

          <p>
            Las probabilidades son estimaciones y no garantizan
            resultados.
          </p>
        </div>
      </section>

      <section id="partidos" className="section">
        <div className="sectionHead">
          <div>
            <span className="eyebrow">PARTIDOS</span>
            <h2>Próximos eventos</h2>
          </div>
        </div>

        <div className="sportTabs">
          {Object.entries(sports).map(([key, item]) => (
            <button
              key={key}
              className={sport === key ? 'active' : ''}
              disabled={!item.enabled}
              onClick={() => item.enabled && setSport(key)}
            >
              {item.icon} {item.label}
              {!item.enabled ? ' · Próximamente' : ''}
            </button>
          ))}
        </div>

        <div style={styles.filters}>
          {filters.map(item => (
            <button
              key={item.id}
              className={
                dateFilter === item.id
                  ? 'filter activeFilter'
                  : 'filter'
              }
              onClick={() => setDateFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={styles.selector}>
          <label style={styles.label}>Competición</label>

          <select
            style={styles.select}
            value={selectedLeague}
            onChange={event =>
              setSelectedLeague(event.target.value)
            }
          >
            <option value="all">
              🌎 Todas las competiciones
            </option>

            {competitions.map(item => (
              <option key={item.key} value={item.key}>
                {flag(item.country)} {item.country} — {item.league}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.summary}>
          <span>
            {loading
              ? 'Cargando partidos...'
              : `${filteredMatches.length} partido(s)`}
          </span>

          <button className="refresh" onClick={loadMatches}>
            ↻ Actualizar
          </button>
        </div>

        {error ? (
          <div className="empty">
            <strong>Error al cargar partidos</strong>
            <small>{error}</small>
          </div>
        ) : loading ? (
          <div className="empty">
            Cargando partidos…
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="empty">
            <strong>No hay partidos disponibles.</strong>
            <small>
              Prueba con otra fecha o competición.
            </small>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                sport={sport}
              />
            ))}
          </div>
        )}
      </section>

      <section id="pronosticos" className="section">
        <span className="eyebrow">PRÓXIMA ETAPA</span>

        <h2>Análisis LizamaBet</h2>

        <p>
          Cada partido tendrá estadísticas de los últimos 5 y 10
          encuentros, H2H, tendencias, probabilidades, córners,
          jugadores y cuotas cuando la fuente disponga de esos
          datos.
        </p>
      </section>

      <section style={styles.donation}>
        <div>
          <span className="eyebrow">APOYA LIZAMABET</span>
          <h2>Ayuda a mantener el proyecto</h2>
          <p>{settings.donation_text}</p>
        </div>

        <a
          href="https://mpago.la/1dqB5EM"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.donateButton}
        >
          💙 Donar con Mercado Pago
        </a>
      </section>

      <footer style={styles.footer}>
        LizamaBet · Análisis deportivo responsable
      </footer>
    </main>
  );
}

const styles = {
  filters: {
    display: 'flex',
    gap: 8,
    margin: '18px 0',
    overflowX: 'auto',
  },

  selector: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.08)',
  },

  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 800,
  },

  select: {
    width: '100%',
    padding: 13,
    borderRadius: 10,
    background: '#11151a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,.15)',
  },

  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))',
    gap: 14,
  },

  competition: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    fontSize: 12,
    opacity: 0.8,
  },

  flag: {
    width: 22,
    maxHeight: 16,
    objectFit: 'contain',
  },

  date: {
    margin: '12px 0',
    fontSize: 13,
    opacity: 0.7,
  },

  teams: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 12,
    minHeight: 110,
  },

  team: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },

  logo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },

  fallback: {
    fontSize: 30,
  },

  vs: {
    opacity: 0.4,
  },

  analysis: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(0,0,0,.18)',
    fontSize: 12,
  },

  donation: {
    maxWidth: 1150,
    margin: '30px auto',
    padding: 25,
    borderRadius: 20,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.08)',
  },

  donateButton: {
    display: 'inline-block',
    marginTop: 10,
    padding: '13px 18px',
    borderRadius: 12,
    background: '#1689e8',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 800,
  },

  footer: {
    padding: 30,
    textAlign: 'center',
    opacity: 0.6,
  },
};
