const express = require('express');
const router = express.Router();
const MedicaoAmbiental = require('../models/MedicaoAmbiental');
const LoteCultivo = require('../models/LoteCultivo');
const PlanoCultivo = require('../models/PlanoCultivo');
const Alerta = require('../models/Alerta');
const { autenticar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

// GET /api/medicoes/lote/:loteId - histórico de medições de um lote
router.get('/lote/:loteId', autenticar, async (req, res) => {
  try {
    const medicoes = await MedicaoAmbiental.find({ loteCultivo: req.params.loteId })
      .populate('registadaPor', 'nome email')
      .sort({ createdAt: -1 });
    res.json(medicoes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/medicoes - registar uma medição e gerar alertas automáticos
router.post('/', autenticar, async (req, res) => {
  try {
    const { loteCultivo, temperatura, humidade, luminosidade } = req.body;

    // Cria a medição
    const medicao = new MedicaoAmbiental({
      loteCultivo,
      temperatura,
      humidade,
      luminosidade,
      registadaPor: req.utilizador._id
    });
    await medicao.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'MedicaoAmbiental', medicao._id.toString(), `Medição registada: Temp=${temperatura}°C, Hum=${humidade}%, Lum=${luminosidade}lux`);

    // Vai buscar o lote e o plano associado
    const lote = await LoteCultivo.findById(loteCultivo).populate('planoCultivo');
    const plano = lote?.planoCultivo;

    const alertasGerados = [];

    // Só gera alertas se o plano for regular e tiver limites definidos
    if (plano && plano.tipo === 'regular') {
      
      // Verifica temperatura
      if (plano.temperaturaMin && temperatura < plano.temperaturaMin) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'temperatura',
          mensagem: `Temperatura baixa: ${temperatura}°C (mínimo: ${plano.temperaturaMin}°C)`,
          severidade: temperatura < plano.temperaturaMin - 5 ? 'Critico' : 'Aviso',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }

      if (plano.temperaturaMax && temperatura > plano.temperaturaMax) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'temperatura',
          mensagem: `Temperatura alta: ${temperatura}°C (máximo: ${plano.temperaturaMax}°C)`,
          severidade: temperatura > plano.temperaturaMax + 5 ? 'Critico' : 'Aviso',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }

      // Verifica humidade
      if (plano.humidadeMin && humidade < plano.humidadeMin) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'humidade',
          mensagem: `Humidade baixa: ${humidade}% (mínimo: ${plano.humidadeMin}%)`,
          severidade: 'Aviso',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }

      if (plano.humidadeMax && humidade > plano.humidadeMax) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'humidade',
          mensagem: `Humidade alta: ${humidade}% (máximo: ${plano.humidadeMax}%)`,
          severidade: 'Aviso',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }

      // Verifica luminosidade
      if (plano.luminosidadeMin && luminosidade < plano.luminosidadeMin) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'luminosidade',
          mensagem: `Luminosidade baixa: ${luminosidade} lux (mínimo: ${plano.luminosidadeMin} lux)`,
          severidade: 'Informativo',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }

      if (plano.luminosidadeMax && luminosidade > plano.luminosidadeMax) {
        const alerta = new Alerta({
          loteCultivo,
          medicaoAmbiental: medicao._id,
          tipo: 'luminosidade',
          mensagem: `Luminosidade alta: ${luminosidade} lux (máximo: ${plano.luminosidadeMax} lux)`,
          severidade: 'Informativo',
          criadoPor: req.utilizador._id
        });
        await alerta.save();
        alertasGerados.push(alerta);
      }
    }

    res.status(201).json({
      medicao,
      alertasGerados: alertasGerados.length,
      alertas: alertasGerados
    });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;