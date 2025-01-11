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

// Configurações
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "connect-src": ["'self'", "https://viacep.com.br", "https://api-publica.speedio.com.br", "https://api.cnpjs.dev"], // Permite conexões à API do ViaCEP
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'"],
      },
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Registro das rotas
const authRoutes = require('./routes/auth');
const empresaRoutes = require('./routes/empresa')(prisma);
const candidatoRoutes = require('./routes/candidato')(prisma);
const adminRoutes = require('./routes/admin')(prisma);

app.use('/auth', authRoutes);
app.use('/empresa', empresaRoutes);
app.use('/candidato', candidatoRoutes);
app.use('/admin', adminRoutes);



// Rota inicial
app.get('/', (req, res) => {
  res.render('home'); // Renderiza o arquivo home.ejs
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).send('Ocorreu um erro no servidor.');
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});