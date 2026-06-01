const express = require('express');
const router = express.Router();
const LoteCultivo = require('../models/LoteCultivo');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

// GET /api/lotes - ver todos os lotes
router.get('/', autenticar, async (req, res) => {
  try {
    const lotes = await LoteCultivo.find()
      .populate('ervaAromatica')
      .populate('planoCultivo')
      .populate('criadoPor', 'nome email');
    res.json(lotes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/lotes/:id - ver um lote específico
router.get('/:id', autenticar, async (req, res) => {
  try {
    const lote = await LoteCultivo.findById(req.params.id)
      .populate('ervaAromatica')
      .populate('planoCultivo')
      .populate('criadoPor', 'nome email');

    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    res.json(lote);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/lotes - criar um lote
router.post('/', autenticar, async (req, res) => {
  try {
    const lote = new LoteCultivo({
      ...req.body,
      criadoPor: req.utilizador._id
    });
    await lote.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'LoteCultivo', lote._id.toString(), `Lote criado: ${lote.nome}`);

    res.status(201).json(lote);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/lotes/:id - editar um lote
router.put('/:id', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const lote = await LoteCultivo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });

    await registarLog(req.utilizador._id, 'EDITAR', 'LoteCultivo', lote._id.toString(), `Lote editado: ${lote.nome}`);

    res.json(lote);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/lotes/:id/estado - atualizar estado do lote
router.put('/:id/estado', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const { estado, dataFim, perdas, quantidadeFinal } = req.body;
    const lote = await LoteCultivo.findById(req.params.id);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });

    lote.estado = estado;
    if (dataFim) lote.dataFim = dataFim;
    if (perdas !== undefined) lote.perdas = perdas;
    if (quantidadeFinal !== undefined) lote.quantidadeFinal = quantidadeFinal;

    await lote.save();

    await registarLog(req.utilizador._id, 'EDITAR', 'LoteCultivo', lote._id.toString(), `Estado do lote ${lote.nome} atualizado para: ${estado}`);

    res.json(lote);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/lotes/:id - apagar um lote
router.delete('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const lote = await LoteCultivo.findByIdAndDelete(req.params.id);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });

    await registarLog(req.utilizador._id, 'APAGAR', 'LoteCultivo', req.params.id, `Lote apagado: ${lote.nome}`);

    res.json({ mensagem: 'Lote apagado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;