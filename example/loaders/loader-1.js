module.exports = function(code){
    console.log('call loader-1')
    return `${code}\n /*Transformed by loader-1")*/`
}