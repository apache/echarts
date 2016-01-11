/**
 * Copyright (c) 2010-2015, Michael Bostock
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * The name Michael Bostock may not be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function(e,t){typeof define=="function"&&define.amd?define(["exports","echarts"],t):typeof exports=="object"&&typeof exports.nodeName!="string"?t(exports,require("echarts")):t({},e.echarts)})(this,function(e,t){var n,r;(function(){function t(e,t){if(!t)return e;if(e.indexOf(".")===0){var n=t.split("/"),r=e.split("/"),i=n.length-1,s=r.length,o=0,u=0;e:for(var a=0;a<s;a++)switch(r[a]){case"..":if(!(o<i))break e;o++,u++;break;case".":u++;break;default:break e}return n.length=i-o,r=r.slice(u),n.concat(r).join("/")}return e}function i(e){function r(r,i){if(typeof r=="string"){var u=n[r];return u||(u=o(t(r,e)),n[r]=u),u}r instanceof Array&&(i=i||function(){},i.apply(this,s(r,i,e)))}var n={};return r}function s(r,i,s){var u=[],a=e[s];for(var f=0,l=Math.min(r.length,i.length);f<l;f++){var c=t(r[f],s),h;switch(c){case"require":h=a&&a.require||n;break;case"exports":h=a.exports;break;case"module":h=a;break;default:h=o(c)}u.push(h)}return u}function o(t){var n=e[t];if(!n)throw new Error("No "+t);if(!n.defined){var r=n.factory,i=r.apply(this,s(n.deps||[],r,t));typeof i!="undefined"&&(n.exports=i),n.defined=1}return n.exports}var e={};r=function(t,n,r){if(arguments.length===2){r=n,n=[];if(typeof r!="function"){var s=r;r=function(){return s}}}e[t]={id:t,deps:n,factory:r,defined:0,exports:{},require:i(t)}},n=i("")})(),r("echarts",[],function(){return t}),r("extension/dataTool/quantile",["require"],function(e){return function(e,t){var n=(e.length-1)*t+1,r=Math.floor(n),i=+e[r-1],s=n-r;return s?i+s*(e[r]-i):i}}),r("extension/dataTool/prepareBoxplotData",["require","./quantile","echarts"],function(e){var t=e("./quantile"),n=e("echarts").number;return function(e,r){r=r||[];var i=[],s=[],o=[],u=r.boundIQR;for(var a=0;a<e.length;a++){o.push(a+"");var f=n.asc(e[a].slice()),l=t(f,.25),c=t(f,.5),h=t(f,.75),p=h-l,d=u==="none"?f[0]:l-(u==null?1.5:u)*p,v=u==="none"?f[f.length-1]:h+(u==null?1.5:u)*p;i.push([d,l,c,h,v]);for(var m=0;m<f.length;m++){var g=f[m];if(g<d||g>v){var y=[a,g];r.layout==="vertical"&&y.reverse(),s.push(y)}}}return{boxData:i,outliers:s,axisData:o}}}),r("extension/dataTool/gexf",["require","echarts"],function(e){function n(e){var t;if(typeof e=="string"){var n=new DOMParser;t=n.parseFromString(e,"text/xml")}else t=e;if(!t||t.getElementsByTagName("parsererror").length)return null;var o=u(t,"gexf");if(!o)return null;var a=u(o,"graph"),f=r(u(a,"attributes")),l={};for(var c=0;c<f.length;c++)l[f[c].id]=f[c];return{nodes:i(u(a,"nodes"),l),links:s(u(a,"edges"))}}function r(e){return e?t.map(a(e,"attribute"),function(e){return{id:o(e,"id"),title:o(e,"title"),type:o(e,"type")}}):[]}function i(e,n){return e?t.map(a(e,"node"),function(e){var t=o(e,"id"),r=o(e,"label"),i={id:t,name:r,label:{normal:{formatter:r}},itemStyle:{normal:{}}},s=u(e,"viz:size"),f=u(e,"viz:position"),l=u(e,"viz:color"),c=u(e,"attvalues");s&&(i.symbolSize=parseFloat(o(s,"value"))),f&&(i.x=parseFloat(o(f,"x")),i.y=parseFloat(o(f,"y"))),l&&(i.itemStyle.normal.color="rgb("+[o(l,"r")|0,o(l,"g")|0,o(l,"b")|0].join(",")+")");if(c){var h=a(c,"attvalue");i.attributes={};for(var p=0;p<h.length;p++){var d=h[p],v=o(d,"for"),m=o(d,"value"),g=n[v];if(g){switch(g.type){case"integer":case"long":m=parseInt(m,10);break;case"float":case"double":m=parseFloat(m);break;case"boolean":m=m.toLowerCase()=="true";break;default:}i.attributes[v]=m}}}return i}):[]}function s(e){return e?t.map(a(e,"edge"),function(e){var t=o(e,"id"),n=o(e,"label"),r=o(e,"source"),i=o(e,"target"),s={id:t,name:n,source:r,target:i,lineStyle:{normal:{}}},a=s.lineStyle.normal,f=u(e,"viz:thickness"),l=u(e,"viz:color");return f&&(a.width=parseFloat(f.getAttribute("value"))),l&&(a.color="rgb("+[o(l,"r")|0,o(l,"g")|0,o(l,"b")|0].join(",")+")"),s}):[]}function o(e,t){return e.getAttribute(t)}function u(e,t){var n=e.firstChild;while(n){if(n.nodeType==1&&n.nodeName.toLowerCase()==t.toLowerCase())return n;n=n.nextSibling}return null}function a(e,t){var n=e.firstChild,r=[];while(n)n.nodeName.toLowerCase()==t.toLowerCase()&&r.push(n),n=n.nextSibling;return r}var t=e("echarts").util;return{parse:n}}),e.dataTool=t.dataTool={quantile:n("extension/dataTool/quantile"),prepareBoxplotData:n("extension/dataTool/prepareBoxplotData"),gexf:n("extension/dataTool/gexf")}});