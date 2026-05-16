'use strict';

const { joinPathFragments, names } = require('@nx/devkit');

function normalizeOptions(schema, appType) {
  const rawName = schema.name || schema.directory;
  if (!rawName) {
    throw new Error('A project name or directory is required.');
  }

  const normalized = names(rawName);
  const projectName = normalized.fileName;
  const projectRoot = joinPathFragments('apps', projectName);

  return {
    appType,
    projectName,
    projectRoot,
    className: normalized.className,
    propertyName: normalized.propertyName,
    displayName: schema.displayName || normalized.className,
    port: schema.port || defaultPortFor(appType),
    tags: schema.tags
      ? schema.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : defaultTagsFor(appType),
  };
}

function defaultPortFor(appType) {
  switch (appType) {
    case 'landing-only':
      return 4300;
    case 'tauri-app':
      return 4310;
    case 'saas':
    default:
      return 4320;
  }
}

function defaultTagsFor(appType) {
  switch (appType) {
    case 'landing-only':
      return ['scope:web', 'type:application', 'factory:generated', 'factory:landing-only'];
    case 'tauri-app':
      return [
        'scope:desktop',
        'type:application',
        'factory:generated',
        'factory:tauri-app'
      ];
    case 'saas':
    default:
      return ['scope:web', 'type:application', 'factory:generated', 'factory:saas'];
  }
}

module.exports = {
  normalizeOptions,
};
