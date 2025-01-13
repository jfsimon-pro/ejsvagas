// app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

// Permitir acesso de outros domínios
app.use(cors({
    origin: ['http://vagas.shop', 'http://www.vagas.shop'], // URLs que podem acessar
    methods: ['GET', 'POST'], // Métodos permitidos
    credentials: true // Permitir envio de cookies ou autenticação
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

// Importar rotas
const authRouter = require('./routes/auth');
const empresaRouter = require('./routes/empresa');
const candidatoRouter = require('./routes/candidato');
const adminRouter = require('./routes/admin');

// Inicializar rotas com prisma
const auth = authRouter(prisma);
const empresa = empresaRouter(prisma);
const candidato = candidatoRouter(prisma);
const admin = adminRouter(prisma);

// Usar rotas
app.use('/auth', auth);
app.use('/empresa', empresa);
app.use('/candidato', candidato);
app.use('/admin', admin);

// Rota inicial.\

app.get('/', (req, res) => {
  res.render('home');
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).send('Ocorreu um erro no servidor.');
});

// Iniciar o servidor
// Iniciar o servidor
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error("Erro ao iniciar o servidor:", err);
  } else {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  }
});
