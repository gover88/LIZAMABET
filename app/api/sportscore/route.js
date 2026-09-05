import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SPORTS = new Set(['football', 'tennis', 'basketball']);

function normalizeMatch(m = {}) {
  const home = m.home_team || m.home || m.team_home || m.homeTeam || {};
  const away = m.away_team || m.away || m.team_away || m.awayTeam || {};
  const league = m.league || m.competition || m.tournament || {};
  const score = m.score || m.scores || {};
  return {
    id: String(m.id ?? m.match_id ?? m.event_id ?? crypto.randomUUID()),
    sport: m.sport || null,
    league: league.name || m.league_name || m.competition_name || 'Competición',
    country: league.country || m.country || '',
    home: home.name || home.short_name || m.home_name || String(home || 'Local'),
    away: away.name || away.short_name || m.away_name || String(away || 'Visita'),
    homeScore: score.home ?? score.home_score ?? m.home_score ?? null,
    awayScore: score.away ?? score.away_score ?? m.away_score ?? null,
    status: m.status?.name || m.status || m.state || '',
    minute: m.minute ?? m.elapsed ?? m.clock ?? null,
    startTime: m.start_time || m.startTime || m.date || m.datetime || m.timestamp || null,
    raw: m
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'football';
  if (!SPORTS.has(sport)) {
    return NextResponse.json({ ok: false, error: 'Deporte no válido' }, { status: 400 });
  }

  const base = (process.env.SPORTSCORE_BASE_URL || 'https://sportscore.com').replace(/\/$/, '');
  const endpoint = `${base}/api/widget/matches/?sport=${encodeURIComponent(sport)}&limit=20&src=lizamabet`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error(`SportScore HTTP ${response.status}`);
    const data = await response.json();

    const candidates =
      Array.isArray(data) ? data :
      Array.isArray(data.matches) ? data.matches :
      Array.isArray(data.data) ? data.data :
      Array.isArray(data.results) ? data.results : [];

    return NextResponse.json({
      ok: true,
      source: 'SportScore',
      sport,
      updatedAt: new Date().toISOString(),
      matches: candidates.map(normalizeMatch)
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'SportScore',
      sport,
      error: 'No fue posible obtener datos de SportScore en este momento.',
      matches: []
    }, { status: 502 });
  }
}
