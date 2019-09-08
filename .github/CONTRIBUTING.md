# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

Please check out the [Apache Code of Conduct](https://www.apache.org/foundation/policies/conduct.html).

## Issues

When opening new issues, please use the [echarts issue helper](https://ecomfe.github.io/echarts-issue-helper/), opening issues in any other way will cause our bot to close them automatically.

And before doing so, please search for similar questions in our [issues list](https://github.com/apache/incubator-echarts/issues?utf8=%E2%9C%93&q=is%3Aissue). If you are able to reproduce an issue found in a closed issue, please create a new issue and reference the closed one.

Please read the [documentation](http://echarts.apache.org/option.html) carefully before asking any questions.

Any questions in the form of *how can I use echarts to* or *how to use echarts x feature to* belong in [Stack Overflow](http://stackoverflow.com), issues with questions like that in the issue tracker will be closed.

## Release Milestone Discussion

We will start the discussion about the bugs to fix and features of each release in the [mailing list](https://echarts.apache.org/en/maillist.html). You may subscribe our [mailing list](https://echarts.apache.org/en/maillist.html) to give your valuable advice in the milestone dicussion.

About our release plan, we will release a mior version at the end of every month. Here is some detail.

1. Assume our current stable release is 4.3.0. We will start the discussion of milestone of the release two ahead, which is 4.5.0 at the beginning of each month. At this time we should also kickoff the developing of the next release, which is 4.4.0.
2. Finish 4.4.0 developing at about 22th of this month and start the testing. And the 4.5.0 milestone discussion is frozen and published on the [GitHub](https://github.com/apache/incubator-echarts/milestone/14)
3. Vote in the mailing list for the 4.4.0 release at the end of this month.

## Pull Requests

### Finding Easy Issues to Fix

You may use [difficulty: easy](https://github.com/apache/incubator-echarts/labels/difficulty%3A%20easy) label to filter issues that we think is easier to fix. These are issues that should be fixed using less time than the average. So if you wish to make some pull requests, this is where you can start with.

You may also filter with [en](https://github.com/apache/incubator-echarts/issues?q=is%3Aopen+label%3A%22difficulty%3A+easy%22+label%3Aen) label for English issues only.

### Coding Standard

Please follow the [coding standard](https://echarts.apache.org/en/coding-standard.html) before you make any changes.

### Git Message Standard

(TBD)

### Contact Us

If you wish to fix a bug or add new features but don't know how, please discuss it with us in the [mailing list](dev@echarts.apache.org).

## How to Debug ECharts

The following steps help you to set up a developing environment for ECharts.

### 1. Clone ECharts project

If you wish to make pull requests, you should **fork the ECharts project** first. Otherwise, just clone it locally.

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
npm link zrender
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

### 4. Run test

```bash
node test/runTest/cli.js
```

It will run all the test cases under `~/workspace/echarts/test` automatically to compare with the previous version. You can use this to check if your code bring some breaking change.

### 5. Make a pull request

Fork ECharts project into your own project. Checkout a branch from master branch named `fix-xxxx`, where xxxx is the issue id related. If there's no related issue, you need to create one in most cases to describe what's wrong or what new feature is required.

If you are a committer of apache/incubator-echarts project, which means you have the write access to the project, you still need to push to a new branch (by `git push origin HEAD:refs/heads/fix-xxxx`) and use pull request to push your code. You cannot push code directly to `master` branch, otherwise it will be rejected by GitHub.
