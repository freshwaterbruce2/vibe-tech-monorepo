'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeDesktopProject } = require('../../utils/write-project');

async function desktopGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'desktop');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeDesktopProject(tree, options);
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

module.exports = desktopGenerator;
module.exports.default = desktopGenerator;
