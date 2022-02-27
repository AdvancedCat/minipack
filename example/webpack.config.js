const path = require('path')
const PluginA = require('./plugins/PluginA.js')

module.exports= {
    mode: 'development',
    entry: {
        main: path.resolve(__dirname, './src/entry1.js'),
        second: path.resolve(__dirname, './src/entry2.js'),
    },
    context: process.cwd(),
    output: {
        path: path.resolve(__dirname, './build'),
        filename: '[name].js'
    },
    resolve:{
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [{
            test: /\.js/,
            use: [
                path.resolve(__dirname, './loaders/loader-1.js')
            ]
        }]
    },
    plugins: [new PluginA()]
}