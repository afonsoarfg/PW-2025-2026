const express = require('express');
const router = express.Router(); 
const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');
const { autenticar, autorizar } = require('../middleware/auth');
const registarLog = require('../middleware/audit');

// POST /api/auth/register - registar utilizador
router.post('/register', async (req, res) => {
  try {
    const { nome, email, password, perfil } = req.body;

    const existe = await Utilizador.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: 'Email já registado.' });
    }

    const utilizador = new Utilizador({ nome, email, password, perfil });
    await utilizador.save();

    await registarLog(utilizador._id, 'REGISTER', 'Utilizador', utilizador._id.toString(), `Novo utilizador registado: ${nome} (${email})`);

    res.status(201).json({ mensagem: 'Utilizador criado com sucesso!' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/auth/login - login de utilizador
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const utilizador = await Utilizador.findOne({ email });
    if (!utilizador) {
      return res.status(400).json({ erro: 'Email ou password incorretos.' });
    }

    const passwordCorreta = await utilizador.verificarPassword(password);
    if (!passwordCorreta) {
      return res.status(400).json({ erro: 'Email ou password incorretos.' });
    }

    const token = jwt.sign(
      { id: utilizador._id, perfil: utilizador.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await registarLog(utilizador._id, 'LOGIN', 'Utilizador', utilizador._id.toString(), `Login efetuado: ${email}`);

    res.json({
      token,
      utilizador: {
        id: utilizador._id,
        nome: utilizador.nome,
        email: utilizador.email,
        perfil: utilizador.perfil
      }
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/auth/utilizadores - ver todos os utilizadores (só Administrador)
router.get('/utilizadores', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const utilizadores = await Utilizador.find().select('-password');
    res.json(utilizadores);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/auth/utilizadores - criar utilizador (só Administrador)
router.post('/utilizadores', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const { nome, email, password, perfil } = req.body;

    const existe = await Utilizador.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: 'Email já registado.' });
    }

    const utilizador = new Utilizador({ nome, email, password, perfil });
    await utilizador.save();

    await registarLog(req.utilizador._id, 'CRIAR', 'Utilizador', utilizador._id.toString(), `Utilizador criado pelo Admin: ${nome} (${email}) - Perfil: ${perfil}`);

    res.status(201).json({ mensagem: 'Novo utilizador registado pelo Administrador com sucesso!' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/auth/utilizadores/:id - eliminar utilizador (só Administrador)
router.delete('/utilizadores/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const utilizador = await Utilizador.findByIdAndDelete(req.params.id);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }

    await registarLog(req.utilizador._id, 'APAGAR', 'Utilizador', req.params.id, `Utilizador apagado: ${utilizador.nome} (${utilizador.email})`);

    res.json({ mensagem: `Utilizador ${utilizador.nome} eliminado com sucesso!` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/auth/utilizadores/:id - atualizar perfil (só Administrador)
router.put('/utilizadores/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const utilizador = await Utilizador.findByIdAndUpdate(
      req.params.id,
      { perfil: req.body.perfil },
      { new: true }
    ).select('-password');

    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }

    await registarLog(req.utilizador._id, 'EDITAR', 'Utilizador', req.params.id, `Perfil atualizado: ${utilizador.nome} → ${req.body.perfil}`);

    res.json(utilizador);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;