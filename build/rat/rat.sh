#!/bin/sh

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.


# RunRat is used to call Apache Rat.
#
# (1) Usage:
#
# Check all:
# ```shell
# java -jar ${ecPath}/build/rat/runrat.jar
# ```
#
# Get help:
# ```shell
# java -jar ${ecPath}/build/rat/runrat.jar --help
# ```
#
# Notice that most of the arguments is the same as Apache Rat,
# only `--dir` and `--exclude` should not be specified.
#
# Ohter feature of Apache Rat:
# ```shell
# java -jar ${ecPath}/build/rat/runrat.jar [option]
# ```
#
#
# (2) Why call Apache Rat via `RunRat`?
#
# Because Apache Rat only support specifying file name (in regexp or wildcard) in its
# "exclude" file, but not support specifying file path (in regexp or wildcard), which
# is commonly necessary in the "ignore/exclude" file of this kind of features.
#
# For example:
# the file path "aaa/lib" (with slash) is not supported. But if only specifying "lib",
# all of the directories "lib" are excluded, which is not expected.
#
# (See `org.apache.rat.walker.Walker#isIgnore` for details, where the file `dir` is not
# actually used by `org.apache.commons.io.filefilter.RegexFileFilter#accept` and
# `org.apache.commons.io.filefilter.WildcardFileFilter#accept`.)
# So use this tool as a workaround.


basePath=$(cd `dirname $0`; pwd)
ecPath=${basePath}/../..

java -jar ${ecPath}/build/rat/runrat.jar
