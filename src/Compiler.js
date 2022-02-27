const path = require('path')
const fs = require('fs')
const { SyncHook } = require('tapable')
const {toUnixPath} = require('./shared/index.js')

module.exports = class Compiler{

    constructor(options){
        this.options = options
        this.hooks = {
            // 开始编译
            run: new SyncHook(),
            // 输出打包结果
            emit: new SyncHook(),
            // 结束编译
            done: new SyncHook()
        }
        this.rootPath = this.options.context || toUnixPath(process.cwd())

        //入口文件集合
        this.entries = new Set()
        // 依赖模块对象集合
        this.modules = new Set()
        // 中间产物的代码块集合
        this.chunks = new Set()
        // 打包产物集合
        this.assets = new Set()
        // 本地编译的所有文件名集合
        this.files = new Set()
    }

    run(callback){
        // 触发run钩子
        this.hooks.run.call()
        // 获取入口文件配置对象
        const entry = this.getEntry()
        // 编译入口文件
        this.buildEntryModule(entry)
    }

    /**
     * 获取字典形式的入口文件
     * @returns {main: '', another: ''}
     */
    getEntry(){
        let entry = Object.create(null)
        const {entry: optionsEntry} = this.options

        if(typeof optionsEntry === 'string'){
            entry['main'] = optionsEntry
        }else{
            entry = optionsEntry
        }

        Object.keys(entry).forEach(key=>{
            const oneEntry = entry[key]
            if(!path.isAbsolute(oneEntry)){
                entry[key] = toUnixPath(path.join(this.rootPath, oneEntry))
            }
        })

        return entry
    }

    /**
     * 编译入口文件
     * @param {*} entry 入口文件配置对象
     */
    buildEntryModule(entry){
        Object.keys(entry).forEach(name=>{
            const entryPath = entry[name]
            const entryObj = this.buildModule(name, entryPath)
            this.entries.add(entryObj)
        })
    }

    buildModule(moduleName, modulePath){
        const raw = (this.originSourceCode = fs.readFileSync(modulePath, 'utf-8'))
        this.moduleCode = raw
        this.handleLoader(modulePath)
        console.log('moduleCode', this.moduleCode)

        return {}
    }

    handleLoader(modulePath){
        const matchLoaders = []
        const rules = this.options.module.rules
        rules.forEach(rule=>{
            const testRule = rule.test
            if(testRule.test(modulePath)){
                if(rule.loader){
                    matchLoaders.push(rule.loader)
                }else{
                    matchLoaders.push(...rule.use)
                }
            }
        })

        // 倒序遍历
        matchLoaders.reverse().forEach(async loader => {
            const loaderFn = require(loader)
            this.moduleCode = loaderFn(this.moduleCode)
        })
    }
}