const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Saúde 360 - Pagamentos API',
      version: '2.1.0',
      description: 'Documentação dos endpoints de pagamentos da plataforma Saúde 360, integrados com Stripe e PIX.',
      contact: {
        name: 'Suporte Saúde 360',
        url: 'https://saude360.example.com/suporte',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/pagamentoRoutes.js', './controllers/pagamentoController.js'],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
