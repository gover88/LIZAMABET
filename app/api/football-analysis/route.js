import { NextResponse } from 'next/server';

const API_URL = 'https://v3.football.api-sports.io';

async function apiFetch(endpoint, apiKey) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'x-apisports-key': apiKey,
    },
    next: {
      revalidate: 1800,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API-Football HTTP ${response.status}`);
  }

  const errors = data?.errors;

  if (
    errors &&
    ((Array.isArray(errors) && errors.length > 0) ||
      (!Array.isArray(errors) && Object.keys(errors).length > 0))
  ) {
    throw new Error(JSON.stringify(errors));
  }

  return data.response || [];
}

function percent(value, total) {
  if (!total) return null;

  return Math.round((value / total) * 100);
}

function calculateTeamTrends(fixtures, teamId) {
  if (!fixtures?.length) {
    return null;
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  let over15 = 0;
  let over25 = 0;
  let over35 = 0;

  let btts = 0;
  let cleanSheets = 0;
  let scored = 0;

  fixtures.forEach(item => {
    const isHome =
      Number(item?.teams?.home?.id) === Number(teamId);

    const gf = Number(
      isHome
        ? item?.goals?.home ?? 0
        : item?.goals?.away ?? 0
    );

    const ga = Number(
      isHome
        ? item?.goals?.away ?? 0
        : item?.goals?.home ?? 0
    );

    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;

    const totalGoals = gf + ga;

    if (totalGoals > 1.5) over15++;
    if (totalGoals > 2.5) over25++;
    if (totalGoals > 3.5) over35++;

    if (gf > 0 && ga > 0) btts++;

    if (ga === 0) cleanSheets++;

    if (gf > 0) scored++;
  });

  const total = fixtures.length;

  return {
    matches: total,

    record: {
      wins,
      draws,
      losses,
    },

    goals: {
      for: goalsFor,
      against: goalsAgainst,

      averageFor:
        Math.round((goalsFor / total) * 100) / 100,

      averageAgainst:
        Math.round((goalsAgainst / total) * 100) / 100,
    },

    trends: {
      over15: percent(over15, total),
      over25: percent(over25, total),
      over35: percent(over35, total),

      bothTeamsScore:
        percent(btts, total),

      scored:
        percent(scored, total),

      cleanSheet:
        percent(cleanSheets, total),
    },
  };
}

function simplifyFixture(item) {
  return {
    id: item?.fixture?.id,

    date: item?.fixture?.date,

    league:
      item?.league?.name || null,

    home: {
      id: item?.teams?.home?.id,
      name: item?.teams?.home?.name,
      logo: item?.teams?.home?.logo,
      goals: item?.goals?.home,
    },

    away: {
      id: item?.teams?.away?.id,
      name: item?.teams?.away?.name,
      logo: item?.teams?.away?.logo,
      goals: item?.goals?.away,
    },
  };
}

function simplifyPrediction(data) {
  if (!data) return null;

  const prediction = data?.predictions;

  return {
    winner:
      prediction?.winner?.name || null,

    winnerComment:
      prediction?.winner?.comment || null,

    advice:
      prediction?.advice || null,

    underOver:
      prediction?.under_over || null,

    goals: {
      home:
        prediction?.goals?.home || null,

      away:
        prediction?.goals?.away || null,
    },

    probabilities: {
      home:
        prediction?.percent?.home || null,

      draw:
        prediction?.percent?.draw || null,

      away:
        prediction?.percent?.away || null,
    },

    comparison:
      data?.comparison || null,
  };
}

function simplifyOdds(data) {
  if (!data?.length) {
    return {
      available: false,
      bookmakers: [],
    };
  }

  const result = [];

  data.forEach(event => {
    (event?.bookmakers || []).forEach(bookmaker => {
      const markets = [];

      (bookmaker?.bets || []).forEach(bet => {
        markets.push({
          id: bet?.id,
          name: bet?.name,

          values:
            (bet?.values || []).map(value => ({
              value: value?.value,
              odd: value?.odd,
              handicap:
                value?.handicap ?? null,
            })),
        });
      });

      result.push({
        id: bookmaker?.id,
        name: bookmaker?.name,
        markets,
      });
    });
  });

  return {
    available: result.length > 0,
    bookmakers: result,
  };
}

function getStatValue(statistics, type) {
  const item =
    statistics?.find(
      stat => stat?.type === type
    );

  return item?.value ?? null;
}

function simplifyTeamStatistics(data) {
  if (!data?.length) {
    return {
      available: false,
      teams: [],
    };
  }

  return {
    available: true,

    teams: data.map(item => ({
      team: {
        id: item?.team?.id,
        name: item?.team?.name,
        logo: item?.team?.logo,
      },

      shots: {
        total:
          getStatValue(
            item?.statistics,
            'Total Shots'
          ),

        onTarget:
          getStatValue(
            item?.statistics,
            'Shots on Goal'
          ),

        offTarget:
          getStatValue(
            item?.statistics,
            'Shots off Goal'
          ),

        blocked:
          getStatValue(
            item?.statistics,
            'Blocked Shots'
          ),
      },

      corners:
        getStatValue(
          item?.statistics,
          'Corner Kicks'
        ),

      fouls:
        getStatValue(
          item?.statistics,
          'Fouls'
        ),

      offsides:
        getStatValue(
          item?.statistics,
          'Offsides'
        ),

      possession:
        getStatValue(
          item?.statistics,
          'Ball Possession'
        ),

      yellowCards:
        getStatValue(
          item?.statistics,
          'Yellow Cards'
        ),

      redCards:
        getStatValue(
          item?.statistics,
          'Red Cards'
        ),

      goalkeeperSaves:
        getStatValue(
          item?.statistics,
          'Goalkeeper Saves'
        ),

      passes:
        getStatValue(
          item?.statistics,
          'Total passes'
        ),

      passAccuracy:
        getStatValue(
          item?.statistics,
          'Passes %'
        ),
    })),
  };
}

function simplifyPlayers(data) {
  if (!data?.length) {
    return {
      available: false,
      teams: [],
    };
  }

  return {
    available: true,

    teams: data.map(team => ({
      team: team?.team,

      players:
        (team?.players || []).map(item => {
          const stat =
            item?.statistics?.[0] || {};

          return {
            id: item?.player?.id,

            name:
              item?.player?.name,

            photo:
              item?.player?.photo,

            minutes:
              stat?.games?.minutes ?? null,

            position:
              stat?.games?.position ?? null,

            rating:
              stat?.games?.rating ?? null,

            shots: {
              total:
                stat?.shots?.total ?? null,

              onTarget:
                stat?.shots?.on ?? null,
            },

            goals:
              stat?.goals?.total ?? null,

            assists:
              stat?.goals?.assists ?? null,

            passes:
              stat?.passes?.total ?? null,

            keyPasses:
              stat?.passes?.key ?? null,

            tackles:
              stat?.tackles?.total ?? null,

            interceptions:
              stat?.tackles?.interceptions ??
              null,

            fouls: {
              drawn:
                stat?.fouls?.drawn ?? null,

              committed:
                stat?.fouls?.committed ?? null,
            },

            cards: {
              yellow:
                stat?.cards?.yellow ?? null,

              red:
                stat?.cards?.red ?? null,
            },
          };
        }),
    })),
  };
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
            'API_FOOTBALL_KEY no está configurada.',
        },
        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const fixtureId =
      searchParams.get('fixture');

    const homeId =
      searchParams.get('home');

    const awayId =
      searchParams.get('away');

    if (!fixtureId || !homeId || !awayId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Faltan parámetros del partido.',

          required:
            '?fixture=ID&home=ID&away=ID',
        },
        { status: 400 }
      );
    }

    /*
      IMPORTANTE:
      Se hacen primero las consultas esenciales.

      No consultamos jugadores históricos partido
      por partido todavía, porque el plan gratuito
      tiene un límite diario.
    */

    const [
      fixtureResponse,
      predictionResponse,
      h2hResponse,
      homeLast,
      awayLast,
      oddsResponse,
    ] = await Promise.all([
      apiFetch(
        `/fixtures?id=${fixtureId}`,
        apiKey
      ),

      apiFetch(
        `/predictions?fixture=${fixtureId}`,
        apiKey
      ).catch(() => []),

      apiFetch(
        `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=10`,
        apiKey
      ).catch(() => []),

      apiFetch(
        `/fixtures?team=${homeId}&last=10&status=FT`,
        apiKey
      ).catch(() => []),

      apiFetch(
        `/fixtures?team=${awayId}&last=10&status=FT`,
        apiKey
      ).catch(() => []),

      apiFetch(
        `/odds?fixture=${fixtureId}`,
        apiKey
      ).catch(() => []),
    ]);

    const fixture =
      fixtureResponse?.[0] || null;

    if (!fixture) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'El partido no fue encontrado.',
        },
        { status: 404 }
      );
    }

    /*
      Las estadísticas y jugadores de /fixtures
      corresponden principalmente a partidos que
      ya tienen esos datos generados.

      Para un partido futuro normalmente pueden
      venir vacíos. Se devuelve "available:false"
      y nunca inventamos valores.
    */

    const teamStatistics =
      await apiFetch(
        `/fixtures/statistics?fixture=${fixtureId}`,
        apiKey
      ).catch(() => []);

    const playerStatistics =
      await apiFetch(
        `/fixtures/players?fixture=${fixtureId}`,
        apiKey
      ).catch(() => []);

    const homeTrend =
      calculateTeamTrends(
        homeLast,
        homeId
      );

    const awayTrend =
      calculateTeamTrends(
        awayLast,
        awayId
      );

    return NextResponse.json({
      ok: true,

      source:
        'API-Football',

      fixture: {
        id:
          fixture?.fixture?.id,

        date:
          fixture?.fixture?.date,

        status:
          fixture?.fixture?.status,

        venue:
          fixture?.fixture?.venue,

        referee:
          fixture?.fixture?.referee,

        league:
          fixture?.league,

        home:
          fixture?.teams?.home,

        away:
          fixture?.teams?.away,
      },

      prediction: {
        available:
          predictionResponse.length > 0,

        data:
          simplifyPrediction(
            predictionResponse?.[0]
          ),
      },

      form: {
        home: {
          team:
            fixture?.teams?.home,

          last10:
            homeLast.map(
              simplifyFixture
            ),

          analysis:
            homeTrend,
        },

        away: {
          team:
            fixture?.teams?.away,

          last10:
            awayLast.map(
              simplifyFixture
            ),

          analysis:
            awayTrend,
        },
      },

      h2h: {
        available:
          h2hResponse.length > 0,

        matches:
          h2hResponse.map(
            simplifyFixture
          ),
      },

      odds:
        simplifyOdds(
          oddsResponse
        ),

      matchStatistics:
        simplifyTeamStatistics(
          teamStatistics
        ),

      players:
        simplifyPlayers(
          playerStatistics
        ),

      availability: {
        prediction:
          predictionResponse.length > 0,

        h2h:
          h2hResponse.length > 0,

        odds:
          oddsResponse.length > 0,

        matchStatistics:
          teamStatistics.length > 0,

        players:
          playerStatistics.length > 0,
      },

      notice:
        'LizamaBet muestra únicamente datos obtenidos de la fuente. Los campos sin cobertura se indican como no disponibles.',
    });
  } catch (error) {
    console.error(
      'Football analysis error:',
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          'No fue posible generar el análisis del partido.',

        details:
          error.message,
      },
      { status: 500 }
    );
  }
}
