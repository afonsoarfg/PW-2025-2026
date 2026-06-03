const express = require('express');
const router = express.Router();
const Tarefa = require('../models/Tarefa');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

// GET /api/tarefas - ver todas as tarefas
router.get('/', autenticar, async (req, res) => {
  try {
    const tarefas = await Tarefa.find()
      .populate('loteCultivo', 'nome')
      .populate('criadoPor', 'nome email')
      .populate('executadaPor', 'nome email');
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/tarefas/pendentes - ver tarefas pendentes (frontend ainda so usa este)
router.get('/pendentes', autenticar, async (req, res) => {
  try {
    const tarefas = await Tarefa.find({ estado: 'pendente' })
      .populate('loteCultivo', 'nome')
      .populate('criadoPor', 'nome email');
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/tarefas/lote/:loteId - ver tarefas de um lote específico
router.get('/lote/:loteId', autenticar, async (req, res) => {
  try {
    const tarefas = await Tarefa.find({ loteCultivo: req.params.loteId })
      .populate('loteCultivo', 'nome')
      .populate('criadoPor', 'nome email')
      .populate('executadaPor', 'nome email');
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/tarefas - criar uma tarefa
router.post('/', autenticar, async (req, res) => {
  try {
    const tarefa = new Tarefa({
      ...req.body,
      criadoPor: req.utilizador._id
    });
    await tarefa.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'Tarefa', tarefa._id.toString(), `Tarefa criada: ${tarefa.tipo} no lote ${tarefa.loteCultivo}`);

    res.status(201).json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/tarefas/:id/executar - marcar tarefa como executada
router.put('/:id/executar', autenticar, async (req, res) => {
  try {
    const tarefa = await Tarefa.findById(req.params.id);
    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    if (tarefa.estado === 'executada') {
      return res.status(400).json({ erro: 'Tarefa já foi executada.' });
    }

    tarefa.estado = 'executada';
    tarefa.dataExecucao = new Date();
    tarefa.executadaPor = req.utilizador._id;
    await tarefa.save();

    await registarLog(req.utilizador._id, 'EXECUTAR', 'Tarefa', tarefa._id.toString(), `Tarefa executada: ${tarefa.tipo}`);

    res.json({ mensagem: 'Tarefa marcada como executada!', tarefa });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/tarefas/:id - apagar uma tarefa
router.delete('/:id', autenticar, autorizar('Responsavel', 'Administrador'), async (req, res) => {
  try {
    const tarefa = await Tarefa.findByIdAndDelete(req.params.id);
    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    await registarLog(req.utilizador._id, 'APAGAR', 'Tarefa', req.params.id, `Tarefa apagada: ${tarefa.tipo}`);

    res.json({ mensagem: 'Tarefa apagada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;