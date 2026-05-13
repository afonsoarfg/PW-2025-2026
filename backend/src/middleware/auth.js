const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');

const autenticar = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const utilizador = await Utilizador.findById(decoded.id);
    
    if (!utilizador) {
      return res.status(401).json({ erro: 'Utilizador não encontrado.' });
    }

    req.utilizador = utilizador;
    next();

  } catch (err) {
    res.status(401).json({ erro: 'Token inválido.' });
  }
};

const autorizar = (...perfis) => {
  return (req, res, next) => {
    if (!perfis.includes(req.utilizador.perfil)) {
      return res.status(403).json({ erro: 'Sem permissão para esta operação.' });
    }
    next();
  };
};

module.exports = { autenticar, autorizar };