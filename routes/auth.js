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

// Filtro para aceitar apenas arquivos PDF e DOCX
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
  // Todas as rotas aqui dentro

  // ... código das rotas ...

  return router;
};