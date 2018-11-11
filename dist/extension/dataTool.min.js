
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


!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("echarts")):"function"==typeof define&&define.amd?define(["exports","echarts"],t):t(e.dataTool={},e.echarts)}(this,function(e,t){"use strict";function r(e,t,r){if(e&&t){if(e.map&&e.map===c)return e.map(t,r);for(var a=[],n=0,o=e.length;n<o;n++)a.push(t.call(r,e[n],n,e));return a}}function a(e){return e?r(u(e,"attribute"),function(e){return{id:i(e,"id"),title:i(e,"title"),type:i(e,"type")}}):[]}function n(e,t){return e?r(u(e,"node"),function(e){var r={id:i(e,"id"),name:i(e,"label"),itemStyle:{normal:{}}},a=l(e,"viz:size"),n=l(e,"viz:position"),o=l(e,"viz:color"),s=l(e,"attvalues");if(a&&(r.symbolSize=parseFloat(i(a,"value"))),n&&(r.x=parseFloat(i(n,"x")),r.y=parseFloat(i(n,"y"))),o&&(r.itemStyle.normal.color="rgb("+[0|i(o,"r"),0|i(o,"g"),0|i(o,"b")].join(",")+")"),s){var f=u(s,"attvalue");r.attributes={};for(var c=0;c<f.length;c++){var p=f[c],d=i(p,"for"),v=i(p,"value"),g=t[d];if(g){switch(g.type){case"integer":case"long":v=parseInt(v,10);break;case"float":case"double":v=parseFloat(v);break;case"boolean":v="true"==v.toLowerCase()}r.attributes[d]=v}}}return r}):[]}function o(e){return e?r(u(e,"edge"),function(e){var t={id:i(e,"id"),name:i(e,"label"),source:i(e,"source"),target:i(e,"target"),lineStyle:{normal:{}}},r=t.lineStyle.normal,a=l(e,"viz:thickness"),n=l(e,"viz:color");return a&&(r.width=parseFloat(a.getAttribute("value"))),n&&(r.color="rgb("+[0|i(n,"r"),0|i(n,"g"),0|i(n,"b")].join(",")+")"),t}):[]}function i(e,t){return e.getAttribute(t)}function l(e,t){for(var r=e.firstChild;r;){if(1==r.nodeType&&r.nodeName.toLowerCase()==t.toLowerCase())return r;r=r.nextSibling}return null}function u(e,t){for(var r=e.firstChild,a=[];r;)r.nodeName.toLowerCase()==t.toLowerCase()&&a.push(r),r=r.nextSibling;return a}function s(e){return e.sort(function(e,t){return e-t}),e}function f(e,t){var r=(e.length-1)*t+1,a=Math.floor(r),n=+e[a-1],o=r-a;return o?n+o*(e[a]-n):n}var c=Array.prototype.map,p=(Object.freeze||Object)({parse:function(e){var t;if(!(t="string"==typeof e?(new DOMParser).parseFromString(e,"text/xml"):e)||t.getElementsByTagName("parsererror").length)return null;var r=l(t,"gexf");if(!r)return null;for(var i=l(r,"graph"),u=a(l(i,"attributes")),s={},f=0;f<u.length;f++)s[u[f].id]=u[f];return{nodes:n(l(i,"nodes"),s),links:o(l(i,"edges"))}}}),d=function(e,t){for(var r=[],a=[],n=[],o=(t=t||[]).boundIQR,i="none"===o||0===o,l=0;l<e.length;l++){n.push(l+"");var u=s(e[l].slice()),c=f(u,.25),p=f(u,.5),d=f(u,.75),v=u[0],g=u[u.length-1],h=(null==o?1.5:o)*(d-c),b=i?v:Math.max(v,c-h),m=i?g:Math.min(g,d+h);r.push([b,c,p,d,m]);for(var y=0;y<u.length;y++){var x=u[y];if(x<b||x>m){var w=[l,x];"vertical"===t.layout&&w.reverse(),a.push(w)}}}return{boxData:r,outliers:a,axisData:n}};t.dataTool&&(t.dataTool.version="1.0.0",t.dataTool.gexf=p,t.dataTool.prepareBoxplotData=d),e.version="1.0.0",e.gexf=p,e.prepareBoxplotData=d});
