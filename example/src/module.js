const utils = require('./utils.js')

module.exports = function add(a, b) {
  if (utils.isNumber(a) && utils.isNumber(b)) {
    return a + b
  }
  throw new Error('a or b are not number.')
}
