import { NextResponse } from 'next/server';

const API_URL = 'https://v3.football.api-sports.io';

function getChileDate(addDays = 0) {
  const date = new Date();

  date.setDate(date.getDate() + addDays);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = type =>
    parts.find(part => part.type === type)?.value;

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

export async function GET(request) {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'API_FOOTBALL_KEY no está configurada en Vercel.',
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('mode') || 'today';

    let from = getChileDate(0);
    let to = getChileDate(0);

    if (mode === 'tomorrow') {
      from = getChileDate(1);
      to = getChileDate(1);
    }

    if (mode === 'upcoming') {
      from = getChileDate(0);
      to = getChileDate(7);
    }

    const params = new URLSearchParams({
      from,
      to,
      timezone: 'America/Santiago',
    });

    const response = await fetch(
      `${API_URL}/fixtures?${params.toString()}`,
      {
        headers: {
          'x-apisports-key': apiKey,
        },

        next: {
          revalidate: 900,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Error consultando API-Football.',
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    const errors = data?.errors;

    if (
      errors &&
      ((Array.isArray(errors) && errors.length > 0) ||
        (!Array.isArray(errors) &&
          Object.keys(errors).length > 0))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'API-Football devolvió un error.',
          details: errors,
        },
        {
          status: 502,
        }
      );
    }

    const matches = (data.response || [])
      .filter(item => {
        const status =
          item?.fixture?.status?.short || '';

        return ['NS', 'TBD'].includes(status);
      })
      .map(item => ({
        id: item.fixture.id,

        sport: 'football',

        startTime: item.fixture.date,

        timestamp: item.fixture.timestamp,

        status:
          item.fixture.status.long ||
          'Programado',

        league: item.league.name,

        leagueId: item.league.id,

        country:
          item.league.country || 'Internacional',

        leagueLogo:
          item.league.logo || null,

        flag:
          item.league.flag || null,

        season:
          item.league.season || null,

        round:
          item.league.round || null,

        home: item.teams.home.name,

        homeId: item.teams.home.id,

        homeLogo:
          item.teams.home.logo || null,

        away: item.teams.away.name,

        awayId: item.teams.away.id,

        awayLogo:
          item.teams.away.logo || null,
      }))
      .sort(
        (a, b) =>
          Number(a.timestamp) -
          Number(b.timestamp)
      );

    return NextResponse.json({
      ok: true,

      source: 'API-Football',

      sport: 'football',

      mode,

      from,

      to,

      count: matches.length,

      matches,
    });
  } catch (error) {
    console.error('API Football error:', error);

    return NextResponse.json(
      {
        ok: false,

        error:
          'No fue posible consultar API-Football.',

        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
