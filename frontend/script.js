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

let db;
let request = indexedDB.open("GreenHerbDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    db.createObjectStore("planos", { keyPath: "id" });
    console.log("Estrutura da IndexedDB criada/atualizada");
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Conexão com IndexedDB estabelecida");
    verificarEstadoSessao();
};

function verificarEstadoSessao() {
    const blocoLogin = document.getElementById('blocoLogin');
    const conteudoApp = document.getElementById('conteudoApp');
    const blocoCSV = document.getElementById('blocoCSV');
    const blocoUsuarios = document.getElementById('blocoUsuarios');
    const saudacaoUser = document.getElementById('saudacaoUser');

    if (token && utilizadorLigado) {
        blocoLogin.classList.add('hidden');
        conteudoApp.classList.remove('hidden');
        saudacaoUser.textContent = `Olá, ${utilizadorLigado.nome} (${utilizadorLigado.perfil})`;

        if (utilizadorLigado.perfil === 'Administrador') {
            blocoCSV.classList.remove('hidden');
            blocoUsuarios.classList.remove('hidden');
        } else if (utilizadorLigado.perfil === 'Responsável') {
            blocoCSV.classList.remove('hidden');
            blocoUsuarios.classList.add('hidden');
        } else { 
            blocoCSV.classList.add('hidden');
            blocoUsuarios.classList.add('hidden');
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

        if (!response.ok) {
            throw new Error(dados.erro || 'Erro ao efetuar login.');
        }

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
            headers: {
                'Authorization': `Bearer ${token}` 
            },
            body: formData
        });

        const dados = await response.json();

        if (!response.ok) {
            throw new Error(dados.erro || 'Erro ao importar CSV.');
        }

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

        if (!response.ok) {
            throw new Error(dados.erro || 'Erro ao criar colaborador.');
        }

        alert("Colaborador registado com sucesso no sistema!");
        document.getElementById('formNovoUsuario').reset();

    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('formPlano').addEventListener('submit', function (event) {
    event.preventDefault();

    if (!db) {
        alert("Erro: Base de dados não carregada.");
        return;
    }

    const transaction = db.transaction(["planos"], "readwrite");
    const store = transaction.objectStore("planos");

    const novoPlano = {
        id: Date.now(),
        lote: document.getElementById('nomeLote').value,
        estadoLote: document.getElementById('estadoLote').value,
        tipoPlano: tipoPlano.value,
        erva: document.getElementById('tipoErva').value,
        modo: document.querySelector('input[name=\"modo\"]:checked').value,
        dataCriacao: new Date().toLocaleString()
    };

    if (tipoPlano.value === 'regular') {
        novoPlano.temp = document.getElementById('tempIdeal').value;
        novoPlano.hum = document.getElementById('humIdeal').value;
    } else if (tipoPlano.value === 'emergencia') {
        novoPlano.praga = document.getElementById('tipoPraga').value;
    }

    const addRequest = store.add(novoPlano);

    addRequest.onsuccess = function () {
        alert("Plano guardado com sucesso na base de dados local (IndexedDB)!");
        document.getElementById('formPlano').reset();
        Object.values(secoes).forEach(s => s.classList.add('hidden'));
        secoes.regular.classList.remove('hidden');
    };

    addRequest.onerror = function () {
        console.error("Erro ao guardar o plano.");
    };
});