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

    // DEBUG: Logar todos os parâmetros recebidos
    console.log('--- DEBUG /vagas ---');
    console.log('Query params:', req.query);
    console.log('busca:', busca, '| faixaSalarial:', faixaSalarial, '| tipoContrato:', tipoContrato, '| uf:', uf, '| escolaridade:', escolaridade);
    if (escolaridade) {
      console.log('Tipo de escolaridade:', typeof escolaridade, '| Length:', escolaridade.length, '| Chars:', Array.from(escolaridade).map(c => `${c}(${c.charCodeAt(0)})`).join(', '));
    }

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
        console.log('\n=== DEBUG FILTRO ESCOLARIDADE ===');
        console.log('1. Parâmetros recebidos:');
        console.log('- escolaridade:', escolaridade);
        console.log('- tipo:', typeof escolaridade);
        console.log('- comprimento:', escolaridade.length);
        console.log('- caracteres:', Array.from(escolaridade).map(c => `${c}(${c.charCodeAt(0)})`).join(', '));
        
        where.AND.push({ 
          escolaridade: { 
            contains: escolaridade,
            mode: 'insensitive'
          } 
        });
        
        console.log('\n2. Where clause após adicionar filtro:');
        console.log(JSON.stringify(where, null, 2));
        
        // Log da primeira vaga encontrada para comparação
        const primeiraVaga = await prisma.vaga.findFirst({
          where: { 
            escolaridade: { 
              contains: escolaridade,
              mode: 'insensitive'
            } 
          }
        });
        
        console.log('\n3. Resultado da busca:');
        if (primeiraVaga) {
          console.log('Vaga encontrada:');
          console.log('- Título:', primeiraVaga.titulo);
          console.log('- Escolaridade:', primeiraVaga.escolaridade);
          console.log('- Tipo:', typeof primeiraVaga.escolaridade);
          console.log('- Comprimento:', primeiraVaga.escolaridade.length);
          console.log('- Caracteres:', Array.from(primeiraVaga.escolaridade).map(c => `${c}(${c.charCodeAt(0)})`).join(', '));
        } else {
          console.log('Nenhuma vaga encontrada com essa escolaridade');
        }
        console.log('=== FIM DEBUG FILTRO ESCOLARIDADE ===\n');
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
    // DEBUG: Logar o valor de escolaridade passado para o template
    console.log('Valor de escolaridade enviado para o template:', templateData.escolaridade);
    res.render('vagas_publicas', templateData);

  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    res.status(500).send('Erro ao carregar vagas');
  }
});

// Rota pública para página Sobre
app.get('/sobre', (req, res) => {
  res.render('sobre');
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
