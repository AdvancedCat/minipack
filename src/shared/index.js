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

function getSourceCode(chunk){
    const {name, entryModule, modules} = chunk
    return `
(()=>{
var __webpack_modules__ = {
    ${modules.map(m=>`'${m.id}':(module)=>{${m._source}}`).join(',')}
}

var __webpack_module_cache__ = {}
function __webpack_require__(moduleId){
    var cacheModule = __webpack_module_cache__[moduleId]
    if(cacheModule !== void 0){
        return cacheModule.exports
    }
    var module = (
        __webpack_module_cache__[moduleId] = {
            exports: {}
        }
    )

    __webpack_modules__[moduleId](module, module.exports, __webpack_require__)

    return module.exports
}

var __webpack_exports__ = {}

;(()=>{
    ${entryModule._source}
})()

})();
`
}

module.exports = {
    toUnixPath,
    tryExtensions,
    getSourceCode
}