// app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Permitir acesso de outros domínios
app.use(cors({
    origin: ['http://vagas.shop', 'http://www.vagas.shop'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Configurações
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "connect-src": ["'self'", "https://viacep.com.br", "https://api-publica.speedio.com.br", "https://api.cnpjs.dev"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'"],
    },
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('Registrando rotas...');
// Rotas
app.use('/', require('./routes/auth'));
console.log('Rota auth registrada');
app.use('/admin', require('./routes/admin')(prisma));
console.log('Rota admin registrada');
app.use('/empresa', require('./routes/empresa')(prisma));
console.log('Rota empresa registrada');
app.use('/candidato', require('./routes/candidato')(prisma));
console.log('Rota candidato registrada');

// Rota inicial
app.get('/', (req, res) => {
  res.render('home');
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).send('Ocorreu um erro no servidor.');
});

// Iniciar o servidor
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error("Erro ao iniciar o servidor:", err);
  } else {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  }
});
