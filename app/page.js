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
  hero_subtitle:
    'Datos, valor esperado y seguimiento en vivo para tomar decisiones mejor informadas.',
  primary_color: '#83ff35',
  accent_color: '#c9ff52',
  donation_text:
    'LizamaBet es gratuito. Si deseas apoyar su mantenimiento y nuevas funciones, puedes realizar una donación voluntaria.',
};

const fallbackLeagues = {
  football: [
    'Primera División Chile',
    'Premier League',
    'LaLiga',
    'Serie A',
    'Bundesliga',
    'Champions League',
    'Copa Libertadores',
    'Copa Sudamericana',
  ],
  tennis: [
    'ATP',
    'WTA',
    'Grand Slams',
    'ATP Masters 1000',
    'ATP 500',
    'WTA 1000',
  ],
  basketball: [
    'NBA',
    'EuroLeague',
    'ACB',
    'Basketball Champions League',
  ],
};

function groupByLeague(matches) {
  const map = new Map();

  for (const match of matches) {
    const key = match.league || 'Otras competiciones';

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(match);
  }

  return map;
}

function parseDate(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    const date = new Date(
      value < 1000000000000
        ? value * 1000
        : value
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function isFinished(match) {
  const status = normalizeStatus(match.status);

  return (
    status.includes('finished') ||
    status.includes('final') ||
    status.includes('ended') ||
    status.includes('full time') ||
    status.includes('after penalties') ||
    status.includes('after extra time') ||
    status === 'ft'
  );
}

function isLive(match) {
  const status = normalizeStatus(match.status);

  if (isFinished(match)) {
    return false;
  }

  return (
    status.includes('live') ||
    status.includes('in progress') ||
    status.includes('playing') ||
    status.includes('1st half') ||
    status.includes('2nd half') ||
    status.includes('halftime') ||
    status.includes('half time') ||
    status.includes('extra time') ||
    status.includes('penalty') ||
    status === '1h' ||
    status === '2h' ||
    status === 'ht' ||
    (
      match.minute !== null &&
      match.minute !== undefined
    )
  );
}

function isToday(match) {
  const date = parseDate(match.startTime);

  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isUpcoming(match) {
  if (isLive(match) || isFinished(match)) {
    return false;
  }

  const date = parseDate(match.startTime);

  if (!date) return false;

  return date.getTime() > Date.now();
}

function formatMatchDate(value) {
  const date = parseDate(value);

  if (!date) return '';

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function Home() {
  const [sport, setSport] = useState('football');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceOk, setSourceOk] = useState(false);

  const [selectedLeague, setSelectedLeague] =
    useState('Todas');

  const [filter, setFilter] = useState('Hoy');

  const [settings, setSettings] =
    useState(defaultSettings);

  const [customLeagues, setCustomLeagues] =
    useState([]);

  const [search, setSearch] = useState('');

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
      const { data } = await supabase
        .from('site_settings')
        .select('key,value');

      if (data?.length) {
        const incoming = Object.fromEntries(
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
    }

    loadSettings();
  }, []);

  useEffect(() => {
    if (!hasSupabase) {
      setCustomLeagues([]);
      return;
    }

    async function loadLeagues() {
      const { data } = await supabase
        .from('leagues')
        .select(
          'name,sport,active,featured'
        )
        .eq('sport', sport)
        .eq('active', true)
        .order('featured', {
          ascending: false,
        })
        .order('name');

      setCustomLeagues(data || []);
    }

    loadLeagues();
  }, [sport]);

  async function loadMatches() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/sportscore?sport=${sport}`,
        {
          cache: 'no-store',
        }
      );

      const data = await response.json();

      setMatches(data.matches || []);
      setSourceOk(Boolean(data.ok));
    } catch (error) {
      console.error(error);

      setMatches([]);
      setSourceOk(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedLeague('Todas');

    loadMatches();

    const intervalTime =
      filter === 'En vivo'
        ? 30000
        : 60000;

    const interval = setInterval(
      loadMatches,
      intervalTime
    );

    return () => {
      clearInterval(interval);
    };
  }, [sport, filter]);

  const leagueNames = useMemo(() => {
    const realLeagues = [
      ...new Set(
        matches
          .map(match => match.league)
          .filter(Boolean)
      ),
    ];

    const configuredLeagues =
      customLeagues.map(
        league => league.name
      );

    const merged = [
      ...new Set([
        ...configuredLeagues,
        ...realLeagues,
        ...fallbackLeagues[sport],
      ]),
    ];

    return merged.filter(name =>
      name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );
  }, [
    matches,
    customLeagues,
    sport,
    search,
  ]);

  const filteredMatches = useMemo(() => {
    let result =
      selectedLeague === 'Todas'
        ? [...matches]
        : matches.filter(
            match =>
              match.league ===
              selectedLeague
          );

    if (filter === 'En vivo') {
      result = result.filter(isLive);
    }

    if (filter === 'Hoy') {
      result = result.filter(isToday);
    }

    if (filter === 'Próximos') {
      result = result
        .filter(isUpcoming)
        .sort((a, b) => {
          const dateA =
            parseDate(
              a.startTime
            )?.getTime() || 0;

          const dateB =
            parseDate(
              b.startTime
            )?.getTime() || 0;

          return dateA - dateB;
        });
    }

    return result;
  }, [
    matches,
    selectedLeague,
    filter,
  ]);

  const grouped = useMemo(
    () =>
      groupByLeague(
        filteredMatches
      ),
    [filteredMatches]
  );

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

          <a href="#deportes">
            Deportes
          </a>

          <a href="#combos">
            Combos
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
            LIZAMABET · DATOS DEPORTIVOS
          </span>

          <h1>
            {settings.hero_title}
          </h1>

          <p>
            {settings.hero_subtitle}
          </p>

          <div className="heroBadges">

            <span>
              📡 SportScore
            </span>

            <span>
              📊 Probabilidad
            </span>

            <span>
              💎 Valor esperado
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
        id="deportes"
        className="section"
      >

        <div className="sectionHead">

          <div>

            <span className="eyebrow">
              EXPLORAR
            </span>

            <h2>
              Deportes y ligas
            </h2>

          </div>

          <div
            className={
              `source ${
                sourceOk
                  ? 'ok'
                  : 'bad'
              }`
            }
          >

            {sourceOk
              ? '● SportScore conectado'
              : '● SportScore sin conexión'}

          </div>

        </div>

        <div className="sportTabs">

          {Object.entries(
            sportMap
          ).map(
            ([key, item]) => (

              <button
                key={key}
                className={
                  sport === key
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setSport(key)
                }
              >

                {item.icon}{' '}
                {item.label}

              </button>

            )
          )}

        </div>

        <div className="leagueLayout">

          <aside className="leaguePanel">

            <div className="leagueTitle">
              Ligas / Torneos
            </div>

            <input
              className="searchInput"
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar liga..."
            />

            <button
              className={
                selectedLeague ===
                'Todas'
                  ? 'league activeLeague'
                  : 'league'
              }
              onClick={() =>
                setSelectedLeague(
                  'Todas'
                )
              }
            >
              ⭐ Todas
            </button>

            {leagueNames.map(
              name => (

                <button
                  key={name}
                  className={
                    selectedLeague ===
                    name
                      ? 'league activeLeague'
                      : 'league'
                  }
                  onClick={() =>
                    setSelectedLeague(
                      name
                    )
                  }
                >
                  {name}
                </button>

              )
            )}

          </aside>

          <div className="matchesArea">

            <div className="filters">

              {[
                'En vivo',
                'Hoy',
                'Próximos',
              ].map(
                option => (

                  <button
                    key={option}
                    className={
                      filter === option
                        ? 'filter activeFilter'
                        : 'filter'
                    }
                    onClick={() =>
                      setFilter(
                        option
                      )
                    }
                  >
                    {option}
                  </button>

                )
              )}

              <button
                className="refresh"
                onClick={
                  loadMatches
                }
              >
                ↻ Actualizar
              </button>

            </div>

            {loading ? (

              <div className="empty">
                Cargando partidos…
              </div>

            ) : filteredMatches.length === 0 ? (

              <div className="empty">

                No hay partidos disponibles
                para este filtro en este
                momento.

                <small>
                  La información depende de
                  los partidos que SportScore
                  esté entregando actualmente.
                </small>

              </div>

            ) : (

              [...grouped.entries()].map(
                ([league, games]) => (

                  <div
                    key={league}
                    className="leagueBlock"
                  >

                    <div className="leagueHeader">

                      {league}

                      <span>
                        {games.length}{' '}
                        partido(s)
                      </span>

                    </div>

                    {games.map(
                      game => (

                        <article
                          className="matchCard"
                          key={game.id}
                        >

                          <div>

                            <span className="status">

                              {game.status ||
                                'Programado'}

                              {game.minute
                                ? ` · ${game.minute}'`
                                : ''}

                            </span>

                            {game.startTime && (

                              <small
                                style={{
                                  display:
                                    'block',
                                  marginTop:
                                    '4px',
                                  opacity:
                                    0.75,
                                }}
                              >

                                {formatMatchDate(
                                  game.startTime
                                )}

                              </small>

                            )}

                            <h3>

                              {game.home}{' '}

                              <b>
                                {game.homeScore ??
                                  '-'}
                              </b>

                            </h3>

                            <h3>

                              {game.away}{' '}

                              <b>
                                {game.awayScore ??
                                  '-'}
                              </b>

                            </h3>

                          </div>

                          <div className="analysis">

                            <span>
                              Mercados y modelo
                            </span>

                            <strong>
                              Próximamente
                            </strong>

                            <small>
                              Se habilitarán al
                              conectar
                              probabilidades y
                              cuotas reales.
                            </small>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )
              )

            )}

          </div>

        </div>

      </section>

      <section
        id="combos"
        className="section"
      >

        <span className="eyebrow">
          COMBINADAS
        </span>

        <h2>
          Combos LizamaBet
        </h2>

        <div className="comboGrid">

          <div className="combo">

            <span>
              🛡️
            </span>

            <h3>
              Conservadora
            </h3>

            <strong>
              Objetivo 2.00+
            </strong>

            <p>
              Selecciones de mayor
              confianza.
            </p>

          </div>

          <div className="combo">

            <span>
              💣
            </span>

            <h3>
              Bomba del Día
            </h3>

            <strong>
              Objetivo 3.00+
            </strong>

            <p>
              Valor con riesgo intermedio.
            </p>

          </div>

          <div className="combo">

            <span>
              🚀
            </span>

            <h3>
              Arriesgada
            </h3>

            <strong>
              Objetivo 5.00+
            </strong>

            <p>
              Mayor cuota y mayor
              incertidumbre.
            </p>

          </div>

        </div>

      </section>

      <section className="donation">

        <div>

          <span className="eyebrow">
            COMUNIDAD
          </span>

          <h2>
            Apoya LizamaBet
          </h2>

          <p>
            {settings.donation_text}
          </p>

        </div>

        <a
          className="donateBtn"
          href={
            process.env
              .NEXT_PUBLIC_MERCADOPAGO_URL ||
            'https://mpago.la/1dqB5EM'
          }
          target="_blank"
          rel="noreferrer"
        >
          💚 Donar con Mercado Pago
        </a>

      </section>

      <footer>

        <div>
          LizamaBet · 18+ · Juega con
          responsabilidad
        </div>

        <a
          href="https://sportscore.com/"
          target="_blank"
          rel="noreferrer"
        >
          Powered by SportScore
        </a>

      </footer>

    </main>
  );
    }
