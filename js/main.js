/* ==========================================================================
   Valores del Suelo · Bogotá D.C.
   Lógica de inicialización del visor (mapa, leyenda, estadísticas, buscador)
   Generado a partir de una exportación de qgis2web, con una capa de UI
   propia añadida encima de los datos originales.
   ========================================================================== */

(function () {
    'use strict';

    /* ---------------------------------------------------------------------
     * 1. Configuración de la escala de color (idéntica a la exportada por
     *    QGIS) y utilidades de formato.
     * ------------------------------------------------------------------- */
    var VALUE_BREAKS = [
        { min: 0,        max: 440000,    color: 'rgba(47,143,163,1.0)'  },
        { min: 440000,   max: 1359000,   color: 'rgba(154,143,169,1.0)' },
        { min: 1359000,  max: 2260000,   color: 'rgba(99,192,200,1.0)'  },
        { min: 2260000,  max: 3030000,   color: 'rgba(199,195,214,1.0)' },
        { min: 3030000,  max: 4000000,   color: 'rgba(242,194,48,1.0)'  },
        { min: 4000000,  max: 6000000,   color: 'rgba(242,194,48,1.0)'  },
        { min: 6000000,  max: 9400000,   color: 'rgba(169,221,226,1.0)' },
        { min: 9400000,  max: 17300000,  color: 'rgba(230,211,179,1.0)' },
        { min: 17300000, max: 30940000,  color: 'rgba(246,213,138,1.0)' }
    ];
    var NODATA_COLOR = 'rgba(180,180,180,1.0)';
    var INITIAL_BOUNDS = [[4.5828888416912985, -74.1841362185226], [4.69025425655015, -74.07862006094673]];

    var copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    function formatCOP(value) {
        return copFormatter.format(value);
    }

    function formatCOPShort(value) {
        if (value >= 1000000) {
            return '$' + (value / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
        }
        if (value >= 1000) {
            return '$' + (value / 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' mil';
        }
        return formatCOP(value);
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function fieldOrDash(v) {
        return (v === null || v === undefined || v === '') ? '—' : escapeHtml(String(v));
    }

    function getBreakIndex(value) {
        if (value === null || value === undefined || isNaN(value)) { return -1; }
        for (var i = 0; i < VALUE_BREAKS.length; i++) {
            if (value >= VALUE_BREAKS[i].min && value <= VALUE_BREAKS[i].max) { return i; }
        }
        return value < VALUE_BREAKS[0].min ? 0 : VALUE_BREAKS.length - 1;
    }

    function getValueInfo(properties) {
        var value = parseFloat(properties ? properties.VALOR_REFE : NaN);
        var idx = getBreakIndex(value);
        return {
            value: value,
            idx: idx,
            color: idx === -1 ? NODATA_COLOR : VALUE_BREAKS[idx].color,
            text: isNaN(value) ? 'Sin dato' : formatCOP(value) + ' /m²'
        };
    }

    /* ---------------------------------------------------------------------
     * 2. Arranque principal, protegido por try/catch para que un error no
     *    deje al usuario mirando la pantalla de carga para siempre.
     * ------------------------------------------------------------------- */
    try {
        if (typeof json_Valor_Ref_M_2025_1 === 'undefined') {
            throw new Error('No se pudieron cargar los datos catastrales (data/Valor_Ref_M_2025_1.js).');
        }

        var map = L.map('map', {
            zoomControl: false,
            maxZoom: 20,
            minZoom: 12,
            preferCanvas: true
        }).fitBounds(INITIAL_BOUNDS);

        var hash = new L.Hash(map);

        map.attributionControl.setPrefix(
            '<a href="https://github.com/qgis2web/qgis2web" target="_blank">qgis2web</a> &middot; ' +
            '<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; ' +
            '<a href="https://qgis.org">QGIS</a>'
        );

        L.control.zoom({ position: 'topleft' }).addTo(map);
        L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

        /* --- Mapas base -------------------------------------------------- */
        map.createPane('pane_basemap');
        map.getPane('pane_basemap').style.zIndex = 400;

        /* Mapas base oficiales de Catastro Bogotá (IDECA), servicios ArcGIS
         * teselados en Web Mercator (EPSG:3857/102100) — compatibles con la
         * cuadrícula de teselas estándar que usa Leaflet. Se dejan fuera
         * "mapa_base_4686" (datum MAGNA-SIRGAS) y "Mapa_Referencia" (WGS84
         * geográfico), cuya cuadrícula de teselas no coincide con la de este
         * mapa y requeriría una librería adicional (esri-leaflet). */
        var IDECA_ATTRIBUTION = '&copy; <a href="https://www.catastrobogota.gov.co" target="_blank">Catastro Bogotá &ndash; IDECA</a>';
        var IDECA_SERVICES_ROOT = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/Mapa_Referencia/';

        function ideca(serviceName, maxNativeZoom) {
            return L.tileLayer(
                IDECA_SERVICES_ROOT + serviceName + '/MapServer/tile/{z}/{y}/{x}',
                {
                    pane: 'pane_basemap', opacity: 1, minZoom: 1, maxZoom: 28,
                    minNativeZoom: 0, maxNativeZoom: maxNativeZoom,
                    keepBuffer: 6, updateWhenZooming: false,
                    attribution: IDECA_ATTRIBUTION
                }
            );
        }

        var BASEMAPS = [
            { id: 'ideca-base', label: 'Base', icon: 'fa-map', layer: ideca('mapa_base_3857', 23) },
            { id: 'ideca-gris', label: 'Gris', icon: 'fa-adjust', layer: ideca('mapa_base_gris', 23) },
            { id: 'ideca-oscuro', label: 'Oscuro', icon: 'fa-moon', layer: ideca('mapa_base_oscuro_3857', 20) },
            { id: 'ideca-toner', label: 'Toner', icon: 'fa-print', layer: ideca('mapa_base_toner', 23) },
            { id: 'ideca-hibrido', label: 'Híbrido', icon: 'fa-broadcast-tower', layer: ideca('mapa_hibrido', 23) },
            { id: 'ideca-cundinamarca', label: 'Cundinamarca', icon: 'fa-map-marker-alt', layer: ideca('mapabasemunicipioscundinamarca', 23) }
        ];

        function buildBasemapSwitcher() {
            var container = document.getElementById('basemap-switcher');
            var current = BASEMAPS[0];
            map.addLayer(current.layer);
            BASEMAPS.forEach(function (b) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'basemap-btn' + (b === current ? ' active' : '');
                btn.innerHTML = '<i class="fas ' + b.icon + '"></i><span>' + b.label + '</span>';
                btn.addEventListener('click', function () {
                    if (b === current) { return; }
                    map.removeLayer(current.layer);
                    map.addLayer(b.layer);
                    current = b;
                    Array.prototype.forEach.call(container.querySelectorAll('.basemap-btn'), function (el) {
                        el.classList.remove('active');
                    });
                    btn.classList.add('active');
                });
                container.appendChild(btn);
            });
        }

        /* --- Capa de datos (manzanas) ------------------------------------ */
        var selectedBreakIndex = null;

        function styleFeature(feature) {
            var info = getValueInfo(feature.properties || {});
            var dim = selectedBreakIndex !== null && info.idx !== selectedBreakIndex;
            return {
                pane: 'pane_data',
                color: dim ? 'rgba(35,35,35,0.25)' : 'rgba(35,35,35,0.85)',
                weight: 1,
                dashArray: '',
                lineCap: 'butt',
                lineJoin: 'miter',
                fill: true,
                fillOpacity: dim ? 0.06 : (info.idx === -1 ? 0.12 : 0.82),
                opacity: dim ? 0.35 : 1,
                fillColor: info.color,
                interactive: false
            };
        }

        function buildPopupContent(feature) {
            var p = feature.properties || {};
            var info = getValueInfo(p);
            return (
                '<div class="val-popup-inner">' +
                    '<div class="popup-accent" style="background:' + info.color + '"></div>' +
                    '<div class="popup-value">' + info.text + '</div>' +
                    '<table class="popup-table">' +
                        '<tr><th>Código de manzana</th><td>' + fieldOrDash(p.ManCodigo) + '</td></tr>' +
                        '<tr><th>Sector catastral</th><td>' + fieldOrDash(p.ManSecCat) + '</td></tr>' +
                        '<tr><th>Número de manzana</th><td>' + fieldOrDash(p.ManNumero) + '</td></tr>' +
                    '</table>' +
                    '<div class="popup-footer">ID interno: ' + fieldOrDash(p.OBJECTID) + '</div>' +
                '</div>'
            );
        }

        function buildTooltipContent(feature) {
            var p = feature.properties || {};
            var info = getValueInfo(p);
            return '<strong>' + fieldOrDash(p.ManCodigo) + '</strong><br>' + info.text;
        }

        map.createPane('pane_data');
        map.getPane('pane_data').style.zIndex = 401;
        map.getPane('pane_data').style['mix-blend-mode'] = 'normal';

        /* La capa de datos tiene 44 000+ polígonos dibujados en un único
         * <canvas> compartido: redibujarlo entero en cada mouseover (como
         * hacía layer.setStyle()/bringToFront()) es lo que provocaba el
         * "se pega". En su lugar, el resaltado se dibuja en un pane aparte
         * con un solo polígono, así solo se redibuja una figura pequeña. */
        map.createPane('pane_highlight');
        map.getPane('pane_highlight').style.zIndex = 410;
        map.getPane('pane_highlight').style.pointerEvents = 'none';

        var highlightLayer = null;
        function showHighlight(feature) {
            if (highlightLayer) { map.removeLayer(highlightLayer); }
            var info = getValueInfo(feature.properties || {});
            highlightLayer = L.geoJson(feature, {
                pane: 'pane_highlight',
                interactive: false,
                style: function () {
                    return { color: '#ffffff', weight: 3, fill: true, fillColor: info.color, fillOpacity: 0.97 };
                }
            }).addTo(map);
        }
        function clearHighlight() {
            if (highlightLayer) { map.removeLayer(highlightLayer); highlightLayer = null; }
        }

        /* -------------------------------------------------------------
         * Simplificación de geometría (Douglas-Peucker)
         * -----------------------------------------------------------
         * La vista inicial muestra la zona completa (44 000+ manzanas a
         * la vez), así que no hay forma de evitar tener todas las capas
         * en el mapa de entrada — la única palanca real es reducir cuánto
         * cuesta dibujar cada una. Cada polígono se simplifica una sola
         * vez al cargar (tolerancia ~1.5-2 m, imperceptible), lo que en
         * este dataset recorta los vértices en ~88% (de ~2.9 millones a
         * ~360 mil puntos totales) sin cambiar el resultado visual.
         * El resaltado al pasar el cursor usa la geometría original sin
         * simplificar, para máxima precisión en el detalle.
         * ------------------------------------------------------------- */
        var SIMPLIFY_TOLERANCE = 0.000015; // grados (~1.5-2 m en Bogotá)

        function sqSegDist(p, a, b) {
            var x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
            if (dx !== 0 || dy !== 0) {
                var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
                if (t > 1) { x = b[0]; y = b[1]; }
                else if (t > 0) { x += dx * t; y += dy * t; }
            }
            dx = p[0] - x; dy = p[1] - y;
            return dx * dx + dy * dy;
        }

        function douglasPeucker(points, tolerance) {
            var len = points.length;
            if (len <= 4) { return points; }
            var tol2 = tolerance * tolerance;
            var keep = new Uint8Array(len);
            keep[0] = 1;
            keep[len - 1] = 1;
            var stack = [[0, len - 1]];
            while (stack.length) {
                var seg = stack.pop();
                var first = seg[0], last = seg[1];
                var maxDist = 0, index = -1;
                for (var i = first + 1; i < last; i++) {
                    var d = sqSegDist(points[i], points[first], points[last]);
                    if (d > maxDist) { maxDist = d; index = i; }
                }
                if (maxDist > tol2 && index !== -1) {
                    keep[index] = 1;
                    stack.push([first, index]);
                    stack.push([index, last]);
                }
            }
            var result = [];
            for (var j = 0; j < len; j++) {
                if (keep[j]) { result.push(points[j]); }
            }
            return result;
        }

        function simplifyRing(ring) {
            var simplified = douglasPeucker(ring, SIMPLIFY_TOLERANCE);
            return simplified.length >= 4 ? simplified : ring;
        }

        function simplifyGeometry(geometry) {
            if (!geometry) { return geometry; }
            if (geometry.type === 'Polygon') {
                return { type: 'Polygon', coordinates: geometry.coordinates.map(simplifyRing) };
            }
            if (geometry.type === 'MultiPolygon') {
                return {
                    type: 'MultiPolygon',
                    coordinates: geometry.coordinates.map(function (poly) { return poly.map(simplifyRing); })
                };
            }
            return geometry;
        }

        /* -------------------------------------------------------------
         * Detección de la manzana bajo el cursor sin usar el hit-test
         * nativo de Leaflet (ver más abajo, junto al dataLayer, por qué).
         * Un índice espacial (RBush, ya cargado para las etiquetas) reduce
         * la búsqueda de 44 000 polígonos a un puñado de candidatos por
         * su caja envolvente; el punto-en-polígono exacto solo se corre
         * sobre esos pocos candidatos. */
        function ringBBox(ring, box) {
            for (var i = 0; i < ring.length; i++) {
                var x = ring[i][0], y = ring[i][1];
                if (x < box.minX) { box.minX = x; }
                if (x > box.maxX) { box.maxX = x; }
                if (y < box.minY) { box.minY = y; }
                if (y > box.maxY) { box.maxY = y; }
            }
        }

        function geometryBBox(geometry) {
            var box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
            if (geometry.type === 'Polygon') {
                geometry.coordinates.forEach(function (ring) { ringBBox(ring, box); });
            } else if (geometry.type === 'MultiPolygon') {
                geometry.coordinates.forEach(function (poly) {
                    poly.forEach(function (ring) { ringBBox(ring, box); });
                });
            }
            return box;
        }

        function pointInRing(x, y, ring) {
            var inside = false;
            for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                var xi = ring[i][0], yi = ring[i][1];
                var xj = ring[j][0], yj = ring[j][1];
                var intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) { inside = !inside; }
            }
            return inside;
        }

        function pointInRings(x, y, rings) {
            // Regla par-impar sobre todos los anillos: cuenta el anillo
            // exterior y cada hueco por igual, sin depender de su sentido.
            var inside = false;
            for (var i = 0; i < rings.length; i++) {
                if (pointInRing(x, y, rings[i])) { inside = !inside; }
            }
            return inside;
        }

        function pointInGeometry(x, y, geometry) {
            if (geometry.type === 'Polygon') {
                return pointInRings(x, y, geometry.coordinates);
            }
            if (geometry.type === 'MultiPolygon') {
                for (var p = 0; p < geometry.coordinates.length; p++) {
                    if (pointInRings(x, y, geometry.coordinates[p])) { return true; }
                }
                return false;
            }
            return false;
        }

        var allFeatures = (json_Valor_Ref_M_2025_1 && json_Valor_Ref_M_2025_1.features) || [];
        var rawFeaturesById = {};
        var simplifiedFeatures = [];
        var spatialItems = [];

        for (var fi = 0; fi < allFeatures.length; fi++) {
            var rawFeature = allFeatures[fi];
            var props = rawFeature.properties || {};
            var id = props.OBJECTID !== undefined && props.OBJECTID !== null ? String(props.OBJECTID) : String(fi);
            var simplifiedGeometry = simplifyGeometry(rawFeature.geometry);
            var simplifiedFeature = { type: 'Feature', properties: props, geometry: simplifiedGeometry };

            rawFeaturesById[id] = rawFeature;
            simplifiedFeatures.push(simplifiedFeature);

            var box = geometryBBox(simplifiedGeometry);
            spatialItems.push({
                minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY,
                feature: simplifiedFeature
            });
        }

        function idOf(props) {
            return (props && props.OBJECTID !== undefined && props.OBJECTID !== null) ? String(props.OBJECTID) : null;
        }

        var spatialIndex = new rbush();
        spatialIndex.load(spatialItems);

        function featureAt(latlng) {
            var candidates = spatialIndex.search({
                minX: latlng.lng, minY: latlng.lat, maxX: latlng.lng, maxY: latlng.lat
            });
            for (var i = 0; i < candidates.length; i++) {
                var f = candidates[i].feature;
                if (pointInGeometry(latlng.lng, latlng.lat, f.geometry)) { return f; }
            }
            return null;
        }

        var canvasRenderer = L.canvas({ padding: 0.4 });

        /* Sin onEachFeature: con 44 000 manzanas, enlazar popup+tooltip+2
         * listeners a CADA una en la carga (aunque el usuario solo toque un
         * puñado) es trabajo desperdiciado y alarga el arranque. Además la
         * capa se marca "interactive: false": el hit-test nativo de Leaflet
         * para Canvas revisa TODAS las figuras dibujadas en cada movimiento
         * del mouse, y con 44 000 polígonos ese barrido es lo que causaba
         * que el mapa "se pegara" al mover el cursor. En su lugar, más
         * abajo, un solo listener de 'mousemove' en el mapa (limitado a
         * una vez por frame) usa el índice espacial para resolver qué
         * manzana está bajo el cursor en microsegundos. El popup/tooltip
         * se enlazan de forma perezosa, solo la primera vez que se toca
         * esa manzana. */
        var dataLayer = L.geoJson({ type: 'FeatureCollection', features: simplifiedFeatures }, {
            pane: 'pane_data',
            renderer: canvasRenderer,
            interactive: false,
            style: styleFeature
        });

        dataLayer.addTo(map);

        var layerById = {};
        dataLayer.eachLayer(function (layer) {
            var id = layer.feature && idOf(layer.feature.properties);
            if (id !== null) { layerById[id] = layer; }
        });

        var hoveredId = null;
        var hoveredLayer = null;

        function clearHover() {
            if (hoveredLayer) { hoveredLayer.closeTooltip(); }
            hoveredLayer = null;
            hoveredId = null;
            clearHighlight();
        }

        function updateHover(latlng) {
            var match = featureAt(latlng);
            var id = match ? idOf(match.properties) : null;
            if (id === hoveredId) { return; }
            if (hoveredLayer) { hoveredLayer.closeTooltip(); }
            hoveredId = id;
            hoveredLayer = null;
            if (!match) {
                clearHighlight();
                return;
            }
            var full = rawFeaturesById[id] || match;
            showHighlight(full);
            var layer = layerById[id];
            if (layer) {
                hoveredLayer = layer;
                if (!layer._tooltipBound) {
                    layer.bindTooltip('', { sticky: true, direction: 'top', className: 'val-tooltip', opacity: 0.97 });
                    layer._tooltipBound = true;
                }
                layer.setTooltipContent(buildTooltipContent(full));
                layer.openTooltip(latlng);
            }
        }

        var pendingHoverLatLng = null;
        var hoverScheduled = false;
        map.on('mousemove', function (e) {
            pendingHoverLatLng = e.latlng;
            if (hoverScheduled) { return; }
            hoverScheduled = true;
            requestAnimationFrame(function () {
                hoverScheduled = false;
                updateHover(pendingHoverLatLng);
            });
        });
        map.on('mouseout', clearHover);
        map.on('movestart zoomstart', clearHover);

        map.on('click', function (e) {
            var match = featureAt(e.latlng);
            if (!match) { return; }
            var id = idOf(match.properties);
            var full = rawFeaturesById[id] || match;
            var layer = layerById[id];
            if (!layer) { return; }
            if (!layer._popupBound) {
                layer.bindPopup('', { maxHeight: 400, className: 'val-popup', autoPanPadding: [40, 40] });
                layer._popupBound = true;
            }
            layer.setPopupContent(buildPopupContent(full));
            layer.openPopup(e.latlng);
        });

        /* --- Leyenda interactiva ------------------------------------------ */
        function buildLegend() {
            var container = document.getElementById('legend-content');
            container.innerHTML = '';
            VALUE_BREAKS.forEach(function (b, i) {
                var row = document.createElement('button');
                row.type = 'button';
                row.className = 'legend-row';
                row.setAttribute('aria-pressed', 'false');
                row.innerHTML =
                    '<span class="legend-swatch" style="background:' + b.color + '"></span>' +
                    '<span class="legend-range">' + formatCOPShort(b.min) + ' – ' + formatCOPShort(b.max) + '</span>';
                row.addEventListener('click', function () {
                    selectedBreakIndex = (selectedBreakIndex === i) ? null : i;
                    dataLayer.setStyle(styleFeature);
                    Array.prototype.forEach.call(container.querySelectorAll('.legend-row'), function (el, elIdx) {
                        var active = selectedBreakIndex === elIdx;
                        el.classList.toggle('active', active);
                        el.setAttribute('aria-pressed', String(active));
                    });
                });
                container.appendChild(row);
            });
        }

        /* --- Estadísticas rápidas ------------------------------------------ */
        function computeAndRenderStats() {
            var feats = (json_Valor_Ref_M_2025_1 && json_Valor_Ref_M_2025_1.features) || [];
            var count = 0, sum = 0, min = Infinity, max = -Infinity;
            for (var i = 0; i < feats.length; i++) {
                var v = parseFloat(feats[i].properties ? feats[i].properties.VALOR_REFE : NaN);
                if (isNaN(v)) { continue; }
                count++;
                sum += v;
                if (v < min) { min = v; }
                if (v > max) { max = v; }
            }
            document.getElementById('stat-count').textContent = feats.length.toLocaleString('es-CO');
            document.getElementById('stat-avg').textContent = count ? formatCOPShort(sum / count) : '—';
            document.getElementById('stat-max').textContent = count ? formatCOPShort(max) : '—';
            document.getElementById('stat-min').textContent = count ? formatCOPShort(min) : '—';
        }

        /* --- Interfaz: panel lateral, acordeones, botón de encuadre ---------- */
        function setupChrome() {
            var appEl = document.getElementById('app');
            var toggleBtn = document.getElementById('sidebar-toggle');
            var backdrop = document.getElementById('sidebar-backdrop');

            function setSidebar(open) {
                appEl.classList.toggle('sidebar-collapsed', !open);
                toggleBtn.setAttribute('aria-expanded', String(open));
                setTimeout(function () { map.invalidateSize(); }, 320);
            }

            toggleBtn.addEventListener('click', function () {
                setSidebar(appEl.classList.contains('sidebar-collapsed'));
            });
            if (backdrop) {
                backdrop.addEventListener('click', function () { setSidebar(false); });
            }

            Array.prototype.forEach.call(document.querySelectorAll('.panel-toggle'), function (btn) {
                btn.addEventListener('click', function () {
                    var panel = document.getElementById(btn.getAttribute('data-target'));
                    if (panel) { panel.classList.toggle('collapsed'); }
                });
            });

            document.getElementById('locate-btn').addEventListener('click', function () {
                map.fitBounds(INITIAL_BOUNDS);
            });

            if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
                appEl.classList.add('sidebar-collapsed');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        function hideLoadingOverlay() {
            var overlay = document.getElementById('loading-overlay');
            if (!overlay) { return; }
            overlay.classList.add('hide');
            setTimeout(function () { overlay.style.display = 'none'; }, 550);
        }

        buildBasemapSwitcher();
        buildLegend();
        computeAndRenderStats();
        setupChrome();
        hideLoadingOverlay();

        setTimeout(function () { map.invalidateSize(); }, 60);

    } catch (err) {
        console.error('Error inicializando el mapa:', err);
        var overlay = document.getElementById('loading-overlay');
        if (overlay) {
            var h2 = overlay.querySelector('h2');
            var p = overlay.querySelector('p');
            var bar = overlay.querySelector('.loader-bar');
            var spinner = overlay.querySelector('.spinner');
            if (h2) { h2.textContent = 'No se pudo cargar el mapa'; }
            if (p) { p.textContent = 'Ocurrió un error inesperado. Detalle: ' + (err && err.message ? err.message : err); }
            if (bar) { bar.style.display = 'none'; }
            if (spinner) { spinner.style.display = 'none'; }
        }
    }
})();
