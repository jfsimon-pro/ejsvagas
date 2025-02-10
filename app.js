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

// Importar rotas
const authRouter = require('./routes/auth');
const empresaRouter = require('./routes/empresa')(prisma);
const candidatoRouter = require('./routes/candidato')(prisma);
const adminRouter = require('./routes/admin')(prisma);

// Usar rotas
app.use('/auth', authRouter);
app.use('/empresa', empresaRouter);
app.use('/candidato', candidatoRouter);
app.use('/admin', adminRouter);

// Rota inicial
app.get('/', async (req, res) => {
  try {
    const ultimasVagas = await prisma.vaga.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        empresa: {
          select: {
            nomeFantasia: true,
            cidade: true,
            uf: true
          }
        }
      }
    });
    
    res.render('home', { ultimasVagas });
  } catch (error) {
    console.error('Erro ao buscar últimas vagas:', error);
    res.render('home', { ultimasVagas: [] });
  }
});

// Rota pública para vagas
app.get('/vagas', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;
    const busca = req.query.busca || '';

    // Construir where clause baseado na busca
    const where = busca ? {
      OR: [
        { titulo: { contains: busca, mode: 'insensitive' } },
        { cargo: { contains: busca, mode: 'insensitive' } },
        { tags: { hasSome: [busca] } }
      ]
    } : {};

    // Buscar vagas com paginação
    const vagas = await prisma.vaga.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        empresa: {
          select: {
            nomeFantasia: true,
            cidade: true,
            uf: true
          }
        }
      }
    });

    // Contar total de vagas para paginação
    const totalVagas = await prisma.vaga.count({ where });
    const totalPages = Math.ceil(totalVagas / perPage);

    res.render('vagas_publicas', {
      vagas,
      busca,
      currentPage: page,
      totalPages,
      totalVagas
    });

  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    res.status(500).send('Erro ao carregar vagas');
  }
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
