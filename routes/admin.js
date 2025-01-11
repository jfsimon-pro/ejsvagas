const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const { authenticateAdmin } = require('../middlewares/auth');




module.exports = (prisma) => {
  // Middleware de autenticação para todas as rotas admin
  router.use(authenticateAdmin);
  // Dashboard do admin
  router.get('/dashboard', async (req, res) => {
    try {
      // Buscar estatísticas
      const stats = {
        empresasCount: await prisma.empresa.count(),
        candidatosCount: await prisma.candidato.count(),
        vagasCount: await prisma.vaga.count(),
        contratacoesCount: await prisma.candidatura.count({
          where: { selecionado: true }
        })
      };

      // Buscar atividades recentes (exemplo)
      const recentActivities = [
        {
          type: 'purple',
          icon: 'fa-building',
          description: 'Nova empresa cadastrada: Tech Solutions',
          time: 'Há 5 minutos'
        },
        {
          type: 'blue',
          icon: 'fa-user',
          description: 'Novo candidato registrado: João Silva',
          time: 'Há 15 minutos'
        },
        {
          type: 'green',
          icon: 'fa-briefcase',
          description: 'Nova vaga publicada: Desenvolvedor Full Stack',
          time: 'Há 30 minutos'
        },
        {
          type: 'orange',
          icon: 'fa-check-circle',
          description: 'Candidato contratado para vaga de UI/UX',
          time: 'Há 1 hora'
        }
      ];

      // Buscar informações do admin
      const admin = await prisma.admin.findUnique({
        where: { id: req.user.userId }
      });

      res.render('admin/dashboard', {
        admin,
        stats,
        recentActivities
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      res.status(500).send('Erro ao carregar dashboard');
    }
  });

  // Rota para listar todas as empresas
  router.get('/empresas', async (req, res) => {
    try {
      const empresas = await prisma.empresa.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
          email: true,
          telefone: true,
          cidade: true,
          uf: true,
          emailVerificado: true,
          createdAt: true,
          _count: {
            select: {
              vagas: true
            }
          }
        }
      });

      res.render('admin/empresas', { empresas });
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      res.status(500).send('Erro ao carregar lista de empresas');
    }
  });

  // Rota para excluir empresa
  router.post('/empresas/:id/delete', async (req, res) => {
    try {
      const { id } = req.params;

      // Primeiro, excluir todas as candidaturas relacionadas às vagas da empresa
      await prisma.candidatura.deleteMany({
        where: {
          vaga: {
            empresaId: id
          }
        }
      });

      // Depois, excluir todas as vagas da empresa
      await prisma.vaga.deleteMany({
        where: {
          empresaId: id
        }
      });

      // Por fim, excluir a empresa
      await prisma.empresa.delete({
        where: { id }
      });

      res.redirect('/admin/empresas');
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      res.status(500).send('Erro ao excluir empresa');
    }
  });

  // Rota para listar todos os candidatos
  router.get('/candidatos', async (req, res) => {
    try {
      const candidatos = await prisma.candidato.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          nomeCompleto: true,
          cpf: true,
          email: true,
          telefone: true,
          cidade: true,
          uf: true,
          escolaridade: true,
          emailVerificado: true,
          createdAt: true,
          _count: {
            select: {
              candidaturas: true
            }
          }
        }
      });

      res.render('admin/candidatos', { candidatos });
    } catch (error) {
      console.error('Erro ao listar candidatos:', error);
      res.status(500).send('Erro ao carregar lista de candidatos');
    }
  });

  // Rota para excluir candidato
  router.post('/candidatos/:id/delete', async (req, res) => {
    try {
      const { id } = req.params;

      // Primeiro, excluir todas as candidaturas do candidato
      await prisma.candidatura.deleteMany({
        where: { candidatoId: id }
      });

      // Excluir experiências profissionais
      await prisma.experienciaProfissional.deleteMany({
        where: { candidatoId: id }
      });

      // Excluir cursos
      await prisma.curso.deleteMany({
        where: { candidatoId: id }
      });

      // Excluir avaliações
      await prisma.avaliacao.deleteMany({
        where: { candidatoId: id }
      });

      // Por fim, excluir o candidato
      await prisma.candidato.delete({
        where: { id }
      });

      res.redirect('/admin/candidatos');
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      res.status(500).send('Erro ao excluir candidato');
    }
  });

  // Rota para listar todas as vagas
  router.get('/vagas', async (req, res) => {
    try {
      const vagas = await prisma.vaga.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          empresa: {
            select: {
              razaoSocial: true,
              cidade: true,
              uf: true
            }
          },
          _count: {
            select: {
              candidaturas: true
            }
          }
        }
      });

      res.render('admin/vagas', { vagas });
    } catch (error) {
      console.error('Erro ao listar vagas:', error);
      res.status(500).send('Erro ao carregar lista de vagas');
    }
  });

  // Rota para excluir vaga
  router.post('/vagas/:id/delete', async (req, res) => {
    try {
      const { id } = req.params;

      // Primeiro, excluir todas as candidaturas da vaga
      await prisma.candidatura.deleteMany({
        where: { vagaId: id }
      });

      // Depois, excluir a vaga
      await prisma.vaga.delete({
        where: { id }
      });

      res.redirect('/admin/vagas');
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      res.status(500).send('Erro ao excluir vaga');
    }
  });

  module.exports = router;
};