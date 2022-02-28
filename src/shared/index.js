const fs = require('fs')

function toUnixPath(path){
    return path.replace(/\\/g, '/')
}

function tryExtensions(modulePath, extensions, originModulePath, moduleContext){
    let exts = ['', ...extensions]
    for(let extension of exts){
        let fullName = modulePath + extension
        if(fs.existsSync(fullName)){
            return fullName
        }
    }
    throw new Error(`No module found. Can't resolve ${originModulePath} in ${moduleContext}`)
}

module.exports = {
    toUnixPath,
    tryExtensions
}