const express = require('express');
const router = express.Router();
const PlanoCultivo = require('../models/PlanoCultivo');
const { autenticar, autorizar } = require('../middleware/auth');

// GET /api/planos - ver todos os planos
router.get('/', autenticar, async (req, res) => {
  try {
    const planos = await PlanoCultivo.find()
      .populate('ervaAromatica')
      .populate('criadoPor', 'nome email')
      .populate('autorizadoPor', 'nome email');
    res.json(planos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/planos/:id - ver um plano específico
router.get('/:id', autenticar, async (req, res) => {
  try {
    const plano = await PlanoCultivo.findById(req.params.id)
      .populate('ervaAromatica')
      .populate('criadoPor', 'nome email')
      .populate('autorizadoPor', 'nome email');
    
    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }
    res.json(plano);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/planos - criar um plano
router.post('/', autenticar, async (req, res) => {
  try {
    const dadosPlano = {
      ...req.body,
      criadoPor: req.utilizador._id
    };

    // Plano pontual precisa de autorização do Responsavel
    if (req.body.tipo === 'pontual' && req.utilizador.perfil !== 'Responsavel') {
      return res.status(403).json({ erro: 'Plano pontual precisa de ser criado por um Responsável.' });
    }

    const plano = new PlanoCultivo(dadosPlano);
    await plano.save();
    res.status(201).json(plano);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/planos/:id - editar um plano
router.put('/:id', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const plano = await PlanoCultivo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }
    res.json(plano);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/planos/:id - apagar um plano
router.delete('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const plano = await PlanoCultivo.findByIdAndDelete(req.params.id);
    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }
    res.json({ mensagem: 'Plano apagado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;