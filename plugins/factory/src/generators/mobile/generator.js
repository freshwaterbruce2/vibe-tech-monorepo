'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeMobileProject } = require('../../utils/write-project');

async function mobileGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'mobile');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeMobileProject(tree, options);
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

module.exports = mobileGenerator;
module.exports.default = mobileGenerator;
