const medicoRepository = require('../repositories/medicoRepository');

async function listarMedicos(query) {
  const filtros = {
    nome:          query.nome          || null,
    especialidade: query.especialidade || null,
    convenio:      query.convenio      || null,
    ordem:         query.ordem         || null,
  };

  // TODO (Vito): verificar cache Redis antes de buscar no banco

  const medicos = await medicoRepository.listar(filtros);
  return medicos;
}

module.exports = { listarMedicos, atualizarNPS: medicoRepository.atualizarNPS };
