'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  hasSupabase,
  supabase,
} from './lib/supabase';

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

const dateFilters = [
  {
    id: 'today',
    label: 'Hoy',
  },

  {
    id: 'tomorrow',
    label: 'Mañana',
  },

  {
    id: 'upcoming',
    label: 'Próximos',
  },
];

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'es-CL',
    {
      timeZone:
        'America/Santiago',

      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

      hour12: false,
    }
  ).format(date);
}

function getCountryEmoji(country) {
  const flags = {
    Chile: '🇨🇱',
    Argentina: '🇦🇷',
    Brazil: '🇧🇷',
    Brasil: '🇧🇷',
    Spain: '🇪🇸',
    España: '🇪🇸',
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

  return (
    flags[country] ||
    '🌐'
  );
}

function MatchCard({
  match,
  sport,
}) {
  return (
    <article
      className="matchCard"
    >
      <div className="matchTop">

        <div className="matchCompetition">

          {match.flag ? (
            <img
              src={match.flag}
              alt=""
              className="countryFlag"
            />
          ) : (
            <span>
              {getCountryEmoji(
                match.country
              )}
            </span>
          )}

          <span>
            {match.country}
          </span>

          <span className="dot">
            •
          </span>

          <strong>
            {match.league}
          </strong>

        </div>

        <span className="scheduledBadge">
          Programado
        </span>

      </div>

      <div className="matchDate">
        🗓️{' '}
        {formatDate(
          match.startTime
        )}
      </div>

      <div className="teams">

        <div className="team">

          {match.homeLogo ? (
            <img
              src={
                match.homeLogo
              }
              alt={
                match.home
              }
              className="teamLogo"
            />
          ) : (
            <div className="teamLogoFallback">
              {sport ===
              'basketball'
                ? '🏀'
                : '⚽'}
            </div>
          )}

          <strong>
            {match.home}
          </strong>

        </div>

        <div className="versus">
          VS
        </div>

        <div className="team">

          {match.awayLogo ? (
            <img
              src={
                match.awayLogo
              }
              alt={
                match.away
              }
              className="teamLogo"
            />
          ) : (
            <div className="teamLogoFallback">
              {sport ===
              'basketball'
                ? '🏀'
                : '⚽'}
            </div>
          )}

          <strong>
            {match.away}
          </strong>

        </div>

      </div>

      <div className="previewBox">

        <div>

          <span className="previewLabel">
            ANÁLISIS LIZAMABET
          </span>

          <strong>
            Próximamente
          </strong>

        </div>

        <p>
          Estadísticas,
          probabilidades,
          tendencias y cuotas
          se mostrarán aquí
          cuando estén
          disponibles.
        </p>

      </div>

      <button
        className="analysisButton"
        disabled
      >
        📊 Ver análisis
      </button>

    </article>
  );
}

export default function Home() {

  const [
    sport,
    setSport,
  ] = useState(
    'football'
  );

  const [
    dateFilter,
    setDateFilter,
  ] = useState(
    'today'
  );

  const [
    matches,
    setMatches,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    selectedLeague,
    setSelectedLeague,
  ] = useState(
    'all'
  );

  const [
    settings,
    setSettings,
  ] = useState(
    defaultSettings
  );

  useEffect(() => {

    document
      .documentElement
      .style
      .setProperty(
        '--primary',
        settings.primary_color
      );

    document
      .documentElement
      .style
      .setProperty(
        '--accent',
        settings.accent_color
      );

  }, [settings]);

  useEffect(() => {

    if (!hasSupabase) {
      return;
    }

    async function loadSettings() {

      try {

        const {
          data,
        } =
          await supabase
            .from(
              'site_settings'
            )
            .select(
              'key,value'
            );

        if (
          data?.length
        ) {

          const incoming =
            Object.fromEntries(
              data.map(
                item => [
                  item.key,
                  item.value,
                ]
              )
            );

          setSettings(
            current => ({
              ...current,
              ...incoming,
            })
          );
        }

      } catch (err) {

        console.error(
          'Settings:',
          err
        );

      }
    }

    loadSettings();

  }, []);

  async function loadMatches() {

    if (
      sport ===
      'tennis'
    ) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {

      const endpoint =
        sport ===
        'football'
          ? '/api/football'
          : '/api/basketball';

      const response =
        await fetch(
          `${endpoint}?mode=${dateFilter}`,
          {
            cache:
              'no-store',
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ||
            'No fue posible cargar los partidos.'
        );
      }

      setMatches(
        data.matches || []
      );

    } catch (err) {

      console.error(
        err
      );

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

    setSelectedLeague(
      'all'
    );

    loadMatches();

  }, [
    sport,
    dateFilter,
  ]);

  const competitions =
    useMemo(() => {

      const map =
        new Map();

      matches.forEach(
        match => {

          const key =
            `${match.country}-${match.league}`;

          if (
            !map.has(key)
          ) {

            map.set(
              key,
              {
                key,

                league:
                  match.league,

                country:
                  match.country,

                flag:
                  match.flag,

                leagueLogo:
                  match.leagueLogo,
              }
            );
          }
        }
      );

      return [
        ...map.values(),
      ].sort(
        (a, b) => {

          const countryCompare =
            String(
              a.country
            ).localeCompare(
              String(
                b.country
              ),
              'es'
            );

          if (
            countryCompare !==
            0
          ) {
            return countryCompare;
          }

          return String(
            a.league
          ).localeCompare(
            String(
              b.league
            ),
            'es'
          );
        }
      );

    }, [matches]);

  const filteredMatches =
    useMemo(() => {

      if (
        selectedLeague ===
        'all'
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

  const selectedCompetition =
    competitions.find(
      competition =>
        competition.key ===
        selectedLeague
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

          <a href="#partidos">
            Partidos
          </a>

          <a href="#destacados">
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
            LIZAMABET ·
            ANÁLISIS DEPORTIVO
          </span>

          <h1>
            {
              settings.hero_title
            }
          </h1>

          <p>
            {
              settings.hero_subtitle
            }
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
            Las probabilidades
            son estimaciones y
            no garantizan
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

          <div className="apiStatus">
            <span className="statusDot" />
            Datos deportivos
            conectados
          </div>

        </div>

        <div className="sportTabs">

          {Object.entries(
            sports
          ).map(
            ([
              key,
              item,
            ]) => (

              <button
                key={key}

                className={
                  sport === key
                    ? 'active'
                    : ''
                }

                onClick={() => {

                  if (
                    item.enabled
                  ) {
                    setSport(
                      key
                    );
                  }

                }}

                disabled={
                  !item.enabled
                }
              >

                {item.icon}{' '}
                {item.label}

                {!item.enabled && (
                  <small>
                    {' '}
                    Próximamente
                  </small>
                )}

              </button>

            )
          )}

        </div>

        <div className="dateFilters">

          {dateFilters.map(
            item => (

              <button
                key={
                  item.id
                }

                className={
                  dateFilter ===
                  item.id
                    ? 'dateButton activeDate'
                    : 'dateButton'
                }

                onClick={() =>
                  setDateFilter(
                    item.id
                  )
                }
              >
                {item.label}
              </button>

            )
          )}

        </div>

        <div className="competitionSelector">

          <label>
            Competición
          </label>

          <select
            value={
              selectedLeague
            }

            onChange={
              event =>
                setSelectedLeague(
                  event.target
                    .value
                )
            }
          >

            <option value="all">
              🌎 Todas las
              competiciones
            </option>

            {competitions.map(
              competition => (

                <option
                  key={
                    competition.key
                  }

                  value={
                    competition.key
                  }
                >

                  {getCountryEmoji(
                    competition.country
                  )}{' '}

                  {
                    competition.country
                  }

                  {' — '}

                  {
                    competition.league
                  }

                </option>

              )
            )}

          </select>

          {selectedCompetition && (

            <div className="selectedCompetition">

              {selectedCompetition.flag ? (

                <img
                  src={
                    selectedCompetition.flag
                  }
                  alt=""
                />

              ) : (

                <span>
                  {getCountryEmoji(
                    selectedCompetition.country
                  )}
                </span>

              )}

              <div>

                <small>
                  {
                    selectedCompetition.country
                  }
                </small>

                <strong>
                  {
                    selectedCompetition.league
                  }
                </strong>

              </div>

            </div>

          )}

        </div>

        <div className="matchSummary">

          <span>
            {loading
              ? 'Buscando partidos...'
              : `${filteredMatches.length} partido(s) disponible(s)`}
          </span>

          <button
            onClick={
              loadMatches
            }
            className="refreshButton"
          >
            ↻ Actualizar
          </button>

        </div>

        {error && (

          <div className="errorBox">

            <strong>
              No pudimos cargar
              los partidos.
            </strong>

            <p>
              {error}
            </p>

          </div>

        )}

        {loading ? (

          <div className="loadingBox">

            <div className="loader" />

            <strong>
              Cargando partidos…
            </strong>

            <small>
              Consultando datos
              deportivos.
            </small>

          </div>

        ) : filteredMatches.length ===
          0 ? (

          <div className="empty">

            <strong>
              No hay partidos
              disponibles.
            </strong>

            <small>
              Prueba con otra
              fecha o
              competición.
            </small>

          </div>

        ) : (

          <div className="matchesGrid">

            {filteredMatches.map(
              match => (

                <MatchCard
                  key={
                    match.id
                  }
                  match={
                    match
                  }
                  sport={
                    sport
                  }
                />

              )
            )}

          </div>

        )}

      </section>

      <section
        id="destacados"
        className="section analysisSection"
      >

        <span className="eyebrow">
          PRÓXIMA ETAPA
        </span>

        <h2>
          Análisis LizamaBet
        </h2>

        <p>
          Cada partido tendrá
          una ficha detallada
          utilizando únicamente
          datos disponibles de
          las fuentes
          deportivas.
        </p>

        <div className="featuresGrid">

          <div className="featureCard">
            <span>
              🎯
            </span>
            <strong>
              Pronósticos
            </strong>
            <p>
              1X2, doble
              oportunidad,
              goles, totales y
              tendencias.
            </p>
          </div>

          <div className="featureCard">
            <span>
              📈
            </span>
            <strong>
              Últimos 5/10
            </strong>
            <p>
              Forma reciente,
              local/visita y
              enfrentamientos
              directos.
            </p>
          </div>

          <div className="featureCard">
            <span>
              🚩
            </span>
            <strong>
              Córners
            </strong>
            <p>
              Promedios y
              tendencias de
              tiros de esquina
              cuando existan
              datos.
            </p>
          </div>

          <div className="featureCard">
            <span>
              👤
            </span>
            <strong>
              Jugadores
            </strong>
            <p>
              Remates, goles,
              tarjetas, puntos,
              triples, rebotes y
              más según deporte.
            </p>
          </div>

          <div className="featureCard">
            <span>
              💰
            </span>
            <strong>
              Cuotas
            </strong>
            <p>
              Comparación con
              cuotas reales
              cuando estén
              disponibles.
            </p>
          </div>

          <div className="featureCard">
            <span>
              💎
            </span>
            <strong>
              Valor
            </strong>
            <p>
              Probabilidad
              LizamaBet frente a
              la probabilidad
              implícita de la
              cuota.
            </p>
          </div>

        </div>

      </section>

      <section className="donationSection">

        <div>

          <span className="eyebrow">
            APOYA LIZAMABET
          </span>

          <h2>
            Ayuda a mantener el
            proyecto
          </h2>

          <p>
            {
              settings.donation_text
            }
          </p>

        </div>

        <a
          href="https://mpago.la/1dqB5EM"
          target="_blank"
          rel="noopener noreferrer"
          className="donationButton"
        >
          💙 Donar con
          Mercado Pago
        </a>

      </section>

      <footer>

        <img
          src="/logo.png"
          alt="LizamaBet"
        />

        <p>
          LizamaBet entrega
          información y análisis
          estadístico. No
          garantiza resultados
          deportivos.
        </p>

      </footer>

      <style jsx>{`

        .apiStatus {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(131,255,53,.08);
          border: 1px solid rgba(131,255,53,.25);
          font-size: 13px;
          font-weight: 700;
        }

        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 12px var(--primary);
        }

        .dateFilters {
          display: flex;
          gap: 8px;
          margin: 20px 0;
          overflow-x: auto;
        }

        .dateButton {
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: #fff;
          border-radius: 12px;
          padding: 11px 18px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .activeDate {
          background: var(--primary);
          color: #071008;
          border-color: var(--primary);
        }

        .competitionSelector {
          margin: 18px 0;
          padding: 18px;
          border-radius: 18px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.08);
        }

        .competitionSelector label {
          display: block;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          opacity: .65;
          margin-bottom: 9px;
        }

        .competitionSelector select {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          background: #11151a;
          color: #fff;
          font-size: 15px;
          outline: none;
        }

        .selectedCompetition {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .selectedCompetition img {
          width: 28px;
          max-height: 22px;
          object-fit: contain;
        }

        .selectedCompetition small,
        .selectedCompetition strong {
          display: block;
        }

        .selectedCompetition small {
          opacity: .6;
         
