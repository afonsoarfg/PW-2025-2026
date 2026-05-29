const express = require('express');
const router = express.Router(); 
const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');
const { autenticar, autorizar } = require('../middleware/auth'); 

// Registrar user  POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nome, email, password, perfil } = req.body;

    const existe = await Utilizador.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: 'Email já registado.' });
    }

    const utilizador = new Utilizador({ nome, email, password, perfil });
    await utilizador.save();

    res.status(201).json({ mensagem: 'Utilizador criado com sucesso!' });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Login  POST /api/auth/login
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
      { expiresIn: '24h' } //alterar
    );

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

// Ver users GET /api/auth/utilizadores
router.get('/utilizadores', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const utilizadores = await Utilizador.find().select('-password');
    res.json(utilizadores);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Criar user POST /api/auth/utilizadores (Apenas Admin)
router.post('/utilizadores', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const { nome, email, password, perfil } = req.body;

    const existe = await Utilizador.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: 'Email já registado.' });
    }

    const utilizador = new Utilizador({ nome, email, password, perfil });
    await utilizador.save();

    res.status(201).json({ mensagem: 'Novo utilizador registado pelo Administrador com sucesso!' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// eliminar user DELETE /api/auth/utilizadores/:id
router.delete('/utilizadores/:id', autenticar, autorizar('Administrador'), async (req, res) => {
  try {
    const utilizador = await Utilizador.findByIdAndDelete(req.params.id);
    
    if (!utilizador) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }
    
    res.json({ mensagem: `Utilizador ${utilizador.nome} eliminado com sucesso!` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;