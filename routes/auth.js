const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const SALT_ROUNDS = 12;

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Função para verificar a conexão do email
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Conexão com o servidor de email estabelecida');
  } catch (error) {
    console.error('Erro ao conectar com servidor de email:', error);
  }
};

// Verificar conexão ao iniciar
verifyEmailConnection();

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas PDF e DOCX são permitidos.'));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = (prisma) => {
  // Página de login do candidato
  router.get('/login_candidato', (req, res) => {
    res.render('auth/login_candidato', { message: req.query.message });
  });

  // Página de login da empresa
  router.get('/login_empresa', (req, res) => {
    res.render('auth/login_empresa', { message: req.query.message });
  });

  // Página de login do admin
  router.get('/login_admin', (req, res) => {
    res.render('auth/login_admin', { message: req.query.message });
  });

  // Processar login do candidato
  router.post('/login_candidato', async (req, res) => {
    const { email, senha } = req.body;

    try {
      const candidato = await prisma.candidato.findUnique({ where: { email } });

      if (!candidato || !(await bcrypt.compare(senha, candidato.senha))) {
        return res.render('auth/login_candidato', { message: 'Email ou senha inválidos.' });
      }

      const token = jwt.sign(
        { userId: candidato.id, email: candidato.email, role: 'candidato' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, { httpOnly: true });
      res.redirect('/candidato/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      res.render('auth/login_candidato', { message: 'Erro ao fazer login.' });
    }
  });

  // Processar login da empresa
  router.post('/login_empresa', async (req, res) => {
    const { email, senha } = req.body;

    try {
      const empresa = await prisma.empresa.findUnique({ where: { email } });

      if (!empresa || !(await bcrypt.compare(senha, empresa.senha))) {
        return res.render('auth/login_empresa', { message: 'Email ou senha inválidos.' });
      }

      const token = jwt.sign(
        { userId: empresa.id, email: empresa.email, role: 'empresa' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, { httpOnly: true });
      res.redirect('/empresa/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      res.render('auth/login_empresa', { message: 'Erro ao fazer login.' });
    }
  });

  // Processar login do admin
  router.post('/login_admin', async (req, res) => {
    const { email, senha } = req.body;

    try {
      const admin = await prisma.admin.findUnique({ where: { email } });

      if (!admin || !(await bcrypt.compare(senha, admin.senha))) {
        return res.render('auth/login_admin', { message: 'Email ou senha inválidos.' });
      }

      const token = jwt.sign(
        { userId: admin.id, email: admin.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', token, { httpOnly: true });
      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      res.render('auth/login_admin', { message: 'Erro ao fazer login.' });
    }
  });

  // Logout
  router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
  });

  // Verificação de email
  router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Atualizar o status de verificação do email
      await prisma.empresa.updateMany({
        where: {
          email: decoded.email,
          emailVerificado: false,
          verificationToken: token
        },
        data: {
          emailVerificado: true,
          verificationToken: null
        }
      });

      res.redirect('/auth/login_empresa?message=Email verificado com sucesso!');
    } catch (error) {
      console.error('Erro na verificação de email:', error);
      res.redirect('/auth/login_empresa?message=Link de verificação inválido ou expirado.');
    }
  });

  return router;
};