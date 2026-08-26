-- =====================================================================
-- MÉTRICAS GLOBALES DEL SISTEMA - Crepes en Punto
-- Ejecuta cada bloque por separado o todos juntos
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════
-- 1. MÉTRICAS DE PUNTOS DE VENTA
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*)                                                    AS total_pdv,
    SUM(CASE WHEN ep.color = 'green' THEN 1 ELSE 0 END)        AS pdv_verdes,
    SUM(CASE WHEN ep.color = 'yellow' THEN 1 ELSE 0 END)       AS pdv_amarillos,
    SUM(CASE WHEN ep.color = 'red' THEN 1 ELSE 0 END)          AS pdv_rojos
FROM pdv p
LEFT JOIN estados_pdv ep ON p.estado_id = ep.id
WHERE p.activo = 1;


-- ═══════════════════════════════════════════════════════════════
-- 2. MÉTRICAS DE VISITAS (últimos 90 días)
-- ═══════════════════════════════════════════════════════════════
SELECT
    COUNT(*)                                                    AS total_visitas,
    SUM(CASE WHEN estado = 'cerrada' THEN 1 ELSE 0 END)        AS cerradas,
    SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END)     AS completadas,
    SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END)     AS finalizadas,
    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END)      AS pendientes,
    SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END)    AS en_progreso,
    SUM(CASE WHEN estado = 'devuelta' THEN 1 ELSE 0 END)       AS devueltas,
    ROUND(
        CAST(SUM(CASE WHEN estado = 'cerrada' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2
    )                                                           AS tasa_cierre_pct
FROM visitas
WHERE fecha >= DATE('now', '-90 days');


-- ═══════════════════════════════════════════════════════════════
-- 3. VISITAS POR ÁREA (últimos 90 días)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    a.nombre AS area,
    COUNT(v.id) AS total_visitas,
    SUM(CASE WHEN v.estado = 'cerrada' THEN 1 ELSE 0 END) AS cerradas,
    SUM(CASE WHEN v.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
FROM visitas v
JOIN areas a ON v.area_id = a.id
WHERE v.fecha >= DATE('now', '-90 days')
GROUP BY a.id
ORDER BY total_visitas DESC;


-- ═══════════════════════════════════════════════════════════════
-- 4. MÉTRICAS DE TICKETS MANTENIMIENTO (MT/ST)
-- ═══════════════════════════════════════════════════════════════
SELECT
    COUNT(*)                                                                    AS total_tickets,
    SUM(CASE WHEN prefijo = 'MT' THEN 1 ELSE 0 END)                            AS tickets_mt,
    SUM(CASE WHEN prefijo = 'ST' THEN 1 ELSE 0 END)                            AS tickets_st,
    SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END)                      AS pendientes,
    SUM(CASE WHEN estado = 'Asignado' THEN 1 ELSE 0 END)                       AS asignados,
    SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END)                     AS en_proceso,
    SUM(CASE WHEN estado = 'Finalizado' THEN 1 ELSE 0 END)                     AS finalizados,
    SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END)                      AS cancelados,
    SUM(CASE WHEN prioridad = 'Crítica' THEN 1 ELSE 0 END)                     AS criticos,
    SUM(CASE WHEN prioridad = 'Alta' THEN 1 ELSE 0 END)                        AS alta_prioridad,
    SUM(CASE WHEN fecha_programada < DATE('now') AND estado NOT IN ('Finalizado','Cancelado') THEN 1 ELSE 0 END) AS vencidos,
    ROUND(AVG(CASE WHEN tiempo_atencion_minutos > 0 THEN tiempo_atencion_minutos END), 0) AS prom_atencion_min,
    ROUND(AVG(CASE WHEN tiempo_ejecucion_minutos > 0 THEN tiempo_ejecucion_minutos END), 0) AS prom_ejecucion_min
FROM mantenimientos;


-- ═══════════════════════════════════════════════════════════════
-- 5. MÉTRICAS DE EQUIPOS
-- ═══════════════════════════════════════════════════════════════
SELECT
    COUNT(*)                                                                                    AS total_equipos,
    SUM(CASE WHEN proximo_mantenimiento < DATE('now') THEN 1 ELSE 0 END)                        AS mant_vencido,
    SUM(CASE WHEN proximo_mantenimiento BETWEEN DATE('now') AND DATE('now', '+30 days') THEN 1 ELSE 0 END) AS mant_proximo_30d,
    SUM(CASE WHEN proximo_mantenimiento > DATE('now', '+30 days') THEN 1 ELSE 0 END)            AS mant_al_dia
FROM equipos
WHERE activo = 1;


-- ═══════════════════════════════════════════════════════════════
-- 6. MÉTRICAS DE CALENDARIO Y SOLICITUDES
-- ═══════════════════════════════════════════════════════════════
SELECT
    (SELECT COUNT(*) FROM eventos_calendario WHERE estado = 'programado' AND fecha >= DATE('now'))   AS eventos_pendientes,
    (SELECT COUNT(*) FROM eventos_calendario WHERE estado = 'completado')                            AS eventos_completados,
    (SELECT COUNT(*) FROM bloqueos_horario WHERE activo = 1 AND fecha >= DATE('now'))                 AS bloqueos_activos,
    (SELECT COUNT(*) FROM solicitudes_visita WHERE estado = 'pendiente')                              AS solicitudes_pendientes,
    (SELECT COUNT(*) FROM solicitudes_visita WHERE estado = 'programada')                             AS solicitudes_programadas,
    (SELECT COUNT(*) FROM inspecciones)                                                               AS total_inspecciones,
    (SELECT COUNT(*) FROM evidencias)                                                                 AS total_evidencias;
