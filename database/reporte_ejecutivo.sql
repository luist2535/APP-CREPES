-- =====================================================================
-- REPORTE EJECUTIVO INTEGRAL POR PUNTO DE VENTA
-- Copia TODO este archivo y pégalo en "Execute SQL" de DB Browser
-- =====================================================================

SELECT
    p.id                                          AS pdv_id,
    p.nombre                                      AS pdv_nombre,
    c.nombre                                      AS ciudad,
    ep.nombre                                     AS estado_actual,
    ep.color                                      AS estado_color,
    p.hora_apertura,
    p.hora_cierre,

    COALESCE(vis.total_visitas, 0)                AS total_visitas_90d,
    COALESCE(vis.visitas_cerradas, 0)             AS visitas_cerradas_90d,
    COALESCE(vis.visitas_pendientes, 0)           AS visitas_pendientes,
    COALESCE(vis.visitas_en_progreso, 0)          AS visitas_en_progreso,
    COALESCE(vis.visitas_devueltas, 0)            AS visitas_devueltas,
    CASE 
        WHEN COALESCE(vis.total_visitas, 0) = 0 THEN 0.00
        ELSE ROUND(CAST(vis.visitas_cerradas AS REAL) / vis.total_visitas * 100, 2)
    END                                           AS tasa_cumplimiento_pct,

    COALESCE(vis.visitas_operaciones, 0)          AS visitas_operaciones,
    COALESCE(vis.visitas_sst, 0)                  AS visitas_sst,
    COALESCE(vis.visitas_mantenimiento, 0)        AS visitas_mantenimiento,
    COALESCE(vis.visitas_calidad, 0)              AS visitas_calidad,
    COALESCE(vis.visitas_drh, 0)                  AS visitas_drh,
    COALESCE(vis.visitas_formacion, 0)            AS visitas_formacion,
    COALESCE(vis.visitas_sistemas, 0)             AS visitas_sistemas,

    COALESCE(evid.total_evidencias, 0)            AS total_evidencias,

    COALESCE(eq.total_equipos, 0)                 AS total_equipos,
    COALESCE(eq.equipos_mantenimiento_vencido, 0) AS equipos_mant_vencido,
    COALESCE(eq.equipos_mant_proximo_30d, 0)      AS equipos_mant_proximo_30d,

    COALESCE(mant.total_tickets, 0)               AS total_tickets_mant,
    COALESCE(mant.tickets_pendientes, 0)          AS tickets_mant_pendientes,
    COALESCE(mant.tickets_asignados, 0)           AS tickets_mant_asignados,
    COALESCE(mant.tickets_en_proceso, 0)          AS tickets_mant_en_proceso,
    COALESCE(mant.tickets_finalizados, 0)         AS tickets_mant_finalizados,
    COALESCE(mant.tickets_cancelados, 0)          AS tickets_mant_cancelados,
    COALESCE(mant.tickets_mt, 0)                  AS tickets_tipo_mt,
    COALESCE(mant.tickets_st, 0)                  AS tickets_tipo_st,
    COALESCE(mant.tickets_criticos, 0)            AS tickets_criticos,
    COALESCE(mant.tickets_vencidos, 0)            AS tickets_vencidos,
    COALESCE(mant.avg_tiempo_atencion, 0)         AS promedio_atencion_min,
    COALESCE(mant.avg_tiempo_ejecucion, 0)        AS promedio_ejecucion_min,

    COALESCE(cal.eventos_programados, 0)          AS eventos_proximos_30d,
    COALESCE(cal.eventos_completados, 0)          AS eventos_completados_30d,

    COALESCE(bloq.bloqueos_activos, 0)            AS bloqueos_activos,

    COALESCE(sol.total_solicitudes, 0)            AS total_solicitudes,
    COALESCE(sol.solicitudes_pendientes, 0)       AS solicitudes_pendientes,
    COALESCE(sol.solicitudes_programadas, 0)      AS solicitudes_programadas,
    COALESCE(sol.solicitudes_rechazadas, 0)       AS solicitudes_rechazadas,

    COALESCE(insp.total_inspecciones, 0)          AS total_inspecciones,
    COALESCE(insp.total_hallazgos, 0)             AS total_hallazgos,

    COALESCE(hist.cambios_estado_90d, 0)          AS cambios_estado_90d,
    hist.ultimo_cambio_fecha                      AS ultimo_cambio_estado,
    hist.usuario_ultimo_cambio                    AS quien_cambio_ultimo,

    ROUND(
        (
            CASE 
                WHEN COALESCE(vis.total_visitas, 0) = 0 THEN 15
                ELSE MIN(30, CAST(vis.visitas_cerradas AS REAL) / vis.total_visitas * 30)
            END
            + CASE 
                WHEN COALESCE(eq.total_equipos, 0) = 0 THEN 20
                ELSE (1.0 - CAST(COALESCE(eq.equipos_mantenimiento_vencido, 0) AS REAL) / eq.total_equipos) * 20
              END
            + CASE 
                WHEN COALESCE(mant.total_tickets, 0) = 0 THEN 25
                ELSE MIN(25, CAST(mant.tickets_finalizados AS REAL) / mant.total_tickets * 25)
              END
            + CASE 
                WHEN ep.color = 'green' THEN 15
                WHEN ep.color = 'yellow' THEN 7
                ELSE 0
              END
            + CASE 
                WHEN COALESCE(sol.solicitudes_pendientes, 0) = 0 THEN 10
                WHEN COALESCE(sol.solicitudes_pendientes, 0) <= 2 THEN 5
                ELSE 0
              END
        ), 1
    )                                             AS score_salud_pdv

FROM pdv p
JOIN ciudades c ON p.ciudad_id = c.id
LEFT JOIN estados_pdv ep ON p.estado_id = ep.id

LEFT JOIN (
    SELECT 
        v.pdv_id,
        COUNT(*)                                                        AS total_visitas,
        SUM(CASE WHEN v.estado = 'cerrada' THEN 1 ELSE 0 END)          AS visitas_cerradas,
        SUM(CASE WHEN v.estado = 'pendiente' THEN 1 ELSE 0 END)        AS visitas_pendientes,
        SUM(CASE WHEN v.estado = 'en_progreso' THEN 1 ELSE 0 END)      AS visitas_en_progreso,
        SUM(CASE WHEN v.estado = 'devuelta' THEN 1 ELSE 0 END)         AS visitas_devueltas,
        SUM(CASE WHEN v.area_id = 1 THEN 1 ELSE 0 END)                 AS visitas_operaciones,
        SUM(CASE WHEN v.area_id = 2 THEN 1 ELSE 0 END)                 AS visitas_sst,
        SUM(CASE WHEN v.area_id = 3 THEN 1 ELSE 0 END)                 AS visitas_mantenimiento,
        SUM(CASE WHEN v.area_id = 4 THEN 1 ELSE 0 END)                 AS visitas_calidad,
        SUM(CASE WHEN v.area_id = 5 THEN 1 ELSE 0 END)                 AS visitas_drh,
        SUM(CASE WHEN v.area_id = 6 THEN 1 ELSE 0 END)                 AS visitas_formacion,
        SUM(CASE WHEN v.area_id = 7 THEN 1 ELSE 0 END)                 AS visitas_sistemas
    FROM visitas v
    WHERE v.fecha >= DATE('now', '-90 days')
    GROUP BY v.pdv_id
) vis ON vis.pdv_id = p.id

LEFT JOIN (
    SELECT v.pdv_id, COUNT(e.id) AS total_evidencias
    FROM evidencias e
    JOIN visitas v ON e.visita_id = v.id
    GROUP BY v.pdv_id
) evid ON evid.pdv_id = p.id

LEFT JOIN (
    SELECT 
        eq.pdv_id,
        COUNT(*)                                                                        AS total_equipos,
        SUM(CASE WHEN eq.proximo_mantenimiento < DATE('now') THEN 1 ELSE 0 END)         AS equipos_mantenimiento_vencido,
        SUM(CASE WHEN eq.proximo_mantenimiento BETWEEN DATE('now') AND DATE('now', '+30 days') THEN 1 ELSE 0 END) AS equipos_mant_proximo_30d
    FROM equipos eq
    WHERE eq.activo = 1
    GROUP BY eq.pdv_id
) eq ON eq.pdv_id = p.id

LEFT JOIN (
    SELECT 
        COALESCE(m.pdv_id, e.pdv_id) AS pdv_id,
        COUNT(*)                                                                    AS total_tickets,
        SUM(CASE WHEN m.estado = 'Pendiente' THEN 1 ELSE 0 END)                    AS tickets_pendientes,
        SUM(CASE WHEN m.estado = 'Asignado' THEN 1 ELSE 0 END)                     AS tickets_asignados,
        SUM(CASE WHEN m.estado = 'En proceso' THEN 1 ELSE 0 END)                   AS tickets_en_proceso,
        SUM(CASE WHEN m.estado = 'Finalizado' THEN 1 ELSE 0 END)                   AS tickets_finalizados,
        SUM(CASE WHEN m.estado = 'Cancelado' THEN 1 ELSE 0 END)                    AS tickets_cancelados,
        SUM(CASE WHEN m.prefijo = 'MT' THEN 1 ELSE 0 END)                          AS tickets_mt,
        SUM(CASE WHEN m.prefijo = 'ST' THEN 1 ELSE 0 END)                          AS tickets_st,
        SUM(CASE WHEN m.prioridad IN ('Alta', 'Crítica') THEN 1 ELSE 0 END)        AS tickets_criticos,
        SUM(CASE WHEN m.fecha_programada < DATE('now') AND m.estado NOT IN ('Finalizado','Cancelado') THEN 1 ELSE 0 END) AS tickets_vencidos,
        ROUND(AVG(CASE WHEN m.tiempo_atencion_minutos > 0 THEN m.tiempo_atencion_minutos END), 0) AS avg_tiempo_atencion,
        ROUND(AVG(CASE WHEN m.tiempo_ejecucion_minutos > 0 THEN m.tiempo_ejecucion_minutos END), 0) AS avg_tiempo_ejecucion
    FROM mantenimientos m
    LEFT JOIN equipos e ON m.equipo_id = e.id
    GROUP BY COALESCE(m.pdv_id, e.pdv_id)
) mant ON mant.pdv_id = p.id

LEFT JOIN (
    SELECT 
        ec.pdv_id,
        SUM(CASE WHEN ec.estado = 'programado' AND ec.fecha BETWEEN DATE('now') AND DATE('now', '+30 days') THEN 1 ELSE 0 END) AS eventos_programados,
        SUM(CASE WHEN ec.estado = 'completado' THEN 1 ELSE 0 END) AS eventos_completados
    FROM eventos_calendario ec
    GROUP BY ec.pdv_id
) cal ON cal.pdv_id = p.id

LEFT JOIN (
    SELECT bh.pdv_id, COUNT(*) AS bloqueos_activos
    FROM bloqueos_horario bh
    WHERE bh.activo = 1 AND bh.fecha >= DATE('now')
    GROUP BY bh.pdv_id
) bloq ON bloq.pdv_id = p.id

LEFT JOIN (
    SELECT 
        sv.pdv_id,
        COUNT(*)                                                              AS total_solicitudes,
        SUM(CASE WHEN sv.estado = 'pendiente' THEN 1 ELSE 0 END)             AS solicitudes_pendientes,
        SUM(CASE WHEN sv.estado = 'programada' THEN 1 ELSE 0 END)            AS solicitudes_programadas,
        SUM(CASE WHEN sv.estado = 'rechazada' THEN 1 ELSE 0 END)             AS solicitudes_rechazadas
    FROM solicitudes_visita sv
    GROUP BY sv.pdv_id
) sol ON sol.pdv_id = p.id

LEFT JOIN (
    SELECT 
        i.pdv_id,
        COUNT(DISTINCT i.id)       AS total_inspecciones,
        COUNT(ih.id)               AS total_hallazgos
    FROM inspecciones i
    LEFT JOIN inspecciones_hallazgos ih ON ih.inspeccion_id = i.id
    WHERE i.pdv_id IS NOT NULL
    GROUP BY i.pdv_id
) insp ON insp.pdv_id = p.id

LEFT JOIN (
    SELECT 
        he.pdv_id,
        COUNT(CASE WHEN he.fecha >= DATE('now', '-90 days') THEN 1 END) AS cambios_estado_90d,
        MAX(he.fecha || ' ' || he.hora) AS ultimo_cambio_fecha,
        (SELECT u2.nombre FROM historial_estados he2 
         JOIN users u2 ON he2.user_id = u2.id 
         WHERE he2.pdv_id = he.pdv_id 
         ORDER BY he2.created_at DESC LIMIT 1) AS usuario_ultimo_cambio
    FROM historial_estados he
    GROUP BY he.pdv_id
) hist ON hist.pdv_id = p.id

WHERE p.activo = 1
ORDER BY score_salud_pdv ASC, p.nombre ASC;
