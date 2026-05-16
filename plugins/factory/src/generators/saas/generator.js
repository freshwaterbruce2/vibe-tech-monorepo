'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeSaasProject } = require('../../utils/write-project');

async function saasGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'saas');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeSaasProject(tree, options);
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    {
      ...options,
      apiPort: options.port + 1000,
      tmpl: '',
    }
  );

  await formatFiles(tree);
}

module.exports = saasGenerator;
module.exports.default = saasGenerator;
