module.exports = function(code){
    console.log('call loader-1')
    return `${code}\n console.log("Transform by loader-1")`
}