// ============================================================
// COPA PRIMATE VOL. II — SCRIPT PRINCIPAL
// Formato: 18 equipos, 4 Bombos, Fase de Grupos, Playoffs, Bracket
// ============================================================

// --- 1. DATOS DE EQUIPOS (3 jugadores por equipo) ---
const equipos = [
    // BOMBO A — Nivel Alto (5 equipos)
    { nombre: "Rose Devil",     jugadores: ["Tony", "Jokker", "TBD"],              logo: "logo1.png",  bombo: "A" },
    { nombre: "Golden Sex",     jugadores: ["Max", "Broken", "TBD"],               logo: "logo2.png",  bombo: "A" },
    { nombre: "Crimson Eclipse",jugadores: ["ReyFhantom", "zNyrex", "TBD"],        logo: "logo5.png",  bombo: "A" },
    { nombre: "GOATS",          jugadores: ["Mica", "Marco", "TBD"],               logo: "logo12.png", bombo: "A" },
    { nombre: "Los Akrtona2",   jugadores: ["S3R4X", "MasterKira", "TBD"],        logo: "logo4.png",  bombo: "A" },

    // BOMBO B — Nivel Medio-Alto (5 equipos)
    { nombre: "Bloody Fruit",   jugadores: ["MrPain 神", "Sandiass21", "TBD"],     logo: "logo7.png",  bombo: "B" },
    { nombre: "SPIDYBOOBS",     jugadores: ["Sama", "Potro", "TBD"],              logo: "logo14.png", bombo: "B" },
    { nombre: "MUGIWARAS",      jugadores: ["Andreloregon", "Jess", "TBD"],       logo: "logo15.png", bombo: "B" },
    { nombre: "TETONES",        jugadores: ["Marrkitosss", "Davv", "TBD"],        logo: "logo11.png", bombo: "B" },
    { nombre: "Al-dedillo VC",  jugadores: ["Xolo", "Noavae", "TBD"],             logo: "logo3.png",  bombo: "B" },

    // BOMBO C — Nivel Medio-Bajo (4 equipos) — +3 puntos de colchón
    { nombre: "Konoha Makaca",       jugadores: ["MakaQuillo", "MakaIsla", "TBD"],  logo: "logo9.png",  bombo: "C" },
    { nombre: "Makaco NinjaPelocho", jugadores: ["Iker", "Adri", "TBD"],           logo: "logo6.png",  bombo: "C" },
    { nombre: "Hijas del Kaos",      jugadores: ["Satha", "Kaos", "TBD"],          logo: "logo8.png",  bombo: "C" },
    { nombre: "Miaus",               jugadores: ["Kae", "Wilson", "TBD"],          logo: "logo13.png", bombo: "C" },

    // BOMBO D — Nivel Bajo (4 equipos) — +3 puntos de colchón
    { nombre: "Team Obrikat",   jugadores: ["JettDiffs", "EGOFack", "TBD"],        logo: "logo10.png", bombo: "D" },
    { nombre: "Los Primates",   jugadores: ["Jugador1", "Jugador2", "Jugador3"],   logo: "logo16.png", bombo: "D" },
    { nombre: "Wild Cards",     jugadores: ["Jugador1", "Jugador2", "Jugador3"],   logo: "logo17.png", bombo: "D" },
    { nombre: "Los Novatos",    jugadores: ["Jugador1", "Jugador2", "Jugador3"],   logo: "logo18.png", bombo: "D" },
];

// Bombos por defecto (pueden cambiar tras sorteo)
const BOMBOS = { A: [], B: [], C: [], D: [] };
equipos.forEach(e => BOMBOS[e.bombo].push(e.nombre));

// Colchón de puntos para bombos C y D
const COLCHON_PUNTOS = 3;
const BOMBOS_CON_COLCHON = ["C", "D"];

// Partidos generados tras el sorteo
let calendarioGenerado = {};   // { nombreEquipo: [{rival, local}, ...] }
let resultadosGrupo = {};      // { "Equipo1 vs Equipo2": { g1: x, g2: y } }
let sorteoRealizado = false;
let playoffsData = [];         // [{t1, t2, ganador}]
let bracketData = {};          // datos del bracket final

// --- 2. DOM REFS ---
const container      = document.getElementById("container-equipos");
const modal          = document.getElementById("teamModal");
const modalCard      = document.getElementById("teamModalCard");
const tablaModal     = document.getElementById("tablaModal");
const tablaModalCard = document.getElementById("tablaModalCard");
const audio          = document.getElementById("audioMono");
const audioChampions = document.getElementById("audioChampions");
const sorteoOverlay  = document.getElementById("sorteo-overlay");
const btnSorteo      = document.getElementById("btn-sorteo");
const btnGrupos      = document.getElementById("btn-grupos");
const btnPlayoffs    = document.getElementById("btn-playoffs");
const btnBracket     = document.getElementById("btn-bracket");

// --- 3. SONIDOS ---
document.querySelectorAll('.btn-sonido').forEach(mono => {
    mono.addEventListener('click', () => { audio.currentTime = 0; audio.play(); });
});

// --- 4. RENDER INICIAL DE EQUIPOS ---
function renderEquiposIniciales() {
    container.innerHTML = '';
    container.style.cssText = '';
    equipos.forEach(eq => {
        const card = document.createElement("div");
        card.className = "card-equipo";
        card.innerHTML = `
            <div class="smoke-cover"></div>
            <div class="bombo-badge ${eq.bombo}">BOMBO ${eq.bombo}</div>
            <div class="equipo-content">
                <img src="${eq.logo}" class="equipo-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23333%22/><text x=%2230%22 y=%2235%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22>?</text></svg>'">
                <div class="equipo-data">
                    <div class="nombre-equipo">${eq.nombre}</div>
                    <div class="jugadores-row">
                        ${eq.jugadores.map(j => `<span>👤 ${j}</span>`).join('')}
                    </div>
                </div>
            </div>`;
        card.addEventListener("click", () => card.classList.add("revealed"));
        card.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            abrirModalEquipo(eq);
        });
        container.appendChild(card);
    });
}

function abrirModalEquipo(eq) {
    if (sorteoRealizado) return;
    modalCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:30px">
            <img src="${eq.logo}" style="width:120px; height:120px; object-fit:contain"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23333%22/></svg>'">
            <div>
                <div class="bombo-badge ${eq.bombo}" style="position:static; display:inline-block; margin-bottom:10px">BOMBO ${eq.bombo}</div>
                <h2 style="font-family:'BertholdBlock'; font-size:2rem; margin-bottom:10px">${eq.nombre}</h2>
                <div style="display:flex; flex-direction:column; gap:5px; color:var(--omen-cyan); font-size:1rem">
                    ${eq.jugadores.map(j => `<span>👤 ${j}</span>`).join('')}
                </div>
            </div>
        </div>`;
    modal.classList.add("active");
}

modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });
tablaModal.addEventListener("click", (e) => { if (e.target === tablaModal) tablaModal.classList.remove("active"); });

renderEquiposIniciales();

// ============================================================
// 5. SORTEO ANIMADO
// ============================================================
btnSorteo.onclick = () => {
    iniciarSorteo();
};

function iniciarSorteo() {
    sorteoOverlay.classList.add("active");
    renderBombosVacios();
    setupSorteoLogica();
}

function renderBombosVacios() {
    const grid = document.getElementById("bombos-grid");
    grid.innerHTML = '';
    ['A','B','C','D'].forEach(letra => {
        const col = document.createElement("div");
        col.className = `bombo-col ${letra}`;
        col.id = `bombo-col-${letra}`;
        const info = letra === 'A' || letra === 'B' ? '5 equipos' : '4 equipos';
        const colchon = BOMBOS_CON_COLCHON.includes(letra) ? `<div class="bombo-colchon">⭐ +${COLCHON_PUNTOS} pts de colchón</div>` : '';
        col.innerHTML = `<div class="bombo-col-title">BOMBO ${letra} <span style="font-size:.65rem;opacity:.5">${info}</span></div>${colchon}`;
        grid.appendChild(col);
    });
}

function setupSorteoLogica() {
    // Mezclar equipos aleatoriamente para el sorteo
    const equiposPorBombo = {
        A: [...BOMBOS.A],
        B: [...BOMBOS.B],
        C: [...BOMBOS.C],
        D: [...BOMBOS.D]
    };
    // Resultado final del sorteo (bombos se mantienen, solo animamos la revelación)
    const secuenciaSorteo = [];
    ['A','B','C','D'].forEach(letra => {
        const mezclados = shuffle([...equiposPorBombo[letra]]);
        mezclados.forEach(nombre => secuenciaSorteo.push({ nombre, bombo: letra }));
    });

    let idx = 0;
    const ball = document.getElementById("sorteo-ball");
    const info = document.getElementById("sorteo-info");
    const currentTeam = document.getElementById("sorteo-stage");
    const btnCerrar = document.getElementById("btn-cerrar-sorteo");

    // Añadir elemento de nombre del equipo actual
    let teamNameEl = document.getElementById("sorteo-current-team");
    if (!teamNameEl) {
        teamNameEl = document.createElement("div");
        teamNameEl.id = "sorteo-current-team";
        teamNameEl.className = "sorteo-current-team";
        currentTeam.appendChild(teamNameEl);
    }

    ball.textContent = "▶";
    ball.onclick = () => {
        if (idx >= secuenciaSorteo.length) return;

        const item = secuenciaSorteo[idx];
        const eq = equipos.find(e => e.nombre === item.nombre);

        // Animar bola
        ball.classList.remove("spinning", "reveal-anim");
        ball.textContent = "...";
        ball.classList.add("spinning");

        // Sonido
        try { audio.currentTime = 0; audio.play(); } catch(e) {}

        setTimeout(() => {
            ball.classList.remove("spinning");
            ball.classList.add("reveal-anim");
            ball.textContent = item.bombo;

            info.textContent = `BOMBO ${item.bombo}`;
            teamNameEl.textContent = item.nombre;

            // Añadir chip al bombo correspondiente
            setTimeout(() => {
                const col = document.getElementById(`bombo-col-${item.bombo}`);
                const chip = document.createElement("div");
                chip.className = "bombo-team-chip";
                chip.innerHTML = `<img src="${eq.logo}" onerror="this.style.display='none'"><span>${eq.nombre}</span>`;
                col.appendChild(chip);
                // Animar entrada
                setTimeout(() => chip.classList.add("visible"), 50);
            }, 300);

            idx++;

            if (idx >= secuenciaSorteo.length) {
                ball.textContent = "✓";
                ball.style.cursor = "default";
                ball.onclick = null;
                info.textContent = "SORTEO COMPLETADO";
                teamNameEl.textContent = "";
                btnCerrar.style.display = "block";
            } else {
                setTimeout(() => { ball.classList.remove("reveal-anim"); ball.textContent = "▶"; }, 600);
            }
        }, 800);
    };

    btnCerrar.onclick = () => {
        sorteoOverlay.classList.remove("active");
        sorteoRealizado = true;
        generarCalendario();
        btnSorteo.style.display = 'none';
        btnGrupos.style.display = 'inline-block';
    };
}

// ============================================================
// 6. GENERACIÓN DE CALENDARIO
// ============================================================
function generarCalendario() {
    // Cada equipo juega contra un rival de cada bombo distinto al suyo
    // Los de bombo A y B juegan un partido extra entre ellos
    calendarioGenerado = {};
    resultadosGrupo = {};
    equipos.forEach(e => { calendarioGenerado[e.nombre] = []; });

    // Función helper para registrar partido
    function agregarPartido(n1, n2) {
        const key = clavePartido(n1, n2);
        if (!resultadosGrupo[key]) {
            resultadosGrupo[key] = { g1: '', g2: '' };
            calendarioGenerado[n1].push(n2);
            calendarioGenerado[n2].push(n1);
        }
    }

    // Todos contra todos entre bombos distintos (cruzado)
    const letrasBombo = ['A','B','C','D'];
    for (let i = 0; i < letrasBombo.length; i++) {
        for (let j = i+1; j < letrasBombo.length; j++) {
            const teamsBi = BOMBOS[letrasBombo[i]];
            const teamsBj = BOMBOS[letrasBombo[j]];
            // Cada equipo del bombo i juega contra un equipo del bombo j
            // Emparejamos secuencialmente (rotando) para equilibrar
            const maxLen = Math.max(teamsBi.length, teamsBj.length);
            for (let k = 0; k < Math.min(teamsBi.length, teamsBj.length); k++) {
                agregarPartido(teamsBi[k], teamsBj[k]);
            }
        }
    }

    // Partido extra entre equipos del mismo bombo (solo A y B, que tienen 5)
    ['A','B'].forEach(letra => {
        const teams = shuffle([...BOMBOS[letra]]);
        // Emparejar los 5: 0v1, 2v3, 4 sin rival extra (o 0v4)
        agregarPartido(teams[0], teams[1]);
        agregarPartido(teams[2], teams[3]);
        // El 5º juega contra el primero si no tienen partido
        agregarPartido(teams[4], teams[0]);
    });
}

function clavePartido(n1, n2) {
    return [n1, n2].sort().join(' | ');
}

// ============================================================
// 7. FASE DE GRUPOS
// ============================================================
btnGrupos.onclick = () => {
    mostrarFaseGrupos();
    btnGrupos.style.display = 'none';
    btnPlayoffs.style.display = 'inline-block';

    // Botón flotante de tabla
    let btnTablaFlotante = document.getElementById("btn-tabla-flotante");
    if (!btnTablaFlotante) {
        btnTablaFlotante = document.createElement("button");
        btnTablaFlotante.id = "btn-tabla-flotante";
        btnTablaFlotante.className = "btn-valorant btn-tabla btn-gold";
        btnTablaFlotante.innerHTML = '<span class="btn-content">📊 TABLA</span>';
        btnTablaFlotante.style.display = 'block';
        document.body.appendChild(btnTablaFlotante);
        btnTablaFlotante.onclick = mostrarTablaGeneral;
    }
};

function mostrarFaseGrupos() {
    container.innerHTML = '';

    const wrapper = document.createElement("div");
    wrapper.className = "grupos-wrapper";

    ['A','B','C','D'].forEach(letra => {
        const grupoDiv = document.createElement("div");
        grupoDiv.className = "contenedor-grupo";

        const colorBombo = `var(--bombo-${letra.toLowerCase()})`;
        const esConColchon = BOMBOS_CON_COLCHON.includes(letra);
        const colchonHTML = esConColchon ? `<div class="colchon-banner">⭐ Colchón inicial: +${COLCHON_PUNTOS} puntos</div>` : '';

        grupoDiv.innerHTML = `
            <h2 class="titulo-grupo-header" style="color:${colorBombo}">
                BOMBO ${letra}
                <span>CLIC PARA GESTIONAR PARTIDOS</span>
            </h2>
            ${colchonHTML}
            <div class="lista-interna" id="lista-${letra}"></div>`;

        const lista = grupoDiv.querySelector(`#lista-${letra}`);
        const cardsDelGrupo = [];

        BOMBOS[letra].forEach(nombre => {
            const eq = equipos.find(e => e.nombre === nombre);
            const card = crearCardGrupo(eq);
            lista.appendChild(card);
            cardsDelGrupo.push({ card, eq });
        });

        grupoDiv.querySelector('.titulo-grupo-header').onclick = () => {
            abrirGestionPartidos(letra, cardsDelGrupo, lista);
        };

        wrapper.appendChild(grupoDiv);
        actualizarClasificacion(letra, cardsDelGrupo, lista);
    });

    container.appendChild(wrapper);
}

function crearCardGrupo(eq) {
    const card = document.createElement("div");
    card.className = "card-equipo revealed";
    const numVictorias = calcularVictorias(eq.nombre);
    card.innerHTML = `
        <div class="equipo-content" style="opacity:1">
            <img src="${eq.logo}" class="equipo-logo"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23333%22/></svg>'">
            <div style="flex:1">
                <div class="nombre-equipo">${eq.nombre}</div>
                <div style="font-size:.65rem; color:rgba(255,255,255,0.4); margin-top:2px">BOMBO ${eq.bombo}</div>
            </div>
            <div class="pelotitas-container">
                ${generarPelotitas(eq.nombre)}
            </div>
        </div>`;
    return card;
}

function generarPelotitas(nombreEquipo) {
    const partidos = calendarioGenerado[nombreEquipo] || [];
    const wins = calcularVictorias(nombreEquipo);
    const total = partidos.length;
    let html = '';
    for (let i = 0; i < total; i++) {
        const activo = i < wins ? 'data-estado="1"' : 'data-estado="0"';
        html += `<div class="pelotita" ${activo}></div>`;
    }
    return html;
}

function calcularVictorias(nombre) {
    let wins = 0;
    const rivales = calendarioGenerado[nombre] || [];
    rivales.forEach(rival => {
        const key = clavePartido(nombre, rival);
        const res = resultadosGrupo[key];
        if (!res) return;
        const g1 = parseInt(res.g1) || 0;
        const g2 = parseInt(res.g2) || 0;
        if (g1 === g2 || (g1 === 0 && g2 === 0)) return;
        // Determinar cuál es el "local" en la key
        const [n1] = clavePartido(nombre, rival).split(' | ');
        const esN1 = n1 === nombre;
        if (esN1 && g1 > g2) wins++;
        if (!esN1 && g2 > g1) wins++;
    });
    return wins;
}

function calcularPuntosTabla(nombre) {
    const bombo = equipos.find(e => e.nombre === nombre)?.bombo;
    const colchon = BOMBOS_CON_COLCHON.includes(bombo) ? COLCHON_PUNTOS : 0;
    return calcularVictorias(nombre) * 3 + colchon;
}

function calcularDiferencia(nombre) {
    let diff = 0;
    const rivales = calendarioGenerado[nombre] || [];
    rivales.forEach(rival => {
        const key = clavePartido(nombre, rival);
        const res = resultadosGrupo[key];
        if (!res) return;
        const g1 = parseInt(res.g1) || 0;
        const g2 = parseInt(res.g2) || 0;
        const [n1] = key.split(' | ');
        const esN1 = n1 === nombre;
        diff += esN1 ? (g1 - g2) : (g2 - g1);
    });
    return diff;
}

function actualizarClasificacion(letra, cardsDelGrupo, lista) {
    const stats = cardsDelGrupo.map(({ card, eq }) => ({
        card, eq,
        pts: calcularPuntosTabla(eq.nombre),
        wins: calcularVictorias(eq.nombre),
        diff: calcularDiferencia(eq.nombre)
    }));
    stats.sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.diff - a.diff);
    stats.forEach(({ card, eq, wins }) => {
        lista.appendChild(card);
        const pelotitas = card.querySelectorAll('.pelotita');
        pelotitas.forEach((p, i) => { p.dataset.estado = i < wins ? "1" : "0"; });
    });
}

// --- Gestión de partidos del grupo ---
function abrirGestionPartidos(letra, cardsDelGrupo, lista) {
    const equiposDelBombo = BOMBOS[letra].map(n => equipos.find(e => e.nombre === n));

    // Recoger todos los partidos de este bombo
    const partidos = [];
    const vistos = new Set();
    equiposDelBombo.forEach(eq => {
        (calendarioGenerado[eq.nombre] || []).forEach(rival => {
            const key = clavePartido(eq.nombre, rival);
            if (!vistos.has(key)) {
                vistos.add(key);
                // Solo mostrar si ambos son del mismo bombo (partido extra)
                // o si el rival no es del mismo bombo
                partidos.push({ key, n1: key.split(' | ')[0], n2: key.split(' | ')[1] });
            }
        });
    });

    // Filtrar: mostrar partidos donde AL MENOS uno es de este bombo
    const partidosBombo = partidos.filter(p => {
        const e1 = equipos.find(e => e.nombre === p.n1);
        const e2 = equipos.find(e => e.nombre === p.n2);
        return e1?.bombo === letra || e2?.bombo === letra;
    });

    const getEq = n => equipos.find(e => e.nombre === n);

    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:15px; font-size:1.5rem">
            BOMBO ${letra} — PARTIDOS
        </h2>
        <div id="partidos-lista">
        ${partidosBombo.map(p => {
            const e1 = getEq(p.n1), e2 = getEq(p.n2);
            const res = resultadosGrupo[p.key] || { g1: '', g2: '' };
            return `
            <div class="partido-row" data-key="${p.key}">
                <img src="${e1?.logo}" onerror="this.style.display='none'">
                <span style="font-size:.75rem">${p.n1}</span>
                <input type="number" class="in-g1" value="${res.g1}" min="0" placeholder="0">
                <span style="color:var(--omen-purple); font-family:'BertholdBlock'">-</span>
                <input type="number" class="in-g2" value="${res.g2}" min="0" placeholder="0">
                <span style="font-size:.75rem; text-align:right">${p.n2}</span>
                <img src="${e2?.logo}" onerror="this.style.display='none'">
            </div>`;
        }).join('')}
        </div>
        <button class="btn-valorant" id="sv-partidos" style="width:100%; margin-top:15px"><span class="btn-content">GUARDAR RESULTADOS</span></button>`;

    modal.classList.add("active");

    document.getElementById("sv-partidos").onclick = () => {
        document.querySelectorAll('#partidos-lista .partido-row').forEach(row => {
            const key = row.dataset.key;
            const g1 = row.querySelector('.in-g1').value;
            const g2 = row.querySelector('.in-g2').value;
            resultadosGrupo[key] = { g1, g2 };
        });
        actualizarClasificacion(letra, cardsDelGrupo, lista);
        // Refrescar pelotitas
        cardsDelGrupo.forEach(({ card, eq }) => {
            const wins = calcularVictorias(eq.nombre);
            card.querySelectorAll('.pelotita').forEach((p, i) => {
                p.dataset.estado = i < wins ? "1" : "0";
            });
        });
        modal.classList.remove("active");
    };
}

// ============================================================
// 8. TABLA GENERAL
// ============================================================
function mostrarTablaGeneral() {
    const ranking = equipos.map(eq => ({
        eq,
        pts: calcularPuntosTabla(eq.nombre),
        wins: calcularVictorias(eq.nombre),
        diff: calcularDiferencia(eq.nombre),
        jugados: (calendarioGenerado[eq.nombre] || []).length
    })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.diff - a.diff);

    const zonaTag = (pos) => {
        if (pos <= 6)  return '<span class="zona-tag direct">DIRECTO</span>';
        if (pos <= 14) return '<span class="zona-tag playoff">PLAYOFF</span>';
        return '<span class="zona-tag elim">ELIMINADO</span>';
    };

    const zonaClass = (pos) => {
        if (pos <= 6)  return 'tabla-zona-top';
        if (pos <= 14) return 'tabla-zona-playoff';
        return 'tabla-zona-elim';
    };

    tablaModalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px; font-size:1.8rem; letter-spacing:4px">
            TABLA GENERAL
        </h2>
        <div style="font-size:.7rem; color:rgba(255,255,255,0.4); text-align:center; margin-bottom:15px">
            ⭐ Bombos C y D incluyen ${COLCHON_PUNTOS} puntos de colchón
        </div>
        <table class="tabla-general">
            <thead>
                <tr>
                    <th>#</th>
                    <th>EQUIPO</th>
                    <th>B</th>
                    <th>PJ</th>
                    <th>V</th>
                    <th>PTS</th>
                    <th>DIF</th>
                    <th>ZONA</th>
                </tr>
            </thead>
            <tbody>
                ${ranking.map((r, i) => {
                    const pos = i + 1;
                    const colchon = BOMBOS_CON_COLCHON.includes(r.eq.bombo) ? `<span class="colchon-pts">(+${COLCHON_PUNTOS})</span>` : '';
                    return `<tr class="${zonaClass(pos)}">
                        <td class="pos">${pos}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px">
                                <img src="${r.eq.logo}" style="width:24px; height:24px; object-fit:contain" onerror="this.style.display='none'">
                                <span style="font-size:.8rem">${r.eq.nombre}</span>
                            </div>
                        </td>
                        <td><span class="bombo-badge ${r.eq.bombo}" style="position:static; display:inline-block; font-size:.55rem; padding:1px 5px">${r.eq.bombo}</span></td>
                        <td style="text-align:center">${r.jugados}</td>
                        <td style="text-align:center">${r.wins}</td>
                        <td style="text-align:center; font-family:'BertholdBlock'">${r.pts} ${colchon}</td>
                        <td style="text-align:center; color:${r.diff >= 0 ? '#00ff88' : '#ff4655'}">${r.diff > 0 ? '+' : ''}${r.diff}</td>
                        <td>${zonaTag(pos)}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        <div style="display:flex; gap:15px; justify-content:center; margin-top:20px; font-size:.7rem; flex-wrap:wrap">
            <span><span class="zona-tag direct">DIRECTO</span> Top 6 → Cuartos</span>
            <span><span class="zona-tag playoff">PLAYOFF</span> 7º-14º → Playoff previo</span>
            <span><span class="zona-tag elim">ELIMINADO</span> 15º-18º → Fuera</span>
        </div>`;

    tablaModal.classList.add("active");
}

// ============================================================
// 9. FASE DE PLAYOFFS (7º al 14º)
// ============================================================
btnPlayoffs.onclick = () => {
    mostrarPlayoffs();
    btnPlayoffs.style.display = 'none';
    btnBracket.style.display = 'inline-block';
};

function getRanking() {
    return equipos.map(eq => ({
        eq,
        pts: calcularPuntosTabla(eq.nombre),
        wins: calcularVictorias(eq.nombre),
        diff: calcularDiferencia(eq.nombre)
    })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.diff - a.diff);
}

function mostrarPlayoffs() {
    container.innerHTML = '';
    document.getElementById("btn-tabla-flotante")?.remove();

    const ranking = getRanking();
    // 7º al 14º son índices 6 a 13
    const zonaPlayoff = ranking.slice(6, 14);

    // Emparejamientos: 7ºvs14º, 8ºvs13º, 9ºvs12º, 10ºvs11º
    const cruces = [
        { t1: zonaPlayoff[0], t2: zonaPlayoff[7], seed1: 7,  seed2: 14 },
        { t1: zonaPlayoff[1], t2: zonaPlayoff[6], seed1: 8,  seed2: 13 },
        { t1: zonaPlayoff[2], t2: zonaPlayoff[5], seed1: 9,  seed2: 12 },
        { t1: zonaPlayoff[3], t2: zonaPlayoff[4], seed1: 10, seed2: 11 },
    ];

    playoffsData = cruces.map(c => ({
        t1: c.t1.eq, t2: c.t2.eq,
        seed1: c.seed1, seed2: c.seed2,
        ganador: null
    }));

    const wrapper = document.createElement("div");
    wrapper.className = "playoffs-wrapper";
    wrapper.innerHTML = `
        <h2 class="playoffs-title">FASE PLAYOFF</h2>
        <div style="font-size:.75rem; text-align:center; color:rgba(255,255,255,0.4); margin-bottom:20px">
            Doble clic en un partido para introducir resultado
        </div>
        <div class="playoffs-grid" id="playoffs-grid"></div>`;

    const grid = wrapper.querySelector('#playoffs-grid');
    playoffsData.forEach((pd, i) => {
        const matchEl = crearMatchPlayoff(pd, i);
        grid.appendChild(matchEl);
    });

    container.appendChild(wrapper);
}

function crearMatchPlayoff(pd, idx) {
    const el = document.createElement("div");
    el.className = "playoff-match";
    el.id = `playoff-${idx}`;
    renderMatchPlayoffHTML(el, pd);
    el.ondblclick = () => abrirModalPlayoff(idx);
    return el;
}

function renderMatchPlayoffHTML(el, pd) {
    const ganadorNombre = pd.ganador?.nombre;
    const t1Loser = ganadorNombre && ganadorNombre !== pd.t1.nombre;
    const t2Loser = ganadorNombre && ganadorNombre !== pd.t2.nombre;

    el.innerHTML = `
        <div class="playoff-team ${t1Loser ? 'loser' : ''}">
            <div>
                <div class="playoff-seed">#${pd.seed1}</div>
                <img src="${pd.t1.logo}" onerror="this.style.display='none'">
            </div>
            <span>${pd.t1.nombre}</span>
        </div>
        <div class="playoff-vs">VS</div>
        <div class="playoff-team ${t2Loser ? 'loser' : ''}" style="flex-direction:row-reverse; text-align:right">
            <div>
                <div class="playoff-seed">#${pd.seed2}</div>
                <img src="${pd.t2.logo}" onerror="this.style.display='none'">
            </div>
            <span>${pd.t2.nombre}</span>
        </div>
        ${pd.ganador ? `<div class="playoff-result">✓</div>` : '<div class="playoff-result" style="color:rgba(255,255,255,0.2)">—</div>'}`;
}

function abrirModalPlayoff(idx) {
    const pd = playoffsData[idx];
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px">
            PLAYOFF — #${pd.seed1} vs #${pd.seed2}
        </h2>
        <div class="fila-partido">
            <div style="text-align:center">
                <img src="${pd.t1.logo}" style="width:80px; height:80px; object-fit:contain" onerror="this.style.display='none'">
                <div style="font-family:'BertholdBlock'; font-size:.85rem; margin-top:5px">${pd.t1.nombre}</div>
            </div>
            <input type="number" id="pl-sc1" class="input-score" value="${pd.sc1 || ''}" min="0" placeholder="0">
            <span style="font-size:2.5rem; font-family:'BertholdBlock'; color:var(--omen-purple)">-</span>
            <input type="number" id="pl-sc2" class="input-score" value="${pd.sc2 || ''}" min="0" placeholder="0">
            <div style="text-align:center">
                <img src="${pd.t2.logo}" style="width:80px; height:80px; object-fit:contain" onerror="this.style.display='none'">
                <div style="font-family:'BertholdBlock'; font-size:.85rem; margin-top:5px">${pd.t2.nombre}</div>
            </div>
        </div>
        <button class="btn-valorant" id="save-playoff" style="width:100%"><span class="btn-content">CONFIRMAR GANADOR</span></button>`;

    modal.classList.add("active");

    document.getElementById("save-playoff").onclick = () => {
        const s1 = parseInt(document.getElementById("pl-sc1").value) || 0;
        const s2 = parseInt(document.getElementById("pl-sc2").value) || 0;
        if (s1 === s2) { alert("No puede haber empate."); return; }

        pd.sc1 = s1; pd.sc2 = s2;
        pd.ganador = s1 > s2 ? pd.t1 : pd.t2;

        const el = document.getElementById(`playoff-${idx}`);
        renderMatchPlayoffHTML(el, pd);
        el.classList.add("done");

        modal.classList.remove("active");
    };
}

// ============================================================
// 10. FASE FINAL — BRACKET (Cuartos, Semis, Final)
// ============================================================
btnBracket.onclick = () => {
    mostrarBracket();
    btnBracket.style.display = 'none';
};

function mostrarBracket() {
    container.innerHTML = '';
    const ranking = getRanking();

    // Top 6 directos (índices 0-5)
    const top6 = ranking.slice(0, 6).map(r => r.eq);
    // Ganadores de playoffs (4 equipos)
    const ganadoresPlayoff = playoffsData.map(pd => pd.ganador || { nombre: 'TBD', logo: '' });

    // 10 equipos en cuartos de final
    // Top 6 tienen bye (esperan en semis/cuartos según orden)
    // Organización: 
    // - 4 partidos de cuartos: ganadores playoff vs peores del top6
    //   QF1: Ganador PO1 vs #6 | QF2: Ganador PO2 vs #5
    //   QF3: Ganador PO3 vs #4 | QF4: Ganador PO4 vs #3
    // - #1, #2 esperan en Semis (bye directo)

    bracketData = {
        cuartos: [
            { t1: ganadoresPlayoff[0], t2: top6[5], ganador: null, id: 'qf0' },
            { t1: ganadoresPlayoff[1], t2: top6[4], ganador: null, id: 'qf1' },
            { t1: ganadoresPlayoff[2], t2: top6[3], ganador: null, id: 'qf2' },
            { t1: ganadoresPlayoff[3], t2: top6[2], ganador: null, id: 'qf3' },
        ],
        semis: [
            { t1: top6[0], t2: { nombre: 'TBD', logo: '' }, ganador: null, id: 'sf0', byeT1: true },
            { t1: top6[1], t2: { nombre: 'TBD', logo: '' }, ganador: null, id: 'sf1', byeT1: true },
            { t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, ganador: null, id: 'sf2' },
            { t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, ganador: null, id: 'sf3' },
        ],
        final: [
            { t1: { nombre: 'TBD', logo: '' }, t2: { nombre: 'TBD', logo: '' }, ganador: null, id: 'fn0' }
        ]
    };

    // Semis: #1 espera ganador QF0, #2 espera ganador QF1, luego QF2 vs QF3
    // -> SF0: #1 vs W(QF0), SF1: #2 vs W(QF1), SF2: W(QF2) vs W(QF3)
    // -> Final: W(SF0) vs W(SF1), W(SF2) vs W(SF3) — en realidad semis son 4, final 2

    renderBracket();
}

function renderBracket() {
    container.innerHTML = '';

    const scroll = document.createElement("div");
    scroll.className = "bracket-scroll";

    const bc = document.createElement("div");
    bc.className = "bracket-container";

    // Columna Cuartos
    bc.appendChild(crearColumnaBracket("CUARTOS", bracketData.cuartos, 'qf'));
    // Columna Semis
    bc.appendChild(crearColumnaBracket("SEMIS", bracketData.semis, 'sf'));
    // Columna Final
    bc.appendChild(crearColumnaBracket("FINAL", bracketData.final, 'fn'));

    scroll.appendChild(bc);
    container.appendChild(scroll);
}

function crearColumnaBracket(titulo, partidos, prefix) {
    const col = document.createElement("div");
    col.className = "bracket-column";
    col.id = `col-${prefix}`;

    const tit = document.createElement("div");
    tit.className = "bracket-col-title";
    tit.textContent = titulo;
    col.appendChild(tit);

    partidos.forEach((p, i) => {
        const box = crearMatchBox(p, prefix, i);
        col.appendChild(box);
    });

    return col;
}

function crearMatchBox(p, prefix, idx) {
    const box = document.createElement("div");
    box.className = "match-box";
    box.id = `match-${p.id}`;

    const esTBD = p.t1.nombre === 'TBD' || p.t2.nombre === 'TBD';
    if (esTBD) box.classList.add("tbd");

    renderMatchBoxHTML(box, p);

    if (!esTBD) {
        box.ondblclick = () => abrirModalBracket(p, prefix, idx);
    }

    return box;
}

function renderMatchBoxHTML(box, p) {
    const ganadorNombre = p.ganador?.nombre;
    const t1Loser = ganadorNombre && ganadorNombre !== p.t1.nombre;
    const t2Loser = ganadorNombre && ganadorNombre !== p.t2.nombre;

    const teamRow = (eq, loser) => {
        const imgHTML = eq.logo
            ? `<img src="${eq.logo}" onerror="this.style.display='none'">`
            : `<div style="width:30px; height:30px; background:#222; border-radius:4px"></div>`;
        return `<div class="match-team-row ${loser ? 'team-perdedor' : ''}">
            ${imgHTML}
            <span>${eq.nombre}</span>
        </div>`;
    };

    box.innerHTML = `
        ${teamRow(p.t1, t1Loser)}
        <div class="vs-line"></div>
        ${teamRow(p.t2, t2Loser)}
        ${p.sc1 !== undefined ? `<div style="text-align:center; font-size:.65rem; color:var(--omen-purple); margin-top:5px; font-family:'BertholdBlock'">${p.sc1} — ${p.sc2}</div>` : ''}`;
}

function abrirModalBracket(p, prefix, idx) {
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px">
            ${['qf','sf'].includes(prefix) ? (prefix === 'qf' ? 'CUARTOS' : 'SEMIFINAL') : 'GRAN FINAL'}
        </h2>
        <div class="fila-partido">
            <div style="text-align:center">
                <img src="${p.t1.logo}" style="width:80px; height:80px; object-fit:contain" onerror="this.style.display='none'">
                <div style="font-family:'BertholdBlock'; font-size:.85rem; margin-top:5px">${p.t1.nombre}</div>
            </div>
            <input type="number" id="bk-sc1" class="input-score" value="${p.sc1 !== undefined ? p.sc1 : ''}" min="0" placeholder="0">
            <span style="font-size:2.5rem; font-family:'BertholdBlock'; color:var(--omen-purple)">-</span>
            <input type="number" id="bk-sc2" class="input-score" value="${p.sc2 !== undefined ? p.sc2 : ''}" min="0" placeholder="0">
            <div style="text-align:center">
                <img src="${p.t2.logo}" style="width:80px; height:80px; object-fit:contain" onerror="this.style.display='none'">
                <div style="font-family:'BertholdBlock'; font-size:.85rem; margin-top:5px">${p.t2.nombre}</div>
            </div>
        </div>
        <button class="btn-valorant" id="save-bracket" style="width:100%"><span class="btn-content">CONFIRMAR RESULTADO</span></button>`;

    modal.classList.add("active");

    document.getElementById("save-bracket").onclick = () => {
        const s1 = parseInt(document.getElementById("bk-sc1").value);
        const s2 = parseInt(document.getElementById("bk-sc2").value);
        if (isNaN(s1) || isNaN(s2) || s1 === s2) { alert("Introduce un resultado válido (sin empate)."); return; }

        p.sc1 = s1; p.sc2 = s2;
        p.ganador = s1 > s2 ? p.t1 : p.t2;
        p.perdedor = s1 > s2 ? p.t2 : p.t1;

        // Avanzar ganador
        avanzarGanadorBracket(p, prefix, idx);

        const box = document.getElementById(`match-${p.id}`);
        renderMatchBoxHTML(box, p);

        modal.classList.remove("active");

        // ¿Es la final?
        if (prefix === 'fn') {
            setTimeout(() => mostrarCampeon(p.ganador.nombre, p.ganador.logo), 500);
        }
    };
}

function avanzarGanadorBracket(p, prefix, idx) {
    const ganador = p.ganador;

    if (prefix === 'qf') {
        // QF0 ganador → SF0 t2, QF1 → SF1 t2, QF2 → SF2 t1, QF3 → SF2 t2
        const mapeo = { 0: ['sf',0,'t2'], 1: ['sf',1,'t2'], 2: ['sf',2,'t1'], 3: ['sf',2,'t2'] };
        const [destPrefix, destIdx, destTeam] = mapeo[idx];
        bracketData.semis[destIdx][destTeam] = ganador;
        actualizarMatchBox('sf', destIdx);
    } else if (prefix === 'sf') {
        // SF0 → Final t1, SF1 → Final t2, SF2 → Final extra (si hay más de 2 semis)
        // Con 4 semis: SF0 vs SF1 → Final t1/t2, SF2 no tiene más (bracket de 10)
        // Simplificando: 
        // SF0 ganador → Final t1
        // SF1 ganador → Final t2
        const mapeo = { 0: 't1', 1: 't2', 2: null, 3: null };
        const dest = mapeo[idx];
        if (dest) {
            bracketData.final[0][dest] = ganador;
            actualizarMatchBox('fn', 0);
        }
    }
}

function actualizarMatchBox(prefix, idx) {
    const partidos = prefix === 'qf' ? bracketData.cuartos : prefix === 'sf' ? bracketData.semis : bracketData.final;
    const p = partidos[idx];
    const box = document.getElementById(`match-${p.id}`);
    if (!box) return;

    renderMatchBoxHTML(box, p);
    const esTBD = p.t1.nombre === 'TBD' || p.t2.nombre === 'TBD';
    if (!esTBD) {
        box.classList.remove("tbd");
        box.ondblclick = () => abrirModalBracket(p, prefix, idx);
    }
}

// ============================================================
// 11. PANTALLA CAMPEÓN
// ============================================================
function mostrarCampeon(nombre, logo) {
    const overlay = document.createElement('div');
    overlay.className = 'champion-overlay';
    overlay.innerHTML = `
        <h1 class="champion-title">¡CAMPEÓN VOL. II!</h1>
        <img src="${logo}" class="champion-logo" onerror="this.style.display='none'">
        <h2 class="champion-name">${nombre}</h2>
        <button class="btn-valorant" onclick="location.reload()" style="margin-top: 50px;">
            <span class="btn-content">FINALIZAR TORNEO</span>
        </button>`;
    document.body.appendChild(overlay);

    if (audioChampions) { audioChampions.currentTime = 0; audioChampions.play(); }
    setTimeout(() => overlay.classList.add('active'), 100);
}

// ============================================================
// 12. UTILS
// ============================================================
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
