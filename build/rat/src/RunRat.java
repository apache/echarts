/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * RunRat is used to call Apache Rat.
 *
 *
 * (1) Usage:
 *
 * Prepare, in command line:
 * ```shell
 * cd ${echartsBaseDir}/build/rat
 * ```
 *
 * Check all:
 * ```shell
 * java RunRat
 * ```
 *
 * Get help:
 * ```shell
 * java RunRat --help
 * ```
 *
 * Notice that most of the arguments is the same as Apache Rat,
 * only `--dir` and `--exclude` should not be specified.
 *
 * Ohter feature of Apache Rat:
 * ```shell
 * java RunRat [option]
 * ```
 *
 * Rebuild:
 * ```shell
 * javac RunRat.java
 * ```
 *
 *
 * (2) Why call Apache Rat via `RunRat`?
 *
 * Because Apache Rat only support specifying file name (in regexp or wildcard) in its
 * "exclude" file, but not support specifying file path (in regexp or wildcard), which
 * is commonly necessary in the "ignore/exclude" file of this kind of features.
 *
 * For example:
 * the file path "aaa/lib" (with slash) is not supported. But if only specifying "lib",
 * all of the directories "lib" are excluded, which is not expected.
 *
 * (See `org.apache.rat.walker.Walker#isIgnore` for details, where the file `dir` is not
 * actually used by `org.apache.commons.io.filefilter.RegexFileFilter#accept` and
 * `org.apache.commons.io.filefilter.WildcardFileFilter#accept`.)
 *
 * So use this tool as a workaround.
 */

import java.io.File;
import java.lang.reflect.Method;
import java.util.ArrayList;

import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtMethod;
import javassist.Loader;

public class RunRat {

    private String defaultRatMainClassName = "org.apache.rat.Report";

    private Method ratReportMainMethod;

    private File ecBaseDir;

    private ArrayList<String> ratArgList = new ArrayList<String>();

    public static void main(String[] args) throws Exception {

        RunRat runRat = new RunRat();

        runRat.prepareArgs(args);

        runRat.prepareLibs(args);

        runRat.callRat();
    }

    private void prepareArgs(String[] args) throws IllegalArgumentException {
        boolean reportTplSpecified = false;
        for (int i = 0; i < args.length; ) {
            String argStr = args[i];

            if (argStr.equals("--dir")
                || argStr.equals("-d")
                || argStr.equals("-e")
                || argStr.equals("--exclude")
                || argStr.equals("-E")
                || argStr.equals("-exclude-file")
            ) {
                throw new IllegalArgumentException(argStr + " should not be specified!");
            }

            if (argStr.equals("-s") || argStr.equals("--stylesheet")) {
                reportTplSpecified = true;
            }

            if (argStr.equals("--ec-base")) {
                this.ecBaseDir = new File(args[i + 1]);
                i += 2;
            }
            else {
                this.ratArgList.add(argStr);
                i++;
            }
        }

        if (this.ecBaseDir == null) {
            this.ecBaseDir = new File(new File(
                this.getClass().getProtectionDomain().getCodeSource().getLocation().getPath()
            ).getParent() + "/../..");
        }

        this.ratArgList.add("--dir");
        this.ratArgList.add(this.ecBaseDir.getPath());
        this.ratArgList.add("--exclude-file");
        this.ratArgList.add(this.ecBaseDir.getPath() + "/.rat-excludes");
        if (!reportTplSpecified) {
            this.ratArgList.add("-s");
            this.ratArgList.add(this.ecBaseDir.getPath() + "/build/rat/src/report.xsl");
        }
    }

    private void prepareLibs(String[] args) throws Exception {

        ClassPool cPool = new ClassPool(true);
        Loader loader = new Loader(cPool);
        cPool.appendClassPath(this.ecBaseDir + "/build/rat/apache-rat-0.12.jar");

        CtClass ctclzWalker = cPool.get("org.apache.rat.walker.Walker");
        CtMethod ctmethodIgnored = ctclzWalker.getDeclaredMethod("ignored");

        String ecBaseDirPath = this.ecBaseDir.getPath();

        ctmethodIgnored.setBody(""
            + "{"
            + "    boolean result = false;"
            + "    if (this.filter != null) {"
            + "        String name = $1.getName();"
            + "        java.io.File dir = $1.getParentFile();"
            + "        String relativePath = new java.io.File(\"" + ecBaseDirPath + "\").toURI().relativize($1.toURI()).getPath();"
            + "        if (relativePath.endsWith(\"/\")) {"
            + "            relativePath = relativePath.substring(0, relativePath.length() - 1);"
            + "        }"
            + "        result = !this.filter.accept(dir, relativePath);"
            + "    }"
            + "    return result;"
            + "}"
        );

        Class clzRatReport = loader.loadClass(this.defaultRatMainClassName);
        this.ratReportMainMethod = clzRatReport.getDeclaredMethod("main", String[].class);
    }

    private void callRat() throws Exception {
        String[] ratArgs = this.ratArgList.toArray(new String[this.ratArgList.size()]);

        this.ratReportMainMethod.invoke(null, (Object)ratArgs);
    }

}
