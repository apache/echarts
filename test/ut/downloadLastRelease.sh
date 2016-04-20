lastReleaseHash=$(git rev-list --tags --max-count=1)
mkdir -p tmp
git show $lastReleaseHash:dist/echarts.js > 'tmp/oldEcharts.js'
