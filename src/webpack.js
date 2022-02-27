import Compiler from './Compiler.js'

function webpack(options){
    const mergeOptions = _mergeOptions(options)
    const compiler = new Compiler(mergeOptions)
    return compiler
}

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

export default webpack