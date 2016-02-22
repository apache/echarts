module.exports = {
  entry: './amd2common.js',
  target: 'node',
  output: {
    filename: 'amd2common.bundle.js'
  },
  node: {
    __dirname: false,
    __filename: false
  }
}