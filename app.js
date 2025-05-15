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
      take: 6,
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
    const faixaSalarial = req.query.faixaSalarial || '';
    const tipoContrato = req.query.tipoContrato || '';
    const uf = req.query.uf || '';
    const escolaridade = req.query.escolaridade || '';

    console.log('Query params:', req.query); // Debug completo dos parâmetros
    console.log('Filtros recebidos:', { busca, faixaSalarial, tipoContrato, uf, escolaridade }); // Debug

    // Construir where clause baseado nos filtros
    const where = {};
    
    // Adicionar condições de busca
    if (busca || faixaSalarial || tipoContrato || uf || escolaridade) {
      where.AND = [];
      
      if (busca) {
        where.AND.push({
          OR: [
            { titulo: { contains: busca, mode: 'insensitive' } },
            { cargo: { contains: busca, mode: 'insensitive' } },
            { descricao: { contains: busca, mode: 'insensitive' } },
            { empresa: { nomeFantasia: { contains: busca, mode: 'insensitive' } } },
            { empresa: { cidade: { contains: busca, mode: 'insensitive' } } },
            { empresa: { uf: { contains: busca, mode: 'insensitive' } } },
            { tags: { hasSome: [busca] } }
          ]
        });
      }

      if (faixaSalarial) {
        where.AND.push({ faixaSalarial: faixaSalarial });
      }

      if (tipoContrato) {
        where.AND.push({ tipoContrato: tipoContrato });
      }

      if (uf) {
        where.AND.push({
          empresa: {
            uf: uf
          }
        });
      }

      if (escolaridade) {
        console.log('Aplicando filtro de escolaridade:', escolaridade); // Debug
        console.log('Valor exato do filtro:', JSON.stringify(escolaridade)); // Debug do valor exato
        where.AND.push({ escolaridade: escolaridade });
        console.log('Where clause após adicionar escolaridade:', JSON.stringify(where, null, 2)); // Debug da where clause
      }
    }

    console.log('Where clause:', JSON.stringify(where, null, 2)); // Debug

    // Buscar vagas com paginação
    const vagas = await prisma.vaga.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        empresa: true
      }
    });

    console.log('Vagas encontradas:', vagas.length); // Debug
    if (vagas.length > 0) {
      console.log('Exemplo de vaga:', {
        titulo: vagas[0].titulo,
        escolaridade: vagas[0].escolaridade,
        escolaridadeType: typeof vagas[0].escolaridade,
        escolaridadeLength: vagas[0].escolaridade.length,
        escolaridadeChars: Array.from(vagas[0].escolaridade).map(c => c.charCodeAt(0))
      });
    }

    // Contar total de vagas para paginação
    const totalVagas = await prisma.vaga.count({ where });
    const totalPages = Math.ceil(totalVagas / perPage);

    // Garantir que todas as variáveis necessárias sejam passadas para o template
    const templateData = {
      vagas,
      busca: busca || '',
      faixaSalarial: faixaSalarial || '',
      tipoContrato: tipoContrato || '',
      uf: uf || '',
      escolaridade: escolaridade || '',
      currentPage: page,
      totalPages,
      totalVagas
    };

    res.render('vagas_publicas', templateData);

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
