// ================================================================
// COPA PRIMATE VOL. II - REALTIME WITH ABLY
// ================================================================

// !!! CONFIGURACIÓN DE ABLY !!!
// Pega aquí tu clave Root real de Ably
const ABLY_API_KEY = 'ngPWJA.-sqsQQ:zUVSXMBliVDlh2zkgBvKFF2JEPi4dCOlAQRzMX_md4E';

// --- LÓGICA DE MULTISALA (ROOMS) Y ROLES ---
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');

// Si no hay sala, generamos una aleatoria y recargamos
if (!roomId) {
    roomId = 'primate_' + Math.random().toString(36).substring(2, 7);
    urlParams.set('room', roomId);
    
    // TRUCO PARA EVITAR QUE FALLE EN LOCAL (file://) O VERCEL:
    try {
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    } catch (e) {
        console.warn("Aviso: Trabajando en modo archivo local. Sala asignada: " + roomId);
    }
}

// Comprobar si es un overlay/espectador
const isSpectator = urlParams.get('view') === 'spectator';

// Inicializar conexión con Ably
const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const channel = ably.channels.get(`copa_primate_${roomId}`);

// --- EQUIPOS Y GRUPOS ---
const GRUPOS = {
    A: [
        { nombre: "Rose Devil",      jugadores: ["Tony","Jokker","TBD"],             logo: "logo1.png"  },
        { nombre: "Golden Sex",      jugadores: ["Max","Broken","TBD"],              logo: "logo2.png"  },
        { nombre: "Crimson Eclipse", jugadores: ["ReyFhantom","zNyrex","TBD"],       logo: "logo5.png"  },
        { nombre: "GOATS",           jugadores: ["Mica","Marco","TBD"],              logo: "logo12.png" },
    ],
    B: [
        { nombre: "Los Akrtona2",    jugadores: ["S3R4X","MasterKira","TBD"],        logo: "logo4.png"  },
        { nombre: "Bloody Fruit",    jugadores: ["MrPain 神","Sandiass21","TBD"],    logo: "logo7.png"  },
        { nombre: "SPIDYBOOBS",      jugadores: ["Sama","Potro","TBD"],              logo: "logo14.png" },
        { nombre: "MUGIWARAS",       jugadores: ["Andreloregon","Jess","TBD"],       logo: "logo15.png" },
    ],
    C: [
        { nombre: "TETONES",         jugadores: ["Marrkitosss","Davv","TBD"],        logo: "logo11.png" },
        { nombre: "Al-dedillo VC",   jugadores: ["Xolo","Noavae","TBD"],             logo: "logo3.png"  },
        { nombre: "Konoha Makaca",   jugadores: ["MakaQuillo","MakaIsla","TBD"],     logo: "logo9.png"  },
        { nombre: "Hijas del Kaos",  jugadores: ["Satha","Kaos","TBD"],              logo: "logo8.png"  },
    ],
    D: [
        { nombre: "Makaco NinjaPelocho", jugadores: ["Iker","Adri","TBD"],           logo: "logo6.png"  },
        { nombre: "Miaus",           jugadores: ["Kae","Wilson","TBD"],              logo: "logo13.png" },
        { nombre: "Team Obrikat",    jugadores: ["JettDiffs","EGOFack","TBD"],       logo: "logo10.png" },
        { nombre: "Los Simios FC",   jugadores: ["Primate1","Primate2","Primate3"],  logo: "logo16.png" },
    ]
};

const equipos = Object.entries(GRUPOS).flatMap(([g, lista]) => lista.map(e => ({ ...e, grupo: g })));
const getEq = nombre => equipos.find(e => e.nombre === nombre);
const letras = ['A','B','C','D'];

// Variables de Estado de la app
let estadoApp = {
    faseActual: 'inicial', // inicial, liga, playoffs, bracket
    jornadas: [[], [], [], []],
    calendario: [],
    resultados: {},
    playoffsData: [],
    bracketData: null,
    idx_sorteo: 0,
    sorteoCompletado: false
};

// ----------------------------------------------------------------
// DOM ELEMENTS
// ----------------------------------------------------------------
const container     = document.getElementById('container-equipos');
const modal         = document.getElementById('teamModal');
const modalCard     = document.getElementById('teamModalCard');
const tablaModal    = document.getElementById('tablaModal');
const tablaCard     = document.getElementById('tablaModalCard');
const btnSorteo     = document.getElementById('btn-sorteo');
const btnLiga       = document.getElementById('btn-liga');
const btnPlayoffs   = document.getElementById('btn-playoffs');
const btnBracket    = document.getElementById('btn-bracket');
const sorteoOverlay = document.getElementById('sorteo-overlay');
const audioMono     = document.getElementById('audioMono');
const audioChamp    = document.getElementById('audioChampions');

// Ocultar controles si es espectador de forma agresiva
if (isSpectator) {
    const footer = document.getElementById('footer-controls');
    if(footer) footer.style.display = 'none';
} else {
    if(modal) modal.addEventListener('click', e => { if(e.target===modal) modal.classList.remove('active'); });
    if(tablaModal) tablaModal.addEventListener('click', e => { if(e.target===tablaModal) tablaModal.classList.remove('active'); });
    document.querySelectorAll('.btn-sonido').forEach(m => m.addEventListener('click', () => { 
        publicarSonido();
    }));
}

// ----------------------------------------------------------------
// SINCRONIZACIÓN EN TIEMPO REAL - ENVÍOS (BROADCAST)
// ----------------------------------------------------------------
function guardarEstadoLocal() {
    try {
        localStorage.setItem('copa_primate_estado_' + roomId, JSON.stringify(estadoApp));
    } catch(e) {
        console.warn('No se pudo guardar en localStorage:', e);
    }
}

function cargarEstadoLocal() {
    try {
        const guardado = localStorage.getItem('copa_primate_estado_' + roomId);
        if (guardado) {
            estadoApp = JSON.parse(guardado);
            console.log('Estado restaurado desde localStorage ✓');
            return true;
        }
    } catch(e) {
        console.warn('No se pudo cargar localStorage:', e);
    }
    return false;
}

function enviarEstado() {
    if (isSpectator) return;
    guardarEstadoLocal();
    channel.publish('cambio_estado', estadoApp);
}

function publicarSonido() {
    if (isSpectator) return;
    channel.publish('reproducir_sonido', { tipo: 'mono' });
}

// ----------------------------------------------------------------
// RECEPCIÓN DE DATOS EN TIEMPO REAL (SUBSCRIBE)
// ----------------------------------------------------------------
channel.subscribe('cambio_estado', (message) => {
    estadoApp = message.data;
    procesarCambioEstado();
});

channel.subscribe('reproducir_sonido', (message) => {
    if (message.data.tipo === 'mono' && audioMono) {
        audioMono.currentTime = 0;
        audioMono.play().catch(e => console.log("Interacción requerida para audio"));
    }
    if (message.data.tipo === 'champions' && audioChamp) {
        audioChamp.currentTime = 0;
        audioChamp.play().catch(e => console.log("Interacción requerida para audio"));
    }
});

// Forzar petición de estado al entrar si somos espectadores
channel.presence.enter();

// El admin reenvía estado cada vez que alguien nuevo entra al canal
channel.presence.subscribe('enter', () => {
    if (!isSpectator) {
        setTimeout(() => enviarEstado(), 500);
    }
});

channel.subscribe('pedir_estado', () => {
    if (!isSpectator) enviarEstado();
});

// ----------------------------------------------------------------
// MÁQUINA DE ESTADOS VISUAL
// ----------------------------------------------------------------
function procesarCambioEstado() {
    // Cerrar overlays innecesarios dinámicamente si cambió de fase
    if (estadoApp.faseActual !== 'inicial' && sorteoOverlay) {
        sorteoOverlay.classList.remove('active');
    }

    // Gestionar botones del administrador dinámicamente
    if (!isSpectator) {
        if(btnSorteo) btnSorteo.style.display = estadoApp.faseActual === 'inicial' ? 'inline-block' : 'none';
        if(btnLiga) btnLiga.style.display = (estadoApp.faseActual === 'inicial' && estadoApp.sorteoCompletado) ? 'inline-block' : 'none';
        if(btnPlayoffs) btnPlayoffs.style.display = estadoApp.faseActual === 'liga' ? 'inline-block' : 'none';
        if(btnBracket) btnBracket.style.display = estadoApp.faseActual === 'playoffs' ? 'inline-block' : 'none';
        
        let tf = document.getElementById('btn-tabla-flotante');
        if (estadoApp.sorteoCompletado && estadoApp.faseActual === 'inicial') {
            if(!tf) {
                tf = document.createElement('button');
                tf.id = 'btn-tabla-flotante';
                tf.className = 'btn-valorant btn-gold';
                tf.innerHTML = '<span class="btn-content">📊 TABLA</span>';
                document.body.appendChild(tf);
                tf.addEventListener('click', mostrarTabla);
            }
            tf.style.display = 'block';
        } else if (tf) {
            tf.style.display = 'none';
        }
    }

    // Dibujar pantalla correcta según estado
    switch (estadoApp.faseActual) {
        case 'inicial':
            renderInicial();
            if (estadoApp.idx_sorteo > 0) {
                if(sorteoOverlay) sorteoOverlay.classList.add('active');
                reconstruirPantallaSorteo();
            }
            break;
        case 'liga':
            actualizarVistaLiga();
            break;
        case 'playoffs':
            actualizarVistaPlayoffs();
            break;
        case 'bracket':
            actualizarVistaBracket();
            break;
    }
}

// ----------------------------------------------------------------
// RENDER INICIAL
// ----------------------------------------------------------------
function renderInicial() {
    if(!container) return;
    container.innerHTML = '';
    container.style.cssText = '';
    equipos.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'card-equipo';
        card.innerHTML = `
            <div class="smoke-cover"></div>
            <div class="grupo-badge ${eq.grupo}">GRUPO ${eq.grupo}</div>
            <div class="equipo-content">
                <img src="${eq.logo}" class="equipo-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22><rect width=%2255%22 height=%2255%22 rx=%228%22 fill=%22%23222%22/><text x=%2227%22 y=%2233%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>?</text></svg>'">
                <div>
                    <div class="nombre-equipo">${eq.nombre}</div>
                    <div class="jugadores-row">${eq.jugadores.map(j=>`<span>👤 ${j}</span>`).join('')}</div>
                </div>
            </div>`;
        
        if (!isSpectator) {
            card.addEventListener('click', () => {
                card.classList.add('revealed');
            });
        }
        container.appendChild(card);
    });
}

// ----------------------------------------------------------------
// ACCIONES DEL ADMINISTRADOR (BOTONES CLICK)
// ----------------------------------------------------------------
if (!isSpectator) {
    if(btnSorteo) btnSorteo.addEventListener('click', () => {
        estadoApp.faseActual = 'inicial';
        prepararSorteo();
        enviarEstado();
    });

    if(btnLiga) btnLiga.addEventListener('click', () => {
        estadoApp.faseActual = 'liga';
        enviarEstado();
    });

    if(btnPlayoffs) btnPlayoffs.addEventListener('click', () => {
        estadoApp.faseActual = 'playoffs';
        generarEstructuraPlayoffs();
        enviarEstado();
    });

    if(btnBracket) btnBracket.addEventListener('click', () => {
        estadoApp.faseActual = 'bracket';
        generarEstructuraBracket();
        enviarEstado();
    });

    const btnCerrarSorteo = document.getElementById('btn-cerrar-sorteo');
    if(btnCerrarSorteo) btnCerrarSorteo.addEventListener('click', () => {
        estadoApp.sorteoCompletado = true;
        if(sorteoOverlay) sorteoOverlay.classList.remove('active');
        enviarEstado();
    });
}

// ----------------------------------------------------------------
// CONTROL DEL SORTEO
// ----------------------------------------------------------------
function prepararSorteo() {
    estadoApp.idx_sorteo = 0;
    estadoApp.sorteoCompletado = false;
    
    let jornadasGeneradas = generarJornadas();
    estadoApp.jornadas = jornadasGeneradas;
    estadoApp.calendario = jornadasGeneradas.flat();
    
    estadoApp.resultados = {};
    estadoApp.calendario.forEach(p => {
        estadoApp.resultados[clave(p.t1, p.t2)] = { s1: '', s2: '' };
    });

    reconstruirPantallaSorteo();
}

function reconstruirPantallaSorteo() {
    const display = document.getElementById('sorteo-grupos-display');
    if(!display) return;
    display.innerHTML = '';
    letras.forEach(g => {
        const col = document.createElement('div');
        col.className = `sg-col ${g}`;
        col.innerHTML = `<div class="sg-col-title">GRUPO ${g}</div>`;
        GRUPOS[g].forEach(eq => {
            const chip = document.createElement('div');
            chip.className = 'sg-team';
            chip.id = `sg-team-${eq.nombre.replace(/\s/g,'_')}`;
            chip.innerHTML = `<img src="${eq.logo}" onerror="this.style.display='none'"><span>${eq.nombre}</span>`;
            col.appendChild(chip);
        });
        display.appendChild(col);
    });

    for(let j=0;j<4;j++){
        const sj = document.getElementById(`sj-${j}`);
        if(sj) sj.innerHTML = `<div class="sj-title">JORNADA ${j+1}</div>`;
    }

    for(let i=0; i<estadoApp.idx_sorteo; i++) {
        let jActual = 0;
        let totalJ0 = estadoApp.jornadas[0].length;
        let totalJ1 = totalJ0 + estadoApp.jornadas[1].length;
        let totalJ2 = totalJ1 + estadoApp.jornadas[2].length;
        
        if(i < totalJ0) jActual = 0;
        else if(i < totalJ1) jActual = 1;
        else if(i < totalJ2) jActual = 2;
        else jActual = 3;

        const match = estadoApp.calendario[i];
        const eq1 = getEq(match.t1);
        const eq2 = getEq(match.t2);
        
        const sjCol = document.getElementById(`sj-${jActual}`);
        if(!sjCol) continue;
        const chip = document.createElement('div');
        chip.className = 'sj-match visible';
        chip.innerHTML = `
            <img src="${eq1.logo}" onerror="this.style.display='none'">
            <span>${match.t1}</span><span class="sj-vs">VS</span><span>${match.t2}</span>
            <img src="${eq2.logo}" onerror="this.style.display='none'">`;
        sjCol.appendChild(chip);
    }

    const ball = document.getElementById('sorteo-ball');
    const infoEl = document.getElementById('sorteo-info');
    const revealEl = document.getElementById('sorteo-match-reveal');

    if(ball && infoEl && revealEl) {
        if (estadoApp.idx_sorteo >= estadoApp.calendario.length) {
            ball.textContent = '✓';
            ball.style.cursor = 'default';
            ball.onclick = null;
            infoEl.textContent = '¡SORTEO COMPLETADO! 32 PARTIDOS';
            revealEl.textContent = '';
            const btnCerrar = document.getElementById('btn-cerrar-sorteo');
            if (!isSpectator && btnCerrar) btnCerrar.style.display = 'block';
        } else {
            ball.textContent = '▶';
            if (isSpectator) {
                ball.style.cursor = 'default';
                infoEl.textContent = 'Esperando sorteo del Administrador...';
            } else {
                ball.style.cursor = 'pointer';
                ball.onclick = () => ejecutarGiroSorteoLocal();
                infoEl.textContent = 'Pulsa el balón para sortear';
            }
        }
    }
}

let local_animando_sorteo = false;
function ejecutarGiroSorteoLocal() {
    if (local_animando_sorteo || isSpectator) return;
    local_animando_sorteo = true;

    channel.publish('reproducir_sonido', { tipo: 'mono' });

    const ball = document.getElementById('sorteo-ball');
    if(ball) ball.classList.add('spinning');
    
    setTimeout(() => {
        if(ball) ball.classList.remove('spinning');
        estadoApp.idx_sorteo++;
        local_animando_sorteo = false;
        enviarEstado();
    }, 800);
}

// ----------------------------------------------------------------
// LIGA BINDINGS
// ----------------------------------------------------------------
function actualizarVistaLiga() {
    if(!container) return;
    container.innerHTML = '';
    const splitContainer = document.createElement('div');
    splitContainer.className = 'liga-split-container';

    // Clasificación Izquierda
    const tablaCol = document.createElement('div');
    tablaCol.className = 'liga-tabla-col';
    const ranking = getRanking();
    const trClass = pos => pos <= 4 ? 'tr-direct' : pos <= 12 ? 'tr-playoff' : 'tr-elim';

    tablaCol.innerHTML = `
        <div class="contenedor-tabla-directa">
            <h2 class="titulo-seccion-liga">📊 CLASIFICACIÓN</h2>
            <table class="tabla-general">
                <thead><tr><th>#</th><th>EQUIPO</th><th>PJ</th><th>V</th><th>PTS</th><th>DIF</th></tr></thead>
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

    // Enfrentamientos Derecha
    const jornadasCol = document.createElement('div');
    jornadasCol.className = 'liga-jornadas-col';
    
    const tituloJornadas = document.createElement('h2');
    tituloJornadas.className = 'titulo-seccion-liga';
    tituloJornadas.innerHTML = `📅 ENFRENTAMIENTOS ${isSpectator ? '' : '<small style="font-size:0.55rem; color:rgba(255,255,255,0.4); display:block; margin-top:4px; letter-spacing:1px;">DOBLE CLIC PARA EDITAR</small>'}`;
    jornadasCol.appendChild(tituloJornadas);

    estadoApp.jornadas.forEach((partidos, ji) => {
        const accItem = document.createElement('div');
        accItem.className = 'accordion-jornada active';

        accItem.innerHTML = `
            <div class="accordion-header">
                <div class="folder-title"><span class="folder-icon">📁</span><span>JORNADA ${ji + 1}</span></div>
            </div>
            <div class="accordion-content">
                <div class="lista-jornada" id="lista-j${ji}"></div>
            </div>`;

        if (!isSpectator) {
            accItem.querySelector('.accordion-header').addEventListener('dblclick', (e) => {
                e.stopPropagation();
                abrirPartidosJornada(ji);
            });
        }

        const lista = accItem.querySelector(`#lista-j${ji}`);
        partidos.forEach(p => lista.appendChild(crearCardPartido(p, ji)));
        jornadasCol.appendChild(accItem);
    });

    splitContainer.appendChild(jornadasCol);
    container.appendChild(splitContainer);
}

function crearCardPartido(p, ji) {
    const eq1 = getEq(p.t1);
    const eq2 = getEq(p.t2);
    const r = estadoApp.resultados[clave(p.t1, p.t2)];
    
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
        </div>`;
    
    if (!isSpectator) {
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            abrirModalResultadoPartido(p, ji);
        });
    }
    
    return card;
}

function abrirModalResultadoPartido(p, ji) {
    const eq1 = getEq(p.t1);
    const eq2 = getEq(p.t2);
    const r = estadoApp.resultados[clave(p.t1, p.t2)];
    const sorted = [p.t1, p.t2].sort();
    const s1prev = (p.t1 === sorted[0]) ? r.s1 : r.s2;
    const s2prev = (p.t1 === sorted[0]) ? r.s2 : r.s1;

    abrirModalResultado(eq1, eq2, s1prev, s2prev, (s1, s2) => {
        if (p.t1 === sorted[0]) {
            r.s1 = s1; r.s2 = s2;
        } else {
            r.s1 = s2; r.s2 = s1;
        }
        enviarEstado();
    });
}

function abrirPartidosJornada(ji) {
    const partidos = estadoApp.jornadas[ji];
    if(!modalCard) return;
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:15px; font-size:1.4rem; letter-spacing:2px">EDITAR JORNADA ${ji + 1}</h2>
        <div style="max-height: 380px; overflow-y: auto; padding-right: 10px;">
            ${partidos.map((p, i) => {
                const eq1 = getEq(p.t1); const eq2 = getEq(p.t2);
                const r = estadoApp.resultados[clave(p.t1, p.t2)];
                const sorted = [p.t1, p.t2].sort();
                const s1Val = (r && r.s1 !== '') ? ((p.t1 === sorted[0]) ? r.s1 : r.s2) : '';
                const s2Val = (r && r.s2 !== '') ? ((p.t1 === sorted[0]) ? r.s2 : r.s1) : '';
                return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:8px; border-radius:4px; border:1px solid rgba(255,255,255,0.05)">
                        <div style="flex:1; display:flex; align-items:center; gap:6px; font-size:0.85rem; width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            <img src="${eq1.logo}" style="width:18px; height:18px; object-fit:contain" onerror="this.style.display='none'">
                            <span>${p.t1}</span>
                        </div>
                        <input type="number" class="input-score-jornada" data-idx="${i}" data-team="1" value="${s1Val}" style="width:45px; background:#111; border:1px solid var(--omen-purple); color:#fff; text-align:center; padding:2px;">
                        <span style="color:var(--omen-purple)">—</span>
                        <input type="number" class="input-score-jornada" data-idx="${i}" data-team="2" value="${s2Val}" style="width:45px; background:#111; border:1px solid var(--omen-purple); color:#fff; text-align:center; padding:2px;">
                        <div style="flex:1; display:flex; align-items:center; justify-content:flex-end; gap:6px; font-size:0.85rem; text-align:right;">
                            <span>${p.t2}</span><img src="${eq2.logo}" style="width:18px; height:18px; object-fit:contain" onerror="this.style.display='none'">
                        </div>
                    </div>`;
            }).join('')}
        </div>
        <button class="btn-valorant" id="btn-guardar-jornada" style="width:100%; margin-top:15px;"><span class="btn-content">GUARDAR JORNADA</span></button>`;
    
    if(modal) modal.classList.add('active');
    
    document.getElementById('btn-guardar-jornada').onclick = () => {
        let valid = true; const updates = [];
        for (let i = 0; i < partidos.length; i++) {
            const inp1 = modalCard.querySelector(`.input-score-jornada[data-idx="${i}"][data-team="1"]`);
            const inp2 = modalCard.querySelector(`.input-score-jornada[data-idx="${i}"][data-team="2"]`);
            if (inp1.value !== '' || inp2.value !== '') {
                const s1 = parseInt(inp1.value); const s2 = parseInt(inp2.value);
                if (isNaN(s1) || isNaN(s2) || s1 === s2) { alert('Marcadores incorrectos detectados.'); valid = false; break; }
                updates.push({ idx: i, s1, s2 });
            }
        }
        if (valid) {
            updates.forEach(up => {
                const p = partidos[up.idx]; const r = estadoApp.resultados[clave(p.t1, p.t2)];
                const sorted = [p.t1, p.t2].sort();
                if (p.t1 === sorted[0]) { r.s1 = up.s1; r.s2 = up.s2; } 
                else { r.s1 = up.s2; r.s2 = up.s1; }
            });
            if(modal) modal.classList.remove('active');
            enviarEstado();
        }
    };
}

// ----------------------------------------------------------------
// PLAYOFFS BINDINGS
// ----------------------------------------------------------------
function generarEstructuraPlayoffs() {
    const ranking = getRanking();
    const zona = ranking.slice(4,12);
    estadoApp.playoffsData = [
        { t1:zona[0]?.eq||{nombre:'TBD',logo:''}, t2:zona[7]?.eq||{nombre:'TBD',logo:''}, seed1:5,  seed2:12, ganador:null, s1:'', s2:'' },
        { t1:zona[1]?.eq||{nombre:'TBD',logo:''}, t2:zona[6]?.eq||{nombre:'TBD',logo:''}, seed1:6,  seed2:11, ganador:null, s1:'', s2:'' },
        { t1:zona[2]?.eq||{nombre:'TBD',logo:''}, t2:zona[5]?.eq||{nombre:'TBD',logo:''}, seed1:7,  seed2:10, ganador:null, s1:'', s2:'' },
        { t1:zona[3]?.eq||{nombre:'TBD',logo:''}, t2:zona[4]?.eq||{nombre:'TBD',logo:''}, seed1:8,  seed2:9,  ganador:null, s1:'', s2:'' },
    ];
}

function actualizarVistaPlayoffs() {
    if(!container) return;
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'playoffs-wrapper';
    wrapper.innerHTML = `
        <h2 class="playoffs-title">FASE PLAYOFF</h2>
        <p class="playoffs-subtitle">${isSpectator ? 'EN DIRECTO' : 'DOBLE CLIC PARA INTRODUCIR RESULTADO'}</p>
        <div class="playoffs-grid" id="playoffs-grid"></div>`;

    const grid = wrapper.querySelector('#playoffs-grid');
    estadoApp.playoffsData.forEach((pd, i) => {
        const el = document.createElement('div');
        el.className = 'playoff-match' + (pd.ganador ? ' done' : '');
        renderPlayoffMatch(el, pd);
        
        if (!isSpectator && pd.t1.nombre !== 'TBD' && pd.t2.nombre !== 'TBD') {
            el.ondblclick = () => abrirModalResultado(pd.t1, pd.t2, pd.s1, pd.s2, (s1, s2) => {
                pd.s1 = s1; pd.s2 = s2;
                pd.ganador = s1 > s2 ? pd.t1 : pd.t2;
                enviarEstado();
            });
        }
        grid.appendChild(el);
    });
    container.appendChild(wrapper);
}

function renderPlayoffMatch(el, pd) {
    const gNom = pd.ganador?.nombre;
    const t1L = gNom && gNom!==pd.t1.nombre;
    const t2L = gNom && gNom!==pd.t2.nombre;
    el.innerHTML = `
        <div class="playoff-team ${t1L?'loser':''}">
            <div><span class="playoff-seed">#${pd.seed1}</span><img src="${pd.t1.logo}" onerror="this.style.display='none'"></div>
            <span>${pd.t1.nombre}</span>
        </div>
        <div class="playoff-vs">VS</div>
        <div class="playoff-team ${t2L?'loser':''}" style="flex-direction:row-reverse;text-align:right">
            <div><span class="playoff-seed">#${pd.seed2}</span><img src="${pd.t2.logo}" onerror="this.style.display='none'"></div>
            <span>${pd.t2.nombre}</span>
        </div>
        <div class="playoff-done-badge">${pd.ganador?'✓':'—'}</div>`;
}

// ----------------------------------------------------------------
// BRACKET FINAL BINDINGS
// ----------------------------------------------------------------
function generarEstructuraBracket() {
    const ranking = getRanking();
    const top4 = ranking.slice(0,4).map(r=>r.eq);
    const gpWinners = estadoApp.playoffsData.map(pd => pd.ganador || { nombre:'TBD', logo:'' });

    estadoApp.bracketData = {
        qf: [
            { id:'qf0', t1:top4[0]||{nombre:'TBD',logo:''}, t2:gpWinners[3]||{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
            { id:'qf1', t1:top4[1]||{nombre:'TBD',logo:''}, t2:gpWinners[2]||{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
            { id:'qf2', t1:top4[2]||{nombre:'TBD',logo:''}, t2:gpWinners[1]||{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
            { id:'qf3', t1:top4[3]||{nombre:'TBD',logo:''}, t2:gpWinners[0]||{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
        ],
        sf: [
            { id:'sf0', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
            { id:'sf1', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
        ],
        fn: [
            { id:'fn0', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
        ],
        campeonAnunciado: false
    };
}

function actualizarVistaBracket() {
    if (!estadoApp.bracketData || !container) return;
    container.innerHTML = '';
    const outer = document.createElement('div'); outer.className = 'bracket-outer';
    const bc = document.createElement('div'); bc.className = 'bracket-container';

    bc.appendChild(crearColumna('CUARTOS DE FINAL', estadoApp.bracketData.qf, 'qf'));
    bc.appendChild(crearColumna('SEMIFINALES', estadoApp.bracketData.sf, 'sf'));
    bc.appendChild(crearColumna('⚡ GRAN FINAL', estadoApp.bracketData.fn, 'fn'));

    outer.appendChild(bc); container.appendChild(outer);

    // Revisar si ya hay campeón y mostrar overlay correspondiente
    const finalMatch = estadoApp.bracketData.fn[0];
    if (finalMatch.ganador && !document.querySelector('.champion-overlay')) {
        mostrarCampeon(finalMatch.ganador.nombre, finalMatch.ganador.logo);
    }
}

function crearColumna(titulo, partidos, fase) {
    const col = document.createElement('div'); col.className = 'bracket-column';
    const tit = document.createElement('div'); tit.className = 'bracket-col-title';
    tit.textContent = titulo; col.appendChild(tit);

    partidos.forEach((p, i) => {
        const box = document.createElement('div');
        box.className = 'match-box' + (fase==='fn'?' final-box':'');
        const esTBD = p.t1.nombre==='TBD' || p.t2.nombre==='TBD';
        if(esTBD) box.classList.add('tbd');

        renderMatchBox(box, p);

        if(!esTBD && !isSpectator) {
            box.ondblclick = () => {
                abrirModalResultado(p.t1, p.t2, p.s1, p.s2, (s1,s2) => {
                    p.s1=s1; p.s2=s2;
                    p.ganador = s1>s2 ? p.t1 : p.t2;
                    
                    avanzarBracketLogicaInterna(fase, i, p.ganador);
                    if (fase === 'fn') {
                        channel.publish('reproducir_sonido', { tipo: 'champions' });
                    }
                    enviarEstado();
                });
            };
        }
        col.appendChild(box);
    });
    return col;
}

function renderMatchBox(box, p) {
    const g = p.ganador?.nombre;
    const t1L = g && g!==p.t1.nombre;
    const t2L = g && g!==p.t2.nombre;
    const img = eq => eq.logo ? `<img src="${eq.logo}" onerror="this.style.display='none'">` : `<div style="width:28px;height:28px;background:#222;border-radius:4px"></div>`;
    box.innerHTML = `
        <div class="mtr ${t1L?'loser':''}">
            ${img(p.t1)}<span class="mtr-name">${p.t1.nombre}</span>${g?`<span class="mtr-score">${p.s1}</span>`:''}
        </div>
        <div class="vs-line"></div>
        <div class="mtr ${t2L?'loser':''}">
            ${img(p.t2)}<span class="mtr-name">${p.t2.nombre}</span>${g?`<span class="mtr-score">${p.s2}</span>`:''}
        </div>`;
}

function avanzarBracketLogicaInterna(fase, idx, ganador) {
    let destFase, destIdx, destSlot;
    if(fase==='qf') {
        destFase='sf'; destIdx = idx<2 ? 0 : 1; destSlot = idx%2===0 ? 't1' : 't2';
    } else if(fase==='sf') {
        destFase='fn'; destIdx=0; destSlot = idx===0 ? 't1' : 't2';
    } else return;

    const arr = destFase==='sf' ? estadoApp.bracketData.sf : estadoApp.bracketData.fn;
    arr[destIdx][destSlot] = ganador;
}

// ----------------------------------------------------------------
// MODAL RESULTADO GENÉRICO
// ----------------------------------------------------------------
function abrirModalResultado(eq1, eq2, s1prev, s2prev, onConfirm) {
    if(!modalCard) return;
    modalCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px; font-size:1.3rem; letter-spacing:3px">RESULTADO</h2>
        <div class="modal-score-row">
            <div class="eq-blk"><img src="${eq1.logo}" onerror="this.style.display='none'"><div class="eq-name">${eq1.nombre}</div></div>
            <input type="number" id="ms1" class="input-score" value="${s1prev}" min="0" placeholder="0">
            <span style="font-family:'BertholdBlock';font-size:2rem;color:var(--omen-purple)">—</span>
            <input type="number" id="ms2" class="input-score" value="${s2prev}" min="0" placeholder="0">
            <div class="eq-blk"><img src="${eq2.logo}" onerror="this.style.display='none'"><div class="eq-name">${eq2.nombre}</div></div>
        </div>
        <button class="btn-valorant" id="ms-confirm" style="width:100%"><span class="btn-content">CONFIRMAR</span></button>`;
    if(modal) modal.classList.add('active');
    modalCard.querySelector('#ms-confirm').onclick = () => {
        const s1 = parseInt(modalCard.querySelector('#ms1').value);
        const s2 = parseInt(modalCard.querySelector('#ms2').value);
        if(isNaN(s1)||isNaN(s2)||s1===s2){ alert('Resultado inválido.'); return; }
        if(modal) modal.classList.remove('active');
        onConfirm(s1,s2);
    };
}

// ----------------------------------------------------------------
// PANTALLA CAMPEÓN OVERLAY
// ----------------------------------------------------------------
function mostrarCampeon(nombre, logo) {
    const flag = document.querySelector('.champion-overlay');
    if (flag) flag.remove();

    const ov = document.createElement('div');
    ov.className = 'champion-overlay';
    ov.innerHTML = `
        <h1 class="champion-title">¡CAMPEÓN VOL. II!</h1>
        <img src="${logo}" class="champion-logo" onerror="this.style.display='none'">
        <h2 class="champion-name">${nombre}</h2>
        ${isSpectator ? '' : `<button class="btn-valorant" onclick="location.reload()" style="margin-top:50px"><span class="btn-content">FINALIZAR TORNEO</span></button>`}`;
    document.body.appendChild(ov);
    setTimeout(()=>ov.classList.add('active'), 100);
}

// ----------------------------------------------------------------
// TABLA FLOTANTE DE CONSULTA RÁPIDA (SOLO ADMIN)
// ----------------------------------------------------------------
function mostrarTabla() {
    if(!tablaCard) return;
    const ranking = getRanking();
    const zonaTag = pos => {
        if(pos<=4)  return '<span class="zona-tag direct">DIRECTO</span>';
        if(pos<=12) return '<span class="zona-tag playoff">PLAYOFF</span>';
        return '<span class="zona-tag elim">ELIMINADO</span>';
    };
    const trClass = pos => pos<=4?'tr-direct':pos<=12?'tr-playoff':'tr-elim';

    tablaCard.innerHTML = `
        <h2 style="font-family:'BertholdBlock'; text-align:center; color:var(--omen-cyan); margin-bottom:20px; font-size:1.6rem; letter-spacing:4px">TABLA GENERAL</h2>
        <table class="tabla-general">
            <thead><tr><th>#</th><th>EQUIPO</th><th>GR</th><th>PJ</th><th>V</th><th>PTS</th><th>DIF</th><th>ZONA</th></tr></thead>
            <tbody>
            ${ranking.map((r,i)=>{
                const pos=i+1;
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
                    <td style="text-align:center;color:${r.diff>=0?'#00ff88':'#ff4655'}">${r.diff>0?'+':''}${r.diff}</td>
                    <td>${zonaTag(pos)}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>`;
    if(tablaModal) tablaModal.classList.add('active');
}

// ----------------------------------------------------------------
// UTILS ESTADÍSTICAS
// ----------------------------------------------------------------
function clave(a,b) { return [a,b].sort().join('|'); }
function getPartidosEquipo(nombre) { return estadoApp.calendario.filter(p => p.t1 === nombre || p.t2 === nombre); }
function getWins(nombre) {
    let wins = 0;
    estadoApp.calendario.forEach(p => {
        const r = estadoApp.resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort();
            if (nombre === sorted[0] && parseInt(r.s1) > parseInt(r.s2)) wins++;
            if (nombre === sorted[1] && parseInt(r.s2) > parseInt(r.s1)) wins++;
        }
    });
    return wins;
}
function getPuntos(nombre) {
    let pts = 0;
    estadoApp.calendario.forEach(p => {
        const r = estadoApp.resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort(); const s1 = parseInt(r.s1); const s2 = parseInt(r.s2);
            if (nombre === sorted[0] && s1 > s2) pts += 3;
            if (nombre === sorted[1] && s2 > s1) pts += 3;
            if (s1 === s2) pts += 1;
        }
    });
    return pts;
}
function getDiff(nombre) {
    let favor = 0; let contra = 0;
    estadoApp.calendario.forEach(p => {
        const r = estadoApp.resultados[clave(p.t1, p.t2)];
        if (r && r.s1 !== '' && r.s2 !== '') {
            const sorted = [p.t1, p.t2].sort(); const s1 = parseInt(r.s1); const s2 = parseInt(r.s2);
            if (nombre === sorted[0]) { favor += s1; contra += s2; } 
            else if (nombre === sorted[1]) { favor += s2; contra += s1; }
        }
    });
    return favor - contra;
}
function getRanking() {
    return equipos.map(eq => ({
        eq, pts: getPuntos(eq.nombre), wins: getWins(eq.nombre), diff: getDiff(eq.nombre),
        pj: getPartidosEquipo(eq.nombre).filter(p=>{ const r=estadoApp.resultados[clave(p.t1,p.t2)]; return r&&r.s1!==''&&r.s2!==''; }).length
    })).sort((a,b) => b.pts-a.pts || b.wins-a.wins || b.diff-a.diff);
}
function shuffle(arr) {
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr;
}

function generarJornadas() {
    const todos = []; const vistos = new Set();
    const add = (a,b) => { const k = [a,b].sort().join('|'); if(!vistos.has(k)){ vistos.add(k); todos.push({t1:a,t2:b}); } };
    letras.forEach(g => { const arr = shuffle([...GRUPOS[g].map(e=>e.nombre)]); add(arr[0],arr[1]); add(arr[2],arr[3]); });
    const pares = [['A','B'],['A','C'],['A','D'],['B','C'],['B','D'],['C','D']];
    pares.forEach(([g1,g2]) => {
        const a1 = shuffle([...GRUPOS[g1].map(e=>e.nombre)]); const a2 = shuffle([...GRUPOS[g2].map(e=>e.nombre)]);
        a1.forEach((t,i) => add(t, a2[i]));
    });
    return distribuirEnJornadas(shuffle(todos));
}
function distribuirEnJornadas(partidos) {
    const J = [[],[],[],[]]; const usadoPorJornada = [{},{},{},{}];
    const puedeIr = (p, j) => !usadoPorJornada[j][p.t1] && !usadoPorJornada[j][p.t2];
    const marcar = (p, j) => { usadoPorJornada[j][p.t1] = true; usadoPorJornada[j][p.t2] = true; J[j].push(p); };
    const colocar = (idx) => {
        if(idx === partidos.length) return true; const p = partidos[idx];
        for(let j=0; j<4; j++){
            if(J[j].length < 8 && puedeIr(p,j)){
                marcar(p,j); if(colocar(idx+1)) return true; J[j].pop();
                delete usadoPorJornada[j][p.t1]; delete usadoPorJornada[j][p.t2];
            }
        }
        return false;
    };
    let intentos = 0;
    while(!colocar(0) && intentos < 20){
        J.forEach(j=>j.length=0); usadoPorJornada.forEach(u=>{ for(const k in u) delete u[k]; });
        shuffle(partidos); intentos++;
    }
    return J;
}

// Carga visual cuando Ably esté conectado
ably.connection.on('connected', () => {
    console.log('Ably conectado ✓');
    if (isSpectator) {
        // El espectador pide el estado al admin
        channel.publish('pedir_estado', {});
    } else {
        // El admin intenta restaurar su estado guardado
        const restaurado = cargarEstadoLocal();
        if (restaurado) {
            // Tenemos estado guardado, lo publicamos para que los espectadores se sincronicen
            channel.publish('cambio_estado', estadoApp);
        }
        procesarCambioEstado();
    }
});
