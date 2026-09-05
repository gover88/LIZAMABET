import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SPORTS = new Set(['football', 'tennis', 'basketball']);

function entityName(value, fallback) {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    return (
      value.name ||
      value.short_name ||
      value.title ||
      fallback
    );
  }

  return fallback;
}

function normalizeMatch(m = {}) {
  const home =
    m.home_team ??
    m.home ??
    m.team_home ??
    m.homeTeam ??
    null;

  const away =
    m.away_team ??
    m.away ??
    m.team_away ??
    m.awayTeam ??
    null;

  const league =
    m.league ??
    m.competition ??
    m.tournament ??
    null;

  const score = m.score || m.scores || {};

  const status =
    m.status?.name ||
    m.status?.type ||
    m.status ||
    m.state ||
    '';

  return {
    id: String(
      m.id ??
      m.match_id ??
      m.event_id ??
      crypto.randomUUID()
    ),

    sport: m.sport || null,

    league: entityName(
      league,
      m.league_name ||
      m.competition_name ||
      'Competición'
    ),

    country:
      (league && typeof league === 'object'
        ? league.country
        : '') ||
      m.country ||
      '',

    home: entityName(
      home,
      m.home_name || 'Local'
    ),

    away: entityName(
      away,
      m.away_name || 'Visita'
    ),

    homeScore:
      score.home ??
      score.home_score ??
      m.home_score ??
      null,

    awayScore:
      score.away ??
      score.away_score ??
      m.away_score ??
      null,

    status: String(status || ''),

    minute:
      m.minute ??
      m.elapsed ??
      m.clock ??
      null,

    startTime:
      m.start_time ||
      m.startTime ||
      m.time ||
      m.date ||
      m.datetime ||
      m.timestamp ||
      null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const sport =
    searchParams.get('sport') || 'football';

  if (!SPORTS.has(sport)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Deporte no válido',
      },
      { status: 400 }
    );
  }

  const base = (
    process.env.SPORTSCORE_BASE_URL ||
    'https://sportscore.com'
  ).replace(/\/$/, '');

  const endpoint =
    `${base}/api/widget/matches/` +
    `?sport=${encodeURIComponent(sport)}` +
    `&limit=50` +
    `&src=lizamabet`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `SportScore HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const candidates =
      Array.isArray(data)
        ? data
        : Array.isArray(data.matches)
        ? data.matches
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.results)
        ? data.results
        : [];

    return NextResponse.json({
      ok: true,
      source: 'SportScore',
      sport,
      updatedAt: new Date().toISOString(),
      matches: candidates.map(normalizeMatch),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: 'SportScore',
        sport,
        error:
          'No fue posible obtener datos de SportScore en este momento.',
        matches: [],
      },
      { status: 502 }
    );
  }
}
