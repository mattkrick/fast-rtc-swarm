const path = require('path')

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
    externals: ['eventemitter3', '@mattkrick/fast-rtc-peer', 'tslib', 'uuid/v4'],
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'awesome-typescript-loader'
        }
      ]
    }
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
    externals: ['eventemitter3', '@mattkrick/fast-rtc-peer', 'tslib', 'uuid/v4'],
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'awesome-typescript-loader'
        }
      ]
    }
  }
]
