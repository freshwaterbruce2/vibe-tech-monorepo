'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeTauriProject } = require('../../utils/write-project');

async function tauriAppGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'tauri-app');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeTauriProject(tree, options);
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    {
      ...options,
      tmpl: '',
    }
  );

  await formatFiles(tree);
}

module.exports = tauriAppGenerator;
module.exports.default = tauriAppGenerator;
