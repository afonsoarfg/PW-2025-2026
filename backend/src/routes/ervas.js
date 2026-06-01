const express = require('express');
const router = express.Router();
const ErvaAromatica = require('../models/ErvaAromatica');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

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

// POST /api/ervas - adicionar erva (só Administrador)
router.post('/', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const erva = new ErvaAromatica(req.body);
    await erva.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'ErvaAromatica', erva._id.toString(), `Erva criada: ${erva.nome}`);

    res.status(201).json(erva);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/ervas/:id - editar erva (só Administrador)
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

    await registarLog(req.utilizador._id, 'EDITAR', 'ErvaAromatica', erva._id.toString(), `Erva editada: ${erva.nome}`);

    res.json(erva);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/ervas/:id - remover erva (só Administrador)
router.delete('/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const erva = await ErvaAromatica.findByIdAndDelete(req.params.id);
    if (!erva) {
      return res.status(404).json({ erro: 'Erva não encontrada.' });
    }

    await registarLog(req.utilizador._id, 'APAGAR', 'ErvaAromatica', req.params.id, `Erva apagada: ${erva.nome}`);

    res.json({ mensagem: 'Erva aromática eliminada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/ervas/importar - importar ervas via CSV (Administrador ou Responsável)
router.post('/importar', autenticar, autorizar('Administrador', 'Responsavel'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Por favor, anexe um ficheiro CSV.' });
  }

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (extension !== '.csv') {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ erro: 'Apenas ficheiros CSV são aceites.' });
  }

  const resultados = [];
  let linha = 0;
  const stream = fs.createReadStream(req.file.path);

  stream
    .pipe(csv({ separator: ',' }))
    .on('data', (data) => {
      linha += 1;

      const nome = data.nome?.trim();
      const descricao = (data.descricao || data.descrição || '').trim();
      const temperaturaMin = Number(data.temperaturaMin);
      const temperaturaMax = Number(data.temperaturaMax);
      const humidadeMin = Number(data.humidadeMin);
      const humidadeMax = Number(data.humidadeMax);
      const luminosidadeMin = Number(data.luminosidadeMin);
      const luminosidadeMax = Number(data.luminosidadeMax);

      if (!nome || data.temperaturaMin === undefined || data.temperaturaMax === undefined || data.humidadeMin === undefined || data.humidadeMax === undefined || data.luminosidadeMin === undefined || data.luminosidadeMax === undefined) {
        stream.destroy(new Error(`CSV inválido na linha ${linha}: campos obrigatórios em falta.`));
        return;
      }

      if ([temperaturaMin, temperaturaMax, humidadeMin, humidadeMax, luminosidadeMin, luminosidadeMax].some(Number.isNaN)) {
        stream.destroy(new Error(`CSV inválido na linha ${linha}: valores numéricos inválidos.`));
        return;
      }

      resultados.push({ nome, descricao, temperaturaMin, temperaturaMax, humidadeMin, humidadeMax, luminosidadeMin, luminosidadeMax });
    })
    .on('end', async () => {
      try {
        if (resultados.length === 0) {
          throw new Error('O ficheiro CSV não contém registos válidos.');
        }

        if (resultados.length > 200) {
          throw new Error('O ficheiro CSV contém demasiados registos. O limite é 200 linhas.');
        }

        const operacoes = resultados.map(erva => ({
          updateOne: {
            filter: { nome: erva.nome },
            update: { $set: erva },
            upsert: true
          }
        }));
        await ErvaAromatica.bulkWrite(operacoes);

        await registarLog(req.utilizador._id, 'IMPORTAR', 'ErvaAromatica', null, `Importação CSV: ${resultados.length} ervas importadas`);

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json({ mensagem: `Sucesso! Foram importadas ${resultados.length} novas plantas via CSV.` });
      } catch (err) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ erro: 'Erro ao guardar no banco de dados: ' + err.message });
      }
    })
    .on('error', (err) => {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ erro: 'Erro ao processar o ficheiro CSV: ' + err.message });
    });
});

module.exports = router;