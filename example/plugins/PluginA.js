
export default class PluginA {
    apply(compiler){
        // 注册钩子
        // 监听run
        compiler.hooks.run.tap('PluginA', ()=>{
            console.log('PluginA')
        })
    }
}