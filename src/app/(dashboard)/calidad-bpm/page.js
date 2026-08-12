'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const AREAS = [
  { key: 'ALMACÉN', label: 'Almacén', icon: '🏭' },
  { key: 'COCINA CALIENTE DIA', label: 'Cocina Cal. Día', icon: '🔥' },
  { key: 'COCINA CALIENTE NOCHE', label: 'Cocina Cal. Noche', icon: '🌙' },
  { key: 'COMEDOR', label: 'Comedor', icon: '🍽️' },
  { key: 'DESPACHO', label: 'Despacho', icon: '📦' },
  { key: 'TRANSPORTE', label: 'Transporte', icon: '🚛' },
];

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const MESES_DISPLAY = {
  'ENERO': 'Enero', 'FEBRERO': 'Febrero', 'MARZO': 'Marzo', 'ABRIL': 'Abril',
  'MAYO': 'Mayo', 'JUNIO': 'Junio', 'JULIO': 'Julio', 'AGOSTO': 'Agosto',
  'SEPTIEMBRE': 'Septiembre', 'OCTUBRE': 'Octubre', 'NOVIEMBRE': 'Noviembre', 'DICIEMBRE': 'Diciembre'
};

function getCurrentWeekOfMonth() {
  const day = new Date().getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function getScoreColor(pct) {
  if (pct >= 92) return '#22C55E';
  if (pct >= 75) return '#EAB308';
  return '#EF4444';
}

function getScoreBg(pct) {
  if (pct >= 92) return 'rgba(34,197,94,0.1)';
  if (pct >= 75) return 'rgba(234,179,8,0.1)';
  return 'rgba(239,68,68,0.1)';
}

function getScoreLabel(pct) {
  if (pct >= 92) return 'Excelente';
  if (pct >= 75) return 'Aceptable';
  if (pct > 0) return 'Requiere mejora';
  return 'Sin evaluar';
}

export default function CalidadBPMPage() {
  const [selectedArea, setSelectedArea] = useState('ALMACÉN');
  const [selectedMes, setSelectedMes] = useState(MESES[new Date().getMonth()]);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState({});
  const [toast, setToast] = useState(null);
  const [shakeCell, setShakeCell] = useState(null);
  const [weekBanner, setWeekBanner] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [highlightWeek, setHighlightWeek] = useState(null);
  const [mobileActiveWeek, setMobileActiveWeek] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCategory = (rowId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };
  const debounceTimers = useRef({});
  const tableRef = useRef(null);

  // Cargar datos cuando cambia área, mes o año
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/bpm-calidad?area=${encodeURIComponent(selectedArea)}&mes=${selectedMes}&anio=${selectedAnio}`);
      if (!res.ok) throw new Error('Error cargando datos');
      const json = await res.json();
      setData(json);

      // Detectar semana actual y estado
      const currentWeek = getCurrentWeekOfMonth();
      const currentMonthIndex = new Date().getMonth();
      const selectedMonthIndex = MESES.indexOf(selectedMes);

      if (selectedMonthIndex === currentMonthIndex) {
        // Estamos viendo el mes actual
        const semanas = json.semanas || [];
        const firstIncomplete = semanas.find(s => !s.completada);
        const completedWeeks = semanas.filter(s => s.completada);

        if (completedWeeks.length > 0 && firstIncomplete) {
          setWeekBanner({
            type: 'info',
            message: `✅ ${completedWeeks.length === 1 ? 'La Semana' : 'Las Semanas'} ${completedWeeks.map(s => s.semanaMes).join(', ')} de ${MESES_DISPLAY[selectedMes]} ya ${completedWeeks.length === 1 ? 'fue completada' : 'fueron completadas'}. Continúe con la Semana ${firstIncomplete.semanaMes}.`,
            highlightWeek: firstIncomplete.numero
          });
          setHighlightWeek(firstIncomplete.numero);
        } else if (completedWeeks.length === 4) {
          setWeekBanner({
            type: 'success',
            message: `🎉 ¡Todas las semanas de ${MESES_DISPLAY[selectedMes]} están completas para ${json.area}!`,
            highlightWeek: null
          });
          setHighlightWeek(null);
        } else {
          setWeekBanner(null);
          setHighlightWeek(semanas[0]?.numero || null);
        }
      } else {
        setWeekBanner(null);
        setHighlightWeek(null);
      }
    } catch (err) {
      console.error('Error:', err);
      showToast('Error al cargar datos: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedArea, selectedMes, selectedAnio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Guardar calificación con debounce
  const saveValue = useCallback(async (row, semanaNumero, valor) => {
    const cellKey = `${row}_${semanaNumero}`;

    // Limpiar timer previo
    if (debounceTimers.current[cellKey]) {
      clearTimeout(debounceTimers.current[cellKey]);
    }

    // Si está vacío, eliminar
    if (valor === '' || valor === null || valor === undefined) {
      setSavingCells(prev => ({ ...prev, [cellKey]: 'saving' }));
      try {
        const res = await fetch('/api/bpm-calidad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ area: selectedArea, row, semanaNumero, valor: null })
        });
        if (!res.ok) throw new Error('Error al guardar');
        setSavingCells(prev => ({ ...prev, [cellKey]: 'saved' }));
        setTimeout(() => setSavingCells(prev => ({ ...prev, [cellKey]: null })), 1500);
        fetchData(true); // Silent refresh
      } catch (err) {
        setSavingCells(prev => ({ ...prev, [cellKey]: 'error' }));
        showToast('Error al guardar', 'error');
      }
      return;
    }

    const numVal = parseInt(valor);
    if (isNaN(numVal) || numVal < 1 || numVal > 5) {
      setShakeCell(cellKey);
      setTimeout(() => setShakeCell(null), 600);
      showToast('Solo se permite calificación del 1 al 5', 'error');
      return;
    }

    setSavingCells(prev => ({ ...prev, [cellKey]: 'saving' }));

    debounceTimers.current[cellKey] = setTimeout(async () => {
      try {
        const res = await fetch('/api/bpm-calidad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ area: selectedArea, row, semanaNumero, valor: numVal })
        });
        if (!res.ok) throw new Error('Error al guardar');
        const result = await res.json();

        setSavingCells(prev => ({ ...prev, [cellKey]: 'saved' }));
        setTimeout(() => setSavingCells(prev => ({ ...prev, [cellKey]: null })), 1500);

        // Actualizar datos locales sin animación de carga
        fetchData(true);

        if (result.semanaCompleta) {
          const semanaMes = ((semanaNumero - 1) % 4) + 1;
          showToast(`🎉 ¡Semana ${semanaMes} completada! Todos los ítems evaluados.`, 'success');
        }
      } catch (err) {
        setSavingCells(prev => ({ ...prev, [cellKey]: 'error' }));
        showToast('Error al guardar la calificación', 'error');
      }
    }, 400);
  }, [selectedArea, fetchData, showToast]);

  // Exportar Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/bpm-calidad/exportar');
      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Matriz_BPM_Calidad_${new Date().toISOString().split('T')[0]}.xlsm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('✅ Excel exportado correctamente', 'success');
    } catch (err) {
      showToast('Error al exportar el Excel: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Calcular resumen general del área
  const getAreaSummary = () => {
    if (!data || !data.semanas) return null;
    const totalFilled = data.semanas.reduce((sum, s) => sum + s.itemsLlenados, 0);
    const totalPossible = data.semanas.reduce((sum, s) => sum + s.totalItems, 0);
    const overallPct = totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0;
    return { totalFilled, totalPossible, overallPct };
  };

  const summary = getAreaSummary();

  return (
    <div style={{ padding: '0', maxWidth: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-only { display: none; }
        .desktop-only { display: block; }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          .mobile-flex { display: flex !important; }
          
          .bpm-mobile-container {
            font-size: 0.85rem;
          }
          .bpm-mobile-category {
            background: #4B3B33;
            color: white;
            padding: 12px 16px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .bpm-mobile-item {
            background: #fff;
            border-bottom: 1px solid #E8DDD4;
            padding: 16px;
          }
          .bpm-mobile-item-desc {
            color: #1A110D;
            font-weight: 500;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          .bpm-mobile-weeks-grid {
            display: flex;
            justify-content: flex-end;
          }
          .bpm-mobile-week-col {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
          .bpm-mobile-week-label {
            font-size: 0.85rem;
            color: #6B5B52;
            font-weight: bold;
          }
          .bpm-mobile-input {
            width: 50px;
            height: 50px;
            text-align: center;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            background: #F9FAFB;
          }
          .bpm-mobile-input:focus {
            outline: none;
            border-color: #8B5E3C;
            background: #fff;
          }
          /* Animaciones */
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .shake { animation: shake 0.3s ease-in-out; border-color: #EF4444 !important; background: #FEF2F2 !important; }
        }
      `}} />
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          padding: '14px 22px', borderRadius: '12px',
          background: toast.type === 'error' ? '#FEE2E2' : '#ECFDF5',
          border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : '#A7F3D0'}`,
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3D2314 0%, #6B3A2A 50%, #8B5E3C 100%)',
        borderRadius: '16px', padding: '24px 28px', marginBottom: '20px',
        color: '#fff', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              🔰 Matriz de Frecuencia BPM
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.8, fontWeight: 400 }}>
              Verificación de Buenas Prácticas de Manufactura — Área de Calidad
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.3)',
              background: exporting ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: exporting ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s', backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Area Tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '16px',
        flexWrap: 'wrap', paddingBottom: '4px'
      }}>
        {AREAS.map(area => {
          const isActive = selectedArea === area.key;
          return (
            <button
              key={area.key}
              onClick={() => setSelectedArea(area.key)}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: 'none',
                background: isActive ? 'linear-gradient(135deg, #6B3A2A, #8B5E3C)' : '#fff',
                color: isActive ? '#fff' : '#6B5B52',
                fontSize: '0.78rem', fontWeight: isActive ? 700 : 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 12px rgba(107,58,42,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                transform: isActive ? 'translateY(-1px)' : 'none'
              }}
            >
              <span style={{ fontSize: '1rem' }}>{area.icon}</span>
              {area.label}
            </button>
          );
        })}
      </div>

      {/* Controls Row */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B5B52' }}>Mes:</label>
          <select
            value={selectedMes}
            onChange={e => setSelectedMes(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8DDD4',
              background: '#fff', fontSize: '0.82rem', color: '#2C1810', fontWeight: 600,
              cursor: 'pointer', outline: 'none'
            }}
          >
            {MESES.map(m => (
              <option key={m} value={m}>{MESES_DISPLAY[m]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B5B52' }}>Año:</label>
          <select
            value={selectedAnio}
            onChange={e => setSelectedAnio(parseInt(e.target.value))}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #E8DDD4',
              background: '#fff', fontSize: '0.82rem', color: '#2C1810', fontWeight: 600,
              cursor: 'pointer', outline: 'none'
            }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Resumen rápido */}
        {summary && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px',
            background: '#FDFAF7', padding: '8px 16px', borderRadius: '10px',
            border: '1px solid #E8DDD4'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#6B5B52', fontWeight: 600 }}>
              Progreso del mes:
            </span>
            <div style={{ width: '120px', height: '8px', background: '#F0EAE1', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${summary.overallPct}%`, height: '100%',
                background: `linear-gradient(90deg, ${getScoreColor(summary.overallPct)}, ${getScoreColor(summary.overallPct)}dd)`,
                borderRadius: '4px', transition: 'width 0.5s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: getScoreColor(summary.overallPct) }}>
              {summary.overallPct}%
            </span>
          </div>
        )}
      </div>

      {/* Week Completion Banner */}
      {weekBanner && (
        <div style={{
          padding: '14px 20px', borderRadius: '12px', marginBottom: '16px',
          background: weekBanner.type === 'success' ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
          border: `1px solid ${weekBanner.type === 'success' ? '#A7F3D0' : '#FED7AA'}`,
          fontSize: '0.82rem', fontWeight: 600,
          color: weekBanner.type === 'success' ? '#065F46' : '#9A3412',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideIn 0.3s ease'
        }}>
          {weekBanner.message}
          {weekBanner.highlightWeek && (
            <button
              onClick={() => setHighlightWeek(weekBanner.highlightWeek)}
              style={{
                marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px',
                border: 'none', background: '#6B3A2A', color: '#fff',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Ir a Semana {((weekBanner.highlightWeek - 1) % 4) + 1} →
            </button>
          )}
        </div>
      )}

      {/* Week Progress Cards */}
      {data && data.semanas && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {data.semanas.map(sem => {
            const isHighlighted = highlightWeek === sem.numero;
            return (
              <div key={sem.numero} style={{
                padding: '14px 16px', borderRadius: '12px',
                background: isHighlighted ? 'linear-gradient(135deg, #6B3A2A, #8B5E3C)' : '#fff',
                border: sem.completada ? '2px solid #22C55E' : isHighlighted ? '2px solid #6B3A2A' : '1px solid #E8DDD4',
                boxShadow: isHighlighted ? '0 4px 16px rgba(107,58,42,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.3s', cursor: 'pointer',
                transform: isHighlighted ? 'translateY(-2px)' : 'none'
              }}
              onClick={() => setHighlightWeek(sem.numero)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: isHighlighted ? '#fff' : '#2C1810'
                  }}>
                    Semana {sem.semanaMes}
                  </span>
                  {sem.completada && (
                    <span style={{ fontSize: '0.9rem' }}>✅</span>
                  )}
                </div>
                <div style={{
                  width: '100%', height: '6px', background: isHighlighted ? 'rgba(255,255,255,0.2)' : '#F0EAE1',
                  borderRadius: '3px', overflow: 'hidden', marginBottom: '6px'
                }}>
                  <div style={{
                    width: `${sem.porcentaje}%`, height: '100%',
                    background: isHighlighted ? '#fff' : getScoreColor(sem.porcentaje > 0 ? 75 : 0),
                    borderRadius: '3px', transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  color: isHighlighted ? 'rgba(255,255,255,0.8)' : '#9CA3AF',
                  fontWeight: 600
                }}>
                  {sem.itemsLlenados}/{sem.totalItems} ítems
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Table */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '60px 0', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{
            width: '40px', height: '40px', border: '4px solid #E8DDD4',
            borderTop: '4px solid #6B3A2A', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '0.85rem', color: '#6B5B52', fontWeight: 600 }}>Cargando datos...</span>
        </div>
      ) : data && data.categorias ? (
        <>
        <div ref={tableRef} className="desktop-only" style={{
          overflowX: 'auto', borderRadius: '14px',
          border: '1px solid #E8DDD4', background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem',
            minWidth: '900px'
          }}>
            <thead>
              {/* Week headers row */}
              <tr style={{ background: 'linear-gradient(135deg, #3D2314, #6B3A2A)' }}>
                <th style={{
                  padding: '12px 16px', textAlign: 'left', color: '#fff',
                  fontWeight: 700, fontSize: '0.75rem', position: 'sticky', left: 0,
                  background: '#3D2314', zIndex: 10, minWidth: '300px',
                  borderRight: '2px solid rgba(255,255,255,0.1)'
                }}>
                  Ítem de Verificación
                </th>
                {data.semanas && data.semanas.map(sem => (
                  <th key={sem.numero} colSpan={3} style={{
                    padding: '10px 8px', textAlign: 'center', color: '#fff',
                    fontWeight: 700, fontSize: '0.72rem',
                    borderLeft: '2px solid rgba(255,255,255,0.15)',
                    background: highlightWeek === sem.numero ? 'rgba(255,255,255,0.12)' : 'transparent'
                  }}>
                    <div>Semana {sem.semanaMes}</div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 400, opacity: 0.7, marginTop: '2px' }}>
                      {MESES_DISPLAY[sem.mes]}
                    </div>
                  </th>
                ))}
              </tr>
              {/* Sub-headers */}
              <tr style={{ background: '#FDFAF7', borderBottom: '2px solid #E8DDD4' }}>
                <th style={{
                  padding: '8px 16px', textAlign: 'left', color: '#6B5B52',
                  fontWeight: 600, fontSize: '0.68rem', position: 'sticky', left: 0,
                  background: '#FDFAF7', zIndex: 10, borderRight: '2px solid #E8DDD4'
                }}>
                </th>
                {data.semanas && data.semanas.map(sem => (
                  <React.Fragment key={`sub-${sem.numero}`}>
                    <th style={{
                      padding: '6px 4px', textAlign: 'center', color: '#9CA3AF',
                      fontWeight: 600, fontSize: '0.62rem', width: '60px',
                      borderLeft: '2px solid #E8DDD4',
                      background: highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent'
                    }}>Obt.</th>
                    <th style={{
                      padding: '6px 4px', textAlign: 'center', color: '#9CA3AF',
                      fontWeight: 600, fontSize: '0.62rem', width: '40px',
                      background: highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent'
                    }}>Tot.</th>
                    <th style={{
                      padding: '6px 4px', textAlign: 'center', color: '#9CA3AF',
                      fontWeight: 600, fontSize: '0.62rem', width: '50px',
                      background: highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent'
                    }}>%</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.categorias.map((cat, catIdx) => (
                <React.Fragment key={cat.row}>
                  {/* Category Header Row */}
                  <tr style={{
                    background: 'linear-gradient(90deg, #F5EBE1, #FDFAF7)',
                    borderTop: catIdx > 0 ? '2px solid #E8DDD4' : 'none'
                  }}>
                    <td style={{
                      padding: '12px 16px', fontWeight: 800, color: '#2C1810',
                      fontSize: '0.85rem', position: 'sticky', left: 0,
                      background: 'linear-gradient(90deg, #F5EBE1, #FDFAF7)',
                      zIndex: 10, borderRight: '2px solid #E8DDD4'
                    }}>
                      {cat.nombre}
                      <span style={{
                        display: 'inline-block', marginLeft: '8px',
                        fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF'
                      }}>
                        ({cat.items.length} ítems)
                      </span>
                    </td>
                    {data.semanas && data.semanas.map(sem => {
                      const avg = cat.promedios[sem.numero] || 0;
                      return (
                        <React.Fragment key={`cat-${cat.row}-${sem.numero}`}>
                          <td style={{
                            padding: '6px 4px', textAlign: 'center',
                            borderLeft: '2px solid #E8DDD4',
                            background: highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent'
                          }}></td>
                          <td style={{
                            padding: '6px 4px', textAlign: 'center',
                            background: highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent'
                          }}></td>
                          <td style={{
                            padding: '6px 4px', textAlign: 'center', fontWeight: 800,
                            fontSize: '0.78rem',
                            color: avg > 0 ? getScoreColor(avg) : '#D1D5DB',
                            background: avg > 0 ? getScoreBg(avg) : (highlightWeek === sem.numero ? 'rgba(107,58,42,0.04)' : 'transparent')
                          }}>
                            {avg > 0 ? `${avg}%` : '—'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  {/* Item Rows */}
                  {cat.items.map((item, itemIdx) => (
                    <tr key={item.row} style={{
                      borderBottom: '1px solid #F0EAE1',
                      transition: 'background 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FDFAF7'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{
                        padding: '8px 16px', color: '#1A110D', fontSize: '0.8rem', fontWeight: 500,
                        lineHeight: '1.5', position: 'sticky', left: 0,
                        background: '#fff', zIndex: 5, borderRight: '2px solid #E8DDD4',
                        maxWidth: '450px'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FDFAF7'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <span style={{ display: 'inline-block', width: '22px', textAlign: 'right', marginRight: '8px', color: '#8B5E3C', fontSize: '0.75rem', fontWeight: 800 }}>
                          {itemIdx + 1}.
                        </span>
                        {item.descripcion}
                      </td>
                      {data.semanas && data.semanas.map(sem => {
                        const semData = item.semanas[sem.numero] || { obtenido: null, total: 5, porcentaje: 0 };
                        const cellKey = `${item.row}_${sem.numero}`;
                        const savingState = savingCells[cellKey];
                        const isShaking = shakeCell === cellKey;
                        const isHighlight = highlightWeek === sem.numero;

                        return (
                          <React.Fragment key={`item-${item.row}-${sem.numero}`}>
                            {/* Obtenidos - Input */}
                            <td style={{
                              padding: '4px 4px', textAlign: 'center',
                              borderLeft: '2px solid #E8DDD4',
                              background: isHighlight ? 'rgba(107,58,42,0.03)' : 'transparent'
                            }}>
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={semData.obtenido !== null ? semData.obtenido : ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    // Actualizar estado local inmediatamente
                                    setData(prev => {
                                      if (!prev) return prev;
                                      const newData = JSON.parse(JSON.stringify(prev));
                                      const cat2 = newData.categorias.find(c => c.row === cat.row);
                                      if (cat2) {
                                        const item2 = cat2.items.find(i => i.row === item.row);
                                        if (item2 && item2.semanas[sem.numero]) {
                                          const numVal = val === '' ? null : parseInt(val);
                                          item2.semanas[sem.numero].obtenido = numVal;
                                          item2.semanas[sem.numero].porcentaje = numVal ? Math.round((numVal / 5) * 100) : 0;
                                        }
                                      }
                                      return newData;
                                    });
                                    saveValue(item.row, sem.numero, val);
                                  }}
                                  onKeyDown={e => {
                                    // Prevenir entrada de caracteres no numéricos
                                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                                      e.preventDefault();
                                    }
                                    // Si escribe 0, 6, 7, 8, 9 prevenir
                                    if (['0', '6', '7', '8', '9'].includes(e.key) && !e.ctrlKey) {
                                      e.preventDefault();
                                      setShakeCell(cellKey);
                                      setTimeout(() => setShakeCell(null), 600);
                                      showToast('Solo valores del 1 al 5', 'error');
                                    }
                                  }}
                                  style={{
                                    width: '44px', height: '32px', textAlign: 'center',
                                    borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                                    border: savingState === 'error' ? '2px solid #EF4444' :
                                            savingState === 'saved' ? '2px solid #22C55E' :
                                            savingState === 'saving' ? '2px solid #EAB308' :
                                            '1px solid #E8DDD4',
                                    outline: 'none', color: '#2C1810',
                                    background: semData.obtenido ? '#fff' : '#FAFAFA',
                                    transition: 'all 0.2s',
                                    animation: isShaking ? 'shake 0.4s ease' : 'none',
                                    MozAppearance: 'textfield'
                                  }}
                                  onFocus={e => {
                                    e.target.style.borderColor = '#6B3A2A';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(107,58,42,0.15)';
                                  }}
                                  onBlur={e => {
                                    e.target.style.borderColor = '#E8DDD4';
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                                {savingState === 'saving' && (
                                  <div style={{
                                    position: 'absolute', top: '-4px', right: '-4px',
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    border: '2px solid #EAB308', borderTop: '2px solid transparent',
                                    animation: 'spin 0.6s linear infinite'
                                  }} />
                                )}
                                {savingState === 'saved' && (
                                  <div style={{
                                    position: 'absolute', top: '-4px', right: '-4px',
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: '#22C55E', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.5rem', fontWeight: 900,
                                    animation: 'fadeIn 0.2s ease'
                                  }}>✓</div>
                                )}
                              </div>
                            </td>
                            {/* Totales */}
                            <td style={{
                              padding: '4px 4px', textAlign: 'center',
                              color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600,
                              background: isHighlight ? 'rgba(107,58,42,0.03)' : 'transparent'
                            }}>
                              5
                            </td>
                            {/* Porcentaje */}
                            <td style={{
                              padding: '4px 6px', textAlign: 'center',
                              fontWeight: 700, fontSize: '0.75rem',
                              color: semData.porcentaje > 0 ? getScoreColor(semData.porcentaje) : '#D1D5DB',
                              background: isHighlight ? 'rgba(107,58,42,0.03)' : 'transparent'
                            }}>
                              {semData.porcentaje > 0 ? `${semData.porcentaje}%` : '—'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="mobile-only bpm-mobile-container">
          
          {/* Mobile Week Selector Tabs */}
          {data.semanas && (
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '16px',
              padding: '4px', background: '#F0EAE1', borderRadius: '12px',
              overflowX: 'auto'
            }}>
              {data.semanas.map(sem => {
                const isActive = (mobileActiveWeek || data.semanas[0].numero) === sem.numero;
                return (
                  <button
                    key={`mob-tab-${sem.numero}`}
                    onClick={() => setMobileActiveWeek(sem.numero)}
                    style={{
                      flex: 1, minWidth: '80px', padding: '10px 4px',
                      background: isActive ? '#fff' : 'transparent',
                      color: isActive ? '#6B3A2A' : '#8B5E3C',
                      border: 'none', borderRadius: '8px',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.8rem',
                      boxShadow: isActive ? '0 2px 8px rgba(107,58,42,0.1)' : 'none',
                      transition: 'all 0.2s', cursor: 'pointer'
                    }}
                  >
                    Semana {((sem.numero - 1) % 4) + 1}
                  </button>
                );
              })}
            </div>
          )}

          {data.categorias.map((cat, catIdx) => {
            const isCollapsed = collapsedCategories[cat.row];
            return (
              <div key={`mob-cat-${cat.row}`} style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E8DDD4' }}>
                {/* Mobile Category Header */}
                <div 
                  className="bpm-mobile-category" 
                  onClick={() => toggleCategory(cat.row)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{cat.nombre}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 'normal' }}>({cat.items.length} ítems)</span>
                  </div>
                  <div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                
                {/* Mobile Items List */}
                {!isCollapsed && cat.items.map((item, itemIdx) => (
                  <div key={`mob-item-${item.row}`} className="bpm-mobile-item">
                    <div className="bpm-mobile-item-desc">
                      <span style={{ color: '#8B5E3C', marginRight: '6px' }}>{itemIdx + 1}.</span>
                      {item.descripcion}
                    </div>
                    
                    {/* Active Week Input */}
                    <div className="bpm-mobile-weeks-grid">
                      {(() => {
                        const activeSem = data.semanas.find(s => s.numero === (mobileActiveWeek || data.semanas[0].numero));
                        if (!activeSem) return null;
                        
                        const semData = item.semanas[activeSem.numero] || { obtenido: null, total: 5, porcentaje: 0 };
                        const cellKey = `${item.row}_${activeSem.numero}`;
                        const isShaking = shakeCell === cellKey;
                        
                        return (
                          <div key={`mob-item-${item.row}-sem-${activeSem.numero}`} className="bpm-mobile-week-col">
                            <span className="bpm-mobile-week-label">Semana {((activeSem.numero - 1) % 4) + 1}</span>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={semData.obtenido !== null ? semData.obtenido : ''}
                              className={`bpm-mobile-input ${isShaking ? 'shake' : ''}`}
                              onChange={e => {
                                const val = e.target.value;
                                setData(prev => {
                                  if (!prev) return prev;
                                  const newData = JSON.parse(JSON.stringify(prev));
                                  const cat2 = newData.categorias.find(c => c.row === cat.row);
                                  if (cat2) {
                                    const item2 = cat2.items.find(i => i.row === item.row);
                                    if (item2 && item2.semanas[activeSem.numero]) {
                                      const numVal = val === '' ? null : parseInt(val);
                                      item2.semanas[activeSem.numero].obtenido = numVal;
                                      item2.semanas[activeSem.numero].porcentaje = numVal ? Math.round((numVal / 5) * 100) : 0;
                                    }
                                  }
                                  return newData;
                                });
                                saveValue(item.row, activeSem.numero, val);
                              }}
                              onKeyDown={e => {
                                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
                                if (['0', '6', '7', '8', '9'].includes(e.key) && !e.ctrlKey) {
                                  e.preventDefault();
                                  setShakeCell(cellKey);
                                  setTimeout(() => setShakeCell(null), 600);
                                  showToast('Solo valores del 1 al 5', 'error');
                                }
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>/ 5</span>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 700, 
                                color: semData.porcentaje > 0 ? getScoreColor(semData.porcentaje) : '#D1D5DB' 
                              }}>
                                {semData.porcentaje > 0 ? `${semData.porcentaje}%` : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        </>
      ) : (
        <div style={{
          padding: '40px', textAlign: 'center', color: '#9CA3AF',
          fontSize: '0.85rem', background: '#fff', borderRadius: '12px',
          border: '1px solid #E8DDD4'
        }}>
          No se encontraron datos para esta área.
        </div>
      )}

      {/* Legend */}
      <div style={{
        marginTop: '16px', padding: '14px 20px', borderRadius: '12px',
        background: '#FDFAF7', border: '1px solid #E8DDD4',
        display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B5B52' }}>Leyenda:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22C55E' }} />
          <span style={{ fontSize: '0.72rem', color: '#6B5B52' }}>92-100% Excelente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EAB308' }} />
          <span style={{ fontSize: '0.72rem', color: '#6B5B52' }}>75-91% Aceptable</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#EF4444' }} />
          <span style={{ fontSize: '0.72rem', color: '#6B5B52' }}>&lt;75% Requiere mejora</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Calificación: 1 (Deficiente) → 5 (Excelente)</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes slideIn {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        table tr:hover td {
          background-color: rgba(245,235,225,0.3) !important;
        }
      `}</style>
    </div>
  );
}

