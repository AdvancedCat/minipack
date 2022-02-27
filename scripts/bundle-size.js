import fs from 'fs'
import { promisify } from 'util'
import Table from 'cli-table'
import fileSize from 'filesize'
import {gzipSize} from 'gzip-size'
import { createRequire } from 'module'
import 'colors'

const require = createRequire(import.meta.url) // 确立 __dirname
const readFileAsync = promisify(fs.readFile)
const pkg = require('../package.json')
const NAME = pkg.name
const VERSION = pkg.version

async function printBundleSizes() {
    const table = new Table({
        head: [
            'Browser'.cyan + ' (gzip)'.green,
            'Browser min'.cyan + ' (gzip)'.green,
            'ESM'.cyan + ' (gzip)'.green,
        ],
    })

    const fileNames = ['index.js', 'index.min.js', 'index.esm.js']

    const row = []

    for (let fileName of fileNames) {
        const sizes = await getFileSize('dist/' + fileName)
        row.push(`${sizes.fileSize} / ${sizes.gzipSize.green}`)
    }

    table.push(row)

    console.log(`\n${NAME} - ${VERSION}`.cyan)
    console.log(table.toString())
}

async function getFileSize(file) {
    const data = await readFileAsync(file, 'utf-8')

    return {
        fileSize: fileSize(Buffer.byteLength(data)),
        gzipSize: fileSize(await gzipSize(data)),
    }
}

printBundleSizes().catch((err) => {
    console.error(err)
    process.exit(1)
})
