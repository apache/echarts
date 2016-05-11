# Test Guide



## Functional Test

Open `./*.html` files in Web Browsers.



## Unit Test

### Rendering-relevant

Our test strategy is to compare the rendered canvas of current version with last release version. The comparison can either based on the *content* of rendered canvas, or the *stack* of canvas operations.

When a test case fails, it doesn't necessary to be a bug since the rendering method may be changed intentionally in a commit. So in this case, we output the rendering result of both versions and the diff result.

Make sure `../dist/echarts.js` is the built based on current source files by:

```bash
cd ../build
npm install
bash build.sh
```

By default, we compare current version with last release version. To run the test, you should first download last release using:

```bash
cd ../test/ut
./configure
```

which will download `echart.js` of last release into `./ut/tmp/oldEcharts.js`.

Then, open `./ut/ui.html` in Web Browsers.

#### Compare current with a specific release

If one argument is passed, we take it as the hash code of a release and compare current version with `/dist/echarts.js` of the that version.

```bash
# this compares current `/dist/echarts.js` with that of v3.1.6
./configure 3724a16
```

#### Compare arbitrary two commits

Since `/dist/echarts.js` is only the build result of release versions, to compare arbitrary versions, you need to checkout specific commits and build the source files. Put the build results as `./tmp/oldEcharts.js` and `./tmp/newEcharts.js` will work.



### Rendering-irrelevant

Open `./ut.html` files in Web Browsers.
