/**
 * numeric format utility
 *
 * @desc numeric format utility for echarts. the format string is similar to excel
 * @author He Jiang (hejiang@shujuguan.cn, hejiang@tju.edu.cn)
 *
 */
define(function (require) {
	"use strict";

	function _format(data, format)
	{
		if (data === null)
			return "null";
			
		var r = /([^;]*)?(?:;([^;]*))?(?:;([^;]*))?(?:;([^;]*))?/;
		var f = r.exec(format);
		// f[1] <-- 正数格式
		// f[2] <-- 负数格式
		// f[3] <-- 零格式
		// f[4] <-- 文本格式

		if (!f[1])
			return data.toString();
			
		data = data.valueOf();
		if (typeof data === 'number') {
			if (data < 0 && f[2])
				return _formatNumber(-data, f[2]);
			if (data == 0 && f[3])
				return _formatNumber(data, f[3]);
				
			return _formatNumber(data, f[1]);
		}
		
		return data.toString();
	}
	function _formatNumber(data, format) {
		var r = /(\[.*\])?([^.]*[^.%,`])?(\.[#0\?]*)?(%?)([,`]*)(.*)/;
		var f = r.exec(format);
		// f[1] <-- 特殊格式
		// f[2] <-- 整数格式
		// f[3] <-- 小数格式
		// f[4] <-- %
		// f[5] <-- 缩放倍数
		// f[6] <-- 后缀
		
		// 显示为百分数, 放大100倍
		if (f[4])
			data *= 100;
			
		var zf = f[5];
		if (zf) {
			for (var i = 0; i < zf.length; ++i) {
				var c = zf.charAt(i);
				// 以,结尾, 缩小1000倍
				if (c == ',') data /= 1000;
				// 以`结尾, 缩小10000倍
				if (c == '`') data /= 10000;
			}
		}
		
		// 处理符号
		var s = '';
		if (data < 0) {
			s = '-';
			data = Math.abs(data);
		}
		
		// 字符串化
		var x = ''; // 字符串表示的数值
		if (f[3]) {
			var d = _countPlaceHolder(f[3]);	// 小数部分占位符数
			x = data.toFixed(d);
		} else {
			x = data.toString();
		}
		x = x.split('.');

		// 处理整数部分
		if (f[2]) {
			var f2 = f[2].replace(/([#0?]),([#0?])/g, "$1$2");
			var t = f[2].length - f2.length; // 是否有千分位分隔符
			var i = _countPlaceHolder(f2); // 整数部分占位符数
			var x0 = x[0];
			var re = /[#0?]/g;
			for (var j = 0, k = i; j < i; ++j, --k) {
				var li = re.lastIndex;
				var ar = re.exec(f2);
				var ch = ar[0];
				s += f2.substring(li, ar.index);
				if (k > x0.length) {
					if (ch == '0') {
						s += '0';
						if (t && k > 1 && (k-1) % 3 == 0)
							s += ',';
					} else if (ch == '?') {
						s += ' ';
						if (t && k > 1 && (k-1) % 3 == 0)
							s += ' ';
					}
				} else {
					if (k == i) {
						var e = x0.substring(0, x0.length-k+1);
						for (var m = 0; m < e.length; ++m) {
							if (t && (x0.length-m) % 3 == 0 && m > 0)
								s += ',';
							s += e[m];
						}
					} else {
						s += x0[x0.length-k];
					}
					if (t && k > 1 && (k-1) % 3 == 0)
						s += ',';
				}
			}
			s += f2.substr(re.lastIndex);
			
			if (i > 0 && !f[3] && x[1])
				s += '.' + x[1];
		}
		
		// 处理小数部分
		if (f[3] && f[3] != '.') {
			if (!f[2])
				s += x[0];
				
			var f3 = f[3];
			var x1 = x[1];
			var re = /[#0?]/g;
			for (var i = 0;;++i) {
				var li = re.lastIndex;
				var ar = re.exec(f3);
				if (ar != null) {
					s += f3.substring(li, ar.index);
					var ch = ar[0];
					
					if (i < x1.length) {
						s += x1[i];
					} else {
						if (ch == '0') {
							s += '0';
						} else if (ch == '?') {
							s += ' ';
						}
					}
				} else {
					s += f3.substr(li);
					break;
				}
			}
		}

		f[4] &&	(s += '%');
		f[6] && (s += f[6]);
			
		return s;
	}
	function _countPlaceHolder(format) {
		var re = /[#0?]/g;
		var c = 0;
		while ( re.exec(format) != null)
			++c;
			
		return c;
	}
	
	return _format;
});