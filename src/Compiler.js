const path = require('path')
const fs = require('fs')
const { SyncHook } = require('tapable')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generator = require('@babel/generator').default
const t = require('@babel/types')
const {toUnixPath, tryExtensions} = require('./shared/index.js')

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
        // 1. 获取源码
        const raw = (this.originSourceCode = fs.readFileSync(modulePath, 'utf-8'))
        this.moduleCode = raw
        // 2. 使用loader处理源码
        this.handleLoader(modulePath)
        // 3. 进行模块编译，得到module对象
        const module = this.handleWebpackCompiler(moduleName, modulePath)
        console.log('module', module)
        return module
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

    handleWebpackCompiler(moduleName, modulePath){
        // 以模块的路径名为模块id
        const moduleId = './' + path.posix.relative(this.rootPath, modulePath)
        const module = {
            id: moduleId,
            name: [moduleName],  // 该模块所属的入口文件
            dependencies: new Set()
        }
        // 解析模块代码
        const ast = parser.parse(this.moduleCode, {
            sourceType: 'module'
        })
        // 深度遍历语法树
        traverse(ast, {
            // 如果是require语句，则收集依赖项
            CallExpression: (nodePath) => {
                const node = nodePath.node
                if(node.callee.name === 'require'){
                    const requirePath = node.arguments[0].value
                    const moduleDirName = path.posix.dirname(modulePath)
                    const absolutePath = tryExtensions(
                        path.posix.join(moduleDirName, requirePath),
                        this.options.resolve.extensions,
                        moduleName,
                        moduleDirName
                    )
                    const moduleId = './' + path.posix.relative(this.rootPath, absolutePath)
                    node.callee = t.identifier('__webpack_require__')
                    node.arguments = [t.stringLiteral(moduleId)]
                    // 为当前模块添加依赖
                    module.dependencies.add(moduleId)
                }
            }
        })

        // 根据新的ast生成代码
        const {code} = generator(ast)
        module._source = code
        return module
    }
}