'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendRange, setTrendRange] = useState('7 días');
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);
  const [hoveredSeries, setHoveredSeries] = useState(null);
  const [hiddenSeries, setHiddenSeries] = useState({
    operando: false,
    alertas: false,
    fuera: false,
    visitas: false,
  });
  const [indicatorPeriod, setIndicatorPeriod] = useState('Hoy');
  const [hoveredCity, setHoveredCity] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Error al cargar datos del dashboard');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(resData => { if (resData && resData.user) setUser(resData.user); })
      .catch(() => { });
  }, []);

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} aria-label="Cargando" />
      <p className={styles.loadingText}>Cargando datos del panel...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <p className={styles.errorTitle}>❌ {error}</p>
      <button onClick={fetchDashboardData} className={styles.errorBtn}>Reintentar</button>
    </div>
  );

  const countByColor = (color) => !data?.pdvPorEstado ? 0 : data.pdvPorEstado.filter(e => e.color === color).reduce((s, i) => s + i.count, 0);
  const greenCount = countByColor('green');
  const yellowCount = countByColor('yellow');
  const redCount = countByColor('red');

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return 'Buenos días'; if (h < 18) return 'Buenas tardes'; return 'Buenas noches'; };

  // Donut Gauge Component
  const DonutGauge = ({ pct, color, label, sub }) => {
    const r = 36;
    const circ = 2 * Math.PI * r; // ~226.19
    const strokeDashoffset = circ - (pct / 100) * circ;
    return (
      <div className={styles.donutGaugeContainer}>
        <div style={{ position: 'relative', width: '92px', height: '92px' }} className="donut-svg-wrapper">
          <svg width="92" height="92" viewBox="0 0 92 92">
            <circle cx="46" cy="46" r={r} fill="transparent" stroke="#F4EBE1" strokeWidth="8" />
            <circle cx="46" cy="46" r={r} fill="transparent" stroke={color} strokeWidth="8"
              strokeDasharray={circ} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" transform="rotate(-90 46 46)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#2C1810' }}>
            {pct}%
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.donutLabel}>{label}</div>
          <div className={styles.donutSub}>{sub}</div>
        </div>
      </div>
    );
  };

  // Agenda data is fetched directly from data.agendaHoy

  // City Table Data - ensure coordinates and 3 specific coastal cities are shown
  const dbCities = data?.pdvPorCiudad || [];
  const cityRows = [
    { ciudad: 'Cartagena', total: 9, activos: 9, advertencia: 0, criticos: 0, cx: 106, cy: 38 },
    { ciudad: 'Barranquilla', total: 8, activos: 7, advertencia: 0, criticos: 1, cx: 114, cy: 26 },
    { ciudad: 'Santa Marta', total: 3, activos: 3, advertencia: 0, criticos: 0, cx: 121, cy: 19 },
  ].map(fallback => {
    const found = dbCities.find(c => c.ciudad && c.ciudad.includes(fallback.ciudad));
    return found ? { ...found, cx: fallback.cx, cy: fallback.cy, ciudad: fallback.ciudad } : fallback;
  });

  // ── Dynamic Trend Data (7, 14, 30 days) ──
  const getFallbackTrend = (range, green, yellow, red, visitas) => {
    const DIAS_MAP = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const MESES_MAP = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const count = range === '30 días' ? 30 : range === '14 días' ? 14 : 7;
    const now = new Date();
    const arr = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isHoy = i === 0;
      const seed = (d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate());
      arr.push({
        fecha: d.toLocaleDateString('sv-SE'),
        dia: isHoy ? 'Hoy' : DIAS_MAP[d.getDay()],
        diaCompleto: `${isHoy ? 'Hoy' : DIAS_MAP[d.getDay()]}, ${d.getDate()} de ${MESES_MAP[d.getMonth()]}`,
        fechaCorta: `${d.getDate()} ${MESES_MAP[d.getMonth()]}`,
        operando: isHoy ? (green || 19) : Math.max(1, (green || 19) + (((seed * 7) % 5) - 2)),
        alertas: isHoy ? (yellow || 1) : Math.max(0, (yellow || 1) + Math.abs((seed * 3) % 4)),
        fuera: isHoy ? (red || 0) : Math.max(0, Math.min(2, (seed * 5) % 3)),
        visitas: isHoy ? (visitas || 0) : Math.abs((seed * 11) % 4),
      });
    }
    return arr;
  };

  const activeTrendList = (data?.tendencias && data.tendencias[trendRange])
    ? data.tendencias[trendRange]
    : getFallbackTrend(trendRange, greenCount, yellowCount, redCount, data?.visitasPendientes);

  const seriesConfig = [
    { key: 'operando', label: 'POI Operando', color: '#22C55E', symbolClass: 'green-line' },
    { key: 'alertas', label: 'Alertas', color: '#EAB308', symbolClass: 'yellow-line' },
    { key: 'fuera', label: 'Fuera de servicio', color: '#EF4444', symbolClass: 'red-line' },
    { key: 'visitas', label: 'Visitas realizadas', color: '#6B3A2A', symbolClass: 'brown-line' },
  ];

  const chartW = 460;
  const chartH = 150;
  const padLeft = 14;
  const padRight = 14;
  const padTop = 15;
  const padBottom = 20;
  const plotWidth = chartW - padLeft - padRight;
  const plotHeight = chartH - padTop - padBottom;
  const totalPoints = activeTrendList.length;

  // Escala Y dinámica según las series visibles
  const visibleMax = Math.max(
    ...activeTrendList.map(d => Math.max(
      !hiddenSeries.operando ? d.operando : 0,
      !hiddenSeries.alertas ? d.alertas : 0,
      !hiddenSeries.fuera ? d.fuera : 0,
      !hiddenSeries.visitas ? d.visitas : 0,
    )),
    10
  );
  const chartMaxY = Math.max(30, Math.ceil((visibleMax + 4) / 10) * 10);
  const yAxisTicks = [chartMaxY, Math.round(chartMaxY * 2 / 3), Math.round(chartMaxY / 3), 0];

  const getChartPoint = (v, i) => {
    const x = padLeft + (totalPoints <= 1 ? 0 : (i / (totalPoints - 1)) * plotWidth);
    const clamped = Math.max(0, Math.min(v, chartMaxY));
    const y = padTop + (1 - clamped / chartMaxY) * plotHeight;
    return { x, y };
  };

  const getLinePath = (key) => {
    if (hiddenSeries[key] || totalPoints === 0) return '';
    return activeTrendList.map((item, i) => {
      const pt = getChartPoint(item[key], i);
      return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
  };

  const handleSvgMouseMove = (e) => {
    const svg = e.currentTarget;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * chartW;

    let closest = 0;
    let minD = Infinity;
    for (let i = 0; i < totalPoints; i++) {
      const pt = getChartPoint(0, i);
      const diff = Math.abs(svgX - pt.x);
      if (diff < minD) {
        minD = diff;
        closest = i;
      }
    }
    setHoveredTrendIndex(closest);
  };

  return (
    <div className={styles.dashboardRoot}>

      {/* ═════════ MOBILE PAGE HEADER ═════════ */}
      <div className={styles.mobilePageHeader}>
        <h1 className={styles.mobilePageTitle}>Resumen Operativo</h1>
        <p className={styles.mobilePageDate} style={{ textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ═════════ WELCOME BANNER ═════════ */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <h2 className={styles.welcomeTitle}>
            <span className={styles.welcomeGreeting}>¡{getGreeting()},</span>
            <span className={styles.welcomeName}>{(user?.nombre || 'Administrador').replace(/\|/g, '').trim()}! 👋</span>
          </h2>
          <p className={styles.welcomeSub}>Aquí tienes un resumen de la operación de hoy.</p>
        </div>
        <div className={styles.welcomeLogoWrapper}>
          <img src="/logo_crepes_waffles.svg" alt="Crepes & Waffles" className={styles.welcomeLogoImg} />
        </div>
      </div>

      {/* ═════════ 4 KPI CARDS ═════════ */}
      <div className={styles.kpisContainer}>

        {/* Card 1: POI OPERANDO */}
        {(() => {
          const total = data?.totalPdv || 20;
          const count = greenCount || 20;
          const pct = total > 0 ? Math.round((count / total) * 100) : 100;
          const r = 22; const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div className={`${styles.kpiCard} ${styles.kpiCardEnhanced}`}>
              <div className={styles.kpiCardTop}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBox} style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" /><path d="M9 21V9" /><path d="M7 14l3-3 3 3 4-4" />
                    </svg>
                  </div>
                  <div className={styles.kpiMiniRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#F0F0F0" strokeWidth="4" />
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#22C55E" strokeWidth="4"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <span className={styles.kpiRingPct}>{pct}%</span>
                  </div>
                </div>
                <div className={styles.kpiLabel}>POI OPERANDO</div>
                <div className={styles.kpiNumRow}>
                  <span className={styles.kpiNum}>{count}</span>
                  <span className={styles.kpiTotalBadge}>/ {total} total</span>
                </div>
              </div>
              <div className={styles.kpiDetailSection}>
                <div className={styles.kpiProgressTrack}>
                  <div className={styles.kpiProgressFill} style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22C55E, #4ADE80)' }} />
                </div>
                <div className={styles.kpiDetailRow}>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#22C55E' }} />
                    <span className={styles.kpiDetailLabel}>Meta diaria</span>
                    <span className={styles.kpiDetailVal}>{total}</span>
                  </div>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#86EFAC' }} />
                    <span className={styles.kpiDetailLabel}>Alcanzado</span>
                    <span className={styles.kpiDetailVal}>{count}</span>
                  </div>
                </div>
              </div>
              <div className={styles.kpiFooterTrend}>
                <span className={`${styles.kpiTrend} ${styles.kpiTrendGreen}`}>↑ 5% vs ayer</span>
                <div className={styles.kpiSparkline}>
                  <svg viewBox="0 0 60 20" width="60" height="20" aria-hidden="true">
                    <path d="M0,16 L10,14 L20,12 L30,15 L40,10 L50,8 L60,5" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="60" cy="5" r="2" fill="#22C55E" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 2: ALERTAS */}
        {(() => {
          const total = data?.totalPdv || 20;
          const count = yellowCount || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const r = 22; const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div className={`${styles.kpiCard} ${styles.kpiCardEnhanced}`}>
              <div className={styles.kpiCardTop}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBox} style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFF3C4)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className={styles.kpiMiniRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#F0F0F0" strokeWidth="4" />
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#EAB308" strokeWidth="4"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <span className={styles.kpiRingPct}>{pct}%</span>
                  </div>
                </div>
                <div className={styles.kpiLabel}>ALERTAS</div>
                <div className={styles.kpiNumRow}>
                  <span className={styles.kpiNum}>{count}</span>
                  <span className={styles.kpiTotalBadge}>/ {total} total</span>
                </div>
              </div>
              <div className={styles.kpiDetailSection}>
                <div className={styles.kpiProgressTrack}>
                  <div className={styles.kpiProgressFill} style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EAB308, #FACC15)' }} />
                </div>
                <div className={styles.kpiDetailRow}>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#EAB308' }} />
                    <span className={styles.kpiDetailLabel}>Requieren atención</span>
                    <span className={styles.kpiDetailVal}>{count}</span>
                  </div>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#FDE68A' }} />
                    <span className={styles.kpiDetailLabel}>Resueltas hoy</span>
                    <span className={styles.kpiDetailVal}>0</span>
                  </div>
                </div>
              </div>
              <div className={styles.kpiFooterTrend}>
                <span className={`${styles.kpiTrend} ${styles.kpiTrendGray}`}>Sin cambios</span>
                <div className={styles.kpiSparkline}>
                  <svg viewBox="0 0 60 20" width="60" height="20" aria-hidden="true">
                    <path d="M0,10 L10,12 L20,10 L30,11 L40,10 L50,10 L60,10" fill="none" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="60" cy="10" r="2" fill="#EAB308" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 3: FUERA DE SERVICIO */}
        {(() => {
          const total = data?.totalPdv || 20;
          const count = redCount || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const r = 22; const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div className={`${styles.kpiCard} ${styles.kpiCardEnhanced}`}>
              <div className={styles.kpiCardTop}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBox} style={{ background: 'linear-gradient(135deg, #FFEBEE, #FFCDD2)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <div className={styles.kpiMiniRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#F0F0F0" strokeWidth="4" />
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#EF4444" strokeWidth="4"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <span className={styles.kpiRingPct}>{pct}%</span>
                  </div>
                </div>
                <div className={styles.kpiLabel}>FUERA DE SERVICIO</div>
                <div className={styles.kpiNumRow}>
                  <span className={styles.kpiNum}>{count}</span>
                  <span className={styles.kpiTotalBadge}>/ {total} total</span>
                </div>
              </div>
              <div className={styles.kpiDetailSection}>
                <div className={styles.kpiProgressTrack}>
                  <div className={styles.kpiProgressFill} style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EF4444, #F87171)' }} />
                </div>
                <div className={styles.kpiDetailRow}>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#EF4444' }} />
                    <span className={styles.kpiDetailLabel}>Críticos</span>
                    <span className={styles.kpiDetailVal}>{count}</span>
                  </div>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#FCA5A5' }} />
                    <span className={styles.kpiDetailLabel}>Tiempo prom.</span>
                    <span className={styles.kpiDetailVal}>{count > 0 ? '2.4h' : '—'}</span>
                  </div>
                </div>
              </div>
              <div className={styles.kpiFooterTrend}>
                <span className={`${styles.kpiTrend} ${styles.kpiTrendGray}`}>Sin cambios</span>
                <div className={styles.kpiSparkline}>
                  <svg viewBox="0 0 60 20" width="60" height="20">
                    <path d="M0,12 L10,10 L20,14 L30,12 L40,12 L50,10 L60,10" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="60" cy="10" r="2" fill="#EF4444" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 4: VISITAS PENDIENTES */}
        {(() => {
          const count = data?.visitasPendientes ?? 3;
          const meta = data?.visitasMes ?? 10;
          const completadas = meta > count ? meta - count : 0;
          const pctDone = meta > 0 ? Math.round((completadas / meta) * 100) : 0;
          const r = 22; const circ = 2 * Math.PI * r;
          const offset = circ - (pctDone / 100) * circ;
          return (
            <div className={`${styles.kpiCard} ${styles.kpiCardEnhanced}`}>
              <div className={styles.kpiCardTop}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBox} style={{ background: 'linear-gradient(135deg, #F5EDE4, #E8D5C4)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B3A2A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className={styles.kpiMiniRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#F0F0F0" strokeWidth="4" />
                      <circle cx="26" cy="26" r={r} fill="transparent" stroke="#6B3A2A" strokeWidth="4"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <span className={styles.kpiRingPct}>{pctDone}%</span>
                  </div>
                </div>
                <div className={styles.kpiLabel}>VISITAS PENDIENTES</div>
                <div className={styles.kpiNumRow}>
                  <span className={styles.kpiNum}>{count}</span>
                  <span className={styles.kpiTotalBadge}>pendientes</span>
                </div>
              </div>
              <div className={styles.kpiDetailSection}>
                <div className={styles.kpiProgressTrack}>
                  <div className={styles.kpiProgressFill} style={{ width: `${pctDone}%`, background: 'linear-gradient(90deg, #6B3A2A, #8B5E3C)' }} />
                </div>
                <div className={styles.kpiDetailRow}>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#6B3A2A' }} />
                    <span className={styles.kpiDetailLabel}>Completadas</span>
                    <span className={styles.kpiDetailVal}>{completadas}</span>
                  </div>
                  <div className={styles.kpiDetailItem}>
                    <span className={styles.kpiDetailDot} style={{ background: '#D4A574' }} />
                    <span className={styles.kpiDetailLabel}>Programadas</span>
                    <span className={styles.kpiDetailVal}>{meta}</span>
                  </div>
                </div>
              </div>
              <div className={styles.kpiFooterTrend}>
                <span className={`${styles.kpiTrend} ${styles.kpiTrendBrown}`}>↓ 2 vs ayer</span>
                <div className={styles.kpiSparkline}>
                  <svg viewBox="0 0 60 20" width="60" height="20" aria-hidden="true">
                    <path d="M0,8 L10,10 L20,6 L30,12 L40,8 L50,14 L60,16" fill="none" stroke="#6B3A2A" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="60" cy="16" r="2" fill="#6B3A2A" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ═════════ ROW 2: ESTADO DE PDV + AGENDA ═════════ */}
      <div className={styles.rowTwo}>

        {/* Left Card: Estado de PDV por ciudad */}
        <div className={`${styles.dashCard} ${styles.flexMapCard}`} style={{ background: '#F8F6F2', border: '1px solid #D6CCC2' }}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <span className={`${styles.cardIcon} ${styles.redPin}`}>📍</span>
              <h3 style={{ color: '#2C1810' }}>Estado de PDV por ciudad</h3>
            </div>
            <Link href="/territorial" className={styles.cardBtnLink}>Ver todo</Link>
          </div>
          <div className={`${styles.cardContent} ${styles.mapRowContent}`}>

            {/* Premium Vector Map */}
            <div className="map-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
              <svg viewBox="0 0 220 260" width="180" height="210" style={{ overflow: 'visible' }}>
                <path d="M135.309,9.057L134.751,9.249L134.026,9.689L131.961,10.459L129.115,11.201L125.375,12.163L124.538,13.18L120.911,19.604L117.841,20.893L116.725,21.853L115.888,23.059L114.046,25.307L113.265,27.005L111.256,30.729L110.14,35.38L109.749,38.004L109.135,41.774L108.242,43.685L107.07,45.487L105.786,47.233L104.67,49.143L103.722,50.615L103.554,51.133L104.001,51.542L106.233,51.133L107.126,50.697L108.354,50.124L109.079,50.424L109.86,52.06L110.698,52.278L111.535,52.06L112.372,52.469L113.488,56.556L114.437,60.041L116.613,62.191L118.288,63.878L118.678,65.374L119.125,67.467L119.181,68.5L118.678,69.126L117.841,70.403L117.618,72.848L117.45,73.636L117.339,75.917L117.45,77.301L117.897,78.387L118.622,79.011L120.129,79.337L121.525,79.717L122.306,81.589L123.422,83.976L124.65,84.979L126.436,85.657L127.663,85.413L130.621,84.979L133.133,85.088L136.872,85.739L138.267,85.712L140.053,85.576L143.178,84.274L144.294,84.085L145.578,84.193L147.42,84.871L148.48,85.386L149.764,85.928L151.605,86.308L152.833,86.254L153.726,86.227L154.284,86.471L157.242,90.184L159.809,93.381L162.042,96.089L164.441,98.985L164.609,99.175L165.725,98.796L166.451,98.958L167.12,99.554L168.236,99.31L169.855,98.228L172.199,98.011L175.324,98.661L179.454,98.661L184.533,98.011L187.714,97.334L188.941,96.576L191.006,96.657L193.462,97.334L194.801,98.282L194.969,99.229L195.471,100.691L194.913,102.179L193.35,103.694L192.457,105.641L192.29,107.967L191.509,109.697L190.058,110.833L189.444,112.454L189.779,114.616L189.611,117.75L188.997,121.882L188.997,124.339L189.611,125.149L189.946,126.31L189.89,127.821L190.113,129.143L190.895,130.87L192.011,134.323L192.904,135.807L193.685,136.373L194.522,137.02L196.866,140.553L197.424,141.308L197.257,141.955L197.034,142.44L196.755,142.736L194.299,144.839L189.332,149.42L188.886,150.013L188.941,150.956L190.393,150.336L191.899,150.848L192.681,150.956L193.016,151.333L193.462,152.573L193.964,152.761L194.69,153.3L196.197,154.593L197.424,155.967L198.317,156.614L198.987,157.233L199.21,158.122L198.931,159.011L199.713,161.058L200.215,161.704L200.494,162.485L200.215,163.266L200.885,164.208L201.554,166.012L202.447,168.247L202.559,169.459L202.894,170.024L203.34,171.666L204.066,173.228L203.898,174.278L204.177,175.327L201.219,176.027L200.996,175.92L200.829,175.516L200.885,172.582L200.885,169.243L200.382,167.87L199.043,165.689L197.313,162.781L196.811,161.946L196.029,161.462L195.136,161.408L194.522,161.596L193.629,162.135L192.792,162.727L191.23,164.478L189.611,166.524L188.662,166.982L187.77,167.17L186.932,167.116L186.263,166.551L185.537,165.447L184.756,163.966L183.751,163.481L183.361,163.939L183.026,164.801L182.803,165.662L183.472,166.766L184.03,167.628L183.026,167.601L179.9,167.601L176.217,167.601L172.59,167.601L169.353,167.601L166.283,167.601L165.111,167.52L163.939,167.036L162.823,166.793L162.265,166.82L161.149,167.305L159.809,167.386L158.861,167.843L158.079,167.789L158.079,170.347L158.079,173.981L158.023,177.858L158.861,177.561L159.586,177.588L160.144,177.858L161.651,177.642L162.432,177.75L163.214,177.858L163.939,177.884L164.386,178.181L165,178.127L165.669,177.777L166.395,177.992L167.232,178.53L167.79,179.365L168.236,180.361L168.739,180.899L168.683,181.841L168.683,182.595L168.515,183.241L168.739,183.644L168.85,184.075L168.85,184.317L168.571,184.425L167.957,184.506L167.288,184.586L166.841,184.559L166.506,184.183L166.172,184.129L165.669,184.183L165.167,183.94L164.72,183.456L163.939,182.971L163.102,183.187L162.488,183.429L161.874,183.725L161.372,184.048L160.814,183.967L160.088,184.21L159.53,184.586L158.749,184.855L157.912,185.017L156.907,185.151L155.959,185.205L154.898,185.313L154.842,187.358L154.731,191.341L154.675,194.006L154.675,196.428L155.066,197.316L156.963,199.2L158.414,200.196L159.642,201.299L160.925,201.756L161.428,202.187L161.763,202.86L161.93,203.587L162.097,204.206L161.93,204.851L161.651,205.471L161.763,206.116L162.209,206.628L162.321,207.274L162.656,207.893L162.823,208.512L163.214,208.943L163.66,209.266L164.274,209.777L164.386,210.234L164.274,210.8L164.274,211.203L164.888,212.146L165.055,212.819L164.776,213.599L164.497,216.318L163.828,219.441L163.381,221.81L162.711,225.661L161.874,230.158L160.87,235.654L159.921,241.07L158.916,246.325L158.079,251.071L157.131,256.304L156.572,259.46L156.293,260L155.456,258.867L154.284,257.787L153.168,257.113L152.666,256.277L152.052,254.523L151.103,253.93L150.489,253.471L149.875,253.525L149.206,254.011L148.201,254.307L147.531,254.28L144.797,253.067L144.35,252.959L146.136,250.208L149.261,245.301L151.271,242.174L153.447,238.698L154.619,236.947L154.731,236.623L154.731,236.192L154.284,235.519L153.168,235.222L151.94,234.711L151.159,233.875L150.099,233.498L149.261,232.906L147.755,232.313L146.806,231.774L145.69,231.586L144.797,230.589L141.56,228.677L140.723,228.515L139.83,228.785L138.49,229.108L137.207,230.158L135.588,230.481L134.081,230.481L133.3,229.862L132.575,229.62L131.57,228.785L129.84,228.111L128.556,227.654L127.775,227.869L126.826,228.839L125.766,229.781L124.985,230.374L123.924,230.32L122.641,231.209L121.357,231.505L120.073,231.64L118.622,231.936L117.004,231.424L115.665,230.966L115.051,230.751L114.493,230.886L113.655,231.37L112.149,231.586L110.977,231.64L110.14,231.397L109.414,230.562L108.186,230.131L106.847,229.62L106.568,228.515L106.735,227.707L107.293,226.549L107.014,225.338L106.456,223.453L106.177,222.672L105.786,221.999L105.117,221.756L103.833,221.945L102.438,221.218L101.545,220.545L101.099,219.683L101.601,218.122L101.154,216.749L100.317,216.022L99.759,214.703L98.922,213.653L97.862,213.115L96.745,213.168L95.852,212.845L94.848,211.742L93.955,211.311L92.895,210.234L90.941,209.75L89.937,209.319L89.323,208.673L88.542,207.462L88.653,206.816L88.262,206.17L87.928,205.013L87.258,203.29L86.532,202.322L85.751,201.568L85.137,200.949L84.188,200.034L83.016,199.469L82.012,198.904L81.621,198.069L81.286,197.397L80.784,197.424L79.947,197.37L79.11,197.208L78.161,196.697L77.38,196.105L76.096,195.055L75.371,194.921L74.757,194.921L73.808,195.943L71.018,194.867L68.674,193.306L66.218,192.902L64.6,191.933L63.149,190.453L62.311,189.431L61.698,188.919L58.516,187.466L57.903,187.331L56.731,188.004L56.34,188.408L56.228,189.565L56.117,190.238L55.056,190.642L53.382,190.561L52.21,190.13L51.429,190.077L51.261,190.399L50.815,190.534L49.866,190.453L48.471,190.13L47.187,189.7L45.457,188.785L44.676,188.892L42.723,188.704L41.104,188.166L40.658,187.708L39.988,184.425L39.765,184.183L39.095,184.048L37.923,183.59L37.197,183.079L36.807,182.164L36.36,181.303L34.351,181.491L31.17,180.361L28.938,179.257L26.873,178.073L23.803,175.704L22.631,175.112L21.18,174.385L20.287,173.228L18.892,172.043L18.39,171.72L17.943,170.643L15.823,169.109L16.883,167.116L19.45,165.609L22.799,166.793L23.189,164.451L21.962,162.404L22.185,158.526L22.576,157.745L23.469,156.694L24.585,155.994L25.254,155.779L26.426,156.129L27.152,155.348L29.887,155.698L30.724,155.375L31.282,154.836L31.951,154.459L32.789,153.516L33.291,152.438L33.682,152.007L34.63,152.169L34.686,151.684L35.188,151.064L36.863,149.636L36.807,149.016L36.36,147.642L36.472,147.13L37.421,146.968L38.593,146.564L39.151,145.27L39.932,144.138L40.769,142.44L41.718,142.332L42.22,140.391L43.448,138.665L46.015,133.568L45.29,133.676L44.676,134.377L43.95,134.296L43.169,133.892L43.392,131.599L42.946,131.329L41.662,133.082L40.602,131.275L40.49,130.196L40.937,129.116L40.881,128.388L39.151,128.927L39.262,128.253L40.323,127.551L40.825,126.822L41.774,126.04L42.164,124.852L42.388,122.989L42.778,120.991L42.499,120.019L41.997,119.182L41.551,115.481L41.662,113.319L41.439,111.644L40.992,110.184L38.928,108.319L42.22,106.155L43.392,104.532L41.885,101.178L39.932,98.336L39.876,96.657L40.434,96.874L41.048,96.82L41.662,93.245L41.495,92.135L40.434,90.319L39.095,90.292L37.923,88.043L37.197,87.528L36.695,86.118L34.798,83.352L33.291,81.915L34.407,78.577L35.356,77.926L35.691,77.111L35.3,75.048L35.412,74.586L35.635,74.369L35.858,74.396L36.305,74.695L37.03,75.591L37.644,76.677L38.146,77.003L38.872,76.65L41.774,74.478L41.606,73.799L41.885,72.413L42.834,71.3L43.895,70.919L44.174,70.294L43.95,69.343L42.834,66.924L41.885,65.646L41.272,64.367L40.937,63.17L39.82,62.055L40.267,60.993L41.16,59.769L41.439,59.551L41.885,59.878L43.169,62.136L45.234,63.578L47.355,65.945L48.248,67.549L48.917,67.848L49.531,68.446L49.252,68.881L48.582,69.343L48.415,70.294L48.861,70.81L49.308,71.136L50.536,70.919L51.205,69.832L50.759,64.993L50.033,62.572L49.196,61.837L48.471,60.885L48.973,60.15L50.313,59.823L52.043,58.979L58.461,54.349L60.637,50.015L62.311,48.433L64.209,47.424L66.497,47.67L68.339,47.124L68.897,45.732L68.395,43.849L67.669,42.73L68.339,41.064L69.064,38.578L69.008,36.501L69.901,35.243L69.567,34.751L68.283,35.762L67.278,36.2L67.836,35.38L69.678,33.301L70.571,30.154L71.297,28.84L73.864,27.005L74.422,26.129L76.319,24.759L79.445,21.798L80.672,20.976L86.7,22.868L88.597,22.758L88.262,23.114L87.37,23.224L86.086,23.745L85.751,24.868L86.588,26.074L87.537,26.403L88.318,25.636L89.1,23.443L90.327,21.03L90.662,18.507L91.499,17.628L92.839,17.326L95.127,17.82L96.913,18.342L98.755,18.424L104.391,18.04L113.544,11.449L117.841,10.019L120.464,8.644L122.194,5.921L122.641,3.884L123.868,3.113L125.208,3.113L125.822,2.617L125.989,1.984L129.17,0.22L131.012,0L132.575,0.028L136.202,1.571L137.821,4.269L138.1,6.141L135.867,8.177ZM29.942,154.863L29.552,155.213L28.77,154.593L28.491,153.812L28.938,153.246L29.607,153.435L29.887,153.92Z"
                  fill="#F0EAE1"
                  stroke="#D6CCC2"
                  strokeWidth="0.8" />

                {/* City Markers */}
                {cityRows.map((city, idx) => {
                  let dotColor = '#22C55E';
                  if (city.criticos > 0) dotColor = '#EF4444';
                  else if (city.advertencia > 0) dotColor = '#EAB308';

                  return (
                    <g key={idx}
                      onMouseEnter={() => setHoveredCity(city)}
                      onMouseLeave={() => setHoveredCity(null)}
                      style={{ cursor: 'pointer' }}>
                      <circle cx={city.cx} cy={city.cy} r="3.5" fill={dotColor} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                      <circle cx={city.cx} cy={city.cy} r="15" fill="transparent" />
                      <text x={city.cx - 8} y={city.cy + 3} fontSize="8" fontWeight="700" fill="#6B5B52" textAnchor="end" style={{ filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.9))', pointerEvents: 'none' }}>{city.ciudad}</text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredCity && (
                <div className={`${styles.mapTooltip} ${styles.animateFadeScale}`}>
                  <div className={styles.tooltipTitle}>{hoveredCity.ciudad}</div>
                  <div className={styles.tooltipStat}><span>Total PDV:</span> <strong>{hoveredCity.total}</strong></div>
                  <div className={styles.tooltipStat}><span className={`${styles.dot} ${styles.dotGreen}`}></span> Operando: <strong>{hoveredCity.activos}</strong></div>
                  <div className={styles.tooltipStat}><span className={`${styles.dot} ${styles.dotYellow}`}></span> Alertas: <strong>{hoveredCity.advertencia}</strong></div>
                  <div className={styles.tooltipStat}><span className={`${styles.dot} ${styles.dotRed}`}></span> Fuera de servicio: <strong>{hoveredCity.criticos}</strong></div>
                </div>
              )}

              {/* Minimalist Legend */}
              <div className={styles.mapLegend} style={{ marginTop: '15px' }}>
                <span className={styles.legendItem}><span className={`${styles.dot} ${styles.dotGreen}`}></span> Operando</span>
                <span className={styles.legendItem}><span className={`${styles.dot} ${styles.dotYellow}`}></span> Alerta</span>
                <span className={styles.legendItem}><span className={`${styles.dot} ${styles.dotRed}`}></span> Fuera de servicio</span>
              </div>
            </div>

            {/* City Table */}
            <div className={styles.cityTableContainer}>
              <table className={styles.cityTable}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>CIUDAD</th>
                    <th style={{ textAlign: 'left' }}>TOTAL</th>
                    <th>🟢</th>
                    <th>🟡</th>
                    <th>🔴</th>
                  </tr>
                </thead>
                <tbody>
                  {cityRows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#2C1810' }}>{row.ciudad}</td>
                      <td style={{ fontWeight: 600, color: '#6B5B52' }}>{row.total}</td>
                      <td><span className={`${styles.numPill} ${styles.greenPill}`}>{row.activos}</span></td>
                      <td><span className={`${styles.numPill} ${styles.yellowPill}`}>{row.advertencia}</span></td>
                      <td><span className={`${styles.numPill} ${styles.redPill}`}>{row.criticos}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Right Card: Agenda del día */}
        <div className={styles.dashCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <span className={`${styles.cardIcon} ${styles.blueCal}`}>📅</span>
              <h3>Agenda del día</h3>
            </div>
            <Link href="/calendario" className={styles.cardBtnLink}>Ver todo</Link>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.agendaTimeline}>
              {data?.agendaHoy && data.agendaHoy.length > 0 ? (
                data.agendaHoy.map((item, idx) => (
                  <div className={styles.agendaRow} key={idx}>
                    <div className={styles.agendaTime}>{item.hora_inicio?.substring(0, 5) || '00:00'}</div>
                    <div className={styles.agendaDotLine}>
                      <span className={styles.agendaDot} style={{ background: item.area_color || '#6B3A2A' }} />
                      {idx < data.agendaHoy.length - 1 && <span className={styles.agendaLine} />}
                    </div>
                    <div className={styles.agendaBody}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C1810' }}>{item.titulo || 'Visita'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>{item.pdv_nombre} - {item.ciudad_nombre}</div>
                    </div>
                    <span className={styles.agendaBadge} style={{ background: (item.area_color || '#6B3A2A') + '1A', color: item.area_color || '#6B3A2A' }}>
                      {item.area_nombre?.toUpperCase() || 'GENERAL'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No hay visitas o eventos programados para hoy.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ═════════ ROW 3: INDICADORES CLAVE + TENDENCIA DE OPERACIÓN ═════════ */}
      <div className={styles.rowThree}>

        {/* Indicadores Clave */}
        <div className={styles.dashCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <span className={styles.cardIcon}>📊</span>
              <h3>Indicadores clave</h3>
            </div>
            <select
              value={indicatorPeriod}
              onChange={e => setIndicatorPeriod(e.target.value)}
              className={styles.cardSelect}
            >
              <option value="Hoy">Hoy ▾</option>
              <option value="Semana">Esta semana ▾</option>
              <option value="Mes">Este mes ▾</option>
            </select>
          </div>
          <div className={`${styles.cardContent} ${styles.donutsRow}`}>
            <DonutGauge pct={data?.totalPdv > 0 ? Math.round((greenCount / data.totalPdv) * 100) : 95} color="#22C55E" label="Disponibilidad" sub="POI operando" />
            <DonutGauge pct={98} color="#EAB308" label="Cumplimiento" sub="Visitas programadas" />
            <DonutGauge pct={100} color="#EF4444" label="Respuesta" sub="A incidencias" />
            <DonutGauge pct={93} color="#6B3A2A" label="Calidad" sub="Puntaje promedio" />
          </div>
        </div>

        {/* Tendencia de operación */}
        <div className={styles.dashCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <span className={styles.cardIcon}>📈</span>
              <h3>Tendencia de operación ({trendRange === '7 días' ? 'últimos 7 días' : trendRange === '14 días' ? 'últimos 14 días' : 'últimos 30 días'})</h3>
            </div>
            <select
              value={trendRange}
              onChange={e => {
                setTrendRange(e.target.value);
                setHoveredTrendIndex(null);
              }}
              className={styles.cardSelect}
            >
              <option value="7 días">7 días ▾</option>
              <option value="14 días">14 días ▾</option>
              <option value="30 días">30 días ▾</option>
            </select>
          </div>

          {/* Mini Resumen del periodo seleccionado */}
          <div className={styles.trendPeriodSummary}>
            <div className={styles.trendPill} title="Promedio de PDVs en operación en este período">
              <span className={styles.trendPillDot} style={{ background: '#22C55E' }}></span>
              <span className={styles.trendPillLabel}>Promedio operando:</span>
              <strong className={styles.trendPillValue}>
                {Math.round(activeTrendList.reduce((acc, c) => acc + c.operando, 0) / (totalPoints || 1))} PDV
              </strong>
            </div>
            <div className={styles.trendPill} title="Total de visitas registradas en el período">
              <span className={styles.trendPillDot} style={{ background: '#6B3A2A' }}></span>
              <span className={styles.trendPillLabel}>Total visitas:</span>
              <strong className={styles.trendPillValue}>
                {activeTrendList.reduce((acc, c) => acc + c.visitas, 0)}
              </strong>
            </div>
            <div className={styles.trendPill} title="Total de alertas durante el período">
              <span className={styles.trendPillDot} style={{ background: '#EAB308' }}></span>
              <span className={styles.trendPillLabel}>Alertas:</span>
              <strong className={styles.trendPillValue}>
                {activeTrendList.reduce((acc, c) => acc + c.alertas, 0)}
              </strong>
            </div>
          </div>

          <div className={`${styles.cardContent} ${styles.trendContentRow}`}>

            {/* SVG Chart */}
            <div className={styles.trendSvgBox}>
              <div className={styles.trendYAxis}>
                {yAxisTicks.map((tick, idx) => (
                  <span key={idx}>{tick}</span>
                ))}
              </div>
              <div className={styles.trendChartArea}>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  width="100%"
                  height={chartH}
                  preserveAspectRatio="none"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={() => setHoveredTrendIndex(null)}
                  onTouchMove={(e) => {
                    if (e.touches && e.touches[0]) {
                      const touch = e.touches[0];
                      const svg = e.currentTarget;
                      const rect = svg.getBoundingClientRect();
                      const relX = touch.clientX - rect.left;
                      const svgX = (relX / rect.width) * chartW;
                      let closest = 0; let minD = Infinity;
                      for (let i = 0; i < totalPoints; i++) {
                        const pt = getChartPoint(0, i);
                        const diff = Math.abs(svgX - pt.x);
                        if (diff < minD) { minD = diff; closest = i; }
                      }
                      setHoveredTrendIndex(closest);
                    }
                  }}
                  onTouchEnd={() => setHoveredTrendIndex(null)}
                >
                  {/* Grid Lines */}
                  {yAxisTicks.map((_, i) => {
                    const y = padTop + (i / 3) * plotHeight;
                    return (
                      <line
                        key={i}
                        x1="0"
                        y1={y}
                        x2={chartW}
                        y2={y}
                        stroke="var(--color-border-light)"
                        strokeWidth="1"
                        strokeDasharray={i === 3 ? "none" : "2 2"}
                      />
                    );
                  })}

                  {/* Hover Guideline & Background Strip */}
                  {hoveredTrendIndex !== null && (() => {
                    const hx = getChartPoint(0, hoveredTrendIndex).x;
                    const colW = Math.max(14, plotWidth / (totalPoints - 1 || 1));
                    return (
                      <g>
                        <rect
                          x={hx - colW / 2}
                          y={padTop}
                          width={colW}
                          height={plotHeight}
                          fill="var(--color-primary)"
                          opacity="0.05"
                          rx="4"
                        />
                        <line
                          x1={hx}
                          y1={padTop}
                          x2={hx}
                          y2={padTop + plotHeight}
                          stroke="var(--color-primary)"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.5"
                        />
                      </g>
                    );
                  })()}

                  {/* Series Paths & Circles */}
                  {seriesConfig.map(({ key, color }) => {
                    if (hiddenSeries[key]) return null;
                    const isHovered = hoveredSeries === key;
                    const isDimmed = hoveredSeries && hoveredSeries !== key;
                    const pathD = getLinePath(key);

                    return (
                      <g key={key} style={{ transition: 'opacity 0.25s ease' }}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={color}
                          strokeWidth={isHovered ? 3.5 : 2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={isDimmed ? 0.25 : 1}
                        />
                        {activeTrendList.map((item, i) => {
                          const pt = getChartPoint(item[key], i);
                          const isPointHovered = hoveredTrendIndex === i;
                          return (
                            <g key={i}>
                              {isPointHovered && (
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="7"
                                  fill={color}
                                  opacity="0.3"
                                  className={styles.pulseHalo}
                                />
                              )}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isPointHovered ? 5 : isHovered ? 4.2 : 3.5}
                                fill={isPointHovered ? '#FFFFFF' : color}
                                stroke={isPointHovered ? color : 'none'}
                                strokeWidth={isPointHovered ? 2.5 : 0}
                                opacity={isDimmed ? 0.25 : 1}
                                style={{ transition: 'all 0.15s ease' }}
                              />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hoveredTrendIndex !== null && activeTrendList[hoveredTrendIndex] && (() => {
                  const cur = activeTrendList[hoveredTrendIndex];
                  const totalP = (cur.operando + cur.alertas + cur.fuera) || 1;
                  const pctOp = Math.round((cur.operando / totalP) * 100);
                  const isRightHalf = hoveredTrendIndex > totalPoints / 2;
                  const xPct = (hoveredTrendIndex / (totalPoints - 1 || 1)) * 100;
                  return (
                    <div
                      className={styles.trendTooltip}
                      style={{
                        left: `${xPct}%`,
                        transform: isRightHalf ? 'translateX(-100%)' : 'translateX(0%)',
                      }}
                    >
                      <div className={styles.tipHeader}>
                        <span className={styles.tipCalendar}>📅</span>
                        <strong>{cur.diaCompleto}</strong>
                      </div>
                      <div className={styles.tipDivider} />
                      <div className={styles.tipMetrics}>
                        {!hiddenSeries.operando && (
                          <div className={styles.tipRow}>
                            <span className={styles.tipDot} style={{ background: '#22C55E' }} />
                            <span className={styles.tipLabel}>POI Operando:</span>
                            <span className={styles.tipVal} style={{ color: '#16A34A' }}>{cur.operando}</span>
                            <span className={styles.tipSub}>({pctOp}%)</span>
                          </div>
                        )}
                        {!hiddenSeries.alertas && (
                          <div className={styles.tipRow}>
                            <span className={styles.tipDot} style={{ background: '#EAB308' }} />
                            <span className={styles.tipLabel}>Alertas:</span>
                            <span className={styles.tipVal} style={{ color: '#CA8A04' }}>{cur.alertas}</span>
                          </div>
                        )}
                        {!hiddenSeries.fuera && (
                          <div className={styles.tipRow}>
                            <span className={styles.tipDot} style={{ background: '#EF4444' }} />
                            <span className={styles.tipLabel}>Fuera de servicio:</span>
                            <span className={styles.tipVal} style={{ color: '#DC2626' }}>{cur.fuera}</span>
                          </div>
                        )}
                        {!hiddenSeries.visitas && (
                          <div className={styles.tipRow}>
                            <span className={styles.tipDot} style={{ background: '#6B3A2A' }} />
                            <span className={styles.tipLabel}>Visitas realizadas:</span>
                            <span className={styles.tipVal} style={{ color: '#6B3A2A' }}>{cur.visitas}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* X Axis Labels */}
                <div className={styles.trendXAxis}>
                  {activeTrendList.map((item, i) => {
                    let show = false;
                    if (totalPoints <= 7) show = true;
                    else if (totalPoints <= 14) show = (i % 2 === 0 || i === totalPoints - 1);
                    else show = (i % 5 === 0 || i === totalPoints - 1);

                    return (
                      <span
                        key={i}
                        className={`${styles.trendXLabel} ${hoveredTrendIndex === i ? styles.trendXLabelActive : ''}`}
                        style={{
                          visibility: show ? 'visible' : 'hidden',
                          fontWeight: hoveredTrendIndex === i ? 800 : 600,
                          color: hoveredTrendIndex === i ? '#6B3A2A' : '#9CA3AF'
                        }}
                      >
                        {totalPoints > 7 ? item.fechaCorta : item.dia}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Legend matching reference mockup - interactive click to toggle & hover to highlight */}
            <div className={styles.trendLegend}>
              <div className={styles.trendLegendTitle}>Filtros (clic para activar/ocultar)</div>
              {seriesConfig.map(({ key, label, symbolClass }) => {
                const isHidden = hiddenSeries[key];
                const isHovered = hoveredSeries === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.trendLegendItem} ${isHidden ? styles.trendLegendItemIsHidden : ''} ${isHovered ? styles.trendLegendItemIsHovered : ''}`}
                    onClick={() => setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }))}
                    onMouseEnter={() => setHoveredSeries(key)}
                    onMouseLeave={() => setHoveredSeries(null)}
                    title={isHidden ? `Mostrar ${label}` : `Ocultar ${label}`}
                  >
                    <span className={`${styles.lineSymbol} ${symbolClass}`} style={{ opacity: isHidden ? 0.35 : 1 }}></span>
                    <span className={styles.legendLabel} style={{ textDecoration: isHidden ? 'line-through' : 'none', opacity: isHidden ? 0.45 : 1 }}>
                      {label}
                    </span>
                    <span className={styles.legendStatusDot} style={{ opacity: isHidden ? 0.25 : 1 }}>
                      {isHidden ? '✕' : '●'}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
