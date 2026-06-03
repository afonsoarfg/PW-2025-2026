// Regista o Service Worker para suporte offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('[INFO] Service Worker registrado com sucesso'))
            .catch(err => console.log('[INFO] SW failed.', err));
    });
}

const API_URL = "http://localhost:3000/api";
let token = localStorage.getItem("greenherb_token") || null;
let utilizadorLigado = JSON.parse(localStorage.getItem("greenherb_user")) || null;

const tipoPlano = document.getElementById('tipoPlano');
const secoes = {
    regular: document.getElementById('secaoRegular'),
    emergencia: document.getElementById('secaoEmergencia'),
    pontual: document.getElementById('secaoPontual')
};

tipoPlano.addEventListener('change', () => {
    Object.values(secoes).forEach(s => s.classList.add('hidden'));
    const selecionada = tipoPlano.value;
    if (secoes[selecionada]) secoes[selecionada].classList.remove('hidden');
});

// Abre a IndexedDB com versão 2 para suportar medições e tarefas offline
let db;
let request = indexedDB.open("GreenHerbDB", 2);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('planos')) {
        db.createObjectStore("planos", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains('medicoesPendentes')) {
        db.createObjectStore("medicoesPendentes", { autoIncrement: true, keyPath: "id" });
    }
    if (!db.objectStoreNames.contains('tarefasPendentes')) {
        db.createObjectStore("tarefasPendentes", { autoIncrement: true, keyPath: "id" });
    }
    console.log("Estrutura da IndexedDB criada/atualizada");
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Conexão com IndexedDB estabelecida");
    verificarEstadoSessao();
};

request.onerror = function (event) {
    console.error("Erro ao abrir IndexedDB:", event.target.error);
};

// Guarda uma medição pendente na IndexedDB quando não há internet
function guardarMedicaoPendente(dados) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('medicoesPendentes', 'readwrite');
        const store = tx.objectStore('medicoesPendentes');
        const req = store.add({ ...dados, timestamp: new Date().toISOString() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Guarda uma tarefa pendente na IndexedDB quando não há internet
function guardarTarefaPendente(dados) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tarefasPendentes', 'readwrite');
        const store = tx.objectStore('tarefasPendentes');
        const req = store.add({ ...dados, timestamp: new Date().toISOString() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Lê todas as medições pendentes da IndexedDB
function lerMedicoesPendentes() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('medicoesPendentes', 'readonly');
        const store = tx.objectStore('medicoesPendentes');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Lê todas as tarefas pendentes da IndexedDB
function lerTarefasPendentes() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tarefasPendentes', 'readonly');
        const store = tx.objectStore('tarefasPendentes');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Apaga uma medição pendente da IndexedDB depois de sincronizar
function apagarMedicaoPendente(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('medicoesPendentes', 'readwrite');
        const store = tx.objectStore('medicoesPendentes');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Apaga uma tarefa pendente da IndexedDB depois de sincronizar
function apagarTarefaPendente(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('tarefasPendentes', 'readwrite');
        const store = tx.objectStore('tarefasPendentes');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Sincroniza as operações pendentes com a API quando a internet voltar
async function sincronizarPendentes() {
    if (!navigator.onLine) return;

    const medicoes = await lerMedicoesPendentes();
    for (const m of medicoes) {
        try {
            const response = await fetch(`${API_URL}/medicoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loteCultivo: m.loteCultivo,
                    temperatura: m.temperatura,
                    humidade: m.humidade,
                    luminosidade: m.luminosidade
                })
            });
            if (response.ok) {
                await apagarMedicaoPendente(m.id);
                console.log('[SYNC] Medição sincronizada:', m.id);
            }
        } catch (err) {
            console.error('[SYNC] Erro ao sincronizar medição:', err);
        }
    }

    const tarefas = await lerTarefasPendentes();
    for (const t of tarefas) {
        try {
            const response = await fetch(`${API_URL}/tarefas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loteCultivo: t.loteCultivo,
                    tipo: t.tipo,
                    descricao: t.descricao
                })
            });
            if (response.ok) {
                await apagarTarefaPendente(t.id);
                console.log('[SYNC] Tarefa sincronizada:', t.id);
            }
        } catch (err) {
            console.error('[SYNC] Erro ao sincronizar tarefa:', err);
        }
    }

    if (medicoes.length > 0 || tarefas.length > 0) {
        alert(`Sincronização concluída! ${medicoes.length} medição(ões) e ${tarefas.length} tarefa(s) enviadas.`);
        carregarAlertas();
        carregarTarefasPendentes();
    }
}

// Deteta quando a internet volta e sincroniza automaticamente
window.addEventListener('online', () => {
    console.log('[INFO] Internet restabelecida - a sincronizar...');
    sincronizarPendentes();
});

function verificarEstadoSessao() {
    const blocoLogin = document.getElementById('blocoLogin');
    const conteudoApp = document.getElementById('conteudoApp');
    const blocoCSV = document.getElementById('blocoCSV');
    const blocoUsuarios = document.getElementById('blocoUsuarios');
    const blocoPlanosPendentes = document.getElementById('blocoPlanosPendentes');
    const blocoListaUtilizadores = document.getElementById('blocoListaUtilizadores');
    const blocoListaPlanos = document.getElementById('blocoListaPlanos');
    const saudacaoUser = document.getElementById('saudacaoUser');

    if (token && utilizadorLigado) {
        blocoLogin.classList.add('hidden');
        conteudoApp.classList.remove('hidden');
        saudacaoUser.textContent = `Olá, ${utilizadorLigado.nome} (${utilizadorLigado.perfil})`;

        carregarErvas();
        carregarPlanos();
        carregarLotes();
        carregarLotesSelect();
        carregarTarefasPendentes();
        carregarLotesMedicao();
        carregarAlertas();

        if (utilizadorLigado.perfil === 'Administrador') {
            blocoCSV.classList.remove('hidden');
            blocoUsuarios.classList.remove('hidden');
            blocoPlanosPendentes.classList.remove('hidden');
            blocoListaUtilizadores.classList.remove('hidden');
            blocoListaPlanos.classList.remove('hidden');
            document.getElementById('blocoLogs').classList.remove('hidden');
            carregarLogs();
            carregarUtilizadores();
            carregarPlanosPendentes();
            carregarTodosPlanos();
        } else if (utilizadorLigado.perfil === 'Responsavel') {
            blocoCSV.classList.remove('hidden');
            blocoUsuarios.classList.add('hidden');
            blocoPlanosPendentes.classList.remove('hidden');
            blocoListaUtilizadores.classList.add('hidden');
            blocoListaPlanos.classList.remove('hidden');
            document.getElementById('blocoLogs').classList.add('hidden');
            carregarPlanosPendentes();
            carregarTodosPlanos();
        } else {
            blocoCSV.classList.add('hidden');
            blocoUsuarios.classList.add('hidden');
            blocoPlanosPendentes.classList.add('hidden');
            blocoListaUtilizadores.classList.add('hidden');
            blocoListaPlanos.classList.add('hidden');
            document.getElementById('blocoLogs').classList.add('hidden');
        }
    } else {
        blocoLogin.classList.remove('hidden');
        conteudoApp.classList.add('hidden');
    }
}

document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao efetuar login.');

        token = dados.token;
        utilizadorLigado = dados.utilizador;
        localStorage.setItem("greenherb_token", token);
        localStorage.setItem("greenherb_user", JSON.stringify(utilizadorLigado));

        alert("Login efetuado com sucesso!");
        document.getElementById('formLogin').reset();
        verificarEstadoSessao();
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    token = null;
    utilizadorLigado = null;
    localStorage.removeItem("greenherb_token");
    localStorage.removeItem("greenherb_user");
    alert("Sessão terminada.");
    verificarEstadoSessao();
});

document.getElementById('formCSV').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('fileCSV');
    if (fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/ervas/importar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao importar CSV.');

        alert(dados.mensagem);
        document.getElementById('formCSV').reset();
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('formNovoUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const perfil = document.getElementById('regPerfil').value;

    try {
        const response = await fetch(`${API_URL}/auth/utilizadores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome, email, password, perfil })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao criar colaborador.');

        alert("Colaborador registado com sucesso!");
        document.getElementById('formNovoUsuario').reset();
        carregarUtilizadores();
    } catch (err) {
        alert(err.message);
    }
});

async function carregarPlanosPendentes() {
    try {
        const response = await fetch(`${API_URL}/planos/pendentes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const planos = await response.json();
        const lista = document.getElementById('listaPlanosPendentes');

        if (!response.ok) { lista.innerHTML = '<p>Erro ao carregar planos.</p>'; return; }
        if (!Array.isArray(planos) || planos.length === 0) { lista.innerHTML = '<p>Não há planos pendentes.</p>'; return; }

        lista.innerHTML = planos.map(plano => `
            <div style="border: 1px solid #f57c00; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <p><strong>Erva:</strong> ${plano.ervaAromatica?.nome || 'N/A'}</p>
                <p><strong>Criado por:</strong> ${plano.criadoPor?.nome || 'N/A'}</p>
                <p><strong>Data:</strong> ${new Date(plano.createdAt).toLocaleString()}</p>
                <button onclick="autorizarPlano('${plano._id}')" style="background-color: #2e7d32; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Autorizar</button>
                <button onclick="apagarPlano('${plano._id}')" style="background-color: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Apagar</button>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar planos pendentes: ' + err.message);
    }
}

async function autorizarPlano(id) {
    try {
        const response = await fetch(`${API_URL}/planos/${id}/autorizar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao autorizar plano.');

        alert('Plano autorizado com sucesso!');
        carregarPlanosPendentes();
    } catch (err) {
        alert(err.message);
    }
}

async function apagarPlano(id) {
    if (!confirm('Tens a certeza que queres apagar este plano?')) return;

    try {
        const response = await fetch(`${API_URL}/planos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao apagar plano.');

        alert('Plano apagado com sucesso!');
        carregarPlanosPendentes();
        carregarTodosPlanos();
        carregarPlanos();
    } catch (err) {
        alert(err.message);
    }
}

async function editarPlanoRegular(id, tempMin, tempMax, humMin, humMax, luzMin, luzMax, rega, duracao) {
    const novoTempMin = prompt('Temperatura Mínima (°C):', tempMin);
    if (novoTempMin === null) return;
    const novoTempMax = prompt('Temperatura Máxima (°C):', tempMax);
    if (novoTempMax === null) return;
    const novoHumMin = prompt('Humidade Mínima (%):', humMin);
    if (novoHumMin === null) return;
    const novoHumMax = prompt('Humidade Máxima (%):', humMax);
    if (novoHumMax === null) return;
    const novoLuzMin = prompt('Luminosidade Mínima (lux):', luzMin);
    if (novoLuzMin === null) return;
    const novoLuzMax = prompt('Luminosidade Máxima (lux):', luzMax);
    if (novoLuzMax === null) return;
    const novoRega = prompt('Plano de Rega:', rega);
    if (novoRega === null) return;
    const novoDuracao = prompt('Duração do ciclo (dias):', duracao);
    if (novoDuracao === null) return;

    try {
        const response = await fetch(`${API_URL}/planos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                temperaturaMin: Number(novoTempMin),
                temperaturaMax: Number(novoTempMax),
                humidadeMin: Number(novoHumMin),
                humidadeMax: Number(novoHumMax),
                luminosidadeMin: Number(novoLuzMin),
                luminosidadeMax: Number(novoLuzMax),
                planoRega: novoRega,
                duracaoCiclo: Number(novoDuracao)
            })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao editar plano.');

        alert('Plano atualizado com sucesso!');
        carregarTodosPlanos();
    } catch (err) {
        alert(err.message);
    }
}

async function editarPlanoEmergencia(id, tipoInt, dosagem, intervalo) {
    const novoTipo = prompt('Tipo de Intervenção:', tipoInt);
    if (novoTipo === null) return;
    const novaDosagem = prompt('Dosagem:', dosagem);
    if (novaDosagem === null) return;
    const novoIntervalo = prompt('Intervalo Mínimo (horas):', intervalo);
    if (novoIntervalo === null) return;

    try {
        const response = await fetch(`${API_URL}/planos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tipoIntervencao: novoTipo,
                dosagem: novaDosagem,
                intervaloMinIntervencoes: Number(novoIntervalo)
            })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao editar plano.');

        alert('Plano atualizado com sucesso!');
        carregarTodosPlanos();
    } catch (err) {
        alert(err.message);
    }
}

async function editarEstadoLote(id, estadoAtual) {
    const novoEstado = prompt('Novo estado (ativo / concluido / comprometido):', estadoAtual);
    if (!novoEstado) return;
    if (!['ativo', 'concluido', 'comprometido'].includes(novoEstado)) {
        alert('Estado inválido! Use: ativo, concluido ou comprometido');
        return;
    }

    let perdas = 0;
    let quantidadeFinal = 0;
    let dataFim = null;

    if (novoEstado === 'concluido' || novoEstado === 'comprometido') {
        const p = prompt('Quantidade de perdas (plantas):');
        if (p !== null) perdas = Number(p);
        const q = prompt('Quantidade final (plantas):');
        if (q !== null) quantidadeFinal = Number(q);
        dataFim = new Date().toISOString();
    }

    try {
        const response = await fetch(`${API_URL}/lotes/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado: novoEstado, perdas, quantidadeFinal, dataFim })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar estado.');

        alert('Estado do lote atualizado!');
        carregarLotes();
    } catch (err) {
        alert(err.message);
    }
}

async function carregarUtilizadores() {
    try {
        const response = await fetch(`${API_URL}/auth/utilizadores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const utilizadores = await response.json();
        const lista = document.getElementById('listaUtilizadores');

        if (utilizadores.length === 0) { lista.innerHTML = '<p>Não há utilizadores registados.</p>'; return; }

        lista.innerHTML = utilizadores.map(u => `
            <div style="border: 1px solid #1976d2; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <p><strong>Nome:</strong> ${u.nome}</p>
                <p><strong>Email:</strong> ${u.email}</p>
                <p><strong>Perfil atual:</strong> ${u.perfil}</p>
                <select id="perfil_${u._id}">
                    <option value="Tecnico" ${u.perfil === 'Tecnico' ? 'selected' : ''}>Técnico</option>
                    <option value="Responsavel" ${u.perfil === 'Responsavel' ? 'selected' : ''}>Responsável</option>
                    <option value="Administrador" ${u.perfil === 'Administrador' ? 'selected' : ''}>Administrador</option>
                </select>
                <button onclick="atualizarPerfil('${u._id}')" style="background-color: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Atualizar Perfil</button>
                <button onclick="apagarUtilizador('${u._id}')" style="background-color: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Apagar</button>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar utilizadores: ' + err.message);
    }
}

async function atualizarPerfil(id) {
    const perfil = document.getElementById(`perfil_${id}`).value;

    try {
        const response = await fetch(`${API_URL}/auth/utilizadores/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ perfil })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar perfil.');

        alert('Perfil atualizado com sucesso!');
        carregarUtilizadores();
    } catch (err) {
        alert(err.message);
    }
}

async function apagarUtilizador(id) {
    if (!confirm('Tens a certeza que queres apagar este utilizador?')) return;

    try {
        const response = await fetch(`${API_URL}/auth/utilizadores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao apagar utilizador.');

        alert('Utilizador apagado com sucesso!');
        carregarUtilizadores();
    } catch (err) {
        alert(err.message);
    }
}

async function carregarTodosPlanos() {
    try {
        const response = await fetch(`${API_URL}/planos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const planos = await response.json();
        const listaRegulares = document.getElementById('listaplanosRegulares');
        const listaEmergencia = document.getElementById('listaplanosEmergencia');

        const regulares = planos.filter(p => p.tipo === 'regular');
        const emergencia = planos.filter(p => p.tipo === 'emergencia');

        if (regulares.length === 0) {
            listaRegulares.innerHTML = '<p>Não há planos regulares.</p>';
        } else {
            listaRegulares.innerHTML = regulares.map(p => `
                <div style="border: 1px solid #2e7d32; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                    <p><strong>Erva:</strong> ${p.ervaAromatica?.nome || 'N/A'}</p>
                    <p><strong>Temp:</strong> ${p.temperaturaMin}°C - ${p.temperaturaMax}°C</p>
                    <p><strong>Humidade:</strong> ${p.humidadeMin}% - ${p.humidadeMax}%</p>
                    <p><strong>Luminosidade:</strong> ${p.luminosidadeMin} - ${p.luminosidadeMax} lux</p>
                    <p><strong>Rega:</strong> ${p.planoRega || 'N/A'}</p>
                    <p><strong>Duração:</strong> ${p.duracaoCiclo} dias</p>
                    <p><strong>Criado por:</strong> ${p.criadoPor?.nome || 'N/A'}</p>
                    <button onclick="editarPlanoRegular('${p._id}', ${p.temperaturaMin}, ${p.temperaturaMax}, ${p.humidadeMin}, ${p.humidadeMax}, ${p.luminosidadeMin}, ${p.luminosidadeMax}, '${p.planoRega || ''}', ${p.duracaoCiclo})" style="background-color: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>
                    <button onclick="apagarPlano('${p._id}')" style="background-color: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Apagar</button>
                </div>
            `).join('');
        }

        if (emergencia.length === 0) {
            listaEmergencia.innerHTML = '<p>Não há planos de emergência.</p>';
        } else {
            listaEmergencia.innerHTML = emergencia.map(p => `
                <div style="border: 1px solid #c62828; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                    <p><strong>Erva:</strong> ${p.ervaAromatica?.nome || 'N/A'}</p>
                    <p><strong>Tipo de Intervenção:</strong> ${p.tipoIntervencao || 'N/A'}</p>
                    <p><strong>Dosagem:</strong> ${p.dosagem || 'N/A'}</p>
                    <p><strong>Intervalo mínimo:</strong> ${p.intervaloMinIntervencoes || 'N/A'} horas</p>
                    <p><strong>Criado por:</strong> ${p.criadoPor?.nome || 'N/A'}</p>
                    <button onclick="editarPlanoEmergencia('${p._id}', '${p.tipoIntervencao || ''}', '${p.dosagem || ''}', ${p.intervaloMinIntervencoes || 0})" style="background-color: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>
                    <button onclick="apagarPlano('${p._id}')" style="background-color: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Apagar</button>
                </div>
            `).join('');
        }
    } catch (err) {
        alert('Erro ao carregar planos: ' + err.message);
    }
}

document.getElementById('formPlano').addEventListener('submit', async function (event) {
    event.preventDefault();

    const tipoSelecionado = tipoPlano.value;
    const erva = document.getElementById('tipoErva').value;

    const dadosPlano = {
        tipo: tipoSelecionado,
        ervaAromatica: erva,
        modo: document.querySelector('input[name="modo"]:checked').value,
        classeAlerta: document.getElementById('classeAlerta').value
    };

    if (tipoSelecionado === 'regular') {
        dadosPlano.temperaturaMin = Number(document.getElementById('tempMin').value);
        dadosPlano.temperaturaMax = Number(document.getElementById('tempMax').value);
        dadosPlano.humidadeMin = Number(document.getElementById('humMin').value);
        dadosPlano.humidadeMax = Number(document.getElementById('humMax').value);
        dadosPlano.luminosidadeMin = Number(document.getElementById('luzMin').value);
        dadosPlano.luminosidadeMax = Number(document.getElementById('luzMax').value);
        dadosPlano.planoRega = document.getElementById('planoRega').value;
        dadosPlano.duracaoCiclo = Number(document.getElementById('duracaoCiclo').value);
    } else if (tipoSelecionado === 'emergencia') {
        dadosPlano.tipoIntervencao = document.getElementById('tipoPraga').value;
        dadosPlano.dosagem = document.getElementById('dosagem').value;
        dadosPlano.intervaloMinIntervencoes = Number(document.getElementById('intervaloMin').value);
    }

    try {
        const response = await fetch(`${API_URL}/planos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosPlano)
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao criar plano.');

        if (tipoSelecionado === 'pontual') {
            alert('Plano pontual criado! A aguardar autorização do Responsável ou Administrador.');
        } else {
            alert('Plano criado com sucesso!');
        }

        await carregarPlanos();
        await carregarErvas();
        document.getElementById('planoLote').value = dados._id;
        document.getElementById('ervaLote').value = dadosPlano.ervaAromatica;
        document.getElementById('ervaLote').disabled = true;

        carregarTodosPlanos();

        document.getElementById('formPlano').reset();
        Object.values(secoes).forEach(s => s.classList.add('hidden'));
        secoes.regular.classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
});

async function carregarErvas() {
    try {
        const response = await fetch(`${API_URL}/ervas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ervas = await response.json();

        ['tipoErva', 'ervaLote'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            select.innerHTML = '';
            ervas.forEach(erva => {
                const option = document.createElement('option');
                option.value = erva._id;
                option.textContent = erva.nome;
                select.appendChild(option);
            });
        });
    } catch (err) {
        console.error('Erro ao carregar ervas:', err);
    }
}

async function carregarPlanos() {
    try {
        const response = await fetch(`${API_URL}/planos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const planos = await response.json();
        const select = document.getElementById('planoLote');
        select.innerHTML = '<option value="">Sem plano associado</option>';
        planos.forEach(p => {
            const option = document.createElement('option');
            option.value = p._id;
            option.textContent = `${p.tipo} - ${p.ervaAromatica?.nome || 'N/A'}`;
            option.dataset.ervaId = p.ervaAromatica?._id || '';
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            const opcao = select.options[select.selectedIndex];
            const ervaSelect = document.getElementById('ervaLote');
            const ervaId = opcao.dataset.ervaId;
            if (ervaId) {
                ervaSelect.value = ervaId;
                ervaSelect.disabled = true;
            } else {
                ervaSelect.disabled = false;
            }
        });
    } catch (err) {
        console.error('Erro ao carregar planos:', err);
    }
}

document.getElementById('formLote').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeLote').value;
    const ervaAromatica = document.getElementById('ervaLote').value;
    const planoLote = document.getElementById('planoLote').value;
    const quantidadeInicial = Number(document.getElementById('quantidadeInicial').value);
    const notas = document.getElementById('notasLote').value;

    const body = { nome, ervaAromatica, quantidadeInicial, notas };
    if (planoLote) body.planoCultivo = planoLote;

    try {
        const response = await fetch(`${API_URL}/lotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao criar lote.');

        alert('Lote criado com sucesso!');
        document.getElementById('formLote').reset();
        document.getElementById('ervaLote').disabled = false;
        carregarLotes();
        carregarLotesSelect();
        carregarLotesMedicao();
    } catch (err) {
        alert(err.message);
    }
});

async function carregarLotes() {
    try {
        const response = await fetch(`${API_URL}/lotes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const lotes = await response.json();
        const lista = document.getElementById('listaLotes');

        if (!lotes.length) { lista.innerHTML = '<p>Não há lotes registados.</p>'; return; }

        lista.innerHTML = lotes.map(l => `
            <div style="border: 1px solid #558b2f; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                <p><strong>Nome:</strong> ${l.nome}</p>
                <p><strong>Erva:</strong> ${l.ervaAromatica?.nome || 'N/A'}</p>
                <p><strong>Plano:</strong> ${l.planoCultivo?.tipo || 'Sem plano'}</p>
                <p><strong>Estado:</strong> <span style="color: ${l.estado === 'ativo' ? '#2e7d32' : l.estado === 'comprometido' ? '#c62828' : '#555'}">${l.estado}</span></p>
                <p><strong>Quantidade inicial:</strong> ${l.quantidadeInicial} plantas</p>
                <p><strong>Perdas:</strong> ${l.perdas} plantas</p>
                <p><strong>Quantidade final:</strong> ${l.quantidadeFinal} plantas</p>
                <p><strong>Criado em:</strong> ${new Date(l.createdAt).toLocaleDateString()}</p>
                ${l.dataFim ? `<p><strong>Data de fim:</strong> ${new Date(l.dataFim).toLocaleDateString()}</p>` : ''}
                <button onclick="editarEstadoLote('${l._id}', '${l.estado}')" style="background-color: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Alterar Estado</button>
                <button onclick="apagarLote('${l._id}')" style="background-color: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Apagar</button>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar lotes: ' + err.message);
    }
}

async function apagarLote(id) {
    if (!confirm('Tens a certeza que queres apagar este lote?')) return;

    try {
        const response = await fetch(`${API_URL}/lotes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao apagar lote.');

        alert('Lote apagado com sucesso!');
        carregarLotes();
        carregarLotesSelect();
        carregarLotesMedicao();
    } catch (err) {
        alert(err.message);
    }
}

async function carregarLotesSelect() {
    try {
        const response = await fetch(`${API_URL}/lotes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const lotes = await response.json();
        const select = document.getElementById('loteTarefa');
        select.innerHTML = '';
        lotes.forEach(l => {
            const option = document.createElement('option');
            option.value = l._id;
            option.textContent = `${l.nome} - ${l.ervaAromatica?.nome || 'N/A'}`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Erro ao carregar lotes:', err);
    }
}

// Cria uma tarefa - se offline guarda na IndexedDB, se online envia para a API
document.getElementById('formTarefa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loteCultivo = document.getElementById('loteTarefa').value;
    const tipo = document.getElementById('tipoTarefa').value;
    const descricao = document.getElementById('descricaoTarefa').value;

    if (!navigator.onLine) {
        await guardarTarefaPendente({ loteCultivo, tipo, descricao });
        alert('Sem internet! Tarefa guardada localmente. Será enviada quando a ligação for restabelecida.');
        document.getElementById('formTarefa').reset();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tarefas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ loteCultivo, tipo, descricao })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao criar tarefa.');

        alert('Tarefa criada com sucesso!');
        document.getElementById('formTarefa').reset();
        carregarTarefasPendentes();
    } catch (err) {
        alert(err.message);
    }
});

async function carregarTarefasPendentes() {
    try {
        const response = await fetch(`${API_URL}/tarefas/pendentes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tarefas = await response.json();
        const lista = document.getElementById('listaTarefasPendentes');

        if (!tarefas.length) { lista.innerHTML = '<p>Não há tarefas pendentes.</p>'; return; }

        lista.innerHTML = tarefas.map(t => `
            <div style="border: 1px solid #00796b; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                <p><strong>Lote:</strong> ${t.loteCultivo?.nome || 'N/A'}</p>
                <p><strong>Tipo:</strong> ${t.tipo}</p>
                <p><strong>Descrição:</strong> ${t.descricao || 'Sem descrição'}</p>
                <p><strong>Criado em:</strong> ${new Date(t.createdAt).toLocaleDateString()}</p>
                <button onclick="executarTarefa('${t._id}')" style="background-color: #2e7d32; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Marcar como Executada</button>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar tarefas: ' + err.message);
    }
}

async function executarTarefa(id) {
    try {
        const response = await fetch(`${API_URL}/tarefas/${id}/executar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao executar tarefa.');

        alert('Tarefa marcada como executada!');
        carregarTarefasPendentes();
    } catch (err) {
        alert(err.message);
    }
}

async function carregarLotesMedicao() {
    try {
        const response = await fetch(`${API_URL}/lotes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const lotes = await response.json();
        const select = document.getElementById('loteMedicao');
        select.innerHTML = '';
        lotes.forEach(l => {
            const option = document.createElement('option');
            option.value = l._id;
            option.textContent = `${l.nome} - ${l.ervaAromatica?.nome || 'N/A'}`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Erro ao carregar lotes:', err);
    }
}

// Regista uma medição - se offline guarda na IndexedDB, se online envia para a API
document.getElementById('formMedicao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loteCultivo = document.getElementById('loteMedicao').value;
    const temperatura = Number(document.getElementById('temperatura').value);
    const humidade = Number(document.getElementById('humidade').value);
    const luminosidade = Number(document.getElementById('luminosidade').value);

    if (!navigator.onLine) {
        await guardarMedicaoPendente({ loteCultivo, temperatura, humidade, luminosidade });
        alert('Sem internet! Medição guardada localmente. Será enviada quando a ligação for restabelecida.');
        document.getElementById('formMedicao').reset();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/medicoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ loteCultivo, temperatura, humidade, luminosidade })
        });

        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao registar medição.');

        if (dados.alertasGerados > 0) {
            alert(`Medição registada! ${dados.alertasGerados} alerta(s) gerado(s) automaticamente!`);
        } else {
            alert('Medição registada com sucesso! Valores dentro dos limites.');
        }

        document.getElementById('formMedicao').reset();
        carregarAlertas();
    } catch (err) {
        alert(err.message);
    }
});

async function carregarAlertas() {
    try {
        const response = await fetch(`${API_URL}/alertas/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const alertas = await response.json();
        const lista = document.getElementById('listaAlertas');

        if (!alertas.length) { lista.innerHTML = '<p>Não há alertas ativos.</p>'; return; }

        lista.innerHTML = alertas.map(a => `
            <div style="border: 1px solid ${a.severidade === 'Critico' ? '#c62828' : a.severidade === 'Aviso' ? '#f57c00' : '#1976d2'}; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: white;">
                <p><strong>Lote:</strong> ${a.loteCultivo?.nome || 'N/A'}</p>
                <p><strong>Mensagem:</strong> ${a.mensagem}</p>
                <p><strong>Severidade:</strong> <span style="color: ${a.severidade === 'Critico' ? '#c62828' : a.severidade === 'Aviso' ? '#f57c00' : '#1976d2'}; font-weight: bold;">${a.severidade}</span></p>
                <p><strong>Data:</strong> ${new Date(a.createdAt).toLocaleString()}</p>
                <button onclick="resolverAlerta('${a._id}')" style="background-color: #2e7d32; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Resolver</button>
                <button onclick="ignorarAlerta('${a._id}')" style="background-color: #f57c00; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Ignorar</button>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar alertas: ' + err.message);
    }
}

async function resolverAlerta(id) {
    try {
        const response = await fetch(`${API_URL}/alertas/${id}/resolver`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao resolver alerta.');
        alert('Alerta resolvido!');
        carregarAlertas();
    } catch (err) {
        alert(err.message);
    }
}

async function ignorarAlerta(id) {
    const justificacao = prompt('Justificação obrigatória para ignorar o alerta:');
    if (!justificacao || justificacao.trim() === '') {
        alert('Tens de introduzir uma justificação!');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/alertas/${id}/ignorar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ justificacao })
        });
        const dados = await response.json();
        if (!response.ok) throw new Error(dados.erro || 'Erro ao ignorar alerta.');
        alert('Alerta ignorado.');
        carregarAlertas();
    } catch (err) {
        alert(err.message);
    }
}

// Carrega os logs de auditoria (só Admin)
async function carregarLogs() {
    try {
        const response = await fetch(`${API_URL}/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await response.json();
        const lista = document.getElementById('listaLogs');

        if (!logs.length) {
            lista.innerHTML = '<p>Não há logs registados.</p>';
            return;
        }

        lista.innerHTML = logs.map(l => `
            <div style="border: 1px solid #37474f; padding: 10px; margin-bottom: 8px; border-radius: 4px; background: white; font-size: 0.9rem;">
                <p><strong>Data:</strong> ${new Date(l.createdAt).toLocaleString()}</p>
                <p><strong>Utilizador:</strong> ${l.utilizador?.nome || 'N/A'} (${l.utilizador?.perfil || 'N/A'})</p>
                <p><strong>Ação:</strong> <span style="color: #37474f; font-weight: bold;">${l.acao}</span></p>
                <p><strong>Entidade:</strong> ${l.entidade}</p>
                <p><strong>Detalhes:</strong> ${l.detalhes || 'N/A'}</p>
            </div>
        `).join('');
    } catch (err) {
        alert('Erro ao carregar logs: ' + err.message);
    }
}

// Exporta os logs em CSV
async function exportarLogs() {
    try {
        const response = await fetch(`${API_URL}/logs/exportar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao exportar logs.');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs-auditoria.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert(err.message);
    }
}