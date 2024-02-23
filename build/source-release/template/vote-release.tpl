--- Mail To: ---
dev@echarts.apache.org
-----------------------------------------------------------

--- Subject: ---
[VOTE] Release {{ECHARTS_RELEASE_VERSION_FULL_NAME}}
-----------------------------------------------------------

Dear community,

We are pleased to be calling this vote for the release of {{ECHARTS_RELEASE_VERSION_FULL_NAME}}.

The release candidate to be voted over is available at:
https://dist.apache.org/repos/dist/dev/echarts/{{ECHARTS_RELEASE_VERSION}}/

The release candidate is signed with a GPG key available at:
https://dist.apache.org/repos/dist/dev/echarts/KEYS

The Git commit for this release is:
https://gitbox.apache.org/repos/asf?p=echarts.git;a=commit;h={{ECHARTS_RELEASE_COMMIT}}

The Release Note is available in:
https://dist.apache.org/repos/dist/dev/echarts/{{ECHARTS_RELEASE_VERSION}}/RELEASE_NOTE.txt

Build Guide:
https://github.com/apache/echarts/blob/{{ECHARTS_RELEASE_VERSION}}/README.md#build

NPM Install:
npm i echarts@{{ECHARTS_RELEASE_VERSION}}
https://www.npmjs.com/package/echarts/v/{{ECHARTS_RELEASE_VERSION}}

Please vote on releasing this package as:
{{ECHARTS_RELEASE_VERSION_FULL_NAME}}
by "{{VOTE_UNTIL}}".

[ ] +1 Release this package
[ ] 0 I don't feel strongly about it, but don't object
[ ] -1 Do not release this package because...

Anyone can participate in testing and voting, not just committers, please
feel free to try out the release candidate and provide your votes.

A checklist for reference:
https://cwiki.apache.org/confluence/display/ECHARTS/Apache+ECharts+Release+Checklist
