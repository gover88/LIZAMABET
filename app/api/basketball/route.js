import { NextResponse } from 'next/server';

const API_URL =
  'https://v1.basketball.api-sports.io';

function getChileDate(addDays = 0) {
  const date = new Date();

  date.setDate(date.getDate() + addDays);

  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(date);

  const getPart = type =>
    parts.find(part => part.type === type)?.value;

  return `${getPart('year')}-${getPart(
    'month'
  )}-${getPart('day')}`;
}

async function fetchDate(date, apiKey) {
  const params = new URLSearchParams({
    date,
    timezone: 'America/Santiago',
  });

  const response = await fetch(
    `${API_URL}/games?${params.toString()}`,
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
    throw new Error(
      `API Basketball HTTP ${response.status}`
    );
  }

  return data.response || [];
}

function isUpcomingGame(game) {
  const status = String(
    game?.status?.short ||
      game?.status?.long ||
      ''
  ).toUpperCase();

  const finishedStatuses = [
    'FT',
    'AOT',
    'AP',
    'POST',
    'CANC',
  ];

  if (
    finishedStatuses.some(item =>
      status.includes(item)
    )
  ) {
    return false;
  }

  const start = new Date(game.date);

  if (Number.isNaN(start.getTime())) {
    return true;
  }

  return start.getTime() > Date.now();
}

export async function GET(request) {
  try {
    const apiKey =
      process.env.API_BASKETBALL_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'API_BASKETBALL_KEY no está configurada en Vercel.',
        },
        {
          status: 500,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const mode =
      searchParams.get('mode') || 'today';

    let days = [0];

    if (mode === 'tomorrow') {
      days = [1];
    }

    if (mode === 'upcoming') {
      days = [0, 1, 2, 3, 4, 5, 6, 7];
    }

    const responses = [];

    for (const day of days) {
      const date = getChileDate(day);

      const games = await fetchDate(
        date,
        apiKey
      );

      responses.push(...games);
    }

    const unique = new Map();

    for (const game of responses) {
      if (!game?.id) continue;

      unique.set(game.id, game);
    }

    const matches = [
      ...unique.values(),
    ]
      .filter(isUpcomingGame)
      .map(game => ({
        id: game.id,

        sport: 'basketball',

        startTime: game.date,

        timestamp: new Date(
          game.date
        ).getTime(),

        status:
          game.status?.long ||
          game.status?.short ||
          'Programado',

        league:
          game.league?.name ||
          'Competición',

        leagueId:
          game.league?.id || null,

        country:
          game.country?.name ||
          'Internacional',

        flag:
          game.country?.flag || null,

        leagueLogo:
          game.league?.logo || null,

        season:
          game.league?.season || null,

        home:
          game.teams?.home?.name ||
          'Local',

        homeId:
          game.teams?.home?.id || null,

        homeLogo:
          game.teams?.home?.logo ||
          null,

        away:
          game.teams?.away?.name ||
          'Visitante',

        awayId:
          game.teams?.away?.id || null,

        awayLogo:
          game.teams?.away?.logo ||
          null,
      }))
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() -
          new Date(b.startTime).getTime()
      );

    return NextResponse.json({
      ok: true,

      source: 'API-Basketball',

      sport: 'basketball',

      mode,

      count: matches.length,

      matches,
    });
  } catch (error) {
    console.error(
      'API Basketball error:',
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          'No fue posible consultar API-Basketball.',

        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
