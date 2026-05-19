export default {
  test: {
    environment: 'node',
    include: ['server/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'server/dist'],
  },
};
