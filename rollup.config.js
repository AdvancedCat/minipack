import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'
import assert from 'assert'
import pkg from './package.json'

const banner = `/*!
* ${pkg.name} v${pkg.version}
* @${pkg.author}
* Released under the ${pkg.license.toUpperCase()} License.
*/`

// 在这里指定挂载全局的包名称
const BundleName = 'minipack'
assert.ok(BundleName, '请输入正确的包名称!')
const commonOutput = {
    name: BundleName,
    format: 'umd',
    banner,
    exports: 'named',
}

export default {
    input: 'src/index.js', // 打包入口
    output: [
        {
            ...commonOutput,
            file: 'dist/index.js',
        },
        {
            ...commonOutput,
            file: 'dist/index.min.js',
            sourcemap: true,
            plugins: [terser()],
        },
        {
            ...commonOutput,
            file: 'dist/index.esm.js',
            format: 'es',
        },
    ],
    plugins: [
        // 打包插件
        replace({
            preventAssignment: true,
            values: {
                'process.env.NODE_ENV': JSON.stringify('production'),
            },
        }),
        resolve(), // 查找和打包node_modules中的第三方模块
        commonjs(), // 将 CommonJS 转换成 ES2015 模块供 Rollup 处理
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**', // 只编译我们的源代码
        }),
    ],
}
