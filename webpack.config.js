const path = require('path')
const nodeExternals = require('webpack-node-externals');
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = [
  {
    mode: 'development',
    devtool: 'source-map',
    entry: {
      FastRTCSwarm: path.join(__dirname, 'src', 'FastRTCSwarm.ts'),
    },
    output: {
      path: path.join(__dirname, './dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      library: 'FastRTCSwarm'
    },
    resolve: {
      extensions: ['.ts']
    },
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'awesome-typescript-loader'
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin([path.join(__dirname, 'dist/**/*')])
    ]
  },
  {
    mode: 'development',
    devtool: 'source-map',
    entry: {
      server: path.join(__dirname, 'src', 'server.ts')
    },
    target: 'node',
    output: {
      path: path.join(__dirname, './'),
      filename: '[name].js',
      libraryTarget: 'commonjs2'
    },
    resolve: {
      extensions: ['.ts']
    },
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'awesome-typescript-loader'
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin([path.join(__dirname, 'dist/**/*')])
    ]
  }
]
