const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { upload, compressImage } = require('../utils/upload'); // Já importado do utilitário
const verifyToken = require('../middlewares/auth').verifyToken;
const nodemailer = require('nodemailer');

// Configuração do nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

module.exports = (prisma) => {
  // Middleware de autenticação para todas as rotas
  router.use(verifyToken);

  // Rota para o dashboard da empresa
  router.get('/dashboard', async (req, res) => {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.userId },
      });

      if (!empresa) {
        return res.status(404).send('Empresa não encontrada.');
      }

      res.render('empresa/dashboard', { empresa });
    } catch (error) {
      console.error('Erro ao carregar o dashboard:', error);
      res.status(500).send('Erro ao carregar o dashboard.');
    }
  });

  // Rota para listar vagas da empresa
  router.get('/vagas', async (req, res) => {
    const { page = 1 } = req.query; // Captura a página atual da query string
    const perPage = 5; // Define o número de vagas por página
    const currentPage = parseInt(page, 10) || 1;

    try {
      // Verifica a empresa logada
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.userId },
      });

      if (!empresa) {
        return res.status(404).send('Empresa não encontrada.');
      }

      // Conta o total de vagas criadas pela empresa
      const totalVagas = await prisma.vaga.count({
        where: { empresaId: req.user.userId },
      });

      // Busca as vagas paginadas
      const vagas = await prisma.vaga.findMany({
        where: { empresaId: req.user.userId },
        include: {
          candidaturas: true
        },
        orderBy: { createdAt: 'desc' }, // Ordena por data de criação
        skip: (currentPage - 1) * perPage,
        take: perPage,
      });

      // Calcula o total de páginas
      const totalPages = Math.ceil(totalVagas / perPage);

      res.render('empresa/vagas', {
        vagas,
        totalVagas,
        currentPage,
        totalPages,
      });
    } catch (error) {
      console.error('Erro ao carregar as vagas:', error);
      res.status(500).send('Erro ao carregar as vagas.');
    }
  });

  // Rota para exibir o formulário de criação de vaga
  router.get('/vagas/criar', async (req, res) => {
    res.render('empresa/criar_vaga');
  });

  // Rota para criar uma nova vaga
  router.post('/vagas/criar', async (req, res) => {
    const {
      titulo,
      descricao,
      tags,
      cargo,
      faixaSalarial,
      tipoContrato,
      disponibilidade,
      horarioTrabalho,
      tipoTrabalho,
      escolaridade,
      idiomas,
      beneficios,
      vagaPcd,
      cidade,
      uf,
      dataLimite,
      quantidadeVagas,
      cnh
    } = req.body;

    try {
      // Converter o valor do radio em array com um único item
      const tipoTrabalho = req.body.tipoTrabalho ? [req.body.tipoTrabalho] : [];

      const vaga = await prisma.vaga.create({
        data: {
          titulo,
          descricao,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          cargo,
          faixaSalarial,
          tipoContrato,
          vagaPcd,
          cidade,
          uf,
          dataLimite: new Date(dataLimite),
          quantidadeVagas: parseInt(quantidadeVagas) || 1,
          cnh: Array.isArray(cnh) ? cnh : [],
          disponibilidade: disponibilidade || [],
          horarioTrabalho,
          tipoTrabalho,
          escolaridade,
          idiomas: idiomas || [],
          beneficios: beneficios || [],
          empresaId: req.user.userId,
        },
      });

      res.redirect('/empresa/vagas');
    } catch (error) {
      console.error('Erro ao criar vaga:', error);
      res.status(500).send('Erro ao criar vaga.');
    }
  });

  // Rota para editar dados da empresa (com validação completa)
  router.post(
    '/editar-completo',
    [
      body('razaoSocial').notEmpty().trim().escape().withMessage('Razão Social é obrigatória.'),
      body('nomeFantasia').notEmpty().trim().escape().withMessage('Nome Fantasia é obrigatória.'),
      body('cnpj').isLength({ min: 14 }).trim().escape().withMessage('CNPJ inválido.'),
      body('ie').optional().trim().escape(),
      body('cep').notEmpty().trim().escape().withMessage('CEP é obrigatório.'),
      body('logradouro').notEmpty().trim().escape().withMessage('Logradouro é obrigatório.'),
      body('numero').notEmpty().trim().escape().withMessage('Número é obrigatório.'),
      body('bairro').notEmpty().trim().escape().withMessage('Bairro é obrigatório.'),
      body('cidade').notEmpty().trim().escape().withMessage('Cidade é obrigatória.'),
      body('uf').notEmpty().trim().escape().withMessage('UF é obrigatório.'),
      body('telefone').notEmpty().trim().escape().withMessage('Telefone é obrigatório.'),
      body('whatsapp').notEmpty().trim().escape().withMessage('WhatsApp é obrigatório.'),
      body('responsavel').notEmpty().trim().escape().withMessage('Nome do responsável é obrigatório.'),
      body('email').isEmail().withMessage('E-mail inválido.'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send('Erro de validação.');
      }

      const {
        razaoSocial,
        nomeFantasia,
        cnpj,
        ie,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        telefone,
        whatsapp,
        responsavel,
        email,
      } = req.body;

      try {
        await prisma.empresa.update({
          where: { id: req.user.userId },
          data: {
            razaoSocial,
            nomeFantasia,
            cnpj,
            ie,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            uf,
            telefone,
            whatsapp,
            responsavel,
            email,
          },
        });

        res.redirect('/empresa/dashboard');
      } catch (error) {
        console.error('Erro ao atualizar dados da empresa:', error);
        res.status(500).send('Erro ao atualizar dados.');
      }
    }
  );

  // Rota para editar dados básicos da empresa (do dashboard)
  router.post('/editar', async (req, res) => {
    try {
      const { telefone, whatsapp, responsavel, email } = req.body;

      await prisma.empresa.update({
        where: { id: req.user.userId },
        data: {
          telefone,
          whatsapp,
          responsavel,
          email
        }
      });

      res.redirect('/empresa/dashboard');
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      res.render('empresa/dashboard', { 
        empresa: await prisma.empresa.findUnique({ where: { id: req.user.userId } }),
        error: 'Erro ao atualizar dados. Tente novamente.'
      });
    }
  });

  // Rota para editar perfil social da empresa (do dashboard)
  router.post('/editar-perfil', upload.single('logo'), async (req, res) => {
    try {
      const { sobre, twitter, instagram, facebook, linkedin } = req.body;
      let logo = null;

      if (req.file) {
        const compressedPath = path.join(req.file.destination, `compressed-${req.file.filename}`);
        await compressImage(req.file.path, compressedPath);
        logo = `uploads/compressed-${req.file.filename}`;
      }

      await prisma.empresa.update({
        where: { id: req.user.userId },
        data: {
          ...(logo && { logo }),
          sobre,
          twitter: twitter || null,
          instagram: instagram || null,
          facebook: facebook || null,
          linkedin: linkedin || null
        }
      });

      // Buscar a empresa atualizada para mostrar os dados atualizados
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.userId }
      });

      res.render('empresa/dashboard', { 
        empresa,
        success: 'Perfil social atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil social:', error);
      const empresa = await prisma.empresa.findUnique({ 
        where: { id: req.user.userId } 
      });
      res.render('empresa/dashboard', { 
        empresa,
        error: 'Erro ao atualizar perfil social. Tente novamente.'
      });
    }
  });

  // Rota de logout
  router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
  });

  // Rota para excluir uma vaga
  router.post('/vagas/excluir/:id', async (req, res) => {
    const { id } = req.params;

    try {
      // Verificar se a vaga pertence à empresa
      const vaga = await prisma.vaga.findUnique({
        where: { id },
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.status(403).send('Acesso negado.');
      }

      // Primeiro, excluir todas as candidaturas relacionadas à vaga
      await prisma.candidatura.deleteMany({
        where: { vagaId: id }
      });

      // Depois, excluir a vaga
      await prisma.vaga.delete({
        where: { id },
      });

      res.redirect('/empresa/vagas');
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      res.status(500).send('Erro ao excluir vaga.');
    }
  });

  // Rota para exibir os detalhes de um candidato específico
  router.get('/candidatos/:id', verifyToken, async (req, res) => {
    try {
      const candidato = await prisma.candidato.findUnique({
        where: { id: req.params.id },
        include: {
          cursos: true,
          experiencias: true,
          candidaturas: {
            include: {
              vaga: true
            }
          }
        }
      });

      if (!candidato) {
        return res.status(404).send('Candidato não encontrado.');
      }

      res.render('empresa/detalhes_candidato', { candidato });
    } catch (error) {
      console.error('Erro ao carregar detalhes do candidato:', error);
      res.status(500).send('Erro ao carregar detalhes do candidato.');
    }
  });

  router.get('/candidatos/:id/detalhes', async (req, res) => {
    const candidatoId = req.params.id;

    try {
      console.log('Candidato ID recebido:', candidatoId); // Log para debug

      const candidato = await prisma.candidato.findUnique({
        where: { id: candidatoId },
        include: {
          cursos: true,
          experienciasProfissionais: true,
          candidaturas: {
            include: {
              vaga: true, // Inclui detalhes da vaga para referência
            },
          },
        },
      });

      if (!candidato) {
        console.log('Candidato não encontrado.');
        return res.status(404).send('Candidato não encontrado.');
      }

      console.log('Dados do candidato:', candidato);

      // Captura o primeiro vagaId associado às candidaturas
      const vagaId = candidato.candidaturas.length > 0 ? candidato.candidaturas[0].vaga.id : null;

      console.log('Vaga ID associada:', vagaId); // Log do vagaId

      res.render('empresa/detalhes_candidato', {
        candidato,
        vagaId,
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes do candidato:', error);
      res.status(500).send('Erro ao carregar os detalhes do candidato.');
    }
  });

  router.get('/vagas/candidatos/:id', async (req, res) => {
    const vagaId = req.params.id;

    try {
      const candidatos = await prisma.candidatura.findMany({
        where: { vagaId },
        include: { candidato: { include: { cursos: true, experiencias: true } } },
      });

      res.render('empresa/candidatos', { candidatos });
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      res.status(500).send('Erro ao carregar candidatos.');
    }
  });

  router.get('/editar-perfil', async (req, res) => {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.userId },
      });

      if (!empresa) {
        return res.status(404).send('Empresa não encontrada.');
      }

      res.render('empresa/editar_perfil', { empresa });
    } catch (error) {
      console.error('Erro ao carregar perfil da empresa:', error);
      res.status(500).send('Erro ao carregar perfil.');
    }
  });

  // Configuração para upload de arquivos
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads'); // Pasta onde as logos serão armazenadas
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });

  router.get('/editar-perfil', async (req, res) => {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.userId },
      });

      if (!empresa) {
        return res.status(404).send('Empresa não encontrada.');
      }

      res.render('empresa/editar_perfil', { empresa, error: null }); // Adicione error: null
    } catch (error) {
      console.error('Erro ao carregar página de edição de perfil:', error);
      res.status(500).send('Erro ao carregar a página de edição.');
    }
  });

  router.post(
    '/editar-perfil',
    (req, res, next) => {
      upload.single('logo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).render('empresa/editar_perfil', {
              empresa: req.body,
              error: 'O arquivo enviado excede o tamanho permitido de 2MB.',
            });
          }
        } else if (err) {
          return res.status(400).render('empresa/editar_perfil', {
            empresa: req.body,
            error: 'Erro ao fazer upload da imagem.',
          });
        }
        next();
      });
    },
    [
      body('twitter')
        .optional({ checkFalsy: true }) // Permite valores vazios ou ausentes
        .isURL()
        .matches(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+$/)
        .withMessage('A URL do Twitter ou X deve ser válida.'),
      body('instagram')
        .optional({ checkFalsy: true })
        .isURL()
        .matches(/^https?:\/\/(www\.)?instagram\.com\/.+$/)
        .withMessage('A URL do Instagram deve ser válida.'),
      body('facebook')
        .optional({ checkFalsy: true })
        .isURL()
        .matches(/^https?:\/\/(www\.)?facebook\.com\/.+$/)
        .withMessage('A URL do Facebook deve ser válida.'),
      body('linkedin')
        .optional({ checkFalsy: true })
        .isURL()
        .matches(/^https?:\/\/(www\.)?linkedin\.com\/.+$/)
        .withMessage('A URL do LinkedIn deve ser válida.'),
      body('whatsapp')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O WhatsApp deve conter apenas números.')
        .isLength({ min: 9, max: 15 })
        .withMessage('O WhatsApp deve ter entre 9 e 15 dígitos.'),
    ],
    async (req, res) => {
      const { sobre, twitter, instagram, facebook, linkedin, whatsapp } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render('empresa/editar_perfil', {
          empresa: req.body,
          error: errors.array().map(err => err.msg).join(', '),
        });
      }

      try {
        // Buscar a empresa no banco de dados para obter a logo existente
        const empresa = await prisma.empresa.findUnique({
          where: { id: req.user.userId },
        });

        if (!empresa) {
          return res.status(404).render('empresa/editar_perfil', {
            empresa: req.body,
            error: 'Empresa não encontrada.',
          });
        }

        // Determinar o caminho da logo: manter a existente ou usar a nova
        let logo = empresa.logo; // Mantém a logo existente por padrão
        if (req.file) {
          const compressedPath = path.join(req.file.destination, `compressed-${req.file.filename}`);
          await compressImage(req.file.path, compressedPath);
          logo = `uploads/compressed-${req.file.filename}`; // Atualiza se uma nova logo for enviada
        }

        // Atualizar os dados da empresa
        await prisma.empresa.update({
          where: { id: req.user.userId },
          data: {
            logo,
            sobre,
            twitter: twitter || null, // Salva como null se estiver vazio
            instagram: instagram || null,
            facebook: facebook || null,
            linkedin: linkedin || null,
            whatsapp: whatsapp || null,
          },
        });

        res.redirect('/empresa/dashboard');
      } catch (error) {
        console.error('Erro ao editar perfil da empresa:', error);
        res.status(500).render('empresa/editar_perfil', {
          empresa: req.body,
          error: 'Erro ao salvar as informações. Tente novamente.',
        });
      }
    }
  );

  // Rota para selecionar candidatos
  router.post('/vagas/:vagaId/candidatos/selecionar', async (req, res) => {
    const { vagaId } = req.params;
    const { candidatoIds } = req.body; // Array com IDs dos candidatos selecionados

    try {
      // Atualiza as candidaturas dos candidatos para "selecionado: true"
      await prisma.candidatura.updateMany({
        where: {
          vagaId,
          candidatoId: { in: candidatoIds },
        },
        data: { selecionado: true },
      });

      res.redirect(`/empresa/vagas/${vagaId}/candidatos`);
    } catch (error) {
      console.error('Erro ao selecionar candidatos:', error);
      res.status(500).send('Erro ao selecionar candidatos.');
    }
  });

  // Rota para selecionar/cancelar seleção de candidato
  router.post('/vagas/:vagaId/candidatos/:candidatoId/toggle-selecao', async (req, res) => {
    const { vagaId, candidatoId } = req.params;

    try {
      // Verificar se a vaga pertence à empresa
      const vaga = await prisma.vaga.findUnique({
        where: { id: vagaId },
        include: { empresa: true }
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.status(403).send('Acesso negado.');
      }

      // Buscar candidatura atual
      const candidatura = await prisma.candidatura.findUnique({
        where: {
          candidatoId_vagaId: {
            candidatoId,
            vagaId
          }
        },
        include: {
          candidato: true
        }
      });

      const novoStatus = !candidatura.selecionado;

      // Atualizar o status da candidatura
      await prisma.candidatura.update({
        where: {
          candidatoId_vagaId: {
            candidatoId,
            vagaId
          }
        },
        data: { selecionado: novoStatus }
      });

      // Se foi selecionado, enviar email
      if (novoStatus) {
        const emailHtml = `
          <h2>Parabéns! Você foi selecionado para uma vaga!</h2>
          <p>Você foi selecionado para a vaga de <strong>${vaga.titulo}</strong>.</p>
          <p>Veja mais detalhes da vaga em: <a href="https://vagas.shop/candidato/vagas/${vaga.id}/detalhes">https://vagas.shop/candidato/vagas/${vaga.id}/detalhes</a></p>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: candidatura.candidato.email,
          subject: `Você foi selecionado para a vaga de ${vaga.titulo}!`,
          html: emailHtml
        });
      }

      res.redirect(`/empresa/vagas/${vagaId}/candidatos`);
    } catch (error) {
      console.error('Erro ao atualizar seleção do candidato:', error);
      res.status(500).send('Erro ao atualizar seleção do candidato.');
    }
  });

  router.get('/perfil/:id', async (req, res) => {
    const { id } = req.params;

    try {
      

      const empresa = await prisma.empresa.findUnique({
        where: { id },
        select: {
          nomeFantasia: true,
          razaoSocial: true,
          logradouro: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          uf: true,
          telefone: true,
          whatsapp: true,
          sobre: true,
          logo: true,
          twitter: true,
          instagram: true,
          facebook: true,
          linkedin: true,
          avaliacoes: {
            select: {
              nota: true, // Seleciona apenas as notas das avaliações
            },
          },
        },
      });

      if (!empresa) {
        return res.status(404).send('Empresa não encontrada.');
      }

      // Calcula a média das notas
      const totalAvaliacoes = empresa.avaliacoes.length;
      const notaMedia =
        totalAvaliacoes > 0
          ? (
              empresa.avaliacoes.reduce((acc, curr) => acc + curr.nota, 0) /
              totalAvaliacoes
            ).toFixed(2)
          : 'N/A'; // Se não houver avaliações

      res.render('empresa/perfil', { empresa, notaMedia });
    } catch (error) {
      console.error('Erro ao carregar perfil da empresa:', error);
      res.status(500).send('Erro ao carregar perfil da empresa.');
    }
  });

  router.get('/vagas/:vagaId/candidatos', async (req, res) => {
    const { vagaId } = req.params;
    const { 
      busca,
      faixaSalarial,
      tipoContrato,
      disponibilidade,
      escolaridade,
      ocupacao,
      idiomas,
      page = 1 
    } = req.query;
    const perPage = 10;

    try {
      const vaga = await prisma.vaga.findUnique({
        where: { id: vagaId },
        include: { empresa: true },
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.status(403).send('Acesso negado.');
      }

      // Construir where clause para filtros
      const where = {
        vagaId,
        AND: [
          // Busca em texto livre
          ...(busca ? [{
            candidato: {
              OR: [
                { nomeCompleto: { contains: busca, mode: 'insensitive' } },
                { cidade: { contains: busca, mode: 'insensitive' } },
                { bairro: { contains: busca, mode: 'insensitive' } },
                { uf: { contains: busca, mode: 'insensitive' } },
                { cursos: { 
                  some: { 
                    OR: [
                      { curso: { contains: busca, mode: 'insensitive' } },
                      { instituicao: { contains: busca, mode: 'insensitive' } }
                    ]
                  }
                }},
                { experienciasProfissionais: { 
                  some: { 
                    OR: [
                      { empresa: { contains: busca, mode: 'insensitive' } },
                      { cargo: { contains: busca, mode: 'insensitive' } },
                      { funcao: { contains: busca, mode: 'insensitive' } }
                    ]
                  }
                }}
              ]
            }
          }] : []),
          // Filtros específicos
          ...(faixaSalarial ? [{ candidato: { faixaSalarial } }] : []),
          ...(tipoContrato ? [{ candidato: { tipoContrato } }] : []),
          ...(disponibilidade ? [{ candidato: { disponibilidade } }] : []),
          ...(escolaridade ? [{ candidato: { escolaridade } }] : []),
          ...(ocupacao ? [{ candidato: { ocupacao } }] : []),
          ...(idiomas ? [{ candidato: { idiomas: { hasEvery: Array.isArray(idiomas) ? idiomas : [idiomas] } } }] : [])
        ]
      };

      // Debug logs
      console.log('Busca:', busca);
      console.log('Idiomas:', idiomas);
      console.log('Query where:', JSON.stringify(where, null, 2));

      const totalCandidatos = await prisma.candidatura.count({ where });

      const candidaturas = await prisma.candidatura.findMany({
        where,
        include: { 
          candidato: {
            include: {
              cursos: true,
              experiencias: true
            }
          } 
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      });

      console.log('Total de candidatos encontrados:', totalCandidatos);

      res.render('empresa/candidatos', {
        vaga,
        vagaId,
        candidaturas,
        busca: busca || '',
        faixaSalarial: faixaSalarial || '',
        tipoContrato: tipoContrato || '',
        disponibilidade: disponibilidade || '',
        escolaridade: escolaridade || '',
        ocupacao: ocupacao || '',
        idiomas: idiomas || [],
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCandidatos / perPage),
        baseUrl: process.env.BASE_URL || `http://${req.get('host')}`
      });
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      res.status(500).send('Erro ao carregar os candidatos.');
    }
  });

  // Rota para editar vaga
  router.get('/vagas/:id/editar', async (req, res) => {
    try {
      const vaga = await prisma.vaga.findUnique({
        where: { id: req.params.id },
        include: { empresa: true }
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.redirect('/empresa/vagas');
      }

      res.render('empresa/editar_vaga', { vaga });
    } catch (error) {
      console.error('Erro ao carregar vaga para edição:', error);
      res.status(500).send('Erro ao carregar vaga para edição');
    }
  });

  // Rota para processar a edição
  router.post('/vagas/:id/editar', async (req, res) => {
    try {
      const vagaId = req.params.id;
      const {
        titulo, descricao, cargo, faixaSalarial, tipoContrato,
        disponibilidade, horarioTrabalho, tipoTrabalho, escolaridade,
        idiomas, beneficios
      } = req.body;

      // Verificar se a vaga pertence à empresa
      const vaga = await prisma.vaga.findUnique({
        where: { id: vagaId }
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.redirect('/empresa/vagas');
      }

      // Atualizar a vaga
      await prisma.vaga.update({
        where: { id: vagaId },
        data: {
          titulo,
          descricao,
          cargo,
          faixaSalarial,
          tipoContrato,
          disponibilidade,
          horarioTrabalho,
          tipoTrabalho,
          escolaridade,
          idiomas: Array.isArray(idiomas) ? idiomas : [idiomas],
          beneficios: Array.isArray(beneficios) ? beneficios : [beneficios]
        }
      });

      res.redirect('/empresa/vagas');
    } catch (error) {
      console.error('Erro ao atualizar vaga:', error);
      res.status(500).send('Erro ao atualizar vaga');
    }
  });

  // Rota para ver todos os candidatos
  router.get('/todos-candidatos', verifyToken, async (req, res) => {
    try {
      const { 
        page = 1, 
        busca = '', 
        pcd = '', 
        uf = '',
        escolaridade = '',
        idioma = '',
        cnh = ''
      } = req.query;
      const perPage = 5;
      const skip = (parseInt(page) - 1) * perPage;

      let where = {};

      if (busca) {
        where.nomeCompleto = { contains: busca, mode: 'insensitive' };
      }

      if (pcd) {
        where.pcd = pcd;
      }

      if (uf) {
        where.uf = uf;
      }

      if (escolaridade) {
        where.escolaridade = escolaridade;
      }

      if (idioma) {
        where.idiomas = {
          has: idioma
        };
      }

      if (cnh) {
        where.cnh = {
          has: cnh
        };
      }

      const totalCandidatos = await prisma.candidato.count({ where });
      const totalPages = Math.ceil(totalCandidatos / perPage);

      const candidatos = await prisma.candidato.findMany({
        where,
        skip,
        take: perPage,
        include: {
          cursos: true,
          experiencias: true,
          candidaturas: {
            include: {
              vaga: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.render('empresa/todos_candidatos', {
        candidatos,
        currentPage: parseInt(page),
        totalPages,
        busca,
        pcd,
        uf,
        escolaridade,
        idioma,
        cnh
      });
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      res.status(500).send('Erro ao carregar candidatos.');
    }
  });

  // Rota para ver candidatos de uma vaga específica
  router.get('/vagas/:id/candidatos', verifyToken, async (req, res) => {
    try {
      const vaga = await prisma.vaga.findUnique({
        where: { id: req.params.id },
        include: {
          candidaturas: {
            include: {
              candidato: {
                include: {
                  cursos: true,
                  experiencias: true
                }
              }
            }
          }
        }
      });

      if (!vaga || vaga.empresaId !== req.user.userId) {
        return res.redirect('/empresa/vagas');
      }

      res.render('empresa/candidatos_vaga', { 
        vaga,
        candidaturas: vaga.candidaturas 
      });
    } catch (error) {
      console.error('Erro ao carregar candidatos da vaga:', error);
      res.status(500).send('Erro ao carregar candidatos da vaga.');
    }
  });

  return router;
};