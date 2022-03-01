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
    const statsJson = stats.toJson()
    // 将内部Set展开
    Object.keys(statsJson).forEach(key=>{
        if(statsJson[key] instanceof Set){
            statsJson[key].forEach(t => {
                ;typeof t === 'object' && ('dependencies' in t) && (t.dependencies = Array.from(t.dependencies))
            })
            statsJson[key] = Array.from(statsJson[key])
        }
    })
    fs.writeFileSync(path.join(__dirname, './example/build/stats.json'), JSON.stringify(statsJson))

    console.log('Build done.')
})

