'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { hasSupabase, supabase } from './lib/supabase';

const sports = {
  football: {
    label: 'Fútbol',
    icon: '⚽',
    enabled: true,
  },
  basketball: {
    label: 'Baloncesto',
    icon: '🏀',
    enabled: true,
  },
  tennis: {
    label: 'Tenis',
    icon: '🎾',
    enabled: false,
  },
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
    Netherlands: '🇳🇱',
    Belgium: '🇧🇪',
    Uruguay: '🇺🇾',
    Paraguay: '🇵🇾',
    Colombia: '🇨🇴',
    Ecuador: '🇪🇨',
    Peru: '🇵🇪',
    Bolivia: '🇧🇴',
    Mexico: '🇲🇽',
    USA: '🇺🇸',
    'United States': '🇺🇸',
    Turkey: '🇹🇷',
    Greece: '🇬🇷',
    Scotland: '🏴',
  };

  return flags[country] || '🌎';
}

function cleanPercent(value) {
  if (!value) return 'Datos no disponibles';

  return String(value).replace('%', '') + '%';
}

function AnalysisModal({
  match,
  sport,
  onClose,
}) {
  const [loading, setLoading] = useState(
    sport === 'football'
  );

  const [analysis, setAnalysis] = useState(null);

  const [error, setError] = useState('');

  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    if (!match || sport !== 'football') {
      setLoading(false);
      return;
    }

    async function loadAnalysis() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          fixture: String(match.id),
          home: String(match.homeId),
          away: String(match.awayId),
        });

        const response = await fetch(
          `/api/football-analysis?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              'No fue posible cargar el análisis.'
          );
        }

        setAnalysis(data);
      } catch (err) {
        setError(
          err.message ||
            'No fue posible cargar el análisis.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [match, sport]);

  if (!match) return null;

  const homeForm =
    analysis?.form?.home?.analysis || null;

  const awayForm =
    analysis?.form?.away?.analysis || null;

  const prediction =
    analysis?.prediction?.data || null;

  const bookmakers =
    analysis?.odds?.bookmakers || [];

  const h2h =
    analysis?.h2h?.matches || [];

  const tabs = [
    ['resumen', 'Resumen'],
    ['pronosticos', 'Pronósticos'],
    ['estadisticas', 'Estadísticas'],
    ['tendencias', 'Tendencias'],
    ['h2h', 'H2H'],
    ['cuotas', 'Cuotas'],
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <small style={styles.modalLeague}>
              {countryFlag(match.country)}{' '}
              {match.country} · {match.league}
            </small>

            <h2 style={{ margin: '8px 0 4px' }}>
              {match.home} vs {match.away}
            </h2>

            <small style={{ opacity: 0.7 }}>
              {formatDate(match.startTime)}
            </small>
          </div>

          <button
            onClick={onClose}
            style={styles.closeButton}
          >
            ✕
          </button>
        </div>

        <div style={styles.modalTeams}>
          <div style={styles.modalTeam}>
            {match.homeLogo && (
              <img
                src={match.homeLogo}
                alt={match.home}
                style={styles.modalLogo}
              />
            )}

            <strong>{match.home}</strong>
          </div>

          <span style={{ opacity: 0.45 }}>
            VS
          </span>

          <div style={styles.modalTeam}>
            {match.awayLogo && (
              <img
                src={match.awayLogo}
                alt={match.away}
                style={styles.modalLogo}
              />
            )}

            <strong>{match.away}</strong>
          </div>
        </div>

        {sport === 'basketball' ? (
          <div style={styles.messageBox}>
            <strong>
              🏀 Análisis de baloncesto en preparación
            </strong>

            <p>
              Los partidos reales ya están conectados.
              La siguiente etapa incorporará estadísticas
              de equipos y jugadores.
            </p>
          </div>
        ) : loading ? (
          <div style={styles.messageBox}>
            <strong>
              Analizando partido…
            </strong>

            <p>
              Consultando forma, H2H, predicciones y
              cuotas disponibles.
            </p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <strong>
              No fue posible cargar el análisis.
            </strong>

            <p>{error}</p>
          </div>
        ) : (
          <>
            <div style={styles.tabs}>
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    ...styles.tabButton,
                    ...(tab === id
                      ? styles.activeTab
                      : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'resumen' && (
              <div>
                <div style={styles.cardsGrid}>
                  <div style={styles.infoCard}>
                    <small>
                      PRONÓSTICO API
                    </small>

                    <strong>
                      {prediction?.advice ||
                        'Datos no disponibles'}
                    </strong>
                  </div>

                  <div style={styles.infoCard}>
                    <small>
                      LOCAL
                    </small>

                    <strong>
                      {cleanPercent(
                        prediction?.probabilities?.home
                      )}
                    </strong>
                  </div>

                  <div style={styles.infoCard}>
                    <small>
                      EMPATE
                    </small>

                    <strong>
                      {cleanPercent(
                        prediction?.probabilities?.draw
                      )}
                    </strong>
                  </div>

                  <div style={styles.infoCard}>
                    <small>
                      VISITA
                    </small>

                    <strong>
                      {cleanPercent(
                        prediction?.probabilities?.away
                      )}
                    </strong>
                  </div>
                </div>

                <div style={styles.sectionBox}>
                  <h3>
                    Forma últimos 10
                  </h3>

                  <div style={styles.compareGrid}>
                    <div>
                      <strong>
                        {match.home}
                      </strong>

                      <p>
                        Victorias:{' '}
                        {homeForm?.record?.wins ??
                          'N/D'}
                      </p>

                      <p>
                        Empates:{' '}
                        {homeForm?.record?.draws ??
                          'N/D'}
                      </p>

                      <p>
                        Derrotas:{' '}
                        {homeForm?.record?.losses ??
                          'N/D'}
                      </p>

                      <p>
                        Promedio goles:{' '}
                        {homeForm?.goals
                          ?.averageFor ?? 'N/D'}
                      </p>
                    </div>

                    <div>
                      <strong>
                        {match.away}
                      </strong>

                      <p>
                        Victorias:{' '}
                        {awayForm?.record?.wins ??
                          'N/D'}
                      </p>

                      <p>
                        Empates:{' '}
                        {awayForm?.record?.draws ??
                          'N/D'}
                      </p>

                      <p>
                        Derrotas:{' '}
                        {awayForm?.record?.losses ??
                          'N/D'}
                      </p>

                      <p>
                        Promedio goles:{' '}
                        {awayForm?.goals
                          ?.averageFor ?? 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'pronosticos' && (
              <div style={styles.sectionBox}>
                <h3>
                  🎯 Pronósticos
                </h3>

                <p>
                  Ganador sugerido:{' '}
                  <strong>
                    {prediction?.winner ||
                      'Datos no disponibles'}
                  </strong>
                </p>

                <p>
                  Consejo:{' '}
                  <strong>
                    {prediction?.advice ||
                      'Datos no disponibles'}
                  </strong>
                </p>

                <p>
                  Over / Under:{' '}
                  <strong>
                    {prediction?.underOver ||
                      'Datos no disponibles'}
                  </strong>
                </p>

                <p>
                  Goles esperados local:{' '}
                  <strong>
                    {prediction?.goals?.home ||
                      'N/D'}
                  </strong>
                </p>

                <p>
                  Goles esperados visita:{' '}
                  <strong>
                    {prediction?.goals?.away ||
                      'N/D'}
                  </strong>
                </p>
              </div>
            )}

            {tab === 'estadisticas' && (
              <div>
                <div style={styles.sectionBox}>
                  <h3>
                    📊 Últimos 10 partidos
                  </h3>

                  <div style={styles.compareGrid}>
                    <div>
                      <strong>
                        {match.home}
                      </strong>

                      <p>
                        Goles a favor:{' '}
                        {homeForm?.goals?.for ??
                          'N/D'}
                      </p>

                      <p>
                        Goles en contra:{' '}
                        {homeForm?.goals?.against ??
                          'N/D'}
                      </p>

                      <p>
                        Media favor:{' '}
                        {homeForm?.goals
                          ?.averageFor ?? 'N/D'}
                      </p>

                      <p>
                        Media contra:{' '}
                        {homeForm?.goals
                          ?.averageAgainst ??
                          'N/D'}
                      </p>
                    </div>

                    <div>
                      <strong>
                        {match.away}
                      </strong>

                      <p>
                        Goles a favor:{' '}
                        {awayForm?.goals?.for ??
                          'N/D'}
                      </p>

                      <p>
                        Goles en contra:{' '}
                        {awayForm?.goals?.against ??
                          'N/D'}
                      </p>

                      <p>
                        Media favor:{' '}
                        {awayForm?.goals
                          ?.averageFor ?? 'N/D'}
                      </p>

                      <p>
                        Media contra:{' '}
                        {awayForm?.goals
                          ?.averageAgainst ??
                          'N/D'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={styles.sectionBox}>
                  <h3>
                    🚩 Córners y remates
                  </h3>

                  <p>
                    Para un partido futuro estas
                    estadísticas pueden no estar
                    disponibles todavía. LizamaBet
                    mostrará datos históricos en la
                    próxima ampliación.
                  </p>
                </div>
              </div>
            )}

            {tab === 'tendencias' && (
              <div style={styles.sectionBox}>
                <h3>
                  📈 Tendencias últimos 10
                </h3>

                <div style={styles.compareGrid}>
                  <div>
                    <strong>
                      {match.home}
                    </strong>

                    <p>
                      +1.5 goles:{' '}
                      {homeForm?.trends?.over15 ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      +2.5 goles:{' '}
                      {homeForm?.trends?.over25 ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      Ambos marcan:{' '}
                      {homeForm?.trends
                        ?.bothTeamsScore ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      Marcó al menos 1:{' '}
                      {homeForm?.trends?.scored ??
                        'N/D'}
                      %
                    </p>
                  </div>

                  <div>
                    <strong>
                      {match.away}
                    </strong>

                    <p>
                      +1.5 goles:{' '}
                      {awayForm?.trends?.over15 ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      +2.5 goles:{' '}
                      {awayForm?.trends?.over25 ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      Ambos marcan:{' '}
                      {awayForm?.trends
                        ?.bothTeamsScore ??
                        'N/D'}
                      %
                    </p>

                    <p>
                      Marcó al menos 1:{' '}
                      {awayForm?.trends?.scored ??
                        'N/D'}
                      %
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'h2h' && (
              <div style={styles.sectionBox}>
                <h3>
                  🤝 Enfrentamientos directos
                </h3>

                {h2h.length === 0 ? (
                  <p>
                    Datos no disponibles.
                  </p>
                ) : (
                  h2h.map(game => (
                    <div
                      key={game.id}
                      style={styles.h2hRow}
                    >
                      <span>
                        {game.home?.name}
                      </span>

                      <strong>
                        {game.home?.goals ?? '-'}
                        {' - '}
                        {game.away?.goals ?? '-'}
                      </strong>

                      <span>
                        {game.away?.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'cuotas' && (
              <div style={styles.sectionBox}>
                <h3>
                  💰 Cuotas reales
                </h3>

                {bookmakers.length === 0 ? (
                  <p>
                    Datos no disponibles para este
                    partido.
                  </p>
                ) : (
                  bookmakers
                    .slice(0, 5)
                    .map(bookmaker => (
                      <div
                        key={bookmaker.id}
                        style={styles.bookmaker}
                      >
                        <strong>
                          {bookmaker.name}
                        </strong>

                        {bookmaker.markets
                          ?.slice(0, 4)
                          .map(market => (
                            <div
                              key={market.id}
                              style={{
                                marginTop: 10,
                              }}
                            >
                              <small>
                                {market.name}
                              </small>

                              <div
                                style={
                                  styles.oddsGrid
                                }
                              >
                                {market.values
                                  ?.slice(0, 6)
                                  .map(
                                    (
                                      odd,
                                      index
                                    ) => (
                                      <span
                                        key={
                                          index
                                        }
                                        style={
                                          styles.odd
                                        }
                                      >
                                        {
                                          odd.value
                                        }{' '}
                                        <b>
                                          {
                                            odd.odd
                                          }
                                        </b>
                                      </span>
                                    )
                                  )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  sport,
  onAnalyze,
}) {
  return (
    <article className="matchCard">
      <div style={styles.competition}>
        {match.flag ? (
          <img
            src={match.flag}
            alt=""
            style={styles.flag}
          />
        ) : (
          <span>
            {countryFlag(match.country)}
          </span>
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
              {sport === 'basketball'
                ? '🏀'
                : '⚽'}
            </span>
          )}

          <strong>{match.home}</strong>
        </div>

        <b style={styles.vs}>
          VS
        </b>

        <div style={styles.team}>
          {match.awayLogo ? (
            <img
              src={match.awayLogo}
              alt={match.away}
              style={styles.logo}
            />
          ) : (
            <span style={styles.fallback}>
              {sport === 'basketball'
                ? '🏀'
                : '⚽'}
            </span>
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
  const [sport, setSport] =
    useState('football');

  const [dateFilter, setDateFilter] =
    useState('today');

  const [matches, setMatches] =
    useState([]);

  const [
    selectedLeague,
    setSelectedLeague,
  ] = useState('all');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    selectedMatch,
    setSelectedMatch,
  ] = useState(null);

  const [settings, setSettings] =
    useState(defaultSettings);

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
          const incoming =
            Object.fromEntries(
              data.map(item => [
                item.key,
                item.value,
              ])
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
        {
          cache: 'no-store',
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'No fue posible cargar los partidos.'
        );
      }

      setMatches(
        data.matches || []
      );
    } catch (err) {
      setMatches([]);

      setError(
        err.message ||
          'No fue posible cargar los partidos.'
      );
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

  const competitions =
    useMemo(() => {
      const map = new Map();

      matches.forEach(match => {
        const key =
          `${match.country}-${match.league}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            country: match.country,
            league: match.league,
          });
        }
      });

      return [...map.values()].sort(
        (a, b) =>
          `${a.country} ${a.league}`.localeCompare(
            `${b.country} ${b.league}`,
            'es'
          )
      );
    }, [matches]);

  const filteredMatches =
    useMemo(() => {
      if (
        selectedLeague === 'all'
      ) {
        return matches;
      }

      return matches.filter(
        match =>
          `${match.country}-${match.league}` ===
          selectedLeague
      );
    }, [
      matches,
      selectedLeague,
    ]);

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
          <a href="#partidos">
            Partidos
          </a>

          <a href="#pronosticos">
            Pronósticos
          </a>

          <Link
            href="/admin"
            className="adminLink"
          >
            🔐 Admin
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">
            LIZAMABET · ANÁLISIS DEPORTIVO
          </span>

          <h1>
            {settings.hero_title}
          </h1>

          <p>
            {settings.hero_subtitle}
          </p>

          <div className="heroBadges">
            <span>
              📊 Estadísticas
            </span>

            <span>
              🎯 Probabilidades
            </span>

            <span>
              💎 Valor esperado
            </span>

            <span>
              💰 Cuotas reales
            </span>
          </div>
        </div>

        <div className="heroCard">
          <div className="pulse" />

          <strong>
            Análisis responsable
          </strong>

          <p>
            Las probabilidades son
            estimaciones y no garantizan
            resultados.
          </p>
        </div>
      </section>

      <section
        id="partidos"
        className="section"
      >
        <div className="sectionHead">
          <div>
            <span className="eyebrow">
              PARTIDOS
            </span>

            <h2>
              Próximos eventos
            </h2>
          </div>
        </div>

        <div className="sportTabs">
          {Object.entries(
            sports
          ).map(([key, item]) => (
            <button
              key={key}
              className={
                sport === key
                  ? 'active'
                  : ''
              }
              disabled={!item.enabled}
              onClick={() =>
                item.enabled &&
                setSport(key)
              }
            >
              {item.icon}{' '}
              {item.label}

              {!item.enabled
                ? ' · Próximamente'
                : ''}
            </button>
          ))}
        </div>

        <div style={styles.filters}>
          {filters.map(item => (
            <button
              key={item.id}
              className={
                dateFilter ===
                item.id
                  ? 'filter activeFilter'
                  : 'filter'
              }
              onClick={() =>
                setDateFilter(
                  item.id
                )
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={styles.selector}>
          <label style={styles.label}>
            Competición
          </label>

          <select
            style={styles.select}
            value={selectedLeague}
            onChange={event =>
              setSelectedLeague(
                event.target.value
              )
            }
          >
            <option value="all">
              🌎 Todas las competiciones
            </option>

            {competitions.map(
              item => (
                <option
                  key={item.key}
                  value={item.key}
                >
                  {countryFlag(
                    item.country
                  )}{' '}
                  {item.country} —{' '}
                  {item.league}
                </option>
              )
            )}
          </select>
        </div>

        <div style={styles.summary}>
          <span>
            {loading
              ? 'Cargando partidos...'
              : `${filteredMatches.length} partido(s)`}
          </span>

          <button
            className="refresh"
            onClick={loadMatches}
          >
            ↻ Actualizar
          </button>
        </div>

        {error ? (
          <div className="empty">
            <strong>
              Error al cargar partidos
            </strong>

            <small>
              {error}
            </small>
          </div>
        ) : loading ? (
          <div className="empty">
            Cargando partidos…
          </div>
        ) : filteredMatches.length ===
          0 ? (
          <div className="empty">
            <strong>
              No hay partidos disponibles.
            </strong>

            <small>
              Prueba con otra fecha o
              competición.
            </small>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredMatches.map(
              match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  sport={sport}
                  onAnalyze={
                    setSelectedMatch
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <section
        id="pronosticos"
        className="section"
      >
        <span className="eyebrow">
          LIZAMABET
        </span>

        <h2>
          Análisis de partidos
        </h2>

        <p>
          Selecciona un partido y pulsa
          “Ver análisis” para consultar
          los datos disponibles.
        </p>
      </section>

      <section style={styles.donation}>
        <div>
          <span className="eyebrow">
            APOYA LIZAMABET
          </span>

          <h2>
            Ayuda a mantener el proyecto
          </h2>

          <p>
            {settings.donation_text}
          </p>
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
        LizamaBet · Análisis deportivo
        responsable
      </footer>

      {selectedMatch && (
        <AnalysisModal
          match={selectedMatch}
          sport={sport}
          onClose={() =>
            setSelectedMatch(null)
          }
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
    overflowX: 'auto',
  },

  selector: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    background:
      'rgba(255,255,255,.04)',
    border:
      '1px solid rgba(255,255,255,.08)',
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
    border:
      '1px solid rgba(255,255,255,.15)',
  },

  summary: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit,minmax(290px,1fr))',
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
    gridTemplateColumns:
      '1fr auto 1fr',
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

  analysisButton: {
    width: '100%',
    marginTop: 15,
    padding: 13,
    border: 'none',
    borderRadius: 12,
    background: 'var(--primary)',
    color: '#071008',
    fontWeight: 900,
    cursor: 'pointer',
  },

  donation: {
    maxWidth: 1150,
    margin: '30px auto',
    padding: 25,
    borderRadius: 20,
    background:
      'rgba(255,255,255,.04)',
    border:
      '1px solid rgba(255,255,255,.08)',
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

  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background:
      'rgba(0,0,0,.82)',
    padding: 12,
    overflowY: 'auto',
  },

  modal: {
    width: '100%',
    maxWidth: 900,
    margin: '20px auto',
    background: '#071008',
    border:
      '1px solid rgba(131,255,53,.2)',
    borderRadius: 22,
    padding: 18,
    color: '#fff',
  },

  modalHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  modalLeague: {
    color: 'var(--primary)',
    fontWeight: 800,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border:
      '1px solid rgba(255,255,255,.15)',
    background:
      'rgba(255,255,255,.05)',
    color: '#fff',
    fontSize: 18,
  },

  modalTeams: {
    display: 'grid',
    gridTemplateColumns:
      '1fr auto 1fr',
    alignItems: 'center',
    gap: 15,
    margin: '25px 0',
  },

  modalTeam: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
  },

  modalLogo: {
    width: 65,
    height: 65,
    objectFit: 'contain',
  },

  messageBox: {
    padding: 22,
    borderRadius: 16,
    background:
      'rgba(255,255,255,.04)',
    textAlign: 'center',
  },

  errorBox: {
    padding: 22,
    borderRadius: 16,
    background:
      'rgba(255,60,60,.08)',
    border:
      '1px solid rgba(255,60,60,.2)',
  },

  tabs: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    marginBottom: 18,
  },

  tabButton: {
    padding: '10px 13px',
    borderRadius: 10,
    border:
      '1px solid rgba(255,255,255,.12)',
    background:
      'rgba(255,255,255,.03)',
    color: '#fff',
    whiteSpace: 'nowrap',
  },

  activeTab: {
    background:
      'var(--primary)',
    color: '#071008',
    fontWeight: 900,
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit,minmax(130px,1fr))',
    gap: 10,
  },

  infoCard: {
    padding: 14,
    borderRadius: 13,
    background:
      'rgba(255,255,255,.04)',
    border:
      '1px solid rgba(255,255,255,.08)',
  },

  sectionBox: {
    marginTop: 15,
    padding: 16,
    borderRadius: 15,
    background:
      'rgba(255,255,255,.035)',
    border:
      '1px solid rgba(255,255,255,.07)',
  },

  compareGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2,minmax(0,1fr))',
    gap: 16,
  },

  h2hRow: {
    display: 'grid',
    gridTemplateColumns:
      '1fr auto 1fr',
    gap: 10,
    padding: '10px 0',
    borderBottom:
      '1px solid rgba(255,255,255,.07)',
    alignItems: 'center',
    textAlign: 'center',
  },

  bookmaker: {
    marginTop: 15,
    padding: 14,
    borderRadius: 13,
    background:
      'rgba(0,0,0,.2)',
  },

  oddsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },

  odd: {
    padding: '7px 9px',
    borderRadius: 8,
    background:
      'rgba(131,255,53,.08)',
    border:
      '1px solid rgba(131,255,53,.15)',
  },
};
