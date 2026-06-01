const express = require('express');
const router = express.Router();
const LogAuditoria = require('../models/LogAuditoria');
const { autenticar, autorizar } = require('../middleware/auth');

// GET /api/logs - ver todos os logs (só Administrador)
router.get('/', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const logs = await LogAuditoria.find()
      .populate('utilizador', 'nome email perfil')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/logs/exportar - exportar logs em CSV (só Administrador)
router.get('/exportar', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const logs = await LogAuditoria.find()
      .populate('utilizador', 'nome email perfil')
      .sort({ createdAt: -1 });

    const linhas = [
      'Data,Utilizador,Email,Perfil,Ação,Entidade,ID Entidade,Detalhes',
      ...logs.map(l => [
        new Date(l.createdAt).toLocaleString(),
        l.utilizador?.nome || 'N/A',
        l.utilizador?.email || 'N/A',
        l.utilizador?.perfil || 'N/A',
        l.acao,
        l.entidade,
        l.entidadeId || '',
        l.detalhes || ''
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=logs-auditoria.csv');
    res.send(linhas.join('\n'));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/logs/:id - apagar um log (só Administrador)
router.delete('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const log = await LogAuditoria.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ erro: 'Log não encontrado.' });
    res.json({ mensagem: 'Log apagado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/logs - apagar todos os logs (só Administrador)
router.delete('/', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    await LogAuditoria.deleteMany({});
    res.json({ mensagem: 'Todos os logs apagados com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;