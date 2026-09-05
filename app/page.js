'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { hasSupabase, supabase } from './lib/supabase';
import AnalysisModal from './components/AnalysisModal';

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
  hero_title:
    'Pronósticos analizados con estadísticas que importan',
  hero_subtitle:
    'Datos, probabilidades, estadísticas y valor esperado para tomar decisiones mejor informadas.',
  primary_color: '#83ff35',
  accent_color: '#c9ff52',
  donation_text:
    'LizamaBet es gratuito. Si deseas apoyar su mantenimiento y nuevas funciones, puedes realizar una donación voluntaria.',
};

function formatDate(value) {
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
  })
    .format(date)
    .replace(',', ' ·');
}

function countryFlag(country) {
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

function MatchCard({ match, sport, onAnalyze }) {
  return (
    <article className="matchCard">
      <div style={styles.competition}>
        <span>{countryFlag(match.country)}</span>
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
            <span>{sport === 'basketball' ? '🏀' : '⚽'}</span>
          )}

          <strong>{match.home}</strong>
        </div>

        <b style={{ opacity: 0.4 }}>VS</b>

        <div style={styles.team}>
          {match.awayLogo ? (
            <img
              src={match.awayLogo}
              alt={match.away}
              style={styles.logo}
            />
          ) : (
            <span>{sport === 'basketball' ? '🏀' : '⚽'}</span>
          )}

          <strong>{match.away}</strong>
        </div>
      </div>

      <button
        onClick={() => onAnalyze(match)}
        style={styles.analysisButton}
      >
        📊 Ver análisis
      </button>
    </article>
  );
}

export default function Home() {
  const [sport, setSport] = useState('football');
  const [dateFilter, setDateFilter] = useState('today');
  const [matches, setMatches] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState(null);
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

    return [...map.values()];
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
            <span>💰 Cuotas reales</span>
          </div>
        </div>
      </section>

      <section id="partidos" className="section">
        <div className="sportTabs">
          {Object.entries(sports).map(([key, item]) => (
            <button
              key={key}
              className={sport === key ? 'active' : ''}
              disabled={!item.enabled}
              onClick={() => item.enabled && setSport(key)}
            >
              {item.icon} {item.label}
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
                {countryFlag(item.country)} {item.country} —{' '}
                {item.league}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="empty">{error}</div>
        ) : loading ? (
          <div className="empty">Cargando partidos…</div>
        ) : (
          <div style={styles.grid}>
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                sport={sport}
                onAnalyze={setSelectedMatch}
              />
            ))}
          </div>
        )}
      </section>

      {selectedMatch && (
        <AnalysisModal
          match={selectedMatch}
          sport={sport}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </main>
  );
}

const styles = {
  filters: {
    display: 'flex',
    gap: 8,
    margin: '18px 0',
  },

  selector: {
    marginBottom: 20,
  },

  select: {
    width: '100%',
    padding: 13,
    borderRadius: 10,
    background: '#11151a',
    color: '#fff',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit,minmax(290px,1fr))',
    gap: 14,
  },

  competition: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    fontSize: 12,
  },

  date: {
    margin: '12px 0',
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

  analysisButton: {
    width: '100%',
    marginTop: 15,
    padding: 13,
    border: 'none',
    borderRadius: 12,
    background: 'var(--primary)',
    color: '#071008',
    fontWeight: 900,
