const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login_admin');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se é um admin
    if (decoded.role !== 'admin') {
      return res.redirect('/auth/login_admin');
    }

    // Adicionar informações do usuário ao request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.redirect('/auth/login_admin');
  }
};

// Middleware para autenticação geral
const authenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.redirect('/auth/login');
  }
};

module.exports = {
  authenticateAdmin,
  authenticate
}; 