const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const appSrc = path.resolve(__dirname, 'src');
const appPublic = path.resolve(__dirname, 'public');
const appIndexJs = path.resolve(appSrc, 'index.js');
const appHtml = path.resolve(appPublic, 'index.html');
const appDist = path.resolve(__dirname, 'dist');

module.exports = (_env = {}, argv = {}) => {
  const mode = argv.mode || process.env.NODE_ENV || 'development';
  const isProduction = mode === 'production';

  return {
    mode,
    entry: appIndexJs,
    output: {
      path: appDist,
      filename: isProduction ? 'assets/js/[name].[contenthash].js' : 'assets/js/[name].js',
      chunkFilename: isProduction ? 'assets/js/[name].[contenthash].chunk.js' : 'assets/js/[name].chunk.js',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
    },
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          include: appSrc,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                require.resolve('@babel/preset-env'),
                [
                  require.resolve('@babel/preset-react'),
                  {
                    runtime: 'automatic',
                    importSource: 'react',
                  },
                ],
              ],
              cacheDirectory: true,
              cacheCompression: false,
            },
          },
        },
        {
          test: /\.css$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : require.resolve('style-loader'),
            {
              loader: require.resolve('css-loader'),
              options: {
                importLoaders: 1,
                sourceMap: !isProduction,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                sourceMap: !isProduction,
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 10 * 1024,
            },
          },
        },
        {
          test: /\.(woff2?|ttf|eot)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: appHtml,
        favicon: path.resolve(appPublic, 'favicon.ico'),
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
        'import.meta.env.MODE': JSON.stringify(mode),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
          process.env.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || ''
        ),
      }),
      new MiniCssExtractPlugin({
        filename: isProduction ? 'assets/css/[name].[contenthash].css' : 'assets/css/[name].css',
        chunkFilename: isProduction ? 'assets/css/[name].[contenthash].chunk.css' : 'assets/css/[name].chunk.css',
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
      runtimeChunk: 'single',
    },
    devServer: {
      static: [
        {
          directory: appPublic,
          watch: true,
        },
        {
          directory: appDist,
        },
      ],
      historyApiFallback: true,
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
      hot: true,
      open: false,
      client: {
        overlay: true,
      },
    },
    performance: {
      hints: false,
    },
  };
};
