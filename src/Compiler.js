import { SyncHook } from 'tapable'
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
    }

    run(callback){

    }
}