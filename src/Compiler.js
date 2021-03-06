const path = require('path')
const fs = require('fs')
const { SyncHook } = require('tapable')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generator = require('@babel/generator').default
const t = require('@babel/types')
const {
  toUnixPath,
  tryExtensions,
  getSourceCode,
  isFromNodeModules
} = require('./shared/index.js')

module.exports = class Compiler {
  constructor(options) {
    this.options = options
    this.hooks = {
      // 开始编译
      run: new SyncHook(),
      // 输出打包结果
      emit: new SyncHook(),
      // 结束编译
      done: new SyncHook(),
    }
    // 根目录，文件或loader寻址定位需要
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

  /**
   * 启动编译流程
   * @param {*} callback 编译完成后的回调
   */
  run(callback) {
    // 触发run钩子
    this.hooks.run.call()
    // webpack运行 “三步走”
    // 获取入口文件配置对象
    const entry = this.getEntry()
    // 编译入口文件
    this.buildEntryModule(entry)
    // 输出打包产物
    this.exportFile(callback)

    // console.log('entries:', this.entries)
    // console.log('modules:', this.modules)
    // console.log('chunks:', this.chunks)
    // console.log('files:', this.files)
  }

  /**
   * 获取字典形式的入口文件
   * @returns {main: '', another: ''}
   */
  getEntry() {
    let entry = Object.create(null)
    const { entry: optionsEntry } = this.options

    if (typeof optionsEntry === 'string') {
      entry['main'] = optionsEntry
    } else {
      entry = optionsEntry
    }

    Object.keys(entry).forEach(key => {
      const oneEntry = entry[key]
      if (!path.isAbsolute(oneEntry)) {
        entry[key] = toUnixPath(path.join(this.rootPath, oneEntry))
      }
    })

    return entry
  }

  /**
   * 编译入口文件
   * @param {*} entry 入口文件配置对象
   */
  buildEntryModule(entry) {
    Object.keys(entry).forEach(name => {
      const entryPath = entry[name]
      const entryObj = this.buildModule(name, entryPath)
      this.entries.add(entryObj)
      // 根据当前入口文件和模块的相互依赖关系，组装成为一个个包含当前入口所有依赖模块的chunk
      this.buildUpChunk(name, entryObj)
    })
  }

  buildModule(moduleName, modulePath) {
    // 1. 获取源码
    const raw = (this.originSourceCode = fs.readFileSync(modulePath, 'utf-8'))
    this.moduleCode = raw
    // 2. 使用loader处理源码
    this.handleLoader(modulePath)
    // 3. 进行模块编译，得到module对象
    const module = this.handleWebpackCompiler(moduleName, modulePath)
    return module
  }

  /**
   * 以入口文件为单位，创建chunk
   * @param {*} entryName
   * @param {*} entryObj
   */
  buildUpChunk(entryName, entryObj) {
    const chunk = {
      name: entryName,
      entryModule: entryObj,
      modules: Array.from(this.modules).filter(m => m.name.includes(entryName)),
    }
    this.chunks.add(chunk)
  }

  /**
   * 读取loader，处理模块源码
   * @param {*} modulePath
   */
  handleLoader(modulePath) {
    const matchLoaders = []
    const rules = this.options.module.rules
    rules.forEach(rule => {
      const testRule = rule.test
      if (testRule.test(modulePath)) {
        if (rule.loader) {
          matchLoaders.push(rule.loader)
        } else {
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

  /**
   * 编译核心，parse --> traverse --> generator
   * 递归编译遇到的每一个模块
   * @param {*} moduleName
   * @param {*} modulePath
   * @returns
   */
  handleWebpackCompiler(moduleName, modulePath) {
    // 以模块的路径名为模块id
    const moduleId = './' + path.posix.relative(this.rootPath, modulePath)
    const module = {
      id: moduleId, // 相对于根路径
      name: [moduleName], // 该模块所属的入口文件
      dependencies: new Set(),
    }
    // 解析模块代码  AST结构 @see: https://astexplorer.net/
    const ast = parser.parse(this.moduleCode, {
      sourceType: 'module',
    })
    // 深度遍历语法树
    traverse(ast, {
      // 如果是require语句，则收集依赖项
      CallExpression: nodePath => {
        const node = nodePath.node
        if (node.callee.name === 'require') {
          const requirePath = node.arguments[0].value
          // TODO: 校验模块是否来自于 node_modules
          // const isNM = isFromNodeModules(requirePath)
          const moduleDirName = path.posix.dirname(modulePath)
          const absolutePath = tryExtensions(
            path.posix.join(moduleDirName, requirePath), // 引入模块的相对路径
            this.options.resolve.extensions,
            moduleName,
            moduleDirName,
          )
          const moduleId =
            './' + path.posix.relative(this.rootPath, absolutePath)
          node.callee = t.identifier('__webpack_require__')
          node.arguments = [t.stringLiteral(moduleId)]

          // 校验依赖项是否已经存在
          const alreadyModules = Array.from(this.modules).map(i => i.id)
          if (alreadyModules.includes(moduleId)) {
            // 已经存在的话 虽然不进行添加进入模块编译 但是仍要更新这个模块依赖的入口
            this.modules.forEach(m => {
              if (m.id === moduleId) {
                m.name.push(moduleName)
              }
            })
          } else {
            // 加入到当前模块的依赖项数组
            module.dependencies.add(moduleId)
          }
        }
      },
    })

    // 根据新的ast生成代码
    const { code } = generator(ast)
    module._source = code

    // 递归处理模块的依赖项
    module.dependencies.forEach(dep => {
      const depModule = this.buildModule(moduleName, dep)
      this.modules.add(depModule) // 将依赖项添加到modules中
    })

    return module
  }

  exportFile(callback) {
    const output = this.options.output
    // 根据chunks生成assets内容
    this.chunks.forEach(chunk => {
      const parseFileName = output.filename.replace('[name]', chunk.name)
      this.assets.add({
        filename: parseFileName,
        _source: getSourceCode(chunk),
      })
    })

    this.hooks.emit.call()

    if (!fs.existsSync(output.path)) {
      fs.mkdirSync(output.path)
    }

    this.assets.forEach(asset => {
      const { filename, _source } = asset
      const filePath = path.join(output.path, filename)
      this.files.add(filename)
      fs.writeFileSync(filePath, _source)
    })

    this.hooks.done.call()

    callback(null, {
      toJson: () => ({
        entries: this.entries,
        modules: this.modules,
        chunks: this.chunks,
        files: this.files,
        assets: this.assets,
      }),
    })
  }
}
