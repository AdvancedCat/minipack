import path from 'path'
import { SyncHook } from 'tapable'
import {toUnixPath} from './shared/index.js'

export default class Compiler{

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
    }

    run(callback){
        // 触发run钩子
        this.hooks.run.call()
        // 获取入口文件
        const entry = this.getEntry()
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
}