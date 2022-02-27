import webpack from './webpack.js'
import config from '../example/webpack.config.js'

const compiler = webpack(config)

compiler.run((err, stats)=>{
    if(err){
        console.log('build err:', err)
    }
    // stats
})

