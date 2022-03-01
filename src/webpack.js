const Compiler = require('./Compiler.js')

function webpack(options){
    const mergeOptions = _mergeOptions(options)
    const compiler = new Compiler(mergeOptions)
    _loadPlugin(options.plugins, compiler)
    return compiler
}

/**
 * 将webpack.config.js中的配置参数与命令行中的参数合并
 * @param {*} options 
 * @returns 
 */
function _mergeOptions(options){
    const shellOptions = process.argv.slice(2).reduce((option, argv)=>{
        const [key, value] = argv.split('=')
        if(key && value){
            const parseKey = key.slice(2)
            option[parseKey] = value
        }
        return option
    }, {})
    
    return {
        ...options,
        ...shellOptions
    }
}

/**
 * 加载plugins
 * TODO: 插件也可以用纯函数形式提供 (compiler)=>{}
 * @param {*} plugins 
 * @param {*} compiler 
 */
function _loadPlugin(plugins, compiler){
    if(plugins && Array.isArray(plugins)){
        plugins.forEach(plugin=>{
            plugin.apply(compiler)
        })
    }
}

module.exports = webpack