const fs = require('fs')

const buffer = fs.readFileSync("./dist/echarts.min.js")
const content = buffer.toString()
const result = content
    .replaceAll(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '')
    .trim()
    .replaceAll("\n", "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
const output = `export  const getEchartMinified = () =>{
    return "${result}"
}`

fs.writeFileSync('dist/react-native-echart.js', output)
console.log("Build echart for react native done! 🍺🍺🍺🍺🍺🍺");