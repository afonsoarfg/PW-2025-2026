const express = require('express');
const router = express.Router();
const ErvaAromatica = require('../models/ErvaAromatica');
const { autenticar, autorizar } = require('../middleware/auth');

// GET /api/ervas - ver todas as ervas
router.get('/', autenticar, async (req, res) => {
  try {
    const ervas = await ErvaAromatica.find();
    res.json(ervas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/ervas/:id - ver uma erva específica
router.get('/:id', autenticar, async (req, res) => {
  try {
    const erva = await ErvaAromatica.findById(req.params.id);
    if (!erva) {
      return res.status(404).json({ erro: 'Erva não encontrada.' });
    }
    res.json(erva);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/ervas - criar uma erva
router.post('/', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const erva = new ErvaAromatica(req.body);
    await erva.save();
    res.status(201).json(erva);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/ervas/:id - editar uma erva
router.put('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const erva = await ErvaAromatica.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!erva) {
      return res.status(404).json({ erro: 'Erva não encontrada.' });
    }
    res.json(erva);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/ervas/:id - apagar uma erva
router.delete('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const erva = await ErvaAromatica.findByIdAndDelete(req.params.id);
    if (!erva) {
      return res.status(404).json({ erro: 'Erva não encontrada.' });
    }
    res.json({ mensagem: 'Erva apagada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;