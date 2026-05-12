if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('[INFO] Service Worker registrado com sucesso'))
            .catch(err => console.log('[INFO] SW failed.', err));
    });
}

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
};

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
        modo: document.querySelector('input[name="modo"]:checked').value,
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
        alert("Plano guardado com sucesso na base de dados local!");
        document.getElementById('formPlano').reset();
        Object.values(secoes).forEach(s => s.classList.add('hidden'));
        secoes.regular.classList.remove('hidden');
    };

    addRequest.onerror = function () {
        console.error("Erro ao guardar o plano.");
    };
});