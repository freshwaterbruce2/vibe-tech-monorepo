'use strict';

const { formatFiles, generateFiles, joinPathFragments } = require('@nx/devkit');

const { normalizeOptions } = require('../../utils/normalize-options');
const { writeMcpProject } = require('../../utils/write-project');

async function mcpGenerator(tree, schema) {
  const options = normalizeOptions(schema, 'mcp');

  if (tree.exists(options.projectRoot)) {
    throw new Error(`Project root already exists: ${options.projectRoot}`);
  }

  writeMcpProject(tree, options);
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    {
      ...options,
      apiPort: options.port,
      mcpPort: options.port + 100, // separate port for MCP daemon
      tmpl: '',
    }
  );

  await formatFiles(tree);
}

module.exports = mcpGenerator;
module.exports.default = mcpGenerator;
