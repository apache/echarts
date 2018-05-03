basePath=$(cd `dirname $0`; pwd)
ecPath=${basePath}/..

java -jar "${basePath}/apache-rat-0.12.jar" --exclude-file "${ecPath}/.rat-excludes" --dir ${ecPath}
#  > "${basePath}/rat-result.txt"
# java -jar "${basePath}/apache-rat/apache-rat-0.12.jar" -h