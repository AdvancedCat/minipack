const fs = require('fs')

function toUnixPath(path){
    return path.replace(/\\/g, '/')
}

function isFromNodeModules(requirePath){
    return (/\.\.?\//).test(requirePath)
  }

function tryExtensions(modulePath, extensions, originModulePath, moduleContext){
    let exts = ['', ...extensions]
    for(let extension of exts){
        let fullName = modulePath + extension
        if(fs.existsSync(fullName)){
            return fullName
        }
    }
    console.log(modulePath, extensions, originModulePath, moduleContext)
    throw new Error(`No module found. Can't resolve ${modulePath} in ${moduleContext}`)
}

function getSourceCode(chunk){
    const {entryModule, modules} = chunk
    const finalModules = [entryModule, ...modules]

    return `
((modules)=>{

var installedModules = {}
function __webpack_require__(moduleId){
    var cacheModule = installedModules[moduleId]
    if(cacheModule !== void 0){
        return cacheModule.exports
    }
    var module = (
        installedModules[moduleId] = {
            exports: {}
        }
    )

    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__)

    return module.exports
}

return __webpack_require__( '${entryModule.id}' )

})(
    {
        ${finalModules.map(m=>`'${m.id}':(module, exports, __webpack_require__)=>{${m._source}}`).join(',')}
    }
);
`
}

module.exports = {
    toUnixPath,
    tryExtensions,
    getSourceCode,
    isFromNodeModules
}