const webpack = require('webpack');
const path = require('path');
module.exports = {
  entry: {
    build: [
      'babel-polyfill',
      //'react-hot-loader/patch',
      //'react-loader',
      './app/js/index'
    ],
  },
  devServer: {
    port: 9009,
    host: 'formbuilder.dev.redaxle.com',
    inline: true,
    contentBase: __dirname + '/public',
  },

  
  output: {
    path: path.join(__dirname, 'public', 'assets', 'js'),
    filename: 'build-webpack.js',
	  library: 'RTBundle',
  },
  //devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules(?!\/draft-js)/,
        loader: 'babel-loader',
        options: {
          plugins: ['transform-async-to-generator', 'styled-jsx/babel']
        },
      },
      {
        test: /\.scss$/,
        use: [
          {loader: 'style-loader'},
          {loader: 'css-loader'},
          {
            loader: 'sass-loader',
            options: {
              includePaths: ['src/css']
            }
          }
        ]
      },
    ],
  },
}