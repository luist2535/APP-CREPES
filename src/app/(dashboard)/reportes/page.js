'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ESTADO_LABELS = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
  en_progreso: { label: 'En Progreso', color: '#3b82f6', bg: '#dbeafe' },
  finalizada: { label: 'Finalizada', color: '#8b5cf6', bg: '#ede9fe' },
  cerrada: { label: 'Cerrada ✓', color: '#10b981', bg: '#d1fae5' },
  devuelta: { label: 'Devuelta', color: '#ef4444', bg: '#fee2e2' },
  completada: { label: 'Completada', color: '#6b7280', bg: '#f3f4f6' },
};

export default function ReportesPage() {
  const [mounted, setMounted] = useState(false);
  const [pdvsList, setPdvsList] = useState([]);
  useEffect(() => {
    setMounted(true);
    fetch('/api/pdv')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setPdvsList(d);
        else if (d.pdvs) setPdvsList(d.pdvs);
      })
      .catch(console.error);
  }, []);

  const [activeTab, setActiveTab] = useState('general');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);

  // Filters
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [activeAreaTab, setActiveAreaTab] = useState('todos');
  const [exportLoading, setExportLoading] = useState(false);
  const [mappedArea, setMappedArea] = useState('');

  // Analítica Calidad por Sub-Área (Módulo 6) States
  const [reporteTab, setReporteTab] = useState('general'); // 'general' | 'calidad'
  const [calidadData, setCalidadData] = useState(null);
  const [calidadLoading, setCalidadLoading] = useState(false);
  const [calidadFechaInicio, setCalidadFechaInicio] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]
  );
  const [calidadFechaFin, setCalidadFechaFin] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [calidadPdv, setCalidadPdv] = useState('all');
  const [calidadCiudad, setCalidadCiudad] = useState('all');
  const [calidadSeccion, setCalidadSeccion] = useState('all'); // Área (Nivel 0)
  const [calidadSubArea, setCalidadSubArea] = useState('all'); // Sub-Área (Nivel 1)
  const [calidadItem, setCalidadItem] = useState('all'); // Ítem (Nivel 2)
  const [calidadSubTab, setCalidadSubTab] = useState('evolucion'); // 'evolucion' | 'ranking' | 'historial' | 'comparador' | 'longitudinal'
  const [compPeriodoA, setCompPeriodoA] = useState('');
  const [compPeriodoB, setCompPeriodoB] = useState('');
  const [longitudinalSeccionSelected, setLongitudinalSeccionSelected] = useState('Almacén');
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Detalle Operación / Visita Modal
  const [selectedVisitaDetalle, setSelectedVisitaDetalle] = useState(null);
  const [evidenciasDetalle, setEvidenciasDetalle] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleTab, setDetalleTab] = useState('general');

  const handleVerOperacion = async (visita) => {
    setSelectedVisitaDetalle(visita);
    setDetalleTab('general');
    setLoadingDetalle(true);
    setEvidenciasDetalle([]);
    try {
      const res = await fetch(`/api/visitas?visita_id=${visita.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvidenciasDetalle(data.evidencias || []);
      }
    } catch (err) {
      console.error('Error al cargar evidencias:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleIrAVisita = (id) => {
    localStorage.setItem('target_visita_id', id);
    window.location.href = '/visitas';
  };

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroArea) params.set('area_id', filtroArea);
    if (filtroCategoria) params.set('categoria_id', filtroCategoria);
    if (filtroCiudad) params.set('ciudad_id', filtroCiudad);
    if (filtroEstado) params.set('estado', filtroEstado);
    if (filtroFechaDesde) params.set('fecha_desde', filtroFechaDesde);
    if (filtroFechaHasta) params.set('fecha_hasta', filtroFechaHasta);
    return params.toString();
  }, [filtroArea, filtroCategoria, filtroCiudad, filtroEstado, filtroFechaDesde, filtroFechaHasta]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const q = buildQuery();
      const res = await fetch(`/api/reportes${q ? '?' + q : ''}`);
      if (!res.ok) throw new Error('Error al cargar reportes');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const role = parseInt(u.rol_id);
        setUserRole(role);
        
        // Define role to area mapping (Admin, Coordinador, Visualizador see all)
        const areaMap = {
          3: '2', // SST
          4: '3', // Mantenimiento
          5: '4', // Calidad
          6: '5', // DRH
          7: '6', // Formación
          9: '7', // Sistemas
        };
        const mapped = areaMap[role] || '';
        if (mapped) {
          setMappedArea(mapped);
          setFiltroArea(mapped);
          setActiveAreaTab(mapped);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcel = async () => {
    if (!data?.visitas?.length) return;
    setExportLoading(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filteredVisitas.map(v => ({
        'ID': v.id,
        'Fecha': v.fecha,
        'Hora Inicio': v.hora_inicio || '',
        'Hora Fin': v.hora_fin || '',
        'PDV': v.pdv_nombre,
        'Ciudad': v.ciudad_nombre,
        'Área': v.area_nombre,
        'Tipo de Visita': v.tipo_visita_nombre || '',
        'Categoría Padre': v.categoria_padre_nombre || v.categoria_nombre || '',
        'Categoría': v.categoria_nombre || '',
        'Responsable': v.responsable_nombre || '',
        'Creado por': v.creador_nombre,
        'Estado': ESTADO_LABELS[v.estado]?.label || v.estado,
        'Observaciones': v.observaciones || '',
        'Hallazgos': v.hallazgos || '',
        'Acciones Correctivas': v.acciones_correctivas || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reportes Visitas');

      // Add summary sheet
      if (data.resumenPorArea?.length) {
        const summaryRows = data.resumenPorArea.map(a => ({
          'Área': a.area_nombre,
          'Total Visitas': a.total,
          'Cerradas': a.cerradas,
          'Finalizadas': a.finalizadas,
          'Pendientes': a.pendientes,
          'En Progreso': a.en_progreso,
          'Devueltas': a.devueltas,
        }));
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Área');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Reporte_Visitas_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Guardar copia automáticamente en las carpetas y repositorio del servidor
      try {
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('categoria', 'reporte_visitas');
        formData.append('tipo_documento', 'Reporte Visitas Excel');
        formData.append('observaciones', `Reporte de Visitas exportado desde el módulo de Reportes (${dateStr})`);
        await fetch('/api/uploads', { method: 'POST', body: formData });
      } catch (repoErr) {
        console.warn('Error al almacenar en repositorio de archivos:', repoErr);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Error al exportar a Excel: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const fetchCalidadComportamiento = useCallback(async () => {
    try {
      setCalidadLoading(true);
      const params = new URLSearchParams();
      params.set('pdv_id', calidadPdv);
      params.set('ciudad_id', calidadCiudad);
      params.set('fechaInicio', calidadFechaInicio);
      params.set('fechaFin', calidadFechaFin);
      params.set('area', calidadSeccion);
      params.set('subarea', calidadSubArea);
      params.set('item', calidadItem);

      const res = await fetch(`/api/reportes/calidad-comportamiento?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setCalidadData(result);
        if (result.evaluaciones_por_periodo && result.evaluaciones_por_periodo.length > 0) {
          if (!compPeriodoA) setCompPeriodoA(result.evaluaciones_por_periodo[0].periodo);
          if (!compPeriodoB) {
            setCompPeriodoB(result.evaluaciones_por_periodo.length > 1 ? result.evaluaciones_por_periodo[1].periodo : result.evaluaciones_por_periodo[0].periodo);
          }
        }
        if (result.areas_disponibles && result.areas_disponibles.length > 0 && !longitudinalSeccionSelected) {
          setLongitudinalSeccionSelected(result.areas_disponibles[0]);
        }
      }
    } catch (err) {
      console.error('Error al cargar analítica de calidad:', err);
    } finally {
      setCalidadLoading(false);
    }
  }, [calidadPdv, calidadCiudad, calidadFechaInicio, calidadFechaFin, calidadSeccion]);

  useEffect(() => {
    if (reporteTab === 'calidad') {
      fetchCalidadComportamiento();
    }
  }, [reporteTab, fetchCalidadComportamiento]);

  useEffect(() => {
    if (!modoPresentacion) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') setSlideIndex(prev => Math.min(prev + 1, 3));
      else if (e.key === 'ArrowLeft') setSlideIndex(prev => Math.max(prev - 1, 0));
      else if (e.key === 'Escape') setModoPresentacion(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modoPresentacion]);

  const exportCalidadToExcel = async () => {
    if (!calidadData) return;
    setExportLoading(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // 1. Sheet: Evolución por Sección
      const rowsEvolucion = (calidadData.evolucion_por_seccion || []).map(s => ({
        'Sección / Sub-Área': s.seccion_nombre,
        'Puntaje Promedio (%)': s.puntaje_promedio,
        'Visitas Evaluadas': s.visitas_evaluadas,
        'Alertas de Disminución Recientes': s.caidas_recientes,
        'Mejor PDV en la Sección': `${s.mejor_pdv?.nombre || '-'} (${s.mejor_pdv?.puntaje || 0} pts)`,
        'Peor PDV en la Sección': `${s.peor_pdv?.nombre || '-'} (${s.peor_pdv?.puntaje || 0} pts)`,
      }));
      const wsEvol = XLSX.utils.json_to_sheet(rowsEvolucion);
      XLSX.utils.book_append_sheet(wb, wsEvol, 'Comportamiento por Sección');

      // 2. Sheet: Ranking Gerencial por PDV (Mes Anterior vs Actual)
      const rowsRanking = (calidadData.ranking_pdv || []).map((p, i) => {
        const pctActual = p.puntaje_mes_actual !== undefined ? p.puntaje_mes_actual : p.puntaje_promedio;
        const pctAnterior = p.puntaje_mes_anterior !== undefined ? p.puntaje_mes_anterior : p.puntaje_promedio;
        return {
          'Puesto #': i + 1,
          'Punto de Venta (PDV)': p.pdv_nombre,
          'Ciudad': p.ciudad_nombre,
          'Mes Anterior (%)': pctAnterior,
          'Mes Actual (%)': pctActual,
          'Diferencia (Pts)': p.diferencia_puntos || 0,
          'Variación (%)': p.variacion_porcentual || 0,
          'Tendencia': p.tendencia || 'Se mantuvo',
          'Total Evaluaciones': p.total_evaluaciones,
          'Secciones en Alerta': p.secciones_en_alerta,
          'Estado Actual': pctActual >= 90 ? 'Excelente' : (pctActual >= 75 ? 'Regular' : 'Crítico')
        };
      });
      const wsRanking = XLSX.utils.json_to_sheet(rowsRanking);
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Mes Anterior vs Actual');

      // 3. Sheet: Historial Longitudinal y Alertas
      const rowsHist = (calidadData.historial || []).map(h => ({
        'ID Visita': h.visita_id,
        'Fecha Inspección': h.fecha,
        'Punto de Venta': h.pdv_nombre,
        'Ciudad': h.ciudad_nombre,
        'Plantilla / Formato': h.plantilla_nombre,
        'Sección Evaluada': h.seccion_nombre,
        'Puntaje Actual (%)': h.puntaje,
        'Puntaje Visita Anterior (%)': h.puntaje_anterior !== null ? h.puntaje_anterior : 'Primera Visita',
        'Variación (pts)': h.diferencia,
        'Estado Alerta': h.alerta_disminucion ? '🔻 CAÍDA DETECTADA' : '🟢 Estable / Mejora',
        'Preguntas Cumple (SI)': h.preguntas_si,
        'Preguntas No Cumple (NO)': h.preguntas_no,
        'No Aplica (NA)': h.preguntas_na,
      }));
      const wsHist = XLSX.utils.json_to_sheet(rowsHist);
      XLSX.utils.book_append_sheet(wb, wsHist, 'Historial y Alertas');

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Analisis_Comportamiento_Calidad_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Guardar copia automáticamente en las carpetas y repositorio del servidor
      try {
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('categoria', 'analisis_calidad');
        formData.append('tipo_documento', 'Análisis Comportamiento Calidad');
        formData.append('observaciones', `Análisis de Comportamiento de Calidad exportado desde Reportes (${dateStr})`);
        await fetch('/api/uploads', { method: 'POST', body: formData });
      } catch (repoErr) {
        console.warn('Error al almacenar en repositorio de archivos:', repoErr);
      }
    } catch (err) {
      console.error('Export Calidad error:', err);
      alert('Error al exportar analítica de Calidad: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintEjecutivo = async () => {
    if (calidadData) {
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const rankingStr = (calidadData.ranking_pdv || []).map((p, i) => `${i + 1}. ${p.pdv_nombre} (${p.ciudad_nombre || ''}) - Promedio: ${p.puntaje_promedio}%`).join('\n');
        const content = `REPORTE PDF EJECUTIVO - ANALÍTICA DE CALIDAD & L&D
==================================================
Ciudad: ${calidadCiudad === 'all' ? 'Todas' : calidadCiudad}
Periodo de Análisis: ${calidadFechaInicio} al ${calidadFechaFin}
Sección: ${calidadSeccion === 'all' ? 'Todas' : calidadSeccion}
Fecha del Reporte: ${dateStr}
Total PDVs Evaluados: ${calidadData.ranking_pdv?.length || 0}
Promedio General: ${calidadData.kpis?.promedio_general || 0}%

RANKING DE PUNTOS DE VENTA:
${rankingStr || 'Sin registros evaluados en el periodo.'}
==================================================
Impreso y registrado en el repositorio el ${new Date().toLocaleString('es-ES')}
`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const fileName = `Reporte_Ejecutivo_Impreso_${dateStr}.txt`;
        const file = new File([blob], fileName, { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('categoria', 'analisis_calidad');
        formData.append('tipo_documento', 'Reporte PDF Ejecutivo Impreso (Soporte)');
        formData.append('observaciones', `Copia automática del reporte ejecutivo al imprimir en PDF (${dateStr})`);
        await fetch('/api/uploads', { method: 'POST', body: formData });
      } catch (err) {
        console.warn('Error respaldando reporte ejecutivo en repositorio:', err);
      }
    }
    window.print();
  };


  const clearFilters = () => {
    setFiltroArea(mappedArea || '');
    setFiltroCategoria('');
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setBusquedaTexto('');
    setActiveAreaTab(mappedArea || 'todos');
  };

  // Client-side text search
  const filteredVisitas = (data?.visitas || []).filter(v => {
    if (!busquedaTexto) return true;
    const q = busquedaTexto.toLowerCase();
    return (
      v.pdv_nombre?.toLowerCase().includes(q) ||
      v.area_nombre?.toLowerCase().includes(q) ||
      v.tipo_visita_nombre?.toLowerCase().includes(q) ||
      v.categoria_nombre?.toLowerCase().includes(q) ||
      v.responsable_nombre?.toLowerCase().includes(q) ||
      v.observaciones?.toLowerCase().includes(q) ||
      String(v.id).includes(q)
    );
  });

  const categoriasForArea = filtroArea
    ? (data?.categorias || []).filter(c => c.area_id === parseInt(filtroArea) && !c.padre_id)
    : [];

  return (
    <div className="rep-container">
      <div className="rep-header">
        <div>
          <h1 className="rep-title">📊 Reportes por Área</h1>
          <p className="rep-subtitle">Historial de visitas, tickets y actividades por área operativa</p>
        </div>
        <button
          className="btn-export"
          onClick={exportToExcel}
          disabled={exportLoading || !filteredVisitas.length}
          id="btn-exportar-excel"
        >
          {exportLoading ? '⏳ Exportando...' : '📥 Exportar Excel'}
        </button>
      </div>

      {/* Master View / Tab Switcher */}
      <div className="rep-master-tabs" style={{ display: 'flex', gap: '12px', margin: '16px 0 24px 0', borderBottom: '2px solid #E8DDD4', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setReporteTab('general')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            border: 'none',
            cursor: 'pointer',
            background: reporteTab === 'general' ? '#8B6914' : '#F3EFEA',
            color: reporteTab === 'general' ? '#FFF' : '#4A2518',
            boxShadow: reporteTab === 'general' ? '0 4px 10px rgba(139, 105, 20, 0.25)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📋 Reporte General y Operaciones ({filteredVisitas.length})
        </button>
        <button
          type="button"
          onClick={() => setReporteTab('calidad')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            border: 'none',
            cursor: 'pointer',
            background: reporteTab === 'calidad' ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' : '#F0FDF4',
            color: reporteTab === 'calidad' ? '#FFF' : '#166534',
            boxShadow: reporteTab === 'calidad' ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
            border: reporteTab === 'calidad' ? 'none' : '1px solid #BBF7D0',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔬 Analítica de Comportamiento e Histórico por Sub-Área (Calidad)
        </button>
      </div>

      {reporteTab === 'general' && (
        <>
          {/* ===== KPI Cards ===== */}
          {data && (
            <div className="kpi-grid">
          {data.resumenPorArea
            .filter(area => !mappedArea || String(area.area_id) === String(mappedArea))
            .map((area, idx) => {
              const total = area.total || 0;
            const completadas = (area.cerradas || 0) + (area.finalizadas || 0);
            const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
            return (
              <div
                key={idx}
                className={`kpi-area-card ${activeAreaTab === String(area.area_id) ? 'kpi-active' : ''}`}
                onClick={() => {
                  setActiveAreaTab(String(area.area_id));
                  setFiltroArea(String(area.area_id));
                }}
                id={`kpi-area-${area.area_id}`}
              >
                <div className="kpi-area-top">
                  <span className="kpi-area-dot" style={{ background: area.area_color || '#8B6914' }}></span>
                  <span className="kpi-area-name">{area.area_nombre}</span>
                </div>
                <div className="kpi-area-num">{total}</div>
                <div className="kpi-area-label">visitas totales</div>
                <div className="kpi-bar-bg">
                  <div className="kpi-bar-fill" style={{ width: `${pct}%`, background: area.area_color || '#8B6914' }}></div>
                </div>
                <div className="kpi-area-pct">{pct}% completadas</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Filters Panel ===== */}
      <div className="filters-panel">
        <div className="filters-row">
          <div className="filter-group">
            <label>🗂️ Área</label>
            <select
              value={filtroArea}
              onChange={e => { setFiltroArea(e.target.value); setFiltroCategoria(''); setActiveAreaTab(e.target.value || 'todos'); }}
              id="filtro-area"
              disabled={!!mappedArea}
            >
              {!mappedArea && <option value="">Todas las áreas</option>}
              {(data?.areas || [])
                .filter(a => !mappedArea || String(a.id) === String(mappedArea))
                .map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
            </select>
          </div>

          {categoriasForArea.length > 0 && (
            <div className="filter-group">
              <label>📋 Categoría</label>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} id="filtro-categoria">
                <option value="">Todas las categorías</option>
                {categoriasForArea.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>🏙️ Ciudad</label>
            <select value={filtroCiudad} onChange={e => setFiltroCiudad(e.target.value)} id="filtro-ciudad">
              <option value="">Todas las ciudades</option>
              {(data?.ciudades || []).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🔖 Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} id="filtro-estado">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📅 Desde</label>
            <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} id="filtro-fecha-desde" />
          </div>

          <div className="filter-group">
            <label>📅 Hasta</label>
            <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} id="filtro-fecha-hasta" />
          </div>
        </div>

        <div className="filters-actions-row">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por PDV, área, responsable, observaciones..."
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value)}
              className="search-input"
              id="busqueda-texto"
            />
          </div>
          <button className="btn-apply" onClick={fetchData} id="btn-aplicar-filtros">Aplicar Filtros</button>
          <button className="btn-clear" onClick={clearFilters} id="btn-limpiar-filtros">Limpiar</button>
        </div>
      </div>

      {/* ===== Results Table ===== */}
      {loading ? (
        <div className="loading-wrap"><div className="spinner"></div><p>Cargando reportes...</p></div>
      ) : error ? (
        <div className="error-wrap">⚠️ {error}</div>
      ) : (
        <>
          <div className="results-header">
            <span className="results-count">
              {filteredVisitas.length} {filteredVisitas.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="table-wrapper">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>PDV / Ciudad</th>
                  <th>Área</th>
                  <th>Categoría</th>
                  <th>Tipo / Detalle</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Horario</th>
                  <th>⚡ Operación</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-row">No hay registros con los filtros aplicados</td>
                  </tr>
                ) : (
                  filteredVisitas.map(v => {
                    const estado = ESTADO_LABELS[v.estado] || { label: v.estado, color: '#6b7280', bg: '#f3f4f6' };
                    return (
                      <tr key={v.id} className="rep-row">
                        <td className="cell-id">#{v.id}</td>
                        <td className="cell-fecha">{v.fecha}</td>
                        <td>
                          <div className="cell-pdv">{v.pdv_nombre}</div>
                          <div className="cell-ciudad">🏙️ {v.ciudad_nombre}</div>
                        </td>
                        <td>
                          <span className="area-badge" style={{ background: v.area_color + '22', color: v.area_color, borderColor: v.area_color + '55' }}>
                            {v.area_nombre}
                          </span>
                        </td>
                        <td className="cell-categoria">
                          {v.categoria_padre_nombre && (
                            <span className="cat-padre">{v.categoria_padre_nombre} ›</span>
                          )}
                          <span className="cat-nombre">{v.categoria_nombre || '—'}</span>
                        </td>
                        <td className="cell-tipo">
                          <div style={{ fontWeight: 600, color: '#374151' }}>{v.tipo_visita_nombre || '—'}</div>
                          {v.hallazgos && (
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.hallazgos}>
                              {v.hallazgos}
                            </div>
                          )}
                        </td>
                        <td className="cell-resp">{v.responsable_nombre || '—'}</td>
                        <td>
                          <span className="estado-badge" style={{ background: estado.bg, color: estado.color }}>
                            {estado.label}
                          </span>
                        </td>
                        <td className="cell-horario">
                          {v.hora_inicio && v.hora_fin ? `${v.hora_inicio} – ${v.hora_fin}` : v.hora_inicio || '—'}
                        </td>
                        <td className="cell-accion">
                          <button
                            className="btn-ver-operacion"
                            onClick={() => handleVerOperacion(v)}
                            title="Ver trazabilidad, checklist, evidencias y firmas de esta operación"
                          >
                            👁️ Ver Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== Mobile Cards View (Para teléfonos / PWA) ===== */}
          <div className="rep-cards-mobile">
            {filteredVisitas.length === 0 ? (
              <div className="empty-card">No hay registros con los filtros aplicados</div>
            ) : (
              filteredVisitas.map(v => {
                const estado = ESTADO_LABELS[v.estado] || { label: v.estado, color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <div key={v.id} className="mobile-card" style={{ borderLeftColor: v.area_color || 'var(--color-primary)' }}>
                    <div className="mobile-card-header">
                      <div className="mobile-card-title">
                        <span className="mobile-pdv">🏢 {v.pdv_nombre}</span>
                        <span className="mobile-ciudad">📍 {v.ciudad_nombre} • #{v.id}</span>
                      </div>
                      <span className="estado-badge" style={{ background: estado.bg, color: estado.color }}>
                        {estado.label}
                      </span>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-metric">
                        <span className="m-label">🗂️ Área</span>
                        <span className="m-val area-badge-small" style={{ color: v.area_color, background: v.area_color + '18', borderColor: v.area_color + '44' }}>
                          {v.area_nombre}
                        </span>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">📋 Visita / Cat.</span>
                        <div className="m-val">
                          <div>{v.categoria_nombre || v.tipo_visita_nombre || '—'}</div>
                          {v.hallazgos && (
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                              {v.hallazgos}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">👤 Responsable</span>
                        <span className="m-val">{v.responsable_nombre || '—'}</span>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">🕒 Horario / Fecha</span>
                        <span className="m-val">{v.fecha} {v.hora_inicio ? `(${v.hora_inicio})` : ''}</span>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <button
                        className="btn-ver-detalle-mobile"
                        onClick={() => handleVerOperacion(v)}
                      >
                        👁️ Ver Detalle Completo
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Category breakdown if available */}
          {data?.resumenPorCategoria?.length > 0 && (
            <div className="cat-breakdown">
              <h3 className="cat-breakdown-title">📋 Visitas por Categoría (Top 20)</h3>
              <div className="cat-list">
                {data.resumenPorCategoria.slice(0, 20).map((cat, idx) => {
                  const pct = cat.total > 0 ? Math.round((cat.completadas / cat.total) * 100) : 0;
                  return (
                    <div key={idx} className="cat-item">
                      <div className="cat-item-header">
                        <div className="cat-item-name">
                          {cat.padre_nombre && <span className="cat-item-padre">{cat.padre_nombre} › </span>}
                          <span>{cat.categoria_nombre}</span>
                        </div>
                        <div className="cat-item-stats">
                          <span className="cat-total">{cat.total}</span>
                          <span className="cat-sep">/</span>
                          <span className="cat-completadas">{cat.completadas} completadas</span>
                        </div>
                      </div>
                      <div className="cat-bar-bg">
                        <div className="cat-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )}

  {/* ===== MÓDULO 6: ANALÍTICA GERENCIAL DE CALIDAD E HISTÓRICO POR SECCIÓN ===== */}
  {reporteTab === 'calidad' && (
    <div className="calidad-analytics-section animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Actions & Presentation Trigger */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)', color: '#FFF', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 8px 24px rgba(22, 101, 52, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ background: '#22C55E', color: '#052E16', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
              📈 Módulo de Calidad & L&D
            </span>
            <h2 style={{ margin: '8px 0 6px 0', fontSize: '1.5rem', fontWeight: '800' }}>
              Analítica de Comportamiento y Evolución por Sub-Área
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#DCFCE7', maxWidth: '750px', lineHeight: '1.4' }}>
              Evalúa el desempeño individual de cada sección del punto de venta (Almacén, Cocina, Cuartos Fríos, Manipuladores, etc.) frente a visitas históricas. Detecta caídas al instante con alertas visuales y exporta reportes gerenciales para toma de decisiones.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setModoPresentacion(true)}
              style={{ background: '#F59E0B', color: '#451A03', fontWeight: 'bold', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}
            >
              🖥️ Modo Presentación Gerencial (PPT)
            </button>
            <button
              type="button"
              onClick={exportCalidadToExcel}
              disabled={exportLoading || !calidadData}
              style={{ background: '#FFF', color: '#166534', fontWeight: 'bold', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {exportLoading ? '⏳ Exportando...' : '📥 Exportar Excel Gerencial'}
            </button>
            <button
              type="button"
              onClick={handlePrintEjecutivo}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer' }}
            >
              📄 Imprimir PDF Ejecutivo
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ background: '#F8FAF6', border: '1px solid #DCFCE7', borderRadius: '14px', padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>📅 Fecha Inicio</label>
          <input
            type="date"
            className="form-control"
            value={calidadFechaInicio}
            onChange={(e) => setCalidadFechaInicio(e.target.value)}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px', fontWeight: '600' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>📅 Fecha Fin</label>
          <input
            type="date"
            className="form-control"
            value={calidadFechaFin}
            onChange={(e) => setCalidadFechaFin(e.target.value)}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px', fontWeight: '600' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>🏪 Punto de Venta (PDV)</label>
          <select
            className="form-select"
            value={calidadPdv}
            onChange={(e) => setCalidadPdv(e.target.value)}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px' }}
          >
            <option value="all">📍 Todos los Puntos de Venta</option>
            {pdvsList.map(pdv => (
              <option key={pdv.id} value={pdv.id}>{pdv.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>🗂️ Área Evaluada</label>
          <select
            className="form-select"
            value={calidadSeccion}
            onChange={(e) => {
              setCalidadSeccion(e.target.value);
              setCalidadSubArea('all'); // Reset sub-area on area change
              setCalidadItem('all'); // Reset item
            }}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px' }}
          >
            <option value="all">📁 Todas las Áreas</option>
            {(calidadData?.areas_disponibles || []).map((sec, idx) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>🔬 Sub-Área</label>
          <select
            className="form-select"
            value={calidadSubArea}
            onChange={(e) => {
              setCalidadSubArea(e.target.value);
              setCalidadItem('all'); // Reset item on subarea change
            }}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px', opacity: calidadSeccion === 'all' ? 0.5 : 1 }}
            disabled={calidadSeccion === 'all'}
          >
            <option value="all">📑 {calidadSeccion === 'all' ? 'Selecciona un Área primero' : 'Todas las Sub-áreas'}</option>
            {(calidadData?.subareas_disponibles || []).map((sec, idx) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>📝 Ítem / Pregunta</label>
          <select
            className="form-select"
            value={calidadItem}
            onChange={(e) => setCalidadItem(e.target.value)}
            style={{ border: '1px solid #86EFAC', borderRadius: '8px', padding: '8px 12px', opacity: calidadSubArea === 'all' ? 0.5 : 1 }}
            disabled={calidadSubArea === 'all'}
          >
            <option value="all">🔍 {calidadSubArea === 'all' ? 'Selecciona una Sub-Área primero' : 'Todos los Ítems'}</option>
            {(calidadData?.items_disponibles || []).map((sec, idx) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '18px' }}>
          <button
            type="button"
            onClick={fetchCalidadComportamiento}
            style={{ background: '#16A34A', color: '#FFF', fontWeight: 'bold', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
          >
            🔄 Actualizar Datos
          </button>
        </div>
      </div>

      {calidadLoading ? (
        <div className="loading-wrap" style={{ padding: '40px' }}><div className="spinner"></div><p>Calculando analítica y puntajes por sección...</p></div>
      ) : !calidadData ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No hay datos disponibles. Verifica que existan inspecciones del área de Calidad.</div>
      ) : (
        <>
          {/* KPI Summary Cards - 3 Cuadros de Evolución y Comparativa (Solicitados) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Cuadro 1: Evaluación Mes Anterior */}
            <div className="card shadow-md" style={{ padding: '20px', borderRadius: '16px', borderTop: '5px solid #64748B', background: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '800', letterSpacing: '0.5px' }}>
                  📅 PUNTAJE EVALUACIÓN MES ANTERIOR
                </div>
                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#334155', margin: '8px 0 4px 0' }}>
                  {calidadData.summary.puntaje_mes_anterior || 0}%
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
                Periodo base: <strong>{calidadData.summary.mes_anterior_label || 'Mes Anterior'}</strong>
              </div>
            </div>

            {/* Cuadro 2: Evaluación Mes Actual */}
            <div className="card shadow-md" style={{ padding: '20px', borderRadius: '16px', borderTop: '5px solid #3B82F6', background: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: '800', letterSpacing: '0.5px' }}>
                  ⭐ PUNTAJE EVALUACIÓN MES ACTUAL
                </div>
                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: (calidadData.summary.puntaje_mes_actual >= 90 ? '#15803D' : calidadData.summary.puntaje_mes_actual >= 75 ? '#B45309' : '#DC2626'), margin: '8px 0 4px 0' }}>
                  {calidadData.summary.puntaje_mes_actual || 0}%
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E40AF', background: '#EFF6FF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #BFDBFE', marginTop: '10px' }}>
                Periodo evaluado: <strong>{calidadData.summary.mes_actual_label || 'Mes Actual'}</strong>
              </div>
            </div>

            {/* Cuadro 3: Comparativa entre ambos periodos */}
            <div className="card shadow-md" style={{ padding: '20px', borderRadius: '16px', borderTop: `5px solid ${calidadData.summary.diferencia_puntos > 0.1 ? '#16A34A' : calidadData.summary.diferencia_puntos < -0.1 ? '#DC2626' : '#EAB308'}`, background: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '800', letterSpacing: '0.5px' }}>
                    ⚖️ COMPARATIVA ENTRE PERIODOS
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: '900', padding: '4px 10px', borderRadius: '20px', background: calidadData.summary.diferencia_puntos > 0.1 ? '#DCFCE7' : calidadData.summary.diferencia_puntos < -0.1 ? '#FEE2E2' : '#FEF9C3', color: calidadData.summary.diferencia_puntos > 0.1 ? '#166534' : calidadData.summary.diferencia_puntos < -0.1 ? '#991B1B' : '#854D0E' }}>
                    {calidadData.summary.diferencia_puntos > 0.1 ? '🟢 Mejoró 📈' : calidadData.summary.diferencia_puntos < -0.1 ? '🔴 Disminuyó 📉' : '🟡 Se mantuvo ➖'}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0 6px 0' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 'bold' }}>DIFERENCIA (PTS)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: calidadData.summary.diferencia_puntos > 0.1 ? '#16A34A' : calidadData.summary.diferencia_puntos < -0.1 ? '#DC2626' : '#64748B' }}>
                      {calidadData.summary.diferencia_puntos > 0 ? `+${calidadData.summary.diferencia_puntos}` : calidadData.summary.diferencia_puntos} pts
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 'bold' }}>VARIACIÓN (%)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: calidadData.summary.variacion_porcentual > 0 ? '#16A34A' : calidadData.summary.variacion_porcentual < 0 ? '#DC2626' : '#64748B' }}>
                      {calidadData.summary.variacion_porcentual > 0 ? `+${calidadData.summary.variacion_porcentual}%` : `${calidadData.summary.variacion_porcentual}%`}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                <span>Evolución visual del desempeño operacional del punto de venta.</span>
              </div>
            </div>
          </div>

          {/* KPI General Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '6px solid #16A34A', background: '#FFF' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold' }}>PROMEDIO GENERAL PERIODO</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: calidadData.summary.promedio_general >= 90 ? '#15803D' : calidadData.summary.promedio_general >= 75 ? '#B45309' : '#DC2626', margin: '4px 0' }}>
                {calidadData.summary.promedio_general}%
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '6px solid #3B82F6', background: '#FFF' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold' }}>SUB-ÁREAS EVALUADAS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B', margin: '4px 0' }}>
                {calidadData.summary.secciones_evaluadas}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '6px solid #8B5CF6', background: '#FFF' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold' }}>VISITAS ANALIZADAS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B', margin: '4px 0' }}>
                {calidadData.summary.total_visitas}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderRadius: '14px', borderLeft: '6px solid #EF4444', background: '#FFF' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold' }}>🔴 ALERTAS DE DISMINUCIÓN</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#EF4444', margin: '4px 0' }}>
                {calidadData.summary.alertas_activas}
              </div>
            </div>
          </div>

          {/* Sub-Tabs Selector */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCalidadSubTab('evolucion')}
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: calidadSubTab === 'evolucion' ? '#16A34A' : '#F1F5F9', color: calidadSubTab === 'evolucion' ? '#FFF' : '#334155' }}
            >
              📈 Desempeño por Sub-Área
            </button>
            <button
              type="button"
              onClick={() => setCalidadSubTab('ranking')}
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: calidadSubTab === 'ranking' ? '#16A34A' : '#F1F5F9', color: calidadSubTab === 'ranking' ? '#FFF' : '#334155' }}
            >
              🏆 Ranking por PDV (Mes Anterior vs Actual)
            </button>
            <button
              type="button"
              onClick={() => setCalidadSubTab('comparador')}
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: calidadSubTab === 'comparador' ? '#2563EB' : '#EFF6FF', color: calidadSubTab === 'comparador' ? '#FFF' : '#1E40AF', border: '1px solid #BFDBFE' }}
            >
              ⚖️ Comparador Libre de Periodos
            </button>
            <button
              type="button"
              onClick={() => setCalidadSubTab('longitudinal')}
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: calidadSubTab === 'longitudinal' ? '#7C3AED' : '#F5F3FF', color: calidadSubTab === 'longitudinal' ? '#FFF' : '#5B21B6', border: '1px solid #DDD6FE' }}
            >
              📊 Evolución Longitudinal por Sección
            </button>
            <button
              type="button"
              onClick={() => setCalidadSubTab('historial')}
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: calidadSubTab === 'historial' ? '#16A34A' : '#F1F5F9', color: calidadSubTab === 'historial' ? '#FFF' : '#334155' }}
            >
              📜 Trazabilidad y Alertas ({calidadData.historial.length})
            </button>
          </div>

          {/* Sub-Tab 1: Evolución por Sub-Área / Sección */}
          {calidadSubTab === 'evolucion' && (
            <div className="card" style={{ padding: '22px', borderRadius: '14px', background: '#FFF' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Comportamiento y Evolución de cada Sección Evaluada
              </h3>
              
              {mounted && calidadData.evolucion_por_seccion && calidadData.evolucion_por_seccion.length > 0 && (
                <div style={{ height: 400, marginBottom: '24px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={calidadData.evolucion_por_seccion}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="seccion_nombre" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 11}} />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip formatter={(val) => `${val}%`} />
                      <Legend verticalAlign="top" />
                      <Bar dataKey="puntaje_promedio" name="Puntaje Promedio (%)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sección / Sub-Área</th>
                      <th style={{ width: '280px' }}>Desempeño Promedio</th>
                      <th style={{ textAlign: 'center' }}>Visitas Evaluadas</th>
                      <th style={{ textAlign: 'center' }}>Caídas Recientes</th>
                      <th>🏆 Mejor Desempeño (PDV)</th>
                      <th>⚠️ Atención Crítica (Peor PDV)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(calidadData.evolucion_por_seccion || []).map((sec, idx) => {
                      const pct = sec.puntaje_promedio || 0;
                      const color = pct >= 90 ? '#16A34A' : pct >= 75 ? '#F59E0B' : '#EF4444';
                      return (
                        <tr key={idx}>
                          <td>
                            <strong style={{ color: '#1E293B', fontSize: '0.95rem' }}>{sec.seccion_nombre}</strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, background: '#F1F5F9', height: '14px', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(pct, 100)}%`, background: color, height: '100%', borderRadius: '10px', transition: 'width 0.4s ease' }} />
                              </div>
                              <span style={{ fontWeight: '800', color: color, minWidth: '45px' }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>{sec.visitas_evaluadas}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {sec.caidas_recientes > 0 ? (
                              <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                🔻 {sec.caidas_recientes} alerta(s)
                              </span>
                            ) : (
                              <span style={{ color: '#10B981', fontWeight: '600' }}>🟢 Sin caídas</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', color: '#15803D' }}>{sec.mejor_pdv?.nombre}</span> ({sec.mejor_pdv?.puntaje}%)
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', color: sec.peor_pdv?.puntaje < 75 ? '#DC2626' : '#64748B' }}>{sec.peor_pdv?.nombre}</span> ({sec.peor_pdv?.puntaje}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Ranking Gerencial por PDV */}
          {calidadSubTab === 'ranking' && (
            <div className="card" style={{ padding: '22px', borderRadius: '14px', background: '#FFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#166534', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    🏆 Ranking y Evolución por Punto de Venta (PDV)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                    Comparativa de puntajes entre la evaluación del mes anterior y la evaluación del mes actual.
                  </p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '60px' }}>Puesto</th>
                      <th>Punto de Venta (PDV)</th>
                      <th>Ciudad</th>
                      <th style={{ textAlign: 'center' }}>Mes Anterior</th>
                      <th style={{ textAlign: 'center' }}>Mes Actual</th>
                      <th style={{ textAlign: 'center' }}>Diferencia / Variación</th>
                      <th style={{ textAlign: 'center' }}>Indicador de Tendencia</th>
                      <th style={{ textAlign: 'center' }}>Inspecciones Evaluadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(calidadData.ranking_pdv || []).map((p, idx) => {
                      const pctActual = p.puntaje_mes_actual !== undefined ? p.puntaje_mes_actual : p.puntaje_promedio;
                      const pctAnterior = p.puntaje_mes_anterior !== undefined ? p.puntaje_mes_anterior : p.puntaje_promedio;
                      const diff = p.diferencia_puntos || 0;
                      const varPct = p.variacion_porcentual || 0;

                      return (
                        <tr key={idx} style={{ background: idx === 0 ? '#FEFCE8' : 'inherit' }}>
                          <td style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>
                          <td><strong style={{ color: '#1E293B', fontSize: '0.95rem' }}>{p.pdv_nombre}</strong></td>
                          <td>{p.ciudad_nombre}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#475569' }}>
                              {pctAnterior}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '1.1rem',
                              fontWeight: '900',
                              color: pctActual >= 90 ? '#15803D' : pctActual >= 75 ? '#D97706' : '#DC2626'
                            }}>
                              {pctActual}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: '800', color: diff > 0.1 ? '#16A34A' : diff < -0.1 ? '#DC2626' : '#64748B', fontSize: '0.92rem' }}>
                              {diff > 0 ? `+${diff}` : diff} pts
                            </div>
                            <div style={{ fontSize: '0.75rem', color: varPct > 0 ? '#15803D' : varPct < 0 ? '#B91C1C' : '#64748B', fontWeight: 'bold' }}>
                              {varPct > 0 ? `(+${varPct}%)` : `(${varPct}%)`}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '5px 12px',
                              borderRadius: '16px',
                              fontWeight: 'bold',
                              fontSize: '0.78rem',
                              background: diff > 0.1 ? '#DCFCE7' : diff < -0.1 ? '#FEE2E2' : '#FEF9C3',
                              color: diff > 0.1 ? '#166534' : diff < -0.1 ? '#991B1B' : '#854D0E',
                              display: 'inline-block'
                            }}>
                              {diff > 0.1 ? '🟢 Mejoró 📈' : diff < -0.1 ? '🔴 Disminuyó 📉' : '🟡 Se mantuvo ➖'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '600' }}>{p.total_evaluaciones}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Comparador Libre de Periodos Históricos */}
          {calidadSubTab === 'comparador' && (
            <div className="card shadow-lg animate-fade-in" style={{ padding: '24px', borderRadius: '16px', background: '#FFF' }}>
              <div style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#1E40AF', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚖️ Comparador Histórico Libre entre Cualquier Periodo
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                  Selecciona dos periodos o meses históricos para analizar la diferencia en puntos, variación porcentual y la tendencia por cada sub-área.
                </p>
              </div>

              {(!calidadData.evaluaciones_por_periodo || calidadData.evaluaciones_por_periodo.length < 1) ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                  No hay suficientes periodos evaluados para realizar una comparación.
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', background: '#F8FAFC', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}>
                        📅 PERIODO ACTUAL / RECIENTE (Periodo A):
                      </label>
                      <select
                        className="form-select"
                        value={compPeriodoA || (calidadData.evaluaciones_por_periodo[0]?.periodo || '')}
                        onChange={(e) => setCompPeriodoA(e.target.value)}
                        style={{ fontWeight: 'bold', border: '2px solid #BFDBFE', background: '#EFF6FF', color: '#1E40AF' }}
                      >
                        {calidadData.evaluaciones_por_periodo.map((p, i) => (
                          <option key={i} value={p.periodo}>
                            {p.periodo} ({p.total_evaluaciones} visitas - Prom: {p.puntaje_promedio}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.82rem', color: '#334155', marginBottom: '6px' }}>
                        🕒 PERIODO ANTERIOR / BASE (Periodo B):
                      </label>
                      <select
                        className="form-select"
                        value={compPeriodoB || (calidadData.evaluaciones_por_periodo[1]?.periodo || calidadData.evaluaciones_por_periodo[0]?.periodo || '')}
                        onChange={(e) => setCompPeriodoB(e.target.value)}
                        style={{ fontWeight: 'bold', border: '2px solid #CBD5E1', background: '#FFF', color: '#334155' }}
                      >
                        {calidadData.evaluaciones_por_periodo.map((p, i) => (
                          <option key={i} value={p.periodo}>
                            {p.periodo} ({p.total_evaluaciones} visitas - Prom: {p.puntaje_promedio}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabla comparativa de las 2 selecciones */}
                  {(() => {
                    const objA = calidadData.evaluaciones_por_periodo.find(p => p.periodo === compPeriodoA) || calidadData.evaluaciones_por_periodo[0];
                    const objB = calidadData.evaluaciones_por_periodo.find(p => p.periodo === compPeriodoB) || calidadData.evaluaciones_por_periodo[1] || calidadData.evaluaciones_por_periodo[0];

                    if (!objA || !objB) return null;

                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#EFF6FF', padding: '12px 18px', borderRadius: '10px', borderLeft: '5px solid #2563EB' }}>
                          <span style={{ fontWeight: 'bold', color: '#1E40AF', fontSize: '0.92rem' }}>
                            Comparando: <strong>{objA.periodo} ({objA.puntaje_promedio}%)</strong> vs <strong>{objB.periodo} ({objB.puntaje_promedio}%)</strong>
                          </span>
                          <span style={{ fontSize: '0.82rem', background: '#FFF', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', color: objA.puntaje_promedio >= objB.puntaje_promedio ? '#16A34A' : '#DC2626', border: '1px solid #BFDBFE' }}>
                            Diferencia global: {Math.round((objA.puntaje_promedio - objB.puntaje_promedio)*10)/10 > 0 ? `+${Math.round((objA.puntaje_promedio - objB.puntaje_promedio)*10)/10}` : Math.round((objA.puntaje_promedio - objB.puntaje_promedio)*10)/10} pts
                          </span>
                        </div>

                        <div className="table-responsive">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Sub-Área / Sección Evaluada</th>
                                <th style={{ textAlign: 'center' }}>Puntaje Periodo A ({objA.periodo})</th>
                                <th style={{ textAlign: 'center' }}>Puntaje Periodo B ({objB.periodo})</th>
                                <th style={{ textAlign: 'center' }}>Diferencia (Pts)</th>
                                <th style={{ textAlign: 'center' }}>Variación (%)</th>
                                <th style={{ textAlign: 'center' }}>Indicador Visual</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(calidadData.areas_disponibles || []).map((sec, idx) => {
                                const stA = objA.desglose_subareas?.find(s => s.seccion_nombre === sec);
                                const stB = objB.desglose_subareas?.find(s => s.seccion_nombre === sec);
                                const scoreA = stA ? stA.puntaje : null;
                                const scoreB = stB ? stB.puntaje : null;

                                const diff = (scoreA !== null && scoreB !== null) ? Math.round((scoreA - scoreB) * 10) / 10 : null;
                                const varPct = (scoreB !== null && scoreB > 0 && diff !== null) ? Math.round((diff / scoreB) * 100 * 10) / 10 : null;

                                return (
                                  <tr key={idx}>
                                    <td><strong style={{ color: '#1E293B' }}>{sec}</strong></td>
                                    <td style={{ textAlign: 'center' }}>
                                      {scoreA !== null ? (
                                        <span style={{ fontWeight: '800', color: scoreA >= 90 ? '#15803D' : scoreA >= 75 ? '#D97706' : '#DC2626', fontSize: '1rem' }}>
                                          {scoreA}%
                                        </span>
                                      ) : <span style={{ color: '#94A3B8' }}>N/A</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {scoreB !== null ? (
                                        <span style={{ fontWeight: '700', color: '#475569', fontSize: '0.95rem' }}>
                                          {scoreB}%
                                        </span>
                                      ) : <span style={{ color: '#94A3B8' }}>N/A</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {diff !== null ? (
                                        <span style={{ fontWeight: '800', color: diff > 0.1 ? '#16A34A' : diff < -0.1 ? '#DC2626' : '#64748B' }}>
                                          {diff > 0 ? `+${diff}` : diff} pts
                                        </span>
                                      ) : <span style={{ color: '#94A3B8' }}>-</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {varPct !== null ? (
                                        <span style={{ fontWeight: 'bold', color: varPct > 0 ? '#15803D' : varPct < 0 ? '#B91C1C' : '#64748B' }}>
                                          {varPct > 0 ? `+${varPct}%` : `${varPct}%`}
                                        </span>
                                      ) : <span style={{ color: '#94A3B8' }}>-</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {diff !== null ? (
                                        <span style={{
                                          padding: '4px 12px',
                                          borderRadius: '14px',
                                          fontWeight: 'bold',
                                          fontSize: '0.78rem',
                                          background: diff > 0.1 ? '#DCFCE7' : diff < -0.1 ? '#FEE2E2' : '#FEF9C3',
                                          color: diff > 0.1 ? '#166534' : diff < -0.1 ? '#991B1B' : '#854D0E'
                                        }}>
                                          {diff > 0.1 ? '🟢 Mejoró 📈' : diff < -0.1 ? '🔴 Disminuyó 📉' : '🟡 Se mantuvo ➖'}
                                        </span>
                                      ) : <span style={{ color: '#94A3B8' }}>Sin datos</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Sub-Tab 4: Evolución Longitudinal por Sección Específica */}
          {calidadSubTab === 'longitudinal' && (
            <div className="card shadow-lg animate-fade-in" style={{ padding: '24px', borderRadius: '16px', background: '#FFF' }}>
              <div style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#5B21B6', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Evolución e Histórico Específico por Sub-Área
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                    Selecciona una sección o sub-área para ver su comportamiento longitudinal detallado en cada inspección.
                  </p>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#4C1D95', marginRight: '8px' }}>
                    Seleccionar Sección:
                  </label>
                  <select
                    className="form-select"
                    value={longitudinalSeccionSelected || (calidadData.secciones_disponibles?.[0] || '')}
                    onChange={(e) => setLongitudinalSeccionSelected(e.target.value)}
                    style={{ fontWeight: 'bold', border: '2px solid #DDD6FE', background: '#F5F3FF', color: '#5B21B6', padding: '8px 14px', borderRadius: '8px' }}
                  >
                    {(calidadData.secciones_disponibles || []).map((s, idx) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const filteredHist = (calidadData.historial || []).filter(h => h.seccion_nombre === (longitudinalSeccionSelected || calidadData.secciones_disponibles?.[0]));

                if (filteredHist.length === 0) {
                  return (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                      No se encontraron registros históricos para la sección "{longitudinalSeccionSelected}".
                    </div>
                  );
                }

                const avgSection = Math.round((filteredHist.reduce((acc, curr) => acc + curr.puntaje, 0) / filteredHist.length) * 10) / 10;
                const alertasSection = filteredHist.filter(h => h.alerta_disminucion).length;

                return (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '12px 20px', borderRadius: '12px', flex: 1, minWidth: '180px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6D28D9', fontWeight: 'bold', display: 'block' }}>PROMEDIO HISTÓRICO SECCIÓN</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: avgSection >= 90 ? '#15803D' : avgSection >= 75 ? '#D97706' : '#DC2626' }}>{avgSection}%</span>
                      </div>
                      <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '12px 20px', borderRadius: '12px', flex: 1, minWidth: '180px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#BE123C', fontWeight: 'bold', display: 'block' }}>CAÍDAS REGISTRADAS (ALERTAS)</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#E11D48' }}>{alertasSection}</span>
                      </div>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 20px', borderRadius: '12px', flex: 1, minWidth: '180px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 'bold', display: 'block' }}>EVALUACIONES REALIZADAS</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1E293B' }}>{filteredHist.length}</span>
                      </div>
                    </div>

                    {mounted && (
                      <div style={{ height: 350, marginBottom: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filteredHist.slice().reverse()} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip formatter={(val) => `${val}%`} />
                            <Legend />
                            <Line type="monotone" dataKey="puntaje" name="Puntaje Obtenido (%)" stroke="#7C3AED" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Fecha Evaluación</th>
                            <th>Punto de Venta (PDV)</th>
                            <th>Ciudad</th>
                            <th style={{ textAlign: 'center' }}>Puntaje Obtenido</th>
                            <th style={{ textAlign: 'center' }}>Puntaje Anterior</th>
                            <th style={{ textAlign: 'center' }}>Variación (Pts)</th>
                            <th style={{ textAlign: 'center' }}>Estado / Tendencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHist.map((h, idx) => (
                            <tr key={idx} style={{ background: h.alerta_disminucion ? '#FEF2F2' : 'inherit' }}>
                              <td><strong>{h.fecha}</strong></td>
                              <td><strong style={{ color: '#1E293B' }}>{h.pdv_nombre}</strong></td>
                              <td>{h.ciudad_nombre}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: '800', color: h.puntaje >= 90 ? '#15803D' : h.puntaje >= 75 ? '#D97706' : '#DC2626', fontSize: '1.05rem' }}>
                                  {h.puntaje}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 'bold' }}>
                                {h.puntaje_anterior !== null ? `${h.puntaje_anterior}%` : 'Inicial'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {h.puntaje_anterior !== null ? (
                                  <span style={{ fontWeight: 'bold', color: h.diferencia > 0 ? '#16A34A' : h.diferencia < 0 ? '#DC2626' : '#64748B' }}>
                                    {h.diferencia > 0 ? `+${h.diferencia}` : h.diferencia} pts
                                  </span>
                                ) : <span style={{ color: '#94A3B8' }}>-</span>}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {h.alerta_disminucion ? (
                                  <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.78rem', border: '1px solid #FECACA' }}>
                                    🔴 Caída detectada
                                  </span>
                                ) : h.diferencia > 0 ? (
                                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                                    🟢 Mejoró
                                  </span>
                                ) : (
                                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                                    🟡 Estable
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Sub-Tab 3: Historial Longitudinal y Alertas */}
          {calidadSubTab === 'historial' && (
            <div className="card" style={{ padding: '22px', borderRadius: '14px', background: '#FFF' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1.2rem', fontWeight: 'bold' }}>
                📜 Trazabilidad Longitudinal de Secciones Evaluadas (Orden Cronológico)
              </h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Visita #</th>
                      <th>Fecha</th>
                      <th>Punto de Venta</th>
                      <th>Formato / Plantilla</th>
                      <th>Sección Evaluada</th>
                      <th style={{ textAlign: 'center' }}>SÍ</th>
                      <th style={{ textAlign: 'center' }}>NO</th>
                      <th style={{ textAlign: 'center' }}>N/A</th>
                      <th style={{ textAlign: 'center' }}>Puntaje</th>
                      <th style={{ textAlign: 'center' }}>Evolución vs. Anterior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(calidadData.historial || []).map((h, idx) => (
                      <tr key={idx} style={{ background: h.alerta_disminucion ? '#FFF5F5' : 'inherit' }}>
                        <td><strong style={{ color: '#8B6914' }}>#{h.visita_id}</strong></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{h.fecha}</td>
                        <td><strong>{h.pdv_nombre}</strong> <br /><span style={{ fontSize: '0.75rem', color: '#666' }}>{h.ciudad_nombre}</span></td>
                        <td style={{ fontSize: '0.85rem', color: '#475569' }}>{h.plantilla_nombre}</td>
                        <td><strong style={{ color: '#1D4ED8', background: '#EFF6FF', padding: '3px 8px', borderRadius: '8px', fontSize: '0.85rem' }}>{h.seccion_nombre}</strong></td>
                        <td style={{ textAlign: 'center', color: '#15803D', fontWeight: 'bold' }}>{h.preguntas_si}</td>
                        <td style={{ textAlign: 'center', color: '#DC2626', fontWeight: 'bold' }}>{h.preguntas_no}</td>
                        <td style={{ textAlign: 'center', color: '#64748B' }}>{h.preguntas_na}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            color: h.puntaje >= 90 ? '#15803D' : h.puntaje >= 75 ? '#D97706' : '#DC2626'
                          }}>
                            {h.puntaje}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {h.puntaje_anterior === null ? (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>Primera toma</span>
                          ) : h.alerta_disminucion ? (
                            <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔻 Caída ({h.diferencia} pts vs {h.puntaje_anterior}%)
                            </span>
                          ) : (
                            <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              📈 {h.diferencia > 0 ? `+${h.diferencia}` : '0'} pts (vs {h.puntaje_anterior}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== MODAL PRESENTACIÓN GERENCIAL A PANTALLA COMPLETA (SLIDES) ===== */}
      {modoPresentacion && calidadData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFF',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px'
        }}>
          {/* Header Presentación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '2rem' }}>📊</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#22C55E' }}>Presentación Ejecutiva de Calidad & Inspecciones</h2>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Crepes & Waffles • Informe de Comportamiento por Sub-Área</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Diapositiva {slideIndex + 1} / 4
              </span>
              <button
                type="button"
                onClick={() => setModoPresentacion(false)}
                style={{ background: '#EF4444', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✕ Salir (Esc)
              </button>
            </div>
          </div>

          {/* Slide Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {slideIndex === 0 && (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                <span style={{ color: '#4ADE80', fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  Resumen Ejecutivo • {`${calidadFechaInicio} al ${calidadFechaFin}`}
                </span>
                <h1 style={{ fontSize: '2.8rem', fontWeight: '800', margin: '16px 0 32px 0', color: '#FFF' }}>
                  Estado del Sistema de Calidad y BPM en Puntos de Venta
                </h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', margin: '20px 0' }}>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '8px' }}>PUNTAJE GLOBAL</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#4ADE80' }}>{calidadData.summary.promedio_general}%</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '8px' }}>SECCIONES EVALUADAS</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#38BDF8' }}>{calidadData.summary.secciones_evaluadas}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '8px' }}>INSPECCIONES TOTALES</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#A855F7' }}>{calidadData.summary.total_visitas}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '8px' }}>ALERTAS DE CAÍDA</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#F87171' }}>{calidadData.summary.alertas_activas}</div>
                  </div>
                </div>
              </div>
            )}

            {slideIndex === 1 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '2rem', color: '#38BDF8', marginBottom: '24px' }}>🔬 Desempeño Operativo por Sub-Área / Sección</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '520px', overflowY: 'auto', paddingRight: '12px' }}>
                  {(calidadData.evolucion_por_seccion || []).map((sec, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '16px 20px', borderRadius: '14px', borderLeft: `6px solid ${sec.puntaje_promedio >= 90 ? '#22C55E' : sec.puntaje_promedio >= 75 ? '#F59E0B' : '#EF4444'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{sec.seccion_nombre}</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: sec.puntaje_promedio >= 90 ? '#4ADE80' : sec.puntaje_promedio >= 75 ? '#FBBF24' : '#F87171' }}>{sec.puntaje_promedio}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94A3B8' }}>
                        <span>🏆 Mejor: {sec.mejor_pdv?.nombre} ({sec.mejor_pdv?.puntaje}%)</span>
                        <span>⚠️ Peor: {sec.peor_pdv?.nombre} ({sec.peor_pdv?.puntaje}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slideIndex === 2 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '2rem', color: '#FBBF24', marginBottom: '24px' }}>🏆 Top Puntos de Venta según Promedio de Calidad</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {(calidadData.ranking_pdv || []).slice(0, 6).map((p, idx) => (
                    <div key={idx} style={{ background: idx === 0 ? 'rgba(250, 204, 21, 0.12)' : 'rgba(255,255,255,0.06)', padding: '22px', borderRadius: '16px', border: idx === 0 ? '2px solid #FBBF24' : '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '6px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`} {p.pdv_nombre}</div>
                      <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '14px' }}>{p.ciudad_nombre} • {p.total_evaluaciones} inspecciones</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: p.puntaje_promedio >= 90 ? '#4ADE80' : p.puntaje_promedio >= 75 ? '#FBBF24' : '#F87171' }}>{p.puntaje_promedio}%</span>
                        {p.secciones_en_alerta > 0 && <span style={{ background: '#EF4444', color: '#FFF', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>🔴 {p.secciones_en_alerta} caídas</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slideIndex === 3 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '2rem', color: '#F87171', marginBottom: '24px' }}>⚠️ Atención Prioritaria: Últimas Alertas de Disminución</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '500px', overflowY: 'auto' }}>
                  {(calidadData.historial || []).filter(h => h.alerta_disminucion).slice(0, 8).map((alerta, idx) => (
                    <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.12)', borderLeft: '6px solid #EF4444', padding: '16px 22px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{alerta.pdv_nombre} ({alerta.ciudad_nombre})</span>
                        <div style={{ fontSize: '0.9rem', color: '#FCA5A5', marginTop: '4px' }}>
                          Sección: <strong>{alerta.seccion_nombre}</strong> • Visita #{alerta.visita_id} el {alerta.fecha}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#F87171' }}>{alerta.puntaje}%</span>
                        <div style={{ fontSize: '0.85rem', color: '#FCA5A5', fontWeight: 'bold' }}>🔻 Caída de {alerta.diferencia} pts (Anterior: {alerta.puntaje_anterior}%)</div>
                      </div>
                    </div>
                  ))}
                  {(calidadData.historial || []).filter(h => h.alerta_disminucion).length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '14px', color: '#4ADE80', fontSize: '1.3rem', fontWeight: 'bold' }}>
                      🎉 ¡Excelente! No se detectaron disminuciones en el puntaje de ninguna sección frente a visitas anteriores en este periodo.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Presentación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
              💡 Usa las flechas del teclado (← / →) o el botón para navegar entre diapositivas
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                disabled={slideIndex === 0}
                onClick={() => setSlideIndex(prev => Math.max(prev - 1, 0))}
                style={{ background: slideIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 'bold', cursor: slideIndex === 0 ? 'not-allowed' : 'pointer' }}
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={slideIndex === 3}
                onClick={() => setSlideIndex(prev => Math.min(prev + 1, 3))}
                style={{ background: slideIndex === 3 ? 'rgba(255,255,255,0.05)' : '#22C55E', color: '#FFF', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 'bold', cursor: slideIndex === 3 ? 'not-allowed' : 'pointer' }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* ===== Modal Detalle Operación / Visita ===== */}
  {selectedVisitaDetalle && (
        <div className="det-modal-overlay" onClick={() => setSelectedVisitaDetalle(null)}>
          <div className="det-modal-container" onClick={e => e.stopPropagation()}>
            <div className="det-modal-header">
              <div>
                <div className="det-header-title">
                  <span>📋 Operación / Visita #{selectedVisitaDetalle.id}</span>
                  <span className="estado-badge" style={{ 
                    background: ESTADO_LABELS[selectedVisitaDetalle.estado]?.bg || '#f3f4f6', 
                    color: ESTADO_LABELS[selectedVisitaDetalle.estado]?.color || '#6b7280',
                    marginLeft: '10px'
                  }}>
                    {ESTADO_LABELS[selectedVisitaDetalle.estado]?.label || selectedVisitaDetalle.estado}
                  </span>
                </div>
                <p className="det-header-sub">
                  🏢 {selectedVisitaDetalle.pdv_nombre} ({selectedVisitaDetalle.ciudad_nombre}) • 📅 {selectedVisitaDetalle.fecha}
                </p>
              </div>
              <button className="det-modal-close" onClick={() => setSelectedVisitaDetalle(null)}>×</button>
            </div>

            <div className="det-modal-tabs">
              <button 
                className={`det-tab-btn ${detalleTab === 'general' ? 'active' : ''}`}
                onClick={() => setDetalleTab('general')}
              >
                📌 Resumen & Checklist
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'hallazgos' ? 'active' : ''}`}
                onClick={() => setDetalleTab('hallazgos')}
              >
                🛠️ Repuestos & Hallazgos
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'evidencias' ? 'active' : ''}`}
                onClick={() => setDetalleTab('evidencias')}
              >
                🖼️ Evidencias ({evidenciasDetalle.length})
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'firmas' ? 'active' : ''}`}
                onClick={() => setDetalleTab('firmas')}
              >
                ✍️ Firmas y Trazabilidad
              </button>
            </div>

            <div className="det-modal-body">
              {detalleTab === 'general' && (
                <div className="det-tab-content">
                  <div className="info-grid-2">
                    <div className="info-box">
                      <span className="info-label">🗂️ Área Operativa</span>
                      <span className="info-val" style={{ color: selectedVisitaDetalle.area_color || 'var(--color-primary)' }}>
                        {selectedVisitaDetalle.area_nombre}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">🎯 Tipo de Visita</span>
                      <span className="info-val">{selectedVisitaDetalle.tipo_visita_nombre || '—'}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">📋 Categoría</span>
                      <span className="info-val">
                        {selectedVisitaDetalle.categoria_padre_nombre ? `${selectedVisitaDetalle.categoria_padre_nombre} › ` : ''}
                        {selectedVisitaDetalle.categoria_nombre || '—'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">⏰ Horario Ejecución</span>
                      <span className="info-val">
                        {selectedVisitaDetalle.hora_inicio && selectedVisitaDetalle.hora_fin 
                          ? `${selectedVisitaDetalle.hora_inicio} – ${selectedVisitaDetalle.hora_fin}` 
                          : selectedVisitaDetalle.hora_inicio || '—'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">👤 Responsable / Auxiliar</span>
                      <span className="info-val">{selectedVisitaDetalle.responsable_nombre || '—'}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">✍️ Registrado por</span>
                      <span className="info-val">{selectedVisitaDetalle.creador_nombre || '—'}</span>
                    </div>
                  </div>

                  <h4 className="det-section-title">📝 Datos del Formulario / Checklist</h4>
                  {(() => {
                    let answers = {};
                    try {
                      const raw = typeof selectedVisitaDetalle.datos_formulario === 'string'
                        ? JSON.parse(selectedVisitaDetalle.datos_formulario || '{}')
                        : (selectedVisitaDetalle.datos_formulario || {});
                      answers = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
                    } catch (e) {
                      answers = {};
                    }

                    const entries = Object.entries(answers).filter(([k, v]) => v !== '' && v !== null && !k.endsWith('__obs') && !k.endsWith('_obs'));
                    if (entries.length === 0) {
                      return <p className="det-empty">No hay respuestas de checklist o formulario registradas en esta operación.</p>;
                    }

                    return (
                      <div className="checklist-results-grid">
                        {entries.map(([key, val], idx) => {
                          const obsKey1 = `${key}__obs`;
                          const obsKey2 = `${key}_obs`;
                          const obs = answers[obsKey1] || answers[obsKey2] || '';
                          const isYes = String(val).toUpperCase() === 'SI' || val === true;
                          const isNo = String(val).toUpperCase() === 'NO' || val === false;
                          const isNa = String(val).toUpperCase() === 'NA' || String(val).toUpperCase() === 'N/A';
                          
                          return (
                            <div key={idx} className={`chk-item-card ${isYes ? 'chk-yes' : isNo ? 'chk-no' : isNa ? 'chk-na' : ''}`}>
                              <div className="chk-top">
                                <span className="chk-label">{key.replace(/__/g, ' - ')}</span>
                                <span className="chk-badge">
                                  {isYes ? 'SÍ ✓' : isNo ? 'NO ✕' : isNa ? 'N/A' : String(val)}
                                </span>
                              </div>
                              {obs && (
                                <div className="chk-obs">
                                  <strong>Observación:</strong> {obs}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {detalleTab === 'hallazgos' && (
                <div className="det-tab-content">
                  {selectedVisitaDetalle.equipo_id && (
                    <div className="equipo-box">
                      <h4 className="det-section-title" style={{ marginTop: 0 }}>⚙️ Equipo Intervenido</h4>
                      <p>
                        <strong>ID / Código:</strong> {selectedVisitaDetalle.equipo_id} <br />
                        {selectedVisitaDetalle.equipo_nombre && (
                          <>
                            <strong>Nombre:</strong> {selectedVisitaDetalle.equipo_nombre} <br />
                            <strong>Marca / Modelo:</strong> {selectedVisitaDetalle.equipo_marca || '—'} / {selectedVisitaDetalle.equipo_modelo || '—'}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <h4 className="det-section-title">💬 Observaciones Generales</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.observaciones || <span className="text-muted">Sin observaciones generales</span>}
                  </div>

                  <h4 className="det-section-title">🔍 Hallazgos / Diagnóstico</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.hallazgos || <span className="text-muted">Sin hallazgos registrados</span>}
                  </div>

                  <h4 className="det-section-title">🛠️ Acciones Correctivas / Trabajo Realizado</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.acciones_correctivas || <span className="text-muted">Sin acciones correctivas registradas</span>}
                  </div>

                  <h4 className="det-section-title">🔩 Repuestos / Materiales Utilizados</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.repuestos || <span className="text-muted">Sin repuestos o materiales reportados</span>}
                  </div>
                </div>
              )}

              {detalleTab === 'evidencias' && (
                <div className="det-tab-content">
                  {loadingDetalle ? (
                    <div className="loading-wrap"><div className="spinner"></div><p>Cargando evidencias fotográficas...</p></div>
                  ) : evidenciasDetalle.length === 0 ? (
                    <p className="det-empty">No se adjuntaron evidencias fotográficas en esta operación.</p>
                  ) : (
                    <div className="evidencias-gallery">
                      {evidenciasDetalle.map((ev, idx) => (
                        <div key={idx} className="evidencia-card">
                          <div className="evidencia-img-wrap">
                            <a href={ev.ruta_archivo} target="_blank" rel="noopener noreferrer">
                              <img src={ev.ruta_archivo} alt={ev.nombre_archivo || 'Evidencia'} />
                            </a>
                          </div>
                          <div className="evidencia-info">
                            <span className="evidencia-tag">{ev.etiqueta?.toUpperCase() || 'FOTO'}</span>
                            <span className="evidencia-name">{ev.nombre_archivo || 'Archivo adjunto'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detalleTab === 'firmas' && (
                <div className="det-tab-content">
                  <div className="firmas-grid">
                    <div className="firma-box">
                      <h5>👨‍🔧 Firma Digital del Auxiliar / Técnico</h5>
                      {selectedVisitaDetalle.firma_auxiliar ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_auxiliar} alt="Firma Auxiliar" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma de auxiliar</p>
                      )}
                    </div>

                    <div className="firma-box">
                      <h5>🏬 Funcionario del Punto de Venta (PDV)</h5>
                      <p className="solicitante-info">
                        <strong>Nombre:</strong> {selectedVisitaDetalle.solicitante_nombre || '—'} <br />
                      </p>
                      {selectedVisitaDetalle.firma_pdv ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_pdv} alt="Firma PDV" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma de PDV</p>
                      )}
                    </div>

                    <div className="firma-box">
                      <h5>👔 Aprobación y Trazabilidad del Jefe</h5>
                      <p className="solicitante-info">
                        <strong>Comentarios:</strong> {selectedVisitaDetalle.comentarios_jefe || '—'} <br />
                      </p>
                      {selectedVisitaDetalle.firma_jefe ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_jefe} alt="Firma Jefe" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma digital del jefe</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="det-modal-footer">
              <button 
                className="btn-ir-visita"
                onClick={() => handleIrAVisita(selectedVisitaDetalle.id)}
              >
                🔗 Ir a Gestión en Módulo Operativo
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-print"
                  onClick={() => window.print()}
                >
                  🖨️ Imprimir Ficha
                </button>
                <button 
                  className="btn-close-modal"
                  onClick={() => setSelectedVisitaDetalle(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .rep-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          padding-bottom: 40px;
        }

        /* ===== Header ===== */
        .rep-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .rep-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .rep-subtitle {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 4px 0 0;
        }

        .btn-export {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          border: none;
          border-radius: var(--radius-lg);
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-export:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16,185,129,0.35);
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== KPI Grid ===== */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(7, 1fr); }
        }

        .kpi-area-card {
          background: #fff;
          border: 2px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .kpi-area-card:hover, .kpi-area-card.kpi-active {
          border-color: var(--color-primary);
          box-shadow: 0 4px 16px rgba(107,58,42,0.12);
          transform: translateY(-2px);
        }

        .kpi-area-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .kpi-area-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kpi-area-name {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height: 1.2;
        }

        .kpi-area-num {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1;
        }

        .kpi-area-label {
          font-size: 0.68rem;
          color: var(--color-text-muted);
          margin-top: 2px;
          margin-bottom: 8px;
        }

        .kpi-bar-bg {
          height: 4px;
          background: var(--color-bg-secondary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .kpi-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .kpi-area-pct {
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }

        /* ===== Filters Panel ===== */
        .filters-panel {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
          flex: 1;
        }

        .filter-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .filter-group select,
        .filter-group input {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 10px;
          font-size: 0.82rem;
          color: var(--color-text-primary);
          background: var(--color-bg-secondary);
          transition: border-color 0.2s;
        }

        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .filters-actions-row {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.85rem;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 10px 8px 32px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--color-text-primary);
          background: var(--color-bg-secondary);
          box-sizing: border-box;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-apply {
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          padding: 9px 20px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-apply:hover { background: var(--color-primary-dark); }

        .btn-clear {
          background: transparent;
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 9px 16px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-clear:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        /* ===== Results ===== */
        .loading-wrap, .error-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--color-text-muted);
          gap: 12px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 4px solid var(--color-bg-secondary);
          border-top: 4px solid var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .results-count {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-muted);
          background: var(--color-bg-secondary);
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }

        /* ===== Table ===== */
        .table-wrapper {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          overflow: auto;
          box-shadow: var(--shadow-sm);
        }

        .rep-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .rep-table thead tr {
          background: var(--color-bg-secondary);
          border-bottom: 2px solid var(--color-border-light);
        }

        .rep-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .rep-row {
          border-bottom: 1px solid var(--color-border-light);
          transition: background 0.15s;
        }

        .rep-row:hover { background: #fdf8f3; }

        .rep-table td {
          padding: 10px 14px;
          vertical-align: middle;
          color: var(--color-text-primary);
        }

        .cell-id {
          font-weight: 700;
          color: var(--color-text-muted);
          font-size: 0.72rem;
        }

        .cell-fecha {
          white-space: nowrap;
          font-weight: 600;
        }

        .cell-pdv {
          font-weight: 700;
          color: var(--color-primary-dark);
        }

        .cell-ciudad {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        .area-badge {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid;
          white-space: nowrap;
        }

        .cell-categoria {
          font-size: 0.78rem;
          max-width: 200px;
        }

        .cat-padre {
          color: var(--color-text-muted);
          font-size: 0.72rem;
          display: block;
          margin-bottom: 1px;
        }

        .cat-nombre {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .cell-tipo {
          color: var(--color-text-secondary);
          font-size: 0.78rem;
          max-width: 160px;
        }

        .cell-resp {
          color: var(--color-text-secondary);
          font-size: 0.78rem;
          white-space: nowrap;
        }

        .estado-badge {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .cell-horario {
          white-space: nowrap;
          color: var(--color-text-muted);
          font-size: 0.75rem;
        }

        .empty-row {
          text-align: center;
          padding: 40px !important;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        /* ===== Category Breakdown ===== */
        .cat-breakdown {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .cat-breakdown-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0 0 var(--spacing-lg);
        }

        .cat-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cat-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .cat-item-name {
          font-size: 0.8rem;
          color: var(--color-text-primary);
          flex: 1;
        }

        .cat-item-padre {
          color: var(--color-text-muted);
          font-size: 0.72rem;
        }

        .cat-item-stats {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .cat-total {
          font-weight: 800;
          color: var(--color-primary-dark);
        }

        .cat-sep { color: var(--color-border); }

        .cat-completadas {
          color: #10b981;
          font-weight: 600;
        }

        .cat-bar-bg {
          height: 5px;
          background: var(--color-bg-secondary);
          border-radius: 3px;
          overflow: hidden;
        }

        .cat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), #8B6914);
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        /* ===== Botón Ver Operación ===== */
        .btn-ver-operacion {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(107,58,42,0.2);
        }

        .btn-ver-operacion:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(107,58,42,0.35);
          background: var(--color-primary-dark);
        }

        /* ===== Modal Detalle ===== */
        .det-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(44, 24, 16, 0.65);
          backdrop-filter: blur(6px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
        }

        .det-modal-container {
          background: #fff;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          animation: slideUpModal 0.25s ease-out;
          border: 1px solid var(--color-border-light);
        }

        @keyframes slideUpModal {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .det-modal-header {
          background: var(--color-bg-secondary);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .det-header-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .det-header-sub {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 4px 0 0;
        }

        .det-modal-close {
          background: none;
          border: none;
          font-size: 1.8rem;
          color: var(--color-text-muted);
          cursor: pointer;
          line-height: 1;
        }

        .det-modal-tabs {
          display: flex;
          background: #faf6f0;
          border-bottom: 1px solid var(--color-border-light);
          padding: 0 var(--spacing-lg);
          gap: 8px;
          overflow-x: auto;
        }

        .det-tab-btn {
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          padding: 12px 14px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .det-tab-btn:hover { color: var(--color-primary); }

        .det-tab-btn.active {
          color: var(--color-primary-dark);
          border-bottom-color: var(--color-primary);
        }

        .det-modal-body {
          padding: var(--spacing-lg);
          overflow-y: auto;
          flex: 1;
          background: var(--color-bg-primary);
        }

        .det-tab-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .info-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 600px) {
          .info-grid-2 { grid-template-columns: repeat(3, 1fr); }
        }

        .info-box {
          background: #fff;
          border: 1px solid var(--color-border-light);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .info-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .det-section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          margin: 10px 0 6px;
          border-bottom: 2px solid var(--color-border-light);
          padding-bottom: 6px;
        }

        .checklist-results-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chk-item-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-left: 4px solid var(--color-border);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chk-yes { border-left-color: #10b981; background: #f0fdf4; }
        .chk-no { border-left-color: #ef4444; background: #fef2f2; }
        .chk-na { border-left-color: #6b7280; background: #f9fafb; }

        .chk-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .chk-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .chk-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          background: #fff;
          border: 1px solid rgba(0,0,0,0.1);
        }

        .chk-obs {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          background: rgba(255,255,255,0.7);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
        }

        .text-box-detail {
          background: #fff;
          border: 1px solid var(--color-border-light);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--color-text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .equipo-box {
          background: #fef7e0;
          border: 1px solid #fde08a;
          padding: 14px;
          border-radius: var(--radius-md);
          color: #854d0e;
        }

        .evidencias-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .evidencia-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xs);
        }

        .evidencia-img-wrap {
          height: 140px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .evidencia-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        .evidencia-img-wrap img:hover { transform: scale(1.05); }

        .evidencia-info {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .evidencia-tag {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--color-primary);
        }

        .evidencia-name {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .firmas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .firma-box {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .firma-box h5 {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          margin: 0;
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: 6px;
        }

        .firma-img-wrap {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--color-border);
          background: #faf6f0;
          border-radius: var(--radius-sm);
          padding: 4px;
        }

        .firma-img-wrap img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }

        .solicitante-info {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .det-empty {
          color: var(--color-text-muted);
          font-style: italic;
          font-size: 0.85rem;
        }

        .det-modal-footer {
          background: var(--color-bg-secondary);
          padding: var(--spacing-md) var(--spacing-lg);
          border-top: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn-ir-visita {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 9px 18px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ir-visita:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59,130,246,0.35);
        }

        .btn-print {
          background: #fff;
          color: var(--color-primary-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-print:hover {
          background: #fdf8f3;
          border-color: var(--color-primary);
        }

        .btn-close-modal {
          background: #6b7280;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 8px 18px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close-modal:hover { background: #4b5563; }

        @media print {
          body * { visibility: hidden; }
          .det-modal-container, .det-modal-container * { visibility: visible; }
          .det-modal-overlay {
            position: absolute;
            left: 0;
            top: 0;
            background: none;
            padding: 0;
          }
          .det-modal-container {
            width: 100%;
            max-width: none;
            border: none;
            box-shadow: none;
          }
          .det-modal-footer, .det-modal-close, .det-modal-tabs { display: none !important; }
        }

        /* ===== Responsive Mobile Cards (PWA / Teléfono) ===== */
        .rep-cards-mobile {
          display: none;
          flex-direction: column;
          gap: 14px;
        }

        .empty-card {
          background: #fff;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: 30px;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .mobile-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-left: 5px solid var(--color-primary);
          border-radius: var(--radius-lg);
          padding: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s;
        }

        .mobile-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }

        .mobile-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: 10px;
          gap: 8px;
        }

        .mobile-card-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mobile-pdv {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--color-primary-dark);
        }

        .mobile-ciudad {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .mobile-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: var(--color-bg-secondary);
          padding: 10px;
          border-radius: var(--radius-md);
        }

        .mobile-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .m-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .m-val {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .area-badge-small {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 800;
          border: 1px solid;
          width: fit-content;
        }

        .mobile-card-footer {
          display: flex;
          justify-content: stretch;
          padding-top: 4px;
        }

        .btn-ver-detalle-mobile {
          width: 100%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          box-shadow: 0 2px 6px rgba(107,58,42,0.2);
        }

        .btn-ver-detalle-mobile:active {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          /* En teléfono ocultamos tabla y mostramos tarjetas */
          .table-wrapper { display: none !important; }
          .rep-cards-mobile { display: flex !important; }

          /* Hacemos que los KPI sean un carrusel horizontal deslizable */
          .kpi-grid {
            display: flex !important;
            overflow-x: auto;
            padding-bottom: 10px;
            scroll-snap-type: x mandatory;
            gap: 12px;
            -webkit-overflow-scrolling: touch;
          }

          .kpi-area-card {
            min-width: 140px;
            flex-shrink: 0;
            scroll-snap-align: start;
            padding: 12px;
          }

          .kpi-area-num { font-size: 1.6rem; }
          .kpi-area-name { font-size: 0.75rem; }

          /* Filtros en móvil más apilados y cómodos */
          .filters-row {
            flex-direction: column;
            gap: 10px;
          }

          .filter-group { min-width: 100%; }
          .filters-actions-row { flex-direction: column; align-items: stretch; }
          .btn-apply, .btn-clear { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
