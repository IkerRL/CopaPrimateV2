// ================================================================
// COPA PRIMATE VOL. II
// 16 equipos · 4 grupos de 4 · Liga cruzada (4 partidos c/u)
// Top 4 directo · 5º-12º playoff · 13º-16º eliminados
// Bracket: Cuartos → Semis → Final
// ================================================================

// --- EQUIPOS Y GRUPOS (edita aquí) ---
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

// Lista plana de equipos
const equipos = Object.entries(GRUPOS).flatMap(([g, lista]) =>
    lista.map(e => ({ ...e, grupo: g }))
);

const getEq  = nombre => equipos.find(e => e.nombre === nombre);
const letras = ['A','B','C','D'];

// Calendario por jornadas
let jornadas = [[], [], [], []]; // jornadas[0..3] = array de { t1, t2 }
let calendario = [];             // lista plana de todos los partidos
let resultados = {};             // clave(t1,t2) -> { s1, s2 }
let playoffsData = [];
let bracketData  = null;

// ----------------------------------------------------------------
// DOM
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

// Cerrar modales
modal.addEventListener('click', e => { if(e.target===modal) modal.classList.remove('active'); });
tablaModal.addEventListener('click', e => { if(e.target===tablaModal) tablaModal.classList.remove('active'); });
document.querySelectorAll('.btn-sonido').forEach(m => m.addEventListener('click', () => { audioMono.currentTime=0; audioMono.play(); }));

// ----------------------------------------------------------------
// RENDER INICIAL
// ----------------------------------------------------------------
function renderInicial() {
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
        card.addEventListener('click', () => card.classList.add('revealed'));
        container.appendChild(card);
    });
}
renderInicial();

// ----------------------------------------------------------------
// SORTEO DE JORNADAS
// ----------------------------------------------------------------
let idx_sorteo = 0;
let total_sorteo = 0;
let sorteo_animando = false;
let partidos_generados = []; // todos los partidos ordenados por jornada

btnSorteo.addEventListener('click', () => {
    sorteoOverlay.classList.add('active');
    prepararSorteo();
});

function prepararSorteo() {
    // Panel de grupos
    const display = document.getElementById('sorteo-grupos-display');
    display.innerHTML = '';
    letras.forEach(g => {
        const col = document.createElement('div');
        col.className = `sg-col ${g}`;
        col.id = `sg-col-${g}`;
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

    // Reset jornadas display
    for(let j=0;j<4;j++){
        const col = document.getElementById(`sj-${j}`);
        col.innerHTML = `<div class="sj-title">JORNADA ${j+1}</div>`;
    }

    document.getElementById('sorteo-info').textContent = 'Pulsa el balón para sortear';
    document.getElementById('sorteo-match-reveal').textContent = '';
    document.getElementById('btn-cerrar-sorteo').style.display = 'none';

    // Generar partidos distribuidos en 4 jornadas
    jornadas = generarJornadas();
    partidos_generados = jornadas.flat();
    calendario = [...partidos_generados];
    partidos_generados.forEach(p => {
        resultados[clave(p.t1,p.t2)] = { s1:'', s2:'' };
    });

    // El sorteo revela partido a partido (jornada por jornada)
    // Primero todos los de J1, luego J2, etc.
    idx_sorteo = 0;
    total_sorteo = partidos_generados.length;

    const ball = document.getElementById('sorteo-ball');
    ball.textContent = '▶';
    ball.style.cursor = 'pointer';
    ball.onclick = () => sortearSiguiente(ball);
}

function generarJornadas() {
    // Genera 32 partidos únicos distribuidos en 4 jornadas de 8
    // Restricción: cada equipo aparece exactamente 1 vez por jornada

    // Primero generamos todos los partidos
    const todos = [];
    const vistos = new Set();
    const add = (a,b) => {
        const k = [a,b].sort().join('|');
        if(!vistos.has(k)){ vistos.add(k); todos.push({t1:a,t2:b}); }
    };

    // Intra-grupo: 4 grupos × 2 partidos = 8 partidos
    letras.forEach(g => {
        const arr = shuffle([...GRUPOS[g].map(e=>e.nombre)]);
        add(arr[0],arr[1]);
        add(arr[2],arr[3]);
    });

    // Inter-grupos: cada equipo vs 1 de cada otro grupo
    // 6 pares de grupos × 4 partidos = 24 partidos
    const pares = [['A','B'],['A','C'],['A','D'],['B','C'],['B','D'],['C','D']];
    pares.forEach(([g1,g2]) => {
        const a1 = shuffle([...GRUPOS[g1].map(e=>e.nombre)]);
        const a2 = shuffle([...GRUPOS[g2].map(e=>e.nombre)]);
        a1.forEach((t,i) => add(t, a2[i]));
    });

    // Distribuir en 4 jornadas de 8 garantizando que cada equipo
    // aparezca exactamente 1 vez por jornada
    return distribuirEnJornadas(shuffle(todos));
}

function distribuirEnJornadas(partidos) {
    const J = [[],[],[],[]];
    const usadoPorJornada = [{},{},{},{}]; // nombre → true si ya está en esa jornada

    const puedeIr = (p, j) =>
        !usadoPorJornada[j][p.t1] && !usadoPorJornada[j][p.t2];

    const marcar = (p, j) => {
        usadoPorJornada[j][p.t1] = true;
        usadoPorJornada[j][p.t2] = true;
        J[j].push(p);
    };

    // Intentamos distribuir con backtracking simple
    // (con solo 32 partidos y 16 equipos es rápido)
    const colocar = (idx) => {
        if(idx === partidos.length) return true;
        const p = partidos[idx];
        for(let j=0; j<4; j++){
            if(J[j].length < 8 && puedeIr(p,j)){
                marcar(p,j);
                if(colocar(idx+1)) return true;
                J[j].pop();
                delete usadoPorJornada[j][p.t1];
                delete usadoPorJornada[j][p.t2];
            }
        }
        return false;
    };

    // Intentar hasta que funcione (shuffle asegura variedad)
    let intentos = 0;
    while(!colocar(0) && intentos < 20){
        J.forEach(j=>j.length=0);
        usadoPorJornada.forEach(u=>{ for(const k in u) delete u[k]; });
        shuffle(partidos);
        intentos++;
    }

    return J;
}

function sortearSiguiente(ball) {
    if(sorteo_animando) return;
    if(idx_sorteo >= total_sorteo) return;

    sorteo_animando = true;

    // Determinar jornada actual
    let acumulado = 0;
    let jornada_actual = 0;
    let idx_en_jornada = idx_sorteo;
    for(let j=0; j<4; j++){
        if(idx_sorteo < acumulado + jornadas[j].length){
            jornada_actual = j;
            idx_en_jornada = idx_sorteo - acumulado;
            break;
        }
        acumulado += jornadas[j].length;
    }

    const match = jornadas[jornada_actual][idx_en_jornada];
    const eq1 = getEq(match.t1);
    const eq2 = getEq(match.t2);
    const infoEl = document.getElementById('sorteo-info');
    const revealEl = document.getElementById('sorteo-match-reveal');

    // Resaltar en panel de grupos
    document.querySelectorAll('.sg-team').forEach(el => el.classList.remove('highlighted'));
    document.getElementById(`sg-team-${match.t1.replace(/\s/g,'_')}`)?.classList.add('highlighted');
    document.getElementById(`sg-team-${match.t2.replace(/\s/g,'_')}`)?.classList.add('highlighted');

    // Animar bola
    ball.classList.add('spinning');
    ball.textContent = '...';
    infoEl.textContent = `JORNADA ${jornada_actual+1} · PARTIDO ${idx_en_jornada+1}/8`;
    revealEl.textContent = '';
    try{ audioMono.currentTime=0; audioMono.play(); } catch(e){}

    setTimeout(() => {
        ball.classList.remove('spinning');
        ball.textContent = `J${jornada_actual+1}`;
        revealEl.textContent = `${match.t1} ⚡ ${match.t2}`;

        // Añadir chip a la columna de jornada
        const sjCol = document.getElementById(`sj-${jornada_actual}`);
        const chip = document.createElement('div');
        chip.className = 'sj-match';
        chip.innerHTML = `
            <img src="${eq1.logo}" onerror="this.style.display='none'">
            <span>${match.t1}</span>
            <span class="sj-vs">VS</span>
            <span>${match.t2}</span>
            <img src="${eq2.logo}" onerror="this.style.display='none'">`;
        sjCol.appendChild(chip);
        setTimeout(()=>chip.classList.add('visible'), 40);
        sjCol.scrollTop = sjCol.scrollHeight;

        idx_sorteo++;
        sorteo_animando = false;

        if(idx_sorteo >= total_sorteo){
            ball.textContent = '✓';
            ball.style.cursor = 'default';
            ball.onclick = null;
            infoEl.textContent = '¡SORTEO COMPLETADO! 32 PARTIDOS';
            revealEl.textContent = '';
            document.getElementById('btn-cerrar-sorteo').style.display = 'block';
        } else {
            setTimeout(()=>{ ball.textContent='▶'; }, 500);
        }
    }, 800);
}

document.getElementById('btn-cerrar-sorteo').addEventListener('click', () => {
    sorteoOverlay.classList.remove('active');
    btnSorteo.style.display = 'none';
    btnLiga.style.display = 'inline-block';

    let tf = document.getElementById('btn-tabla-flotante');
    if(!tf){
        tf = document.createElement('button');
        tf.id = 'btn-tabla-flotante';
        tf.className = 'btn-valorant btn-gold';
        tf.innerHTML = '<span class="btn-content">📊 TABLA</span>';
        document.body.appendChild(tf);
        tf.addEventListener('click', mostrarTabla);
    }
    tf.style.display = 'block';
});

// ----------------------------------------------------------------
// CLAVE DE PARTIDO
// ----------------------------------------------------------------
function clave(a,b) { return [a,b].sort().join('|'); }

// ----------------------------------------------------------------
// FASE DE LIGA — VISTA POR JORNADAS
// ----------------------------------------------------------------
btnLiga.addEventListener('click', () => {
    mostrarLiga();
    btnLiga.style.display = 'none';
    btnPlayoffs.style.display = 'inline-block';
});

function mostrarLiga() {
    container.innerHTML = '';
    
    // Ocultamos el botón flotante tradicional de la tabla porque ahora estará integrada fijamente
    const tf = document.getElementById('btn-tabla-flotante');
    if (tf) tf.style.display = 'none';

    // Contenedor Split Principal (Izquierda / Derecha)
    const splitContainer = document.createElement('div');
    splitContainer.className = 'liga-split-container';

    // === COLUMNA IZQUIERDA: TABLA GENERAL DE CLASIFICACIÓN ===
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

    // === COLUMNA DERECHA: MINI CARPETAS (ACCORDIONS DE JORNADAS) ===
    const jornadasCol = document.createElement('div');
    jornadasCol.className = 'liga-jornadas-col';
    
    const tituloJornadas = document.createElement('h2');
    tituloJornadas.className = 'titulo-seccion-liga';
    tituloJornadas.innerHTML = '📅 ENFRENTAMIENTOS <small style="font-size:0.55rem; color:rgba(255,255,255,0.4); display:block; margin-top:4px; letter-spacing:1px;">DOBLE CLIC PARA EDITAR MARCADORES</small>';
    jornadasCol.appendChild(tituloJornadas);

    jornadas.forEach((partidos, ji) => {
        const accItem = document.createElement('div');
        accItem.className = 'accordion-jornada';

        // Estructura de minicarpeta interactiva con un slider interno
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
        
        // Un click extiende o contrae el slider de partidos
        header.addEventListener('click', (e) => {
            if (e.detail === 1) { 
                const isOpen = accItem.classList.contains('active');
                // Opcional: Cierra las otras carpetas si quieres modo acordeón estricto
                jornadasCol.querySelectorAll('.accordion-jornada').forEach(item => item.classList.remove('active'));
                if (!isOpen) accItem.classList.add('active');
            }
        });

        // Doble click despliega la ventana emergente original de edición de goles
        header.addEventListener('dblclick', () => {
            abrirPartidosJornada(ji);
        });

        // Adjuntamos las tarjetas de partidos generadas
        const lista = accItem.querySelector(`#lista-j${ji}`);
        partidos.forEach(p => lista.appendChild(crearCardPartido(p, ji)));

        jornadasCol.appendChild(accItem);
    });

    splitContainer.appendChild(jornadasCol);
    container.appendChild(splitContainer);
}

// Sobreescribimos refreshJornada para que al actualizar goles, la tabla izquierda también mute en tiempo real
function refreshJornada(ji) {
    const lista = document.getElementById(`lista-j${ji}`);
    if (!lista) return;
    lista.innerHTML = '';
    jornadas[ji].forEach(p => lista.appendChild(crearCardPartido(p, ji)));
    
    // Actualización reactiva instantánea del bloque de Clasificación
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
// TABLA GENERAL
// ----------------------------------------------------------------
function getRanking() {
    return equipos.map(eq => ({
        eq,
        pts:   getPuntos(eq.nombre),
        wins:  getWins(eq.nombre),
        diff:  getDiff(eq.nombre),
        pj:    getPartidosEquipo(eq.nombre).filter(p=>{
                   const r=resultados[clave(p.t1,p.t2)];
                   return r&&r.s1!==''&&r.s2!=='';
               }).length
    })).sort((a,b) => b.pts-a.pts || b.wins-a.wins || b.diff-a.diff);
}

function mostrarTabla() {
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
            <thead><tr>
                <th>#</th><th>EQUIPO</th><th>GR</th><th>PJ</th><th>V</th><th>PTS</th><th>DIF</th><th>ZONA</th>
            </tr></thead>
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
        </table>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;font-size:.7rem;flex-wrap:wrap">
            <span><span class="zona-tag direct">DIRECTO</span> Top 4 → Cuartos</span>
            <span><span class="zona-tag playoff">PLAYOFF</span> 5º-12º → Playoff</span>
            <span><span class="zona-tag elim">ELIMINADO</span> 13º-16º → Fuera</span>
        </div>`;
    tablaModal.classList.add('active');
}

// ----------------------------------------------------------------
// PLAYOFFS (5º al 12º → 4 partidos → 4 pasan a cuartos)
// ----------------------------------------------------------------
btnPlayoffs.addEventListener('click', () => {
    mostrarPlayoffs();
    btnPlayoffs.style.display = 'none';
    btnBracket.style.display = 'inline-block';
});

function mostrarPlayoffs() {
    container.innerHTML = '';
    document.getElementById('btn-tabla-flotante').style.display = 'none';

    const ranking = getRanking();
    const zona = ranking.slice(4,12); // posiciones 5ª a 12ª (índices 4-11)

    // Emparejamientos: 5ºvs12º, 6ºvs11º, 7ºvs10º, 8ºvs9º
    playoffsData = [
        { t1:zona[0].eq, t2:zona[7].eq, seed1:5,  seed2:12, ganador:null, s1:'', s2:'' },
        { t1:zona[1].eq, t2:zona[6].eq, seed1:6,  seed2:11, ganador:null, s1:'', s2:'' },
        { t1:zona[2].eq, t2:zona[5].eq, seed1:7,  seed2:10, ganador:null, s1:'', s2:'' },
        { t1:zona[3].eq, t2:zona[4].eq, seed1:8,  seed2:9,  ganador:null, s1:'', s2:'' },
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'playoffs-wrapper';
    wrapper.innerHTML = `
        <h2 class="playoffs-title">FASE PLAYOFF</h2>
        <p class="playoffs-subtitle">DOBLE CLIC PARA INTRODUCIR RESULTADO</p>
        <div class="playoffs-grid" id="playoffs-grid"></div>`;

    const grid = wrapper.querySelector('#playoffs-grid');
    playoffsData.forEach((pd,i) => {
        const el = document.createElement('div');
        el.className = 'playoff-match';
        el.id = `plmatch-${i}`;
        renderPlayoffMatch(el, pd);
        el.ondblclick = () => abrirModalResultado(
            pd.t1, pd.t2, pd.s1, pd.s2,
            (s1,s2) => {
                pd.s1=s1; pd.s2=s2;
                pd.ganador = s1>s2 ? pd.t1 : pd.t2;
                renderPlayoffMatch(el, pd);
                el.classList.add('done');
            }
        );
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
            <div><span class="playoff-seed">#${pd.seed1}</span>
            <img src="${pd.t1.logo}" onerror="this.style.display='none'"></div>
            <span>${pd.t1.nombre}</span>
        </div>
        <div class="playoff-vs">VS</div>
        <div class="playoff-team ${t2L?'loser':''}" style="flex-direction:row-reverse;text-align:right">
            <div><span class="playoff-seed">#${pd.seed2}</span>
            <img src="${pd.t2.logo}" onerror="this.style.display='none'"></div>
            <span>${pd.t2.nombre}</span>
        </div>
        <div class="playoff-done-badge">${pd.ganador?'✓':'—'}</div>`;
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
        if(isNaN(s1)||isNaN(s2)||s1===s2){ alert('Resultado inválido (no puede haber empate).'); return; }
        modal.classList.remove('active');
        onConfirm(s1,s2);
    };
}

// ----------------------------------------------------------------
// BRACKET FINAL (Cuartos → Semis → Final)
// ----------------------------------------------------------------
btnBracket.addEventListener('click', () => {
    iniciarBracket();
    btnBracket.style.display = 'none';
});

function iniciarBracket() {
    const ranking = getRanking();
    const top4 = ranking.slice(0,4).map(r=>r.eq);
    const gpWinners = playoffsData.map(pd => pd.ganador || { nombre:'TBD', logo:'' });

    // Cuartos de final (4 partidos):
    // QF1: #1 vs GP4  |  QF2: #2 vs GP3
    // QF3: #3 vs GP2  |  QF4: #4 vs GP1
    bracketData = {
        qf: [
            { id:'qf0', t1:top4[0], t2:gpWinners[3], s1:'', s2:'', ganador:null },
            { id:'qf1', t1:top4[1], t2:gpWinners[2], s1:'', s2:'', ganador:null },
            { id:'qf2', t1:top4[2], t2:gpWinners[1], s1:'', s2:'', ganador:null },
            { id:'qf3', t1:top4[3], t2:gpWinners[0], s1:'', s2:'', ganador:null },
        ],
        sf: [
            { id:'sf0', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
            { id:'sf1', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
        ],
        fn: [
            { id:'fn0', t1:{nombre:'TBD',logo:''}, t2:{nombre:'TBD',logo:''}, s1:'', s2:'', ganador:null },
        ]
    };

    renderBracket();
}

function renderBracket() {
    container.innerHTML = '';

    const outer = document.createElement('div');
    outer.className = 'bracket-outer';

    const bc = document.createElement('div');
    bc.className = 'bracket-container';

    // Columna QF
    const colQF = crearColumna('CUARTOS DE FINAL', bracketData.qf, 'qf');
    // Columna SF
    const colSF = crearColumna('SEMIFINALES', bracketData.sf, 'sf');
    // Columna Final
    const colFN = crearColumna('⚡ GRAN FINAL', bracketData.fn, 'fn');

    bc.appendChild(colQF);
    bc.appendChild(colSF);
    bc.appendChild(colFN);

    outer.appendChild(bc);
    container.appendChild(outer);
}

function crearColumna(titulo, partidos, fase) {
    const col = document.createElement('div');
    col.className = 'bracket-column';
    col.id = `col-${fase}`;

    const tit = document.createElement('div');
    tit.className = 'bracket-col-title';
    tit.textContent = titulo;
    col.appendChild(tit);

    // Espaciado vertical para alinear con la siguiente columna
    const alturas = { qf: [0,1,2,3], sf: [0.5, 2.5], fn: [1.5] };
    const gaps    = { qf: 15, sf: 15, fn: 15 };
    const boxH    = 100; // altura aprox de un match-box en px

    partidos.forEach((p, i) => {
        const box = crearMatchBox(p, fase, i);
        col.appendChild(box);
    });

    return col;
}

function crearMatchBox(p, fase, idx) {
    const box = document.createElement('div');
    box.className = 'match-box' + (fase==='fn'?' final-box':'');
    box.id = `mb-${p.id}`;

    const esTBD = p.t1.nombre==='TBD' || p.t2.nombre==='TBD';
    if(esTBD) box.classList.add('tbd');

    renderMatchBox(box, p);

    if(!esTBD) {
        box.ondblclick = () => {
            abrirModalResultado(p.t1, p.t2, p.s1, p.s2, (s1,s2) => {
                p.s1=s1; p.s2=s2;
                p.ganador = s1>s2 ? p.t1 : p.t2;
                renderMatchBox(box, p);
                avanzarBracket(fase, idx, p.ganador);
                if(fase==='fn') setTimeout(()=>mostrarCampeon(p.ganador.nombre, p.ganador.logo), 400);
            });
        };
    }

    return box;
}

function renderMatchBox(box, p) {
    const g = p.ganador?.nombre;
    const t1L = g && g!==p.t1.nombre;
    const t2L = g && g!==p.t2.nombre;
    const img = eq => eq.logo ? `<img src="${eq.logo}" onerror="this.style.display='none'">` : `<div style="width:28px;height:28px;background:#222;border-radius:4px"></div>`;
    box.innerHTML = `
        <div class="mtr ${t1L?'loser':''}">
            ${img(p.t1)}
            <span class="mtr-name">${p.t1.nombre}</span>
            ${g?`<span class="mtr-score">${p.s1}</span>`:''}
        </div>
        <div class="vs-line"></div>
        <div class="mtr ${t2L?'loser':''}">
            ${img(p.t2)}
            <span class="mtr-name">${p.t2.nombre}</span>
            ${g?`<span class="mtr-score">${p.s2}</span>`:''}
        </div>`;
}

function avanzarBracket(fase, idx, ganador) {
    // QF → SF: QF0→SF0.t1, QF1→SF0.t2, QF2→SF1.t1, QF3→SF1.t2
    // SF → FN: SF0→FN0.t1, SF1→FN0.t2
    let destFase, destIdx, destSlot;

    if(fase==='qf') {
        destFase='sf';
        destIdx = idx<2 ? 0 : 1;
        destSlot = idx%2===0 ? 't1' : 't2';
    } else if(fase==='sf') {
        destFase='fn'; destIdx=0;
        destSlot = idx===0 ? 't1' : 't2';
    } else return;

    const arr = destFase==='sf' ? bracketData.sf : bracketData.fn;
    arr[destIdx][destSlot] = ganador;

    // Re-renderizar el match destino
    const destBox = document.getElementById(`mb-${arr[destIdx].id}`);
    if(!destBox) return;
    renderMatchBox(destBox, arr[destIdx]);

    // Si ya tiene los 2 equipos, activar dblclick
    const p = arr[destIdx];
    if(p.t1.nombre!=='TBD' && p.t2.nombre!=='TBD') {
        destBox.classList.remove('tbd');
        destBox.ondblclick = () => {
            abrirModalResultado(p.t1, p.t2, p.s1, p.s2, (s1,s2) => {
                p.s1=s1; p.s2=s2;
                p.ganador = s1>s2 ? p.t1 : p.t2;
                renderMatchBox(destBox, p);
                avanzarBracket(destFase, destIdx, p.ganador);
                if(destFase==='fn') setTimeout(()=>mostrarCampeon(p.ganador.nombre, p.ganador.logo), 400);
            });
        };
    }
}

// ----------------------------------------------------------------
// CAMPEÓN
// ----------------------------------------------------------------
function mostrarCampeon(nombre, logo) {
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
    if(audioChamp){ audioChamp.currentTime=0; audioChamp.play(); }
    setTimeout(()=>ov.classList.add('active'), 100);
}

// ----------------------------------------------------------------
// UTILS
// ----------------------------------------------------------------
function shuffle(arr) {
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
}
