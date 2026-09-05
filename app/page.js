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
          <div style={styles.modal
