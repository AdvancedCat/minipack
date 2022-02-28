const fs = require('fs')
const path = require('path')
const webpack = require('./src/index.js')
const config = require( './example/webpack.config.js')

const compiler = webpack(config)

compiler.run((err, stats)=>{
    if(err){
        console.log('build err:', err)
        return
    }
    // stats
    fs.writeFileSync(path.join(__dirname, './example/build/stats.json'), JSON.stringify(stats.toJson()))
})

