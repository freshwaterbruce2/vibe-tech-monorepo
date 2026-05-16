'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeLandingProject } = require('../../utils/write-project');

async function landingOnlyGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'landing-only');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeLandingProject(tree, options);
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

module.exports = landingOnlyGenerator;
module.exports.default = landingOnlyGenerator;
