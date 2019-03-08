# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

Please checkout [Apache Code of Conduct](https://www.apache.org/foundation/policies/conduct.html) first.

## Issues

Please use [ECharts issue helper](https://ecomfe.github.io/echarts-issue-helper/) to create issues. Otherwise, they will be closed by our robot.

And before you do so, please search for similar questions in [issues list](https://github.com/apache/incubator-echarts/issues?utf8=%E2%9C%93&q=is%3Aissue). If a closed issue have new problems in your environment, please create a new issue and reference the previous one.

Please read the [documentation](http://echarts.apache.org/option.html) carefully before asking any questions.

Questions in the form on *how to use ECharts to ...* should be at http://stackoverflow.com and will be closed in GitHub issues.

## Pull Requests

If you wish to fix a bug or add some new features, please discuss with us in the issue first. If there's no such issue, please create an issue using [ECharts issue helper](https://ecomfe.github.io/echarts-issue-helper/).

## How to Debug ECharts

The following steps help you to set up a developing environment for ECharts.

### 1. Clone ECharts project

If you wish to make pull requests, you should fork the ECharts project first. Otherwise, just clone it locally.

```bash
git clone git@github.com:apache/incubator-echarts.git
```

[ZRender](https://github.com/ecomfe/zrender) is the rendering library under the hood. You need to clone it along with ECharts.

```bash
git clone git@github.com:ecomfe/zrender.git
```

We assume these projects are downloaded at `~/workspace/echarts` and `~/workspace/zrender`. But their locations can be arbitrary.

### 2. Install dependencies

```bash
cd ~/workspace/echarts
npm install
cd ~/workspace/zrender
npm install
```

Sometimes, we need to change the code of ZRender project to fix a problem in ECharts. So we need to make sure we are importing the ZRender in our local project, rather than latest released npm version. To do this, we use an npm feature called `npm link`.

```bash
cd ~/workspace/zrender
npm link
cd ~/workspace/echarts
npm link
```

And then, you can see `~/workspace/echarts/node_modules/zrender` is a link to `~/workspace/zrender`.

### 3. Run and debug

To build the ECharts project and watch source file changes (including ZRender project) to rebuild:

```bash
cd ~/workspace/echarts
node build/build.js --watch
```

To build once:
contributing-inspect.png
```bash
node build/build.js
```

Then, open the test cases under `~/workspace/echarts/test` in Web browser. You can add breakpoints under `src` directory. For example, in Chrome Inspect, it looks like:

![Chrome inspect](../asset/contributing-inspect.png)

### 4. Make a pull request

Fork ECharts project into your own project. Checkout a branch from master branch named `fix-xxxx`, where xxxx is the issue id related. If there's no related issue, you need to create one in most cases to describe what's wrong or what new feature is required.

If you are a committer of apache/incubator-echarts project, which means you have the write access to the project, you still need to push to a new branch (by `git push origin HEAD:refs/heads/fix-xxxx`) and use pull request to push your code. You cannot push code directly to `master` branch, otherwise it will be rejected by GitHub.

Once your PR is merged, you will be asked to assign a PDF file called [Apache ICLA](https://www.apache.org/licenses/icla.pdf). This is required for all non-trival commits of apache/incubator-echarts project, which means you don't have to sign it if you only changed some spelling in `README.md`.
