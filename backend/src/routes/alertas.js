const express = require('express');
const router = express.Router();
const Alerta = require('../models/Alerta');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

// GET /api/alertas - ver todos os alertas
router.get('/', autenticar, async (req, res) => {
  try {
    const alertas = await Alerta.find()
      .populate('loteCultivo', 'nome')
      .populate('criadoPor', 'nome email')
      .populate('resolvidoPor', 'nome email')
      .sort({ createdAt: -1 });
    res.json(alertas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/alertas/ativos - ver alertas ativos
router.get('/ativos', autenticar, async (req, res) => {
  try {
    const alertas = await Alerta.find({ estado: 'ativo' })
      .populate('loteCultivo', 'nome')
      .populate('criadoPor', 'nome email')
      .sort({ createdAt: -1 });
    res.json(alertas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/alertas/lote/:loteId - alertas de um lote específico
router.get('/lote/:loteId', autenticar, async (req, res) => {
  try {
    const alertas = await Alerta.find({ loteCultivo: req.params.loteId })
      .populate('criadoPor', 'nome email')
      .populate('resolvidoPor', 'nome email')
      .sort({ createdAt: -1 });
    res.json(alertas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/alertas/:id/resolver - resolver um alerta
router.put('/:id/resolver', autenticar, async (req, res) => {
  try {
    const alerta = await Alerta.findById(req.params.id);
    if (!alerta) return res.status(404).json({ erro: 'Alerta não encontrado.' });

    if (alerta.estado !== 'ativo') {
      return res.status(400).json({ erro: 'Alerta já foi resolvido ou ignorado.' });
    }

    alerta.estado = 'resolvido';
    alerta.resolvidoPor = req.utilizador._id;
    await alerta.save();

    await registarLog(req.utilizador._id, 'RESOLVER', 'Alerta', alerta._id.toString(), `Alerta resolvido: ${alerta.mensagem}`);

    res.json({ mensagem: 'Alerta resolvido com sucesso!', alerta });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/alertas/:id/ignorar - ignorar um alerta com justificação obrigatória
router.put('/:id/ignorar', autenticar, async (req, res) => {
  try {
    const { justificacao } = req.body;

    if (!justificacao || justificacao.trim() === '') {
      return res.status(400).json({ erro: 'Justificação obrigatória para ignorar um alerta.' });
    }

    const alerta = await Alerta.findById(req.params.id);
    if (!alerta) return res.status(404).json({ erro: 'Alerta não encontrado.' });

    if (alerta.estado !== 'ativo') {
      return res.status(400).json({ erro: 'Alerta já foi resolvido ou ignorado.' });
    }

    alerta.estado = 'ignorado';
    alerta.justificacao = justificacao;
    alerta.resolvidoPor = req.utilizador._id;
    await alerta.save();

    await registarLog(req.utilizador._id, 'IGNORAR', 'Alerta', alerta._id.toString(), `Alerta ignorado. Justificação: ${justificacao}`);

    res.json({ mensagem: 'Alerta ignorado.', alerta });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;