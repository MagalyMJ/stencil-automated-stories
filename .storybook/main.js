const path = require('path');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-viewport', '@storybook/addon-notes'],
  webpackFinal: async (config, { configType }) => {
    // `configType` has a value of 'DEVELOPMENT' or 'PRODUCTION'
    // You can change the configuration based on that.
    // 'PRODUCTION' is used when building the static version of storybook.

    config.devServer = {
      watchContentBase: true,
      contentBase: path.join(__dirname, 'src'),
      historyApiFallback: true,
    };

    config.module.rules[0].use[0].options.sourceType = 'unambiguous';

    config.module.rules.push({
      test: /.\.stories\.tsx$/,
      exclude: /(src)/,
      use: 'raw-loader',
    });
    config.resolve.extensions.push('.stories.tsx');

    config.resolve.alias = {
      '@src': path.resolve(__dirname, '../dist/collection'),
    };

    // Return the altered config
    return config;
  },
};
