
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


!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("echarts")):"function"==typeof define&&define.amd?define(["exports","echarts"],t):t(e.dataTool={},e.echarts)}(this,function(e,t){"use strict";var i=Array.prototype.map;function l(e,t,r){if(e&&t){if(e.map&&e.map===i)return e.map(t,r);for(var a=[],o=0,n=e.length;o<n;o++)a.push(t.call(r,e[o],o,e));return a}}function v(e,t){return e.getAttribute(t)}function d(e,t){for(var r=e.firstChild;r;){if(1==r.nodeType&&r.nodeName.toLowerCase()==t.toLowerCase())return r;r=r.nextSibling}return null}function g(e,t){for(var r=e.firstChild,a=[];r;)r.nodeName.toLowerCase()==t.toLowerCase()&&a.push(r),r=r.nextSibling;return a}var r=(Object.freeze||Object)({parse:function(e){var t;if(!(t="string"==typeof e?(new DOMParser).parseFromString(e,"text/xml"):e)||t.getElementsByTagName("parsererror").length)return null;var r=d(t,"gexf");if(!r)return null;for(var a=d(r,"graph"),o=function(e){return e?l(g(e,"attribute"),function(e){return{id:v(e,"id"),title:v(e,"title"),type:v(e,"type")}}):[]}(d(a,"attributes")),n={},i=0;i<o.length;i++)n[o[i].id]=o[i];return{nodes:function(e,p){return e?l(g(e,"node"),function(e){var t={id:v(e,"id"),name:v(e,"label"),itemStyle:{normal:{}}},r=d(e,"viz:size"),a=d(e,"viz:position"),o=d(e,"viz:color"),n=d(e,"attvalues");if(r&&(t.symbolSize=parseFloat(v(r,"value"))),a&&(t.x=parseFloat(v(a,"x")),t.y=parseFloat(v(a,"y"))),o&&(t.itemStyle.normal.color="rgb("+[0|v(o,"r"),0|v(o,"g"),0|v(o,"b")].join(",")+")"),n){var i=g(n,"attvalue");t.attributes={};for(var l=0;l<i.length;l++){var u=i[l],s=v(u,"for"),f=v(u,"value"),c=p[s];if(c){switch(c.type){case"integer":case"long":f=parseInt(f,10);break;case"float":case"double":f=parseFloat(f);break;case"boolean":f="true"==f.toLowerCase()}t.attributes[s]=f}}}return t}):[]}(d(a,"nodes"),n),links:function(e){return e?l(g(e,"edge"),function(e){var t={id:v(e,"id"),name:v(e,"label"),source:v(e,"source"),target:v(e,"target"),lineStyle:{normal:{}}},r=t.lineStyle.normal,a=d(e,"viz:thickness"),o=d(e,"viz:color");return a&&(r.width=parseFloat(a.getAttribute("value"))),o&&(r.color="rgb("+[0|v(o,"r"),0|v(o,"g"),0|v(o,"b")].join(",")+")"),t}):[]}(d(a,"edges"))}}});function w(e,t){var r=(e.length-1)*t+1,a=Math.floor(r),o=+e[a-1],n=r-a;return n?o+n*(e[a]-o):o}function a(e,t){for(var r,a=[],o=[],n=[],i=(t=t||[]).boundIQR,l="none"===i||0===i,u=0;u<e.length;u++){n.push(u+"");var s=((r=e[u].slice()).sort(function(e,t){return e-t}),r),f=w(s,.25),c=w(s,.5),p=w(s,.75),v=s[0],d=s[s.length-1],g=(null==i?1.5:i)*(p-f),h=l?v:Math.max(v,f-g),b=l?d:Math.min(d,p+g);a.push([h,f,c,p,b]);for(var m=0;m<s.length;m++){var y=s[m];if(y<h||b<y){var x=[u,y];"vertical"===t.layout&&x.reverse(),o.push(x)}}}return{boxData:a,outliers:o,axisData:n}}var o="1.0.0";t.dataTool&&(t.dataTool.version=o,t.dataTool.gexf=r,t.dataTool.prepareBoxplotData=a),e.version=o,e.gexf=r,e.prepareBoxplotData=a});
