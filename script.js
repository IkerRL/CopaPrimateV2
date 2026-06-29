// ================================================================
// COPA PRIMATE VOL. II
// 12 equipos · 4 grupos de 3 · Liga cruzada (4 partidos c/u)
// Top 4 directo · 5º-12º playoff
// Bracket: Cuartos → Semis → Final
// ================================================================

// --- EQUIPOS Y GRUPOS (edita aquí) ---
const GRUPOS = {
    A: [
        { nombre: "Thunder Buddies", jugadores: ["Brrokeen", "Pipe"], logo: "logo3.png" },
        { nombre: "Los Akrtona2", jugadores: ["Kira", "Serax"], logo: "logo2.png" },
        { nombre: "Chuu-Chuu 100% MAX", jugadores: ["MakaQuillo", "Max"], logo: "logo8.png" },
        { nombre: "REHENKARMACIÓN", jugadores: ["Satha", "Makflat"], logo: "logo1.png" }
    ],
    B: [
        { nombre: "Entry Baiters", jugadores: ["レックウザ ", "Militantedelsoe"], logo: "logo5.png" },
        { nombre: "Dream Team", jugadores: ["JoKker", "Pepardo"], logo: "logo7.png" },
        { nombre: "Makaco Ninja-Pelocho", jugadores: ["MakacoNinja", "Iker😎"], logo: "logo6.png" },
        { nombre: "Kizuna", jugadores: ["Alezita", "Sarix"], logo: "logo4.png" }
    ],
    C: [
        { nombre: "Sakura", jugadores: ["Gustavo", "Carlos"], logo: "logo14.png" },
        { nombre: "Soul Resonance", jugadores: ["KrypT", "IAngeil-"], logo: "logo11.png" },
        { nombre: "Stranger Picks", jugadores: ["TheDori", "Sotomi"], logo: "logo9.png" },
        { nombre: "MARIIKS", jugadores: ["Acid", "Bru"], logo: "logo10.png" }
    ]

};

// Lista plana de equipos
const equipos = Object.entries(GRUPOS).flatMap(([g, lista]) =>
    lista.map(e => ({ ...e, grupo: g }))
);

const getEq = nombre => equipos.find(e => e.nombre === nombre);
const letras = ['A', 'B', 'C', 'D'];

// Calendario por jornadas
let jornadas = [[], [], [], []]; // jornadas[0..3] = array de { t1, t2 }
let calendario = [];             // lista plana de todos los partidos
let resultados = {};             // clave(t1,t2) -> { s1, s2 }
let playoffsData = [];
let bracketData = null;
let currentPhase = 'inicial';    // 'inicial', 'liga', 'playoffs', 'bracket'
let isApplyingSyncState = false;
let revealedCards = [];
let zoomedTeam = null;
let activeJornadaAccordion = 0;

// ----------------------------------------------------------------
// DOM
// ----------------------------------------------------------------
const container = document.getElementById('container-equipos');
const modal = document.getElementById('teamModal');
const modalCard = document.getElementById('teamModalCard');
const tablaModal = document.getElementById('tablaModal');
const tablaCard = document.getElementById('tablaModalCard');
const btnLiga = document.getElementById('btn-liga');
const btnPlayoffs = document.getElementById('btn-playoffs');
const btnBracket = document.getElementById('btn-bracket');
const audioMono = document.getElementById('audioMono');
const audioChamp = document.getElementById('audioChampions');

// Cerrar modales
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
tablaModal.addEventListener('click', e => { if (e.target === tablaModal) tablaModal.classList.remove('active'); });
document.querySelectorAll('.btn-sonido').forEach(m => m.addEventListener('click', () => { if (audioMono) { audioMono.currentTime = 0; audioMono.play(); } }));


// Al hacer clic en el monito de la derecha (monkey-right), abrimos/cerramos el panel de multijugador
document.querySelectorAll('.monkey-right').forEach(m => m.addEventListener('click', (e) => {
    if (!document.body.classList.contains('obs-mode')) {
        e.stopPropagation(); // Evitar que el clic se propague al document y lo cierre al instante
        const syncPanel = document.getElementById('syncPanel');
        if (syncPanel) {
            syncPanel.classList.toggle('active');
        }
    }
}));

// ----------------------------------------------------------------
// RENDER INICIAL
// ----------------------------------------------------------------
function renderInicial() {
    container.innerHTML = '';
    container.style.cssText = '';
    equipos.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'card-equipo';
        card.setAttribute('data-equipo-nombre', eq.nombre);
        if (revealedCards.includes(eq.nombre)) {
            card.classList.add('revealed');
        }
        card.innerHTML = `
            <div class="smoke-cover"></div>
            <div class="grupo-badge ${eq.grupo}">GRUPO ${eq.grupo}</div>
            <div class="equipo-content">
                <img src="${eq.logo}" class="equipo-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22><rect width=%2255%22 height=%2255%22 rx=%228%22 fill=%22%23222%22/><text x=%2227%22 y=%2233%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>?</text></svg>'">
                <div>
                    <div class="nombre-equipo">${eq.nombre}</div>
                    <div class="jugadores-row">${eq.jugadores.map(j => `<span>👤 ${j}</span>`).join('')}</div>
                </div>
            </div>`;

        // Clic para revelar una tarjeta (se sincroniza a través de MQTT si es el Administrador)
        card.addEventListener('click', () => {
            if (!card.classList.contains('revealed')) {
                card.classList.add('revealed');
                if (!revealedCards.includes(eq.nombre)) {
                    revealedCards.push(eq.nombre);
                }
                if (!window.isPantalla) {
                    broadcastState();
                }
            }
        });

        // Doble clic para hacer zoom (sincroniza en pantalla)
        card.addEventListener('dblclick', () => {
            if (!window.isPantalla && card.classList.contains('revealed')) {
                zoomedTeam = eq.nombre;
                mostrarZoomEquipo(eq);
                broadcastState();
            }
        });

        container.appendChild(card);
    });
}
renderInicial();

const zoomOverlay = document.getElementById('zoom-overlay');
const zoomCardContent = document.getElementById('zoom-card-content');
zoomOverlay.addEventListener('click', () => {
    if (!window.isPantalla) {
        cerrarZoomEquipo();
    }
});

function mostrarZoomEquipo(eq) {
    if (!eq) return;
    const badge = `<div class="grupo-badge ${eq.grupo}">GRUPO ${eq.grupo}</div>`;
    zoomCardContent.innerHTML = `
        <div class="card-equipo revealed" style="margin:0; width:300px; height:120px; cursor:default; transform:none; border-color:var(--omen-purple)">
            ${badge}
            <div class="equipo-content">
                <img src="${eq.logo}" class="equipo-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22><rect width=%2255%22 height=%2255%22 rx=%228%22 fill=%22%23222%22/><text x=%2227%22 y=%2233%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>?</text></svg>'">
                <div>
                    <div class="nombre-equipo" style="font-size:1.1rem">${eq.nombre}</div>
                    <div class="jugadores-row" style="font-size:0.8rem">${eq.jugadores.map(j => `<span>👤 ${j}</span>`).join('')}</div>
                </div>
            </div>
        </div>
    `;
    zoomOverlay.style.display = 'flex';
    // force reflow
    void zoomOverlay.offsetWidth;
    zoomOverlay.classList.add('active');
}

function cerrarZoomEquipo() {
    zoomOverlay.classList.remove('active');
    setTimeout(() => {
        if (!zoomOverlay.classList.contains('active')) zoomOverlay.style.display = 'none';
    }, 300);

    if (!window.isPantalla) {
        zoomedTeam = null;
        broadcastState();
    }
}

// ----------------------------------------------------------------
// INICIALIZACIÓN DE PARTIDOS
// ----------------------------------------------------------------
let partidos_generados = []; // todos los partidos ordenados por jornada

function initTorneo() {
    if (jornadas.flat().length > 0) return; // ya inicializado

    jornadas = [
        // Jornada 1
        [
            { t1: "Thunder Buddies", t2: "Entry Baiters" },
            { t1: "Los Akrtona2", t2: "Dream Team" },
            { t1: "Chuu-Chuu 100% MAX", t2: "Makaco Ninja-Pelocho" },
            { t1: "REHENKARMACIÓN", t2: "Kizuna" },
            { t1: "Sakura", t2: "Soul Resonance" },
            { t1: "Stranger Picks", t2: "MARIIKS" }
        ],
        // Jornada 2
        [
            { t1: "Thunder Buddies", t2: "Sakura" },
            { t1: "Los Akrtona2", t2: "Stranger Picks" },
            { t1: "Chuu-Chuu 100% MAX", t2: "Soul Resonance" },
            { t1: "REHENKARMACIÓN", t2: "MARIIKS" },
            { t1: "Entry Baiters", t2: "Dream Team" },
            { t1: "Makaco Ninja-Pelocho", t2: "Kizuna" }
        ],
        // Jornada 3
        [
            { t1: "Thunder Buddies", t2: "Los Akrtona2" },
            { t1: "Chuu-Chuu 100% MAX", t2: "REHENKARMACIÓN" },
            { t1: "Entry Baiters", t2: "Sakura" },
            { t1: "Dream Team", t2: "Stranger Picks" },
            { t1: "Makaco Ninja-Pelocho", t2: "MARIIKS" },
            { t1: "Kizuna", t2: "Soul Resonance" }
        ],
        // Jornada 4
        [
            { t1: "Thunder Buddies", t2: "Kizuna" },
            { t1: "Los Akrtona2", t2: "Makaco Ninja-Pelocho" },
            { t1: "Chuu-Chuu 100% MAX", t2: "Entry Baiters" },
            { t1: "REHENKARMACIÓN", t2: "Dream Team" },
            { t1: "Sakura", t2: "Stranger Picks" },
            { t1: "Soul Resonance", t2: "MARIIKS" }
        ]
    ];
    partidos_generados = jornadas.flat();
    calendario = [...partidos_generados];
    partidos_generados.forEach(p => {
        resultados[clave(p.t1, p.t2)] = { s1: '', s2: '' };
    });

    // Resultados Jornada 1
    const setRes = (t1, t2, val1, val2) => {
        const sorted = [t1, t2].sort();
        if (sorted[0] === t1) {
            resultados[clave(t1, t2)] = { s1: val1.toString(), s2: val2.toString() };
        } else {
            resultados[clave(t1, t2)] = { s1: val2.toString(), s2: val1.toString() };
        }
    };

}

// ----------------------------------------------------------------
// CLAVE DE PARTIDO
// ----------------------------------------------------------------
function clave(a, b) { return [a, b].sort().join('|'); }

// ----------------------------------------------------------------
// FASE DE LIGA — VISTA POR JORNADAS
// ----------------------------------------------------------------
btnLiga.addEventListener('click', () => {
    initTorneo();
    currentPhase = 'liga';
    mostrarLiga();
    btnLiga.style.display = 'none';
    btnPlayoffs.style.display = 'inline-block';

    let tf = document.getElementById('btn-tabla-flotante');
    if (!tf) {
        tf = document.createElement('button');
        tf.id = 'btn-tabla-flotante';
        tf.className = 'btn-valorant btn-gold';
        tf.innerHTML = '<span class="btn-content">📊 TABLA</span>';
        document.body.appendChild(tf);
        tf.addEventListener('click', mostrarTabla);
    }
    tf.style.display = 'block';

    broadcastState();
});

function mostrarLiga() {
    container.innerHTML = '';

    const tf = document.getElementById('btn-tabla-flotante');
    if (tf) tf.style.display = 'none';

    const splitContainer = document.createElement('div');
    splitContainer.className = 'liga-split-container';

    // === COLUMNA IZQUIERDA: CLASIFICACIÓN ===
    const tablaCol = document.createElement('div');
    tablaCol.className = 'liga-tabla-col';

    const ranking = getRanking();
    const trClass = pos => pos <= 4 ? 'tr-direct' : pos <= 12 ? 'tr-playoff' : 'tr-elim';

    tablaCol.innerHTML = `
        <div class="contenedor-tabla-directa">
            <h2 class="titulo-seccion-liga">📊 CLASIFICACIÓN</h2>
            <table class="tabla-general">
                <thead><tr>
                    <th>#</th><th>EQUIPO</th><th>PJ</th><th>V</th><th>PTS</th><th>DIF</th>
                </tr></thead>
                <tbody>
                ${ranking.map((r, i) => {
        const pos = i + 1;
        return `<tr class="${trClass(pos)}">
                        <td class="pos-num">${pos}</td>
                        <td><div style="display:flex;align-items:center;gap:8px">
                            <img src="${r.eq.logo}" style="width:20px;height:20px;object-fit:contain" onerror="this.style.display='none'">
                            <span class="tabla-nom-equipo">${r.eq.nombre}</span>
                        </div></td>
                        <td style="text-align:center">${r.pj}</td>
                        <td style="text-align:center">${r.wins}</td>
                        <td style="text-align:center;font-family:'BertholdBlock'">${r.pts}</td>
                        <td style="text-align:center;color:${r.diff >= 0 ? '#00ff88' : '#ff4655'}">${r.diff > 0 ? '+' : ''}${r.diff}</td>
                    </tr>`;
    }).join('')}
                </tbody>
            </table>
        </div>`;
    splitContainer.appendChild(tablaCol);

    // === COLUMNA DERECHA: ACORDEONES ===
    const jornadasCol = document.createElement('div');
    jornadasCol.className = 'liga-jornadas-col';

    const tituloJornadas = document.createElement('h2');
    tituloJornadas.className = 'titulo-seccion-liga';
    tituloJornadas.innerHTML = '📅 ENFRENTAMIENTOS <small style="font-size:0.55rem; color:rgba(255,255,255,0.4); display:block; margin-top:4px; letter-spacing:1px;">DOBLE CLIC PARA EDITAR MARCADORES</small>';
    jornadasCol.appendChild(tituloJornadas);

    jornadas.forEach((partidos, ji) => {
        const accItem = document.createElement('div');
        accItem.className = 'accordion-jornada';
        if (ji === activeJornadaAccordion) accItem.classList.add('active');

        accItem.innerHTML = `
            <div class="accordion-header">
                <div class="folder-title">
                    <span class="folder-icon">📁</span>
                    <span>JORNADA ${ji + 1}</span>
                </div>
                <span class="arrow-icon">▼</span>
            </div>
            <div class="accordion-content">
                <div class="lista-jornada" id="lista-j${ji}"></div>
            </div>`;

        const header = accItem.querySelector('.accordion-header');

        header.addEventListener('click', (e) => {
            const isOpen = accItem.classList.contains('active');
            jornadasCol.querySelectorAll('.accordion-jornada').forEach(item => item.classList.remove('active'));
            if (!isOpen) {
                accItem.classList.add('active');
                activeJornadaAccordion = ji;
            } else {
                activeJornadaAccordion = -1;
            }
            if (!window.isPantalla) {
                broadcastState();
            }
        });

        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (window.isPantalla) return;
            abrirPartidosJornada(ji);
        });

        const lista = accItem.querySelector(`#lista-j${ji}`);
        partidos.forEach(p => lista.appendChild(crearCardPartido(p, ji)));

        jornadasCol.appendChild(accItem);
    });

    splitContainer.appendChild(jornadasCol);
    container.appendChild(splitContainer);
}

// Genera las tarjetas individuales de enfrentamientos
function crearCardPartido(p, ji) {
    const eq1 = getEq(p.t1);
    const eq2 = getEq(p.t2);
    const r = resultados[clave(p.t1, p.t2)];

    const sorted = [p.t1, p.t2].sort();
    const s1Val = (r && r.s1 !== '') ? ((p.t1 === sorted[0]) ? r.s1 : r.s2) : '—';
    const s2Val = (r && r.s2 !== '') ? ((p.t1 === sorted[0]) ? r.s2 : r.s1) : '—';

    const card = document.createElement('div');
    card.className = 'partido-liga-card';
    card.innerHTML = `
        <div class="partido-equipo-col">
            <img src="${eq1.logo}" onerror="this.style.display='none'">
            <span class="partido-equipo-name">${p.t1}</span>
        </div>
        <div class="partido-score-col">
            <span class="partido-score-num">${s1Val}</span>
            <span class="partido-vs-text">VS</span>
            <span class="partido-score-num">${s2Val}</span>
        </div>
        <div class="partido-equipo-col back-align">
            <span class="partido-equipo-name">${p.t2}</span>
            <img src="${eq2.logo}" onerror="this.style.display='none'">
        </div>
    `;

    card.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (window.isPantalla) return;
        abrirModalResultadoPartido(p, ji);
    });

    return card;
}

// Abre ventana emergente para un único partido
function abrirModalResultadoPartido(p, ji) {
    const eq1 = getEq(p.t1);
    const eq2 = getEq(p.t2);
    const r = resultados[clave(p.t1, p.t2)];

    const sorted = [p.t1, p.t2].sort();
    const s1prev = (p.t1 === sorted[0]) ? r.s1 : r.s2;
    const s2prev = (p.t1 === sorted[0]) ? r.s2 : r.s1;

    abrirModalResultado(eq1, eq2, s1prev, s2prev, (s1, s2) => {
        if (p.t1 === sorted[0]) {
            r.s1 = s1; r.s2 = s2;
        } else {
            r.s1 = s2; r.s2 = s1;
        }
        refreshJornada(ji);
        broadcastState();
    });
}

// Abre ventana masiva para editar los 8 partidos de la jornada seleccionada
function abrirPartidosJornada(ji) {
    const partidos = jornadas[ji];
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:15px; font-size:1.4rem; letter-spacing:2px">EDITAR JORNADA ${ji + 1}</h2>
        <div style="max-height: 380px; overflow-y: auto; padding-right: 10px;" id="modal-lista-partidos-jornada">
            ${partidos.map((p, i) => {
        const eq1 = getEq(p.t1);
        const eq2 = getEq(p.t2);
        const r = resultados[clave(p.t1, p.t2)];
        const sorted = [p.t1, p.t2].sort();
        const s1Val = (r && r.s1 !== '') ? ((p.t1 === sorted[0]) ? r.s1 : r.s2) : '';
        const s2Val = (r && r.s2 !== '') ? ((p.t1 === sorted[0]) ? r.s2 : r.s1) : '';
        return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:8px; border-radius:4px; border:1px solid rgba(255,255,255,0.05)">
                        <div style="flex:1; display:flex; align-items:center; gap:6px; font-size:0.85rem; width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            <img src="${eq1.logo}" style="width:18px; height:18px; object-fit:contain" onerror="this.style.display='none'">
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.t1}</span>
                        </div>
                        <input type="number" class="input-score-jornada" data-idx="${i}" data-team="1" value="${s1Val}" style="width:45px; background:#111; border:1px solid var(--omen-purple); color:#fff; text-align:center; border-radius:3px; padding:2px;" min="0" placeholder="0">
                        <span style="color:var(--omen-purple)">—</span>
                        <input type="number" class="input-score-jornada" data-idx="${i}" data-team="2" value="${s2Val}" style="width:45px; background:#111; border:1px solid var(--omen-purple); color:#fff; text-align:center; border-radius:3px; padding:2px;" min="0" placeholder="0">
                        <div style="flex:1; display:flex; align-items:center; justify-content:flex-end; gap:6px; font-size:0.85rem; width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right;">
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.t2}</span>
                            <img src="${eq2.logo}" style="width:18px; height:18px; object-fit:contain" onerror="this.style.display='none'">
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
        <button class="btn-valorant" id="btn-guardar-jornada" style="width:100%; margin-top:15px;"><span class="btn-content">GUARDAR JORNADA</span></button>
    `;
    modal.classList.add('active');

    document.getElementById('btn-guardar-jornada').onclick = () => {
        let valid = true;
        const updates = [];

        for (let i = 0; i < partidos.length; i++) {
            const inp1 = modalCard.querySelector(`.input-score-jornada[data-idx="${i}"][data-team="1"]`);
            const inp2 = modalCard.querySelector(`.input-score-jornada[data-idx="${i}"][data-team="2"]`);

            if (inp1.value !== '' || inp2.value !== '') {
                const s1 = parseInt(inp1.value);
                const s2 = parseInt(inp2.value);
                if (isNaN(s1) || isNaN(s2)) {
                    alert('Introduce ambos marcadores para los partidos editados.');
                    valid = false; break;
                }
                if (s1 === s2) {
                    alert('No puede haber empates.');
                    valid = false; break;
                }
                updates.push({ idx: i, s1, s2 });
            }
        }

        if (valid) {
            updates.forEach(up => {
                const p = partidos[up.idx];
                const r = resultados[clave(p.t1, p.t2)];
                const sorted = [p.t1, p.t2].sort();
                if (p.t1 === sorted[0]) {
                    r.s1 = up.s1; r.s2 = up.s2;
                } else {
                    r.s1 = up.s2; r.s2 = up.s1;
                }
            });
            modal.classList.remove('active');
            refreshJornada(ji);
            broadcastState();
        }
    };
}

function refreshJornada(ji) {
    const lista = document.getElementById(`lista-j${ji}`);
    if (!lista) return;
    lista.innerHTML = '';
    jornadas[ji].forEach(p => lista.appendChild(crearCardPartido(p, ji)));

    const tbody = document.querySelector('.contenedor-tabla-directa tbody');
    if (tbody) {
        const ranking = getRanking();
        const trClass = pos => pos <= 4 ? 'tr-direct' : pos <= 12 ? 'tr-playoff' : 'tr-elim';
        tbody.innerHTML = ranking.map((r, i) => {
            const pos = i + 1;
            return `<tr class="${trClass(pos)}">
                <td class="pos-num">${pos}</td>
                <td><div style="display:flex;align-items:center;gap:8px">
                    <img src="${r.eq.logo}" style="width:20px;height:20px;object-fit:contain" onerror="this.style.display='none'">
                    <span class="tabla-nom-equipo">${r.eq.nombre}</span>
                </div></td>
                <td style="text-align:center">${r.pj}</td>
                <td style="text-align:center">${r.wins}</td>
                <td style="text-align:center;font-family:'BertholdBlock'">${r.pts}</td>
                <td style="text-align:center;color:${r.diff >= 0 ? '#00ff88' : '#ff4655'}">${r.diff > 0 ? '+' : ''}${r.diff}</td>
            </tr>`;
        }).join('');
    }
}

// ----------------------------------------------------------------
// FUNCIONES ESTADÍSTICAS MIGRADAS
// ----------------------------------------------------------------
function getPartidosEquipo(nombre) {
    return calendario.filter(p => p.t1 === nombre || p.t2 === nombre);
}

function getWins(nombre) {
    let wins = 0;
    calendario.forEach(p => {
        const r = resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort();
            const s1 = parseInt(r.s1);
            const s2 = parseInt(r.s2);
            if (nombre === sorted[0] && s1 > s2) wins++;
            if (nombre === sorted[1] && s2 > s1) wins++;
        }
    });
    return wins;
}

function getPuntos(nombre) {
    let pts = 0;
    calendario.forEach(p => {
        const r = resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort();
            const s1 = parseInt(r.s1);
            const s2 = parseInt(r.s2);
            if (nombre === sorted[0] && s1 > s2) pts += 1;
            if (nombre === sorted[1] && s2 > s1) pts += 1;
            if (s1 === s2) pts += 1;
        }
    });
    return pts;
}

function getDiff(nombre) {
    let favor = 0;
    let contra = 0;
    calendario.forEach(p => {
        const r = resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort();
            const s1 = parseInt(r.s1);
            const s2 = parseInt(r.s2);
            if (nombre === sorted[0]) {
                favor += s1; contra += s2;
            } else if (nombre === sorted[1]) {
                favor += s2; contra += s1;
            }
        }
    });
    return favor - contra;
}

function getRanking() {
    return equipos.map(eq => ({
        eq,
        pts: getPuntos(eq.nombre),
        wins: getWins(eq.nombre),
        diff: getDiff(eq.nombre),
        pj: getPartidosEquipo(eq.nombre).filter(p => {
            const r = resultados[clave(p.t1, p.t2)];
            return r && r.s1 !== '' && r.s2 !== '';
        }).length
    })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.diff - a.diff);
}

function mostrarTabla() {
    const ranking = getRanking();
    const zonaTag = pos => {
        if (pos <= 4) return '<span class="zona-tag direct">DIRECTO</span>';
        if (pos <= 12) return '<span class="zona-tag playoff">PLAYOFF</span>';
        return '<span class="zona-tag elim">ELIMINADO</span>';
    };
    const trClass = pos => pos <= 4 ? 'tr-direct' : pos <= 12 ? 'tr-playoff' : 'tr-elim';

    tablaCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px; font-size:1.6rem; letter-spacing:4px">TABLA GENERAL</h2>
        <table class="tabla-general">
            <thead><tr>
                <th>#</th><th>EQUIPO</th><th>GR</th><th>PJ</th><th>V</th><th>PTS</th><th>DIF</th><th>ZONA</th>
            </tr></thead>
            <tbody>
            ${ranking.map((r, i) => {
        const pos = i + 1;
        return `<tr class="${trClass(pos)}">
                    <td class="pos-num">${pos}</td>
                    <td><div style="display:flex;align-items:center;gap:8px">
                        <img src="${r.eq.logo}" style="width:22px;height:22px;object-fit:contain" onerror="this.style.display='none'">
                        <span>${r.eq.nombre}</span>
                    </div></td>
                    <td><span class="grupo-badge ${r.eq.grupo}" style="position:static;display:inline-block;font-size:.55rem;padding:1px 5px">${r.eq.grupo}</span></td>
                    <td style="text-align:center">${r.pj}</td>
                    <td style="text-align:center">${r.wins}</td>
                    <td style="text-align:center;font-family:'BertholdBlock'">${r.pts}</td>
                    <td style="text-align:center;color:${r.diff >= 0 ? '#00ff88' : '#ff4655'}">${r.diff > 0 ? '+' : ''}${r.diff}</td>
                    <td>${zonaTag(pos)}</td>
                </tr>`;
    }).join('')}
            </tbody>
        </table>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;font-size:.7rem;flex-wrap:wrap">
            <span><span class="zona-tag direct">DIRECTO</span> Top 4 → Cuartos</span>
            <span><span class="zona-tag playoff">PLAYOFF</span> 5º-12º → Playoff</span>
        </div>`;
    tablaModal.classList.add('active');
}

// ----------------------------------------------------------------
// PLAYOFFS (5º al 12º → 4 partidos)
// ----------------------------------------------------------------
btnPlayoffs.addEventListener('click', () => {
    currentPhase = 'playoffs';
    mostrarPlayoffs();
    btnPlayoffs.style.display = 'none';
    btnBracket.style.display = 'inline-block';
    broadcastState();
});

function mostrarPlayoffs() {
    container.innerHTML = '';
    const tf = document.getElementById('btn-tabla-flotante');
    if (tf) tf.style.display = 'none';

    if (!playoffsData || playoffsData.length === 0) {
        const ranking = getRanking();
        const zona = ranking.slice(4, 12);

        playoffsData = [
            { t1: zona[0].eq, t2: zona[7].eq, seed1: 5, seed2: 12, ganador: null, s1: '', s2: '' },
            { t1: zona[1].eq, t2: zona[6].eq, seed1: 6, seed2: 11, ganador: null, s1: '', s2: '' },
            { t1: zona[2].eq, t2: zona[5].eq, seed1: 7, seed2: 10, ganador: null, s1: '', s2: '' },
            { t1: zona[3].eq, t2: zona[4].eq, seed1: 8, seed2: 9, ganador: null, s1: '', s2: '' },
        ];
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'playoffs-wrapper';
    wrapper.innerHTML = `
        <h2 class="playoffs-title">FASE PLAYOFF</h2>
        <p class="playoffs-subtitle">DOBLE CLIC PARA INTRODUCIR RESULTADO</p>
        <div class="playoffs-grid" id="playoffs-grid"></div>`;

    const grid = wrapper.querySelector('#playoffs-grid');
    playoffsData.forEach((pd, i) => {
        const el = document.createElement('div');
        el.className = 'playoff-match';
        if (pd.ganador) el.classList.add('done');
        el.id = `plmatch-${i}`;
        renderPlayoffMatch(el, pd);
        el.ondblclick = () => {
            if (window.isPantalla) return;
            const img1 = pd.t1.logo || '';
            const img2 = pd.t2.logo || '';
            modalCard.innerHTML = `
                <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:10px">RESULTADO MAPA (BO3)</h2>
                <div class="fila-partido" style="display:flex; align-items:center; justify-content:center; gap:20px; margin:20px 0;">
                    <div style="text-align:center"><img src="${img1}" style="width:100px; height:100px; object-fit:contain" onerror="this.style.display='none'"><br><span style="font-family:'BertholdBlock';font-size:0.8rem">${pd.t1.nombre}</span></div>
                    <input type="number" id="sc1" class="input-score" style="width:68px; height:68px; background:#000; color:#fff; border:2px solid var(--omen-purple); text-align:center; border-radius:12px; font-family:'BertholdBlock'; font-size:2.2rem;">
                    <span style="font-size:3rem; font-family:'BertholdBlock'; color:var(--omen-purple)">-</span>
                    <input type="number" id="sc2" class="input-score" style="width:68px; height:68px; background:#000; color:#fff; border:2px solid var(--omen-purple); text-align:center; border-radius:12px; font-family:'BertholdBlock'; font-size:2.2rem;">
                    <div style="text-align:center"><img src="${img2}" style="width:100px; height:100px; object-fit:contain" onerror="this.style.display='none'"><br><span style="font-family:'BertholdBlock';font-size:0.8rem">${pd.t2.nombre}</span></div>
                </div>
                <button class="btn-valorant" id="saveM" style="width:100%"><span class="btn-content">CONFIRMAR MAPA</span></button>
            `;
            modal.classList.add("active");

            document.getElementById('saveM').onclick = () => {
                const limit = 2; // BO3
                let v1 = parseInt(pd.s1) || 0;
                let v2 = parseInt(pd.s2) || 0;

                if (v1 >= limit || v2 >= limit) { modal.classList.remove("active"); return; }
                const s1 = parseInt(document.getElementById('sc1').value) || 0;
                const s2 = parseInt(document.getElementById('sc2').value) || 0;
                if (s1 === s2) return;

                if (s1 > s2 && v1 < limit) { v1++; pd.s1 = v1.toString(); }
                else if (s2 > s1 && v2 < limit) { v2++; pd.s2 = v2.toString(); }

                modal.classList.remove("active");

                if (v1 === limit || v2 === limit) {
                    pd.ganador = v1 === limit ? pd.t1 : pd.t2;
                    el.classList.add('done');
                }
                renderPlayoffMatch(el, pd);
                broadcastState();
            };
        };
        grid.appendChild(el);
    });
    container.appendChild(wrapper);
}

function renderPlayoffMatch(el, pd) {
    const limit = 2; // BO3
    const v1 = parseInt(pd.s1) || 0;
    const v2 = parseInt(pd.s2) || 0;

    const gNom = pd.ganador?.nombre;
    const t1L = gNom && gNom !== pd.t1.nombre;
    const t2L = gNom && gNom !== pd.t2.nombre;

    const renderPelotitas = (v) => {
        let html = '<div class="pelotitas-container" style="justify-content:center; margin-top:8px; margin-left:0;">';
        for (let i = 0; i < limit; i++) {
            const estado = (i < v) ? "1" : "0";
            html += `<div class="pelotita" data-estado="${estado}"></div>`;
        }
        html += '</div>';
        return html;
    };

    el.innerHTML = `
        <div class="playoff-team-col ${t1L ? 'loser' : ''}">
            <span class="playoff-seed">#${pd.seed1}</span>
            <img src="${pd.t1.logo}" onerror="this.style.display='none'">
            <span class="pname">${pd.t1.nombre}</span>
            ${renderPelotitas(v1)}
        </div>
        <div class="playoff-vs">VS</div>
        <div class="playoff-team-col ${t2L ? 'loser' : ''}">
            <span class="playoff-seed">#${pd.seed2}</span>
            <img src="${pd.t2.logo}" onerror="this.style.display='none'">
            <span class="pname">${pd.t2.nombre}</span>
            ${renderPelotitas(v2)}
        </div>
    `;
}

// ----------------------------------------------------------------
// MODAL RESULTADO GENÉRICO
// ----------------------------------------------------------------
function abrirModalResultado(eq1, eq2, s1prev, s2prev, onConfirm) {
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px; font-size:1.3rem; letter-spacing:3px">RESULTADO</h2>
        <div class="modal-score-row">
            <div class="eq-blk">
                <img src="${eq1.logo}" onerror="this.style.display='none'">
                <div class="eq-name">${eq1.nombre}</div>
            </div>
            <input type="number" id="ms1" class="input-score" value="${s1prev}" min="0" placeholder="0">
            <span style="font-family:'BertholdBlock';font-size:2rem;color:var(--omen-purple)">—</span>
            <input type="number" id="ms2" class="input-score" value="${s2prev}" min="0" placeholder="0">
            <div class="eq-blk">
                <img src="${eq2.logo}" onerror="this.style.display='none'">
                <div class="eq-name">${eq2.nombre}</div>
            </div>
        </div>
        <button class="btn-valorant" id="ms-confirm" style="width:100%"><span class="btn-content">CONFIRMAR</span></button>`;
    modal.classList.add('active');
    modalCard.querySelector('#ms-confirm').onclick = () => {
        const s1 = parseInt(modalCard.querySelector('#ms1').value);
        const s2 = parseInt(modalCard.querySelector('#ms2').value);
        if (isNaN(s1) || isNaN(s2) || s1 === s2) { alert('Resultado inválido (no puede haber empate).'); return; }
        modal.classList.remove('active');
        onConfirm(s1, s2);
    };
}

// ----------------------------------------------------------------
// BRACKET FINAL (Cuartos → Semis → Final)
// ----------------------------------------------------------------
btnBracket.addEventListener('click', () => {
    currentPhase = 'bracket';
    iniciarBracket();
    btnBracket.style.display = 'none';
    broadcastState();
});

function iniciarBracket() {
    if (!bracketData) {
        const ranking = getRanking();
        const top4 = ranking.slice(0, 4).map(r => r.eq);
        const gpWinners = playoffsData.map(pd => pd.ganador || { nombre: 'TBD', logo: '' });

        bracketData = {
            qf: [
                { id: 'qf0', t1: top4[0], t2: gpWinners[3], s1: '', s2: '', ganador: null },
                { id: 'qf1', t1: top4[1], t2: gpWinners[2], s1: '', s2: '', ganador: null },
                { id: 'qf2', t1: top4[2], t2: gpWinners[1], s1: '', s2: '', ganador: null },
                { id: 'qf3', t1: top4[3], t2: gpWinners[0], s1: '', s2: '', ganador: null },
            ],
            sf: [
                { id: 'sf0', t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, s1: '', s2: '', ganador: null },
                { id: 'sf1', t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, s1: '', s2: '', ganador: null },
            ],
            fn: [
                { id: 'fn0', t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, s1: '', s2: '', ganador: null },
            ]
        };
    }
    renderBracket();
}

function renderBracket() {
    container.innerHTML = '';
    const outer = document.createElement('div');
    outer.className = 'bracket-outer';
    const bc = document.createElement('div');
    bc.className = 'bracket-container';

    bc.appendChild(crearColumna('CUARTOS DE FINAL', bracketData.qf, 'qf'));
    bc.appendChild(crearColumna('SEMIFINALES', bracketData.sf, 'sf'));
    bc.appendChild(crearColumna('⚡ GRAN FINAL', bracketData.fn, 'fn'));

    outer.appendChild(bc);
    container.appendChild(outer);

    // Dibuja las líneas conectoras del bracket de manera retardada para asegurar que el DOM esté listo
    setTimeout(drawBracketLines, 60);

    // Registra el evento de redibujado en redimensión
    window.removeEventListener('resize', drawBracketLines);
    window.addEventListener('resize', drawBracketLines);

    // Auto-trigger champion display if final is played and not yet displayed
    if (bracketData.fn && bracketData.fn[0] && bracketData.fn[0].ganador && bracketData.fn[0].ganador.nombre !== 'TBD') {
        mostrarCampeon(bracketData.fn[0].ganador.nombre, bracketData.fn[0].ganador.logo);
    }
}

function drawBracketLines() {
    // Buscar el contenedor
    const containerEl = document.querySelector('.bracket-container');
    if (!containerEl) return;

    // Eliminar SVG previo si existe
    let svg = document.getElementById('bracket-svg');
    if (svg) svg.remove();

    // Crear elemento SVG
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'bracket-svg';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';
    containerEl.appendChild(svg);

    const qfBoxes = Array.from(document.querySelectorAll('#col-qf .match-box'));
    const sfBoxes = Array.from(document.querySelectorAll('#col-sf .match-box'));
    const fnBoxes = Array.from(document.querySelectorAll('#col-fn .match-box'));

    const drawLine = (box1, box2) => {
        if (!box1 || !box2) return;
        const r1 = box1.getBoundingClientRect();
        const r2 = box2.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        // Calcular coordenadas relativas al contenedor
        const x1 = r1.right - containerRect.left;
        const y1 = r1.top + r1.height / 2 - containerRect.top;
        const x2 = r2.left - containerRect.left;
        const y2 = r2.top + r2.height / 2 - containerRect.top;

        // Punto medio horizontal para hacer el quiebre orthogonal (en ángulo recto)
        const midX = x1 + (x2 - x1) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
        path.setAttribute('stroke', 'rgba(124, 114, 255, 0.45)');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        path.style.filter = 'drop-shadow(0 0 5px rgba(124, 114, 255, 0.4))';
        svg.appendChild(path);
    };

    // Cuartos a Semis (QF a SF)
    // qf0 y qf1 van a sf0
    drawLine(qfBoxes[0], sfBoxes[0]);
    drawLine(qfBoxes[1], sfBoxes[0]);
    // qf2 y qf3 van a sf1
    drawLine(qfBoxes[2], sfBoxes[1]);
    drawLine(qfBoxes[3], sfBoxes[1]);

    // Semis a Final (SF a FN)
    drawLine(sfBoxes[0], fnBoxes[0]);
    drawLine(sfBoxes[1], fnBoxes[0]);
}

function crearColumna(titulo, partidos, fase) {
    const col = document.createElement('div');
    col.className = 'bracket-column';
    col.id = `col-${fase}`;

    const tit = document.createElement('div');
    tit.className = 'bracket-col-title';
    tit.textContent = titulo;
    col.appendChild(tit);

    partidos.forEach((p, i) => {
        col.appendChild(crearMatchBox(p, fase, i));
    });
    return col;
}

// ================================================================
// SINCRONIZACIÓN EN VIVO (MQTT via HiveMQ)
// ================================================================
const syncToggleBtn = document.getElementById('syncToggleBtn');
const syncPanel = document.getElementById('syncPanel');
const syncPulse = document.getElementById('syncPulse');
const syncStatusBadge = document.getElementById('syncStatusBadge');
const syncRoomInput = document.getElementById('syncRoomInput');
const btnSyncConnect = document.getElementById('btnSyncConnect');
const btnSyncCopyLink = document.getElementById('btnSyncCopyLink');
const btnSyncDisconnect = document.getElementById('btnSyncDisconnect');
const syncConnectedActions = document.getElementById('syncConnectedActions');
const syncBrokerInput = document.getElementById('syncBrokerInput');
const syncTopicInput = document.getElementById('syncTopicInput');

let mqttClient = null;
let mqttTopic = '';

// Historial de mensajes para evitar duplicados (self-echo)
const MSG_HISTORIAL = new Set();

// Toggle panel
if (syncToggleBtn) {
    syncToggleBtn.addEventListener('click', () => {
        syncPanel.classList.toggle('active');
    });
}
document.addEventListener('click', (e) => {
    const monkeyRight = document.querySelector('.monkey-right');
    const isMonkeyClick = monkeyRight && monkeyRight.contains(e.target);
    if (!isMonkeyClick && syncPanel && !syncPanel.contains(e.target)) {
        syncPanel.classList.remove('active');
    }
});

// Generar código de sala aleatorio
function generateRandomRoom() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'COPA-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Auto-rellenar sala desde URL o generar una nueva
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
const isPantalla = urlParams.get('pantalla') === 'true';
const isAdmin = urlParams.get('admin') === 'true';

// Determinar el rol/modo de forma dinámica
if (roomParam) {
    window.roomName = roomParam;

    // Si tiene sala por URL pero no tiene &admin=true, por defecto actúa como Pantalla
    if (!isAdmin) {
        window.isPantalla = true;
        document.body.classList.add('pantalla-mode');

        // Si es el modo de pantalla limpia de OBS, añadimos obs-mode para desactivar interacciones
        if (isPantalla) {
            document.body.classList.add('obs-mode');
        } else {
            // Si no es OBS limpio, mostramos el botón de admin (si existe en el DOM)
            const adminBtn = document.getElementById('admin-btn');
            if (adminBtn) adminBtn.style.display = 'block';
        }
    }

    // Conectar automáticamente a la sala
    syncRoomInput.value = roomParam;
    setTimeout(() => connectMQTT(roomParam), 600);
} else {
    // Si abrimos la URL raíz sin parámetros, es modo Admin por defecto y genera código de sala
    syncRoomInput.value = generateRandomRoom();
}

// Función para abrir el panel de control en un popup
function abrirPanel() {
    const rName = window.roomName || syncRoomInput.value || '';
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(rName)}&admin=true`;
    console.log("[Antigravity] abrirPanel called with URL:", url);
    window.open(url, 'PanelControl', 'width=1100,height=850,resizable=yes');
}

// Actualizar UI de estado de conexión
function updateConnectionStatus(status) {
    syncPulse.className = 'pulse-icon';
    syncStatusBadge.className = 'status-badge';

    if (status === 'disconnected') {
        syncPulse.classList.add('red');
        syncStatusBadge.classList.add('status-disconnected');
        syncStatusBadge.textContent = 'DESCONECTADO';
        btnSyncConnect.style.display = 'inline-block';
        syncConnectedActions.style.display = 'none';
        syncRoomInput.disabled = false;
    } else if (status === 'connecting') {
        syncPulse.classList.add('yellow');
        syncStatusBadge.classList.add('status-connecting');
        syncStatusBadge.textContent = 'CONECTANDO...';
        btnSyncConnect.style.display = 'none';
        syncConnectedActions.style.display = 'none';
        syncRoomInput.disabled = true;
    } else if (status === 'connected') {
        syncPulse.classList.add('green');
        syncStatusBadge.classList.add('status-connected');
        syncStatusBadge.textContent = `SALA: ${syncRoomInput.value}`;
        btnSyncConnect.style.display = 'none';
        syncConnectedActions.style.display = 'flex';
        syncRoomInput.disabled = true;
    }
}

// Conectar al broker MQTT
function connectMQTT(roomName) {
    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
    }

    const broker = (syncBrokerInput?.value.trim()) || 'wss://broker.hivemq.com:8884/mqtt';
    const topicBase = (syncTopicInput?.value.trim()) || 'copa_primate';
    mqttTopic = `${topicBase}/${roomName.trim()}`;

    console.log(`Conectando a MQTT broker: ${broker} | Tema: ${mqttTopic}`);
    updateConnectionStatus('connecting');

    mqttClient = mqtt.connect(broker, {
        clientId: 'copa_' + Math.random().toString(16).slice(2, 10),
        clean: true,
        reconnectPeriod: 3000,
    });

    mqttClient.on('connect', () => {
        console.log(`Conectado a MQTT en sala: ${roomName}`);
        updateConnectionStatus('connected');
        mqttClient.subscribe(mqttTopic, { qos: 0 });
        // Pedir estado actual a otros clientes conectados
        publishMQTT({ type: 'REQUEST_STATE' });
    });

    mqttClient.on('message', (topic, payload) => {
        try {
            const msg = JSON.parse(payload.toString());

            // Deduplicar: ignorar mensajes propios
            if (msg._id && MSG_HISTORIAL.has(msg._id)) return;

            console.log('Mensaje MQTT recibido:', msg.type);

            if (msg.type === 'REQUEST_STATE') {
                // Responder con el estado si tenemos algo
                if (currentPhase !== 'inicial' || idx_sorteo > 0 || Object.keys(resultados).length > 0) {
                    broadcastState();
                }
            } else if (msg.type === 'STATE_UPDATE') {
                if (!sorteo_animando) {
                    isApplyingSyncState = true;
                    aplicarEstado(msg.state);
                    isApplyingSyncState = false;
                }
            } else if (msg.type === 'SORTEO_NEXT') {
                ejecutarSorteoSiguiente();
            }
        } catch (e) {
            console.error('Error al procesar mensaje MQTT:', e);
        }
    });

    mqttClient.on('reconnect', () => {
        console.log('Reconectando a MQTT...');
        updateConnectionStatus('connecting');
    });

    mqttClient.on('error', (err) => {
        console.error('Error MQTT:', err);
        updateConnectionStatus('disconnected');
    });

    mqttClient.on('close', () => {
        console.log('Conexión MQTT cerrada');
        updateConnectionStatus('disconnected');
    });
}

// Publicar mensaje en el tema de la sala
function publishMQTT(msg) {
    if (!mqttClient || !mqttClient.connected) return;
    const id = Math.random().toString(36).slice(2, 10);
    msg._id = id;
    MSG_HISTORIAL.add(id);
    // Limpiar historial para no acumular indefinidamente
    if (MSG_HISTORIAL.size > 200) {
        const first = MSG_HISTORIAL.values().next().value;
        MSG_HISTORIAL.delete(first);
    }
    mqttClient.publish(mqttTopic, JSON.stringify(msg), { qos: 0, retain: false });
}

// Serializar y emitir el estado completo del torneo
function broadcastState() {
    if (isApplyingSyncState) return;
    if (!mqttClient || !mqttClient.connected) return;

    console.log('Publicando estado via MQTT...');

    const state = {
        currentPhase,
        jornadas,
        calendario,
        resultados,
        playoffsData,
        bracketData,
        idx_sorteo,
        total_sorteo,
        currentPhase,
        partidos_generados,
        revealedCards,
        zoomedTeam,
        activeJornadaAccordion,
        btnSorteoDisplay: btnSorteo.style.display,
        btnLigaDisplay: btnLiga.style.display,
        btnPlayoffsDisplay: btnPlayoffs.style.display,
        btnBracketDisplay: btnBracket.style.display,
        sorteoOverlayActive: sorteoOverlay.classList.contains('active'),
        btnTablaFlotanteDisplay: document.getElementById('btn-tabla-flotante')?.style.display || 'none'
    };

    publishMQTT({ type: 'STATE_UPDATE', state });
}

// Aplicar estado recibido de la red
function aplicarEstado(state) {
    if (!state) return;
    console.log('Aplicando estado recibido...', state.currentPhase);

    if (state.jornadas) jornadas = state.jornadas;
    if (state.calendario) calendario = state.calendario;
    if (state.resultados) resultados = state.resultados;
    if (state.playoffsData) playoffsData = state.playoffsData;
    if (state.bracketData) bracketData = state.bracketData;
    if (state.idx_sorteo !== undefined) idx_sorteo = state.idx_sorteo;
    if (state.total_sorteo !== undefined) total_sorteo = state.total_sorteo;
    if (state.partidos_generados) partidos_generados = state.partidos_generados;
    currentPhase = state.currentPhase || 'inicial';

    if (state.zoomedTeam !== undefined && state.zoomedTeam !== zoomedTeam) {
        zoomedTeam = state.zoomedTeam;
        if (zoomedTeam) {
            mostrarZoomEquipo(getEq(zoomedTeam));
        } else {
            zoomOverlay.classList.remove('active');
            setTimeout(() => { if (!zoomOverlay.classList.contains('active')) zoomOverlay.style.display = 'none'; }, 300);
        }
    }

    // Botones
    if (btnSorteo) btnSorteo.style.display = state.btnSorteoDisplay || 'inline-block';
    if (btnLiga) btnLiga.style.display = state.btnLigaDisplay || 'none';
    if (btnPlayoffs) btnPlayoffs.style.display = state.btnPlayoffsDisplay || 'none';
    if (btnBracket) btnBracket.style.display = state.btnBracketDisplay || 'none';

    // Overlay sorteo
    if (state.sorteoOverlayActive) {
        sorteoOverlay.classList.add('active');
        renderSorteoState();
    } else {
        sorteoOverlay.classList.remove('active');
    }

    // Botón tabla flotante
    let tf = document.getElementById('btn-tabla-flotante');
    if (state.btnTablaFlotanteDisplay === 'block') {
        if (!tf) {
            tf = document.createElement('button');
            tf.id = 'btn-tabla-flotante';
            tf.className = 'btn-valorant btn-gold';
            tf.innerHTML = '<span class="btn-content">📊 TABLA</span>';
            document.body.appendChild(tf);
            tf.addEventListener('click', mostrarTabla);
        }
        tf.style.display = 'block';
    } else {
        if (tf) tf.style.display = 'none';
    }

    // Aplicar estado de tarjetas reveladas
    if (state.revealedCards) {
        state.revealedCards.forEach(nom => {
            if (!revealedCards.includes(nom)) {
                revealedCards.push(nom);
            }
        });
    }
    if (state.activeJornadaAccordion !== undefined) {
        activeJornadaAccordion = state.activeJornadaAccordion;
    }

    // Renderizar la fase actual
    if (currentPhase === 'inicial') {
        // Inicializar si el contenedor está vacío o no tiene tarjetas
        if (container.children.length === 0 || !container.querySelector('.card-equipo')) {
            renderInicial();
        }

        // Aplicar la clase revealed de forma animada a los elementos del DOM recibidos
        if (state.revealedCards) {
            state.revealedCards.forEach(nom => {
                const cardEl = container.querySelector(`.card-equipo[data-equipo-nombre="${nom}"]`);
                if (cardEl && !cardEl.classList.contains('revealed')) {
                    cardEl.classList.add('revealed');
                }
            });
        }
    }
    else if (currentPhase === 'liga') { mostrarLiga(); for (let j = 0; j < 4; j++) refreshJornada(j); }
    else if (currentPhase === 'playoffs') mostrarPlayoffs();
    else if (currentPhase === 'bracket') renderBracket();
}

// Reproducir visualmente el estado del sorteo (para clientes que se unen tarde)
function renderSorteoState() {
    setupSorteoGruposDisplay();
    for (let j = 0; j < 4; j++) {
        const col = document.getElementById(`sj-${j}`);
        if (col) col.innerHTML = `<div class="sj-title">JORNADA ${j + 1}</div>`;
    }
    for (let i = 0; i < idx_sorteo; i++) {
        let j_act = 0, tempAcum = 0;
        for (let j = 0; j < 4; j++) {
            if (i < tempAcum + (jornadas[j]?.length || 0)) { j_act = j; break; }
            tempAcum += (jornadas[j]?.length || 0);
        }
        const match = partidos_generados[i];
        if (!match) continue;
        const eq1 = getEq(match.t1), eq2 = getEq(match.t2);
        const sjCol = document.getElementById(`sj-${j_act}`);
        if (sjCol && eq1 && eq2) {
            const chip = document.createElement('div');
            chip.className = 'sj-match visible';
            chip.innerHTML = `
                <img src="${eq1.logo}" onerror="this.style.display='none'">
                <span>${match.t1}</span>
                <span class="sj-vs">VS</span>
                <span>${match.t2}</span>
                <img src="${eq2.logo}" onerror="this.style.display='none'">`;
            sjCol.appendChild(chip);
        }
    }
    const ball = document.getElementById('sorteo-ball');
    const infoEl = document.getElementById('sorteo-info');
    const revealEl = document.getElementById('sorteo-match-reveal');
    const btnCerrar = document.getElementById('btn-cerrar-sorteo');
    if (idx_sorteo >= total_sorteo && total_sorteo > 0) {
        if (ball) { ball.textContent = '✓'; ball.style.cursor = 'default'; ball.onclick = null; }
        if (infoEl) infoEl.textContent = '¡SORTEO COMPLETADO! ' + total_sorteo + ' PARTIDOS';
        if (revealEl) revealEl.textContent = '';
        if (btnCerrar) btnCerrar.style.display = 'block';
    } else {
        if (ball) { ball.textContent = '▶'; ball.style.cursor = 'pointer'; ball.onclick = () => sortearSiguiente(ball); }
        if (infoEl) infoEl.textContent = idx_sorteo === 0 ? 'Pulsa el balón para sortear' : `Partido ${idx_sorteo}/${total_sorteo}`;
        if (revealEl) revealEl.textContent = '';
        if (btnCerrar) btnCerrar.style.display = 'none';
    }
}

// ── Botones del panel ────────────────────────────────────────────
btnSyncConnect.addEventListener('click', () => {
    const room = syncRoomInput.value.trim();
    if (!room) { alert('Introduce un código de sala válido.'); return; }
    connectMQTT(room);
});

btnSyncDisconnect.addEventListener('click', () => {
    if (mqttClient) { mqttClient.end(true); mqttClient = null; }
    updateConnectionStatus('disconnected');
});

btnSyncCopyLink.addEventListener('click', () => {
    const room = syncRoomInput.value.trim();
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        const orig = btnSyncCopyLink.innerHTML;
        btnSyncCopyLink.innerHTML = '✓ ¡COPIADO!';
        setTimeout(() => { btnSyncCopyLink.innerHTML = orig; }, 2000);
    }).catch(() => alert(`Copia este enlace: ${shareUrl}`));
});

function bindMatchBoxClick(box, p, fase, idx) {
    box.ondblclick = () => {
        if (window.isPantalla) return;
        const img1 = p.t1.logo || '';
        const img2 = p.t2.logo || '';
        modalCard.innerHTML = `
            <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:10px">RESULTADO MAPA</h2>
            <div class="fila-partido" style="display:flex; align-items:center; justify-content:center; gap:20px; margin:20px 0;">
                <img src="${img1}" style="width:140px; height:140px; object-fit:contain" onerror="this.style.display='none'">
                <input type="number" id="sc1" class="input-score" style="width:68px; height:68px; background:#000; color:#fff; border:2px solid var(--omen-purple); text-align:center; border-radius:12px; font-family:'BertholdBlock'; font-size:2.2rem;">
                <span style="font-size:3rem; font-family:'BertholdBlock'; color:var(--omen-purple)">-</span>
                <input type="number" id="sc2" class="input-score" style="width:68px; height:68px; background:#000; color:#fff; border:2px solid var(--omen-purple); text-align:center; border-radius:12px; font-family:'BertholdBlock'; font-size:2.2rem;">
                <img src="${img2}" style="width:140px; height:140px; object-fit:contain" onerror="this.style.display='none'">
            </div>
            <button class="btn-valorant" id="saveM" style="width:100%"><span class="btn-content">CONFIRMAR MAPA</span></button>
        `;
        modal.classList.add("active");

        document.getElementById('saveM').onclick = () => {
            const limit = (fase === 'fn') ? 3 : 2;
            let v1 = parseInt(p.s1) || 0;
            let v2 = parseInt(p.s2) || 0;

            if (v1 >= limit || v2 >= limit) { modal.classList.remove("active"); return; }
            const s1 = parseInt(document.getElementById('sc1').value) || 0;
            const s2 = parseInt(document.getElementById('sc2').value) || 0;
            if (s1 === s2) return;

            if (s1 > s2 && v1 < limit) { v1++; p.s1 = v1.toString(); }
            else if (s2 > s1 && v2 < limit) { v2++; p.s2 = v2.toString(); }

            modal.classList.remove("active");

            if (v1 === limit || v2 === limit) {
                p.ganador = v1 === limit ? p.t1 : p.t2;
                avanzarBracket(fase, idx, p.ganador);
                if (fase === 'fn') {
                    setTimeout(() => mostrarCampeon(p.ganador.nombre, p.ganador.logo), 400);
                }
            }
            renderMatchBox(box, p, fase);
            broadcastState();
        };
    };
}

function crearMatchBox(p, fase, idx) {
    const box = document.createElement('div');
    box.className = 'match-box' + (fase === 'fn' ? ' final-box' : '');
    box.id = `mb-${p.id}`;

    const esTBD = p.t1.nombre === 'TBD' || p.t2.nombre === 'TBD';
    if (esTBD) box.classList.add('tbd');

    renderMatchBox(box, p, fase);

    if (!esTBD) {
        bindMatchBoxClick(box, p, fase, idx);
    }
    return box;
}

function renderMatchBox(box, p, fase) {
    const limit = (fase === 'fn') ? 3 : 2;
    const v1 = parseInt(p.s1) || 0;
    const v2 = parseInt(p.s2) || 0;

    const g = p.ganador?.nombre;
    const t1L = g && g !== p.t1.nombre;
    const t2L = g && g !== p.t2.nombre;

    const renderPelotitas = (v) => {
        let html = '<div class="pelotitas-container">';
        for (let i = 0; i < limit; i++) {
            const estado = (i < v) ? "1" : "0";
            html += `<div class="pelotita" data-estado="${estado}"></div>`;
        }
        html += '</div>';
        return html;
    };

    const img = eq => eq.logo ? `<img src="${eq.logo}" onerror="this.style.display='none'">` : `<div style="width:28px;height:28px;background:#222;border-radius:4px"></div>`;
    box.innerHTML = `
        <div class="mtr ${t1L ? 'loser' : ''}">
            ${img(p.t1)}
            <span class="mtr-name">${p.t1.nombre}</span>
            ${p.t1.nombre !== 'TBD' ? renderPelotitas(v1) : ''}
        </div>
        <div class="vs-line"></div>
        <div class="mtr ${t2L ? 'loser' : ''}">
            ${img(p.t2)}
            <span class="mtr-name">${p.t2.nombre}</span>
            ${p.t2.nombre !== 'TBD' ? renderPelotitas(v2) : ''}
        </div>`;
}

function avanzarBracket(fase, idx, ganador) {
    let destFase, destIdx, destSlot;

    if (fase === 'qf') {
        destFase = 'sf';
        destIdx = idx < 2 ? 0 : 1;
        destSlot = idx % 2 === 0 ? 't1' : 't2';
    } else if (fase === 'sf') {
        destFase = 'fn'; destIdx = 0;
        destSlot = idx === 0 ? 't1' : 't2';
    } else return;

    const arr = destFase === 'sf' ? bracketData.sf : bracketData.fn;
    arr[destIdx][destSlot] = ganador;

    const destBox = document.getElementById(`mb-${arr[destIdx].id}`);
    if (!destBox) return;
    renderMatchBox(destBox, arr[destIdx], destFase);

    const p = arr[destIdx];
    if (p.t1.nombre !== 'TBD' && p.t2.nombre !== 'TBD') {
        destBox.classList.remove('tbd');
        bindMatchBoxClick(destBox, p, destFase, destIdx);
    }
}

function mostrarCampeon(nombre, logo) {
    if (document.querySelector('.champion-overlay')) return;
    const ov = document.createElement('div');
    ov.className = 'champion-overlay';
    ov.innerHTML = `
        <h1 class="champion-title">¡CAMPEÓN VOL. II!</h1>
        <img src="${logo}" class="champion-logo" onerror="this.style.display='none'">
        <h2 class="champion-name">${nombre}</h2>
        <button class="btn-valorant" onclick="location.reload()" style="margin-top:50px">
            <span class="btn-content">FINALIZAR TORNEO</span>
        </button>`;
    document.body.appendChild(ov);
    if (audioChamp) { audioChamp.currentTime = 0; audioChamp.play(); }
    setTimeout(() => ov.classList.add('active'), 100);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
