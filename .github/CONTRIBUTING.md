# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

Please check out the [Apache Code of Conduct](https://www.apache.org/foundation/policies/conduct.html).

## Issues

When opening new issues, please use the [echarts issue helper](https://ecomfe.github.io/echarts-issue-helper/), opening issues in any other way will cause our bot to close them automatically.

And before doing so, please search for similar questions in our [issues list](https://github.com/apache/incubator-echarts/issues?utf8=%E2%9C%93&q=is%3Aissue). If you are able to reproduce an issue found in a closed issue, please create a new issue and reference the closed one.

Please read the [documentation](http://echarts.apache.org/option.html) carefully before asking any questions.

Any questions in the form of *how can I use echarts to* or *how to use echarts x feature to* belong in [Stack Overflow](http://stackoverflow.com), issues with questions like that in the issue tracker will be closed.

## Pull Requests

If you wish to fix a bug or add new features, please discuss it with us in an issue first. If there's no issue, please create one using the [echarts issue helper](https://ecomfe.github.io/echarts-issue-helper/).

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

Sometimes, in order to fix an issue within echarts, changes have to be made inside the codebase of zrender. To test any changes to zrender locally you can use npm's [npm link](https://docs.npmjs.com/cli/link.html) feature, for example:

```bash
cd ~/workspace/zrender
npm link
cd ~/workspace/echarts
npm link
```

With this, you can see that `~/workspace/echarts/node_modules/zrender` is a link to `~/workspace/zrender`.

### 3. Run and debug

To build the ECharts project and watch source file changes (including ZRender project) to rebuild:

```bash
cd ~/workspace/echarts
node build/build.js --watch
```

To build once:

```bash
node build/build.js
```

Then, open the test cases under `~/workspace/echarts/test` in Web browser. You can add breakpoints under `src` directory. For example, in Chrome Inspect, it looks like:

![Chrome inspect](../asset/contributing-inspect.png)

### 4. Make a pull request

Fork ECharts project into your own project. Checkout a branch from master branch named `fix-xxxx`, where xxxx is the issue id related. If there's no related issue, you need to create one in most cases to describe what's wrong or what new feature is required.

If you are a committer of apache/incubator-echarts project, which means you have the write access to the project, you still need to push to a new branch (by `git push origin HEAD:refs/heads/fix-xxxx`) and use pull request to push your code. You cannot push code directly to `master` branch, otherwise it will be rejected by GitHub.
