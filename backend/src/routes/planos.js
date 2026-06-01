const express = require('express');
const router = express.Router();
const PlanoCultivo = require('../models/PlanoCultivo');
const ErvaAromatica = require('../models/ErvaAromatica');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

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

// GET /api/planos/pendentes - listar planos pontuais sem autorização
router.get('/pendentes', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const planos = await PlanoCultivo.find({ 
      tipo: 'pontual', 
      autorizadoPor: null 
    })
      .populate('ervaAromatica')
      .populate('criadoPor', 'nome email');
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

    if (req.body.tipo === 'pontual') {
      dadosPlano.estado = 'pendente';
    }

    const erva = await ErvaAromatica.findById(req.body.ervaAromatica);
    if (erva) {
      if (req.body.temperaturaMin && req.body.temperaturaMin < erva.temperaturaMin) {
        return res.status(400).json({ erro: `Temperatura mínima não pode ser inferior a ${erva.temperaturaMin}°C para esta erva.` });
      }
      if (req.body.temperaturaMax && req.body.temperaturaMax > erva.temperaturaMax) {
        return res.status(400).json({ erro: `Temperatura máxima não pode ser superior a ${erva.temperaturaMax}°C para esta erva.` });
      }
      if (req.body.humidadeMin && req.body.humidadeMin < erva.humidadeMin) {
        return res.status(400).json({ erro: `Humidade mínima não pode ser inferior a ${erva.humidadeMin}% para esta erva.` });
      }
      if (req.body.humidadeMax && req.body.humidadeMax > erva.humidadeMax) {
        return res.status(400).json({ erro: `Humidade máxima não pode ser superior a ${erva.humidadeMax}% para esta erva.` });
      }
    }

    const plano = new PlanoCultivo(dadosPlano);
    await plano.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'PlanoCultivo', plano._id.toString(), `Plano criado: ${plano.tipo} para erva ${erva?.nome || 'N/A'}`);

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

    await registarLog(req.utilizador._id, 'EDITAR', 'PlanoCultivo', plano._id.toString(), `Plano editado: ${plano.tipo}`);

    res.json(plano);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/planos/:id/autorizar - autorizar plano pontual
router.put('/:id/autorizar', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const plano = await PlanoCultivo.findById(req.params.id);

    if (!plano) {
      return res.status(404).json({ erro: 'Plano não encontrado.' });
    }

    if (plano.tipo !== 'pontual') {
      return res.status(400).json({ erro: 'Só planos pontuais precisam de autorização.' });
    }

    plano.autorizadoPor = req.utilizador._id;
    plano.estado = 'ativo';
    await plano.save();

    await registarLog(req.utilizador._id, 'AUTORIZAR', 'PlanoCultivo', plano._id.toString(), `Plano pontual autorizado`);

    res.json({ mensagem: 'Plano autorizado com sucesso!', plano });
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

    await registarLog(req.utilizador._id, 'APAGAR', 'PlanoCultivo', req.params.id, `Plano apagado: ${plano.tipo}`);

    res.json({ mensagem: 'Plano apagado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;