# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

Please check out the [Apache Code of Conduct](https://www.apache.org/foundation/policies/conduct.html) first.

## What can you do for the ECharts community?

Contributions can be made in varied ways:

- Help others in the issues
    - Help solve problems with the issues
    - Remind the authors to provide a demo if they are reporting for a bug
    - Try to reproduce the problem as described in the issues
- Make pull requests to fix bugs or implement new features
- Improve or translate the documents
- Discuss in the [mailing list](https://echarts.apache.org/en/maillist.html)
- ...

## Issues

When opening new issues, please use the [echarts issue helper](https://ecomfe.github.io/echarts-issue-helper/), opening issues in any other way will cause our bot to close them automatically.

Additionally, before doing so, please search for similar questions in our [issues list](https://github.com/apache/echarts/issues?utf8=%E2%9C%93&q=is%3Aissue). If you are able to reproduce an issue found in a closed issue, please create a new issue and reference the closed one.

Please read the [documentation](http://echarts.apache.org/option.html) carefully before asking any questions.

Any questions in the form of *how can I use echarts to* or *how to use echarts x feature to* belong in [Stack Overflow](http://stackoverflow.com), issues with questions like that in the issue tracker will be closed.

## Release Milestone Discussion

We will start the discussion about the bugs to fix and the features of each release in the [mailing list](https://echarts.apache.org/en/maillist.html). You may subscribe to our [mailing list](https://echarts.apache.org/en/maillist.html) to give your valuable advice in milestone discussions.

Regarding the release plan, we will release a minor version at the end of every month. Here is some detail.

1. Assume our current stable release is 4.3.0. We will start the discussion of the milestone of the release two versions ahead, which is 4.5.0 at the beginning of each month. At this time we should also kickoff the development of the next release, which is 4.4.0.
2. Finish 4.4.0 developing at about 22th of this month and start the testing. And the 4.5.0 milestone discussion is frozen and published on the [GitHub](https://github.com/apache/echarts/milestone/14)
3. Vote in the mailing list for the 4.4.0 release at the end of this month.

## Pull Requests

Wiki: [How to make a pull request](https://github.com/apache/echarts/wiki/How-to-make-a-pull-request)

## How to Debug ECharts

Wiki: [How to setup the dev environment](https://github.com/apache/echarts/wiki/How-to-setup-the-dev-environment)

## Some hints about using code from other authors

+ About using some algorithms/formulas or inspired by other's work:
    + We can be inspired by other people’s work. There is no problem with copying ideas and no problems associated with that so long as the code is entirely yours and you aren’t violating the license of the inspirational work. You can just follow "normal" source code rules.
    + But when you copy the code, even parts of files, it must remain under the copyright of the original authors.
    + What's the right thing to do for the public good here? I'll go with:
        + Be transparent when implementing an existing idea/algorithm.
        + Reference where that idea/algorithm came from.
        + Use standard language when doing so (we need to define standard language).
            + "inspired by", "learned from" and "references to" are vague concepts in copyright.
        + If any copyrightable expression is copied from the existing idea/algorithm, compare its licensing to our licensing policies and include licensing accordingly.
    + Check the original discussion about it in: https://lists.apache.org/list.html?legal-discuss@apache.org:lte=36M:echarts
+ About adding the license/header of 3rd-party work:
    + https://www.apache.org/legal/src-headers.html#3party
+ Licenses that are compatible with the Apache license:
    + BSD and MIT are compatible with the Apache license but CC_BY_SA is not (https://apache.org/legal/resolved.html#cc-sa).
+ Stack Overflow:
    + before intending to copy code from Stack Overflow, we must check:
    + https://apache.org/legal/resolved.html#stackoverflow
    + https://issues.apache.org/jira/browse/LEGAL-471
+ Wikipedia (and most Wikimedia Foundation projects):
    + Wikipedia, and most Wikimedia Foundation projects, are licensed under CC 4.0 BY_SA (and sometimes GFDL) and is incompatible with the Apache license. Therefore, we should not copy code from Wikipedia, or Wikimedia Foundation projects.
