import { NextResponse } from 'next/server';

const API_URL = 'https://v3.football.api-sports.io';

function getChileDate(addDays = 0) {
  const now = new Date();

  const chileNow = new Date(
    now.toLocaleString('en-US', {
      timeZone: 'America/Santiago',
    })
  );

  chileNow.setDate(chileNow.getDate() + addDays);

  const year = chileNow.getFullYear();

  const month = String(
    chileNow.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    chileNow.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function fetchFixtures(date, apiKey) {
  const params = new URLSearchParams({
    date,
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
    throw new Error(
      `API-Football HTTP ${response.status}`
    );
  }

  const errors = data?.errors;

  if (
    errors &&
    ((Array.isArray(errors) &&
      errors.length > 0) ||
      (!Array.isArray(errors) &&
        Object.keys(errors).length > 0))
  ) {
    throw new Error(
      JSON.stringify(errors)
    );
  }

  return data.response || [];
}

function isUpcomingFixture(item) {
  const status =
    item?.fixture?.status?.short || '';

  return ['NS', 'TBD'].includes(status);
}

export async function GET(request) {
  try {
    const apiKey =
      process.env.API_FOOTBALL_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'API_FOOTBALL_KEY no está configurada en Vercel.',
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
      days = [0, 1, 2, 3, 4, 5, 6];
    }

    const allFixtures = [];

    for (const dayOffset of days) {
      const date =
        getChileDate(dayOffset);

      const fixtures =
        await fetchFixtures(
          date,
          apiKey
        );

      allFixtures.push(
        ...fixtures
      );
    }

    const uniqueFixtures =
      new Map();

    for (const fixture of allFixtures) {
      if (!fixture?.fixture?.id) {
        continue;
      }

      uniqueFixtures.set(
        fixture.fixture.id,
        fixture
      );
    }

    const matches = [
      ...uniqueFixtures.values(),
    ]
      .filter(isUpcomingFixture)

      .map(item => ({
        id:
          item.fixture.id,

        sport:
          'football',

        startTime:
          item.fixture.date,

        timestamp:
          item.fixture.timestamp,

        status:
          item.fixture.status?.long ||
          'Programado',

        statusShort:
          item.fixture.status?.short ||
          'NS',

        league:
          item.league?.name ||
          'Competición',

        leagueId:
          item.league?.id ||
          null,

        country:
          item.league?.country ||
          'Internacional',

        leagueLogo:
          item.league?.logo ||
          null,

        flag:
          item.league?.flag ||
          null,

        season:
          item.league?.season ||
          null,

        round:
          item.league?.round ||
          null,

        home:
          item.teams?.home?.name ||
          'Local',

        homeId:
          item.teams?.home?.id ||
          null,

        homeLogo:
          item.teams?.home?.logo ||
          null,

        away:
          item.teams?.away?.name ||
          'Visitante',

        awayId:
          item.teams?.away?.id ||
          null,

        awayLogo:
          item.teams?.away?.logo ||
          null,
      }))

      .sort(
        (a, b) =>
          Number(a.timestamp) -
          Number(b.timestamp)
      );

    return NextResponse.json({
      ok: true,

      source:
        'API-Football',

      sport:
        'football',

      mode,

      count:
        matches.length,

      matches,
    });
  } catch (error) {
    console.error(
      'API Football error:',
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          'No fue posible consultar API-Football.',

        details:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
