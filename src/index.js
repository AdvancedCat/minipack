const webpack = require('./webpack.js')
const config = require( '../example/webpack.config.js')

const compiler = webpack(config)

compiler.run((err, stats)=>{
    if(err){
        console.log('build err:', err)
    }
    // stats
})

