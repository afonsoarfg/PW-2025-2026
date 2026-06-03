# GREENHERB - Plataforma Web de Gestao Inteligente de uma Estufa

## Descricao

Aplicacao web full-stack para gestao de uma estufa de ervas aromaticas. Permite gerir lotes de cultivo, planos de cultivo, medicoes ambientais, alertas e intervencoes operacionais, com autenticacao por perfil e suporte a funcionamento offline.

---

## Tecnologias

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Base de Dados: MongoDB com Mongoose
- Autenticacao: JWT (JSON Web Tokens)
- Armazenamento no Browser: localStorage, IndexedDB, Cache API (Service Worker)
- Documentacao da API: OpenAPI 3.x

---

## Estrutura do Projeto

```
PW-2025-2026/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Utilizador.js
│   │   │   ├── ErvaAromatica.js
│   │   │   ├── PlanoCultivo.js
│   │   │   ├── LoteCultivo.js
│   │   │   ├── Tarefa.js
│   │   │   ├── MedicaoAmbiental.js
│   │   │   ├── Alerta.js
│   │   │   └── LogAuditoria.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── ervas.js
│   │   │   ├── planos.js
│   │   │   ├── lotes.js
│   │   │   ├── tarefas.js
│   │   │   ├── medicoes.js
│   │   │   ├── alertas.js
│   │   │   └── logs.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── audit.js
│   │   └── app.js
│   ├── .env
│   └── openapi.yaml
└── frontend/
    ├── index.html
    ├── style.css
    ├── script.js
    ├── sw.js
    └── ervas.csv
```

---

## Pre-requisitos

- Node.js v18 ou superior
- MongoDB instalado e a correr localmente
- npm

---

## Instalacao e Configuracao

### 1. Clonar o repositorio

```bash
git clone https://github.com/afonsoarfg/PW-2025-2026.git
cd PW-2025-2026
```

### 2. Instalar dependencias do backend

```bash
cd backend
npm install
```

### 3. Configurar o ficheiro .env

Criar um ficheiro `.env` dentro da pasta `backend` com o seguinte conteudo:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/greenherb
JWT_SECRET=greenherb_secret_key_2025
```

### 4. Iniciar o MongoDB

Garantir que o MongoDB esta a correr localmente na porta 27017.

### 5. Iniciar o servidor

```bash
cd backend
npm start
```

O servidor fica disponivel em http://localhost:3000.

---

## Criar o Primeiro Administrador

Antes de usar a aplicacao, e necessario criar o primeiro utilizador Administrador. Fazer um pedido POST para a API:

- URL: http://localhost:3000/api/auth/register
- Metodo: POST
- Body (JSON):

```json
{
  "nome": "Administrador",
  "email": "admin@greenherb.com",
  "password": "admin123",
  "perfil": "Administrador"
}
```

A partir dai, o Administrador pode criar outros utilizadores pelo painel de gestao.

---

## Aceder ao Frontend

Abrir o ficheiro `frontend/index.html` diretamente no browser ou servir a pasta com um servidor estatico.

---

## Importar Ervas Aromaticas

A aplicacao inclui um ficheiro `frontend/ervas.csv` com dados de demonstracao. Para importar:

1. Fazer login como Administrador ou Responsavel
2. Na seccao "Importacao em Lote (CSV)", selecionar o ficheiro `ervas.csv`
3. Clicar em "Processar e Importar CSV"

---

## Perfis de Utilizador

| Perfil | Permissoes |
|--------|-----------|
| Tecnico | Criar lotes, registar medicoes e tarefas, ver alertas |
| Responsavel | Tudo do Tecnico mais autorizar planos pontuais, gerir planos, importar CSV |
| Administrador | Acesso total, incluindo gestao de utilizadores e logs de auditoria |

---

## Endpoints da API

A documentacao completa da API esta disponivel no ficheiro `backend/openapi.yaml`.

Principais endpoints:

- POST /api/auth/register - Registar utilizador
- POST /api/auth/login - Login
- GET/POST /api/ervas - Gestao de ervas aromaticas
- POST /api/ervas/importar - Importar ervas via CSV
- GET/POST /api/planos - Gestao de planos de cultivo
- PUT /api/planos/:id/autorizar - Autorizar plano pontual
- GET/POST /api/lotes - Gestao de lotes de cultivo
- GET/POST /api/tarefas - Gestao de tarefas operacionais
- POST /api/medicoes - Registar medicao ambiental
- GET /api/alertas/ativos - Ver alertas ativos
- PUT /api/alertas/:id/resolver - Resolver alerta
- PUT /api/alertas/:id/ignorar - Ignorar alerta com justificacao
- GET /api/logs - Ver logs de auditoria (Admin)
- GET /api/logs/exportar - Exportar logs em CSV (Admin)

---

## Funcionamento Offline

A aplicacao suporta funcionamento em modo offline:

- Os ficheiros estaticos (HTML, CSS, JS) sao guardados em cache pelo Service Worker
- Medicoes ambientais e tarefas operacionais registadas sem internet sao guardadas na IndexedDB
- Quando a ligacao e restabelecida, os dados sao sincronizados automaticamente com a API

---


## Autores

Trabalho Pratico de Programacao Web - 2025/2026
Afonso Goncalves -- 48583
Duarte Rufino -- 54539