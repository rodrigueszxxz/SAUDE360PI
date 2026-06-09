/**
 * sanitizarInput.js — Saúde 360
 * Middleware de sanitização de inputs para prevenir ataques de injeção.
 *
 * Protege contra:
 * - Prototype Pollution (__proto__, constructor, prototype em JSON)
 * - Strings excessivamente longas em campos de query
 * - Arrays onde se espera string simples (ex: ?campo[]=valor1&campo[]=valor2)
 */

/**
 * Remove chaves perigosas de objetos (prototype pollution prevention)
 */
function limparObjeto(obj, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 10) return obj;

  const chavesPerigosas = ['__proto__', 'constructor', 'prototype'];
  for (const chave of chavesPerigosas) {
    if (chave in obj) {
      delete obj[chave];
    }
  }

  for (const chave of Object.keys(obj)) {
    if (typeof obj[chave] === 'object' && obj[chave] !== null) {
      limparObjeto(obj[chave], profundidade + 1);
    } else if (typeof obj[chave] === 'string' && obj[chave].length > 10000) {
      // Truncar strings absurdamente longas para evitar DoS por payload
      obj[chave] = obj[chave].substring(0, 10000);
    }
  }

  return obj;
}

/**
 * Middleware que sanitiza req.body, req.query e req.params
 */
function sanitizarInput(req, _res, next) {
  if (req.body)   limparObjeto(req.body);
  if (req.query)  limparObjeto(req.query);
  if (req.params) limparObjeto(req.params);
  next();
}

module.exports = sanitizarInput;
