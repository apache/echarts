/*
	Rollup.js v0.50.0
	Sat Sep 16 2017 09:48:09 GMT-0400 (EDT) - commit b949eb08169115ff66648838cbc4833379bf9440


	https://github.com/rollup/rollup

	Released under the MIT License.
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.rollup = {})));
}(this, (function (exports) { 'use strict';

const DEBUG = false;
const map = new Map;

let timeStartHelper;
let timeEndHelper;

if ( typeof process === 'undefined' || typeof process.hrtime === 'undefined' ) {
	timeStartHelper = function timeStartHelper () {
		return window.performance.now();
	};

	timeEndHelper = function timeEndHelper ( previous ) {
		return window.performance.now() - previous;
	};
} else {
	timeStartHelper = function timeStartHelper () {
		return process.hrtime();
	};

	timeEndHelper = function timeEndHelper ( previous ) {
		const hrtime = process.hrtime( previous );
		return hrtime[0] * 1e3 + Math.floor( hrtime[1] / 1e6 );
	};
}

function timeStart ( label ) {
	if ( !map.has( label ) ) {
		map.set( label, {
			time: 0
		});
	}
	map.get( label ).start = timeStartHelper();
}

function timeEnd ( label ) {
	if ( map.has( label ) ) {
		const item = map.get( label );
		item.time += timeEndHelper( item.start );
	}
}

function flushTime ( log ) {
	if ( log === void 0 ) log = defaultLog;

	for ( const item of map.entries() ) {
		log( item[0], item[1].time );
	}
	map.clear();
}

function defaultLog ( label, time ) {
	if ( DEBUG ) {
		/* eslint-disable no-console */
		console.info( '%dms: %s', time, label );
		/* eslint-enable no-console */
	}
}

const absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/;
const relativePath = /^\.?\.\//;

function isAbsolute ( path ) {
	return absolutePath.test( path );
}

function isRelative ( path ) {
	return relativePath.test( path );
}

function normalize ( path ) {
	return path.replace( /\\/g, '/' );
}

function basename ( path ) {
	return path.split( /(\/|\\)/ ).pop();
}

function dirname ( path ) {
	const match = /(\/|\\)[^/\\]*$/.exec( path );
	if ( !match ) { return '.'; }

	const dir = path.slice( 0, -match[0].length );

	// If `dir` is the empty string, we're at root.
	return dir ? dir : '/';
}

function extname ( path ) {
	const match = /\.[^.]+$/.exec( basename( path ) );
	if ( !match ) { return ''; }
	return match[0];
}

function relative ( from, to ) {
	const fromParts = from.split( /[/\\]/ ).filter( Boolean );
	const toParts = to.split( /[/\\]/ ).filter( Boolean );

	while ( fromParts[0] && toParts[0] && fromParts[0] === toParts[0] ) {
		fromParts.shift();
		toParts.shift();
	}

	while ( toParts[0] === '.' || toParts[0] === '..' ) {
		const toPart = toParts.shift();
		if ( toPart === '..' ) {
			fromParts.pop();
		}
	}

	while ( fromParts.pop() ) {
		toParts.unshift( '..' );
	}

	return toParts.join( '/' );
}

function resolve () {
	var paths = [], len = arguments.length;
	while ( len-- ) paths[ len ] = arguments[ len ];

	let resolvedParts = paths.shift().split( /[/\\]/ );

	paths.forEach( path => {
		if ( isAbsolute( path ) ) {
			resolvedParts = path.split( /[/\\]/ );
		} else {
			const parts = path.split( /[/\\]/ );

			while ( parts[0] === '.' || parts[0] === '..' ) {
				const part = parts.shift();
				if ( part === '..' ) {
					resolvedParts.pop();
				}
			}

			resolvedParts.push.apply( resolvedParts, parts );
		}
	});

	return resolvedParts.join( '/' ); // TODO windows...
}

const nope = method => `Cannot use fs.${method} inside browser`;

const lstatSync = nope( 'lstatSync' );
const readdirSync = nope( 'readdirSync' );
const readFileSync = nope( 'readFileSync' );
const realpathSync = nope( 'realpathSync' );
const writeFile = nope( 'writeFile' );

var keys = Object.keys;

function blank () {
	return Object.create( null );
}

function forOwn ( object, func ) {
	Object.keys( object ).forEach( key => func( object[ key ], key ) );
}

function assign ( target ) {
	var sources = [], len = arguments.length - 1;
	while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

	sources.forEach( source => {
		for ( const key in source ) {
			if ( source.hasOwnProperty( key ) ) { target[ key ] = source[ key ]; }
		}
	});

	return target;
}

function mapSequence ( array, fn ) {
	const results = [];
	let promise = Promise.resolve();

	function next ( member, i ) {
		return Promise.resolve( fn( member ) ).then( value => results[i] = value );
	}

	for ( let i = 0; i < array.length; i += 1 ) {
		promise = promise.then( () => next( array[i], i ) );
	}

	return promise.then( () => results );
}

function validateKeys ( actualKeys, allowedKeys ) {
	let i = actualKeys.length;

	while ( i-- ) {
		const key = actualKeys[i];

		if ( allowedKeys.indexOf( key ) === -1 ) {
			return new Error(
				`Unexpected key '${ key }' found, expected one of: ${ allowedKeys.join( ', ' ) }`
			);
		}
	}
}

function error ( props ) {
	// use the same constructor as props (if it's an error object)
	// so that err.name is preserved etc
	// (Object.keys below does not update these values because they
	// are properties on the prototype chain)
	// basically if props is a SyntaxError it will not be overriden as a generic Error
	const constructor = (props instanceof Error) ? props.constructor : Error;
	const err = new constructor( props.message );

	Object.keys( props ).forEach( key => {
		err[ key ] = props[ key ];
	});

	throw err;
}

// this looks ridiculous, but it prevents sourcemap tooling from mistaking
// this for an actual sourceMappingURL
let SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';

const SOURCEMAPPING_URL_RE = new RegExp( `^#\\s+${SOURCEMAPPING_URL}=.+\\n?` );

var charToInteger = {};
var integerToChar = {};

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split( '' ).forEach( function ( char, i ) {
	charToInteger[ char ] = i;
	integerToChar[ i ] = char;
});

function decode$1 ( string ) {
	var result = [],
		len = string.length,
		i,
		hasContinuationBit,
		shift = 0,
		value = 0,
		integer,
		shouldNegate;

	for ( i = 0; i < len; i += 1 ) {
		integer = charToInteger[ string[i] ];

		if ( integer === undefined ) {
			throw new Error( 'Invalid character (' + string[i] + ')' );
		}

		hasContinuationBit = integer & 32;

		integer &= 31;
		value += integer << shift;

		if ( hasContinuationBit ) {
			shift += 5;
		} else {
			shouldNegate = value & 1;
			value >>= 1;

			result.push( shouldNegate ? -value : value );

			// reset
			value = shift = 0;
		}
	}

	return result;
}

function encode$1 ( value ) {
	var result, i;

	if ( typeof value === 'number' ) {
		result = encodeInteger( value );
	} else {
		result = '';
		for ( i = 0; i < value.length; i += 1 ) {
			result += encodeInteger( value[i] );
		}
	}

	return result;
}

function encodeInteger ( num ) {
	var result = '', clamped;

	if ( num < 0 ) {
		num = ( -num << 1 ) | 1;
	} else {
		num <<= 1;
	}

	do {
		clamped = num & 31;
		num >>= 5;

		if ( num > 0 ) {
			clamped |= 32;
		}

		result += integerToChar[ clamped ];
	} while ( num > 0 );

	return result;
}

function decodeSegments ( encodedSegments ) {
	var i = encodedSegments.length;
	var segments = new Array( i );

	while ( i-- ) { segments[i] = decode$1( encodedSegments[i] ); }
	return segments;
}

function decode$$1 ( mappings ) {
	var sourceFileIndex = 0;   // second field
	var sourceCodeLine = 0;    // third field
	var sourceCodeColumn = 0;  // fourth field
	var nameIndex = 0;         // fifth field

	var lines = mappings.split( ';' );
	var numLines = lines.length;
	var decoded = new Array( numLines );

	var i;
	var j;
	var line;
	var generatedCodeColumn;
	var decodedLine;
	var segments;
	var segment;
	var result;

	for ( i = 0; i < numLines; i += 1 ) {
		line = lines[i];

		generatedCodeColumn = 0; // first field - reset each time
		decodedLine = [];

		segments = decodeSegments( line.split( ',' ) );

		for ( j = 0; j < segments.length; j += 1 ) {
			segment = segments[j];

			if ( !segment.length ) {
				break;
			}

			generatedCodeColumn += segment[0];

			result = [ generatedCodeColumn ];
			decodedLine.push( result );

			if ( segment.length === 1 ) {
				// only one field!
				continue;
			}

			sourceFileIndex  += segment[1];
			sourceCodeLine   += segment[2];
			sourceCodeColumn += segment[3];

			result.push( sourceFileIndex, sourceCodeLine, sourceCodeColumn );

			if ( segment.length === 5 ) {
				nameIndex += segment[4];
				result.push( nameIndex );
			}
		}

		decoded[i] = decodedLine;
	}

	return decoded;
}

function encode$$1 ( decoded ) {
	var offsets = {
		generatedCodeColumn: 0,
		sourceFileIndex: 0,   // second field
		sourceCodeLine: 0,    // third field
		sourceCodeColumn: 0,  // fourth field
		nameIndex: 0          // fifth field
	};

	return decoded.map( function (line) {
		offsets.generatedCodeColumn = 0; // first field - reset each time
		return line.map( encodeSegment ).join( ',' );
	}).join( ';' );

	function encodeSegment ( segment ) {
		if ( !segment.length ) {
			return segment;
		}

		var result = new Array( segment.length );

		result[0] = segment[0] - offsets.generatedCodeColumn;
		offsets.generatedCodeColumn = segment[0];

		if ( segment.length === 1 ) {
			// only one field!
			return encode$1( result );
		}

		result[1] = segment[1] - offsets.sourceFileIndex;
		result[2] = segment[2] - offsets.sourceCodeLine;
		result[3] = segment[3] - offsets.sourceCodeColumn;

		offsets.sourceFileIndex  = segment[1];
		offsets.sourceCodeLine   = segment[2];
		offsets.sourceCodeColumn = segment[3];

		if ( segment.length === 5 ) {
			result[4] = segment[4] - offsets.nameIndex;
			offsets.nameIndex = segment[4];
		}

		return encode$1( result );
	}
}

var charToInteger$1 = {};
var integerToChar$1 = {};

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split( '' ).forEach( function ( char, i ) {
	charToInteger$1[ char ] = i;
	integerToChar$1[ i ] = char;
});



function encode ( value ) {
	var result;

	if ( typeof value === 'number' ) {
		result = encodeInteger$1( value );
	} else {
		result = '';
		for ( var i = 0; i < value.length; i += 1 ) {
			result += encodeInteger$1( value[i] );
		}
	}

	return result;
}

function encodeInteger$1 ( num ) {
	var result = '';

	if ( num < 0 ) {
		num = ( -num << 1 ) | 1;
	} else {
		num <<= 1;
	}

	do {
		var clamped = num & 31;
		num >>= 5;

		if ( num > 0 ) {
			clamped |= 32;
		}

		result += integerToChar$1[ clamped ];
	} while ( num > 0 );

	return result;
}

function Chunk ( start, end, content ) {
	this.start = start;
	this.end = end;
	this.original = content;

	this.intro = '';
	this.outro = '';

	this.content = content;
	this.storeName = false;
	this.edited = false;

	// we make these non-enumerable, for sanity while debugging
	Object.defineProperties( this, {
		previous: { writable: true, value: null },
		next: { writable: true, value: null }
	});
}

Chunk.prototype = {
	appendLeft: function appendLeft ( content ) {
		this.outro += content;
	},

	appendRight: function appendRight ( content ) {
		this.intro = this.intro + content;
	},

	clone: function clone () {
		var chunk = new Chunk( this.start, this.end, this.original );

		chunk.intro = this.intro;
		chunk.outro = this.outro;
		chunk.content = this.content;
		chunk.storeName = this.storeName;
		chunk.edited = this.edited;

		return chunk;
	},

	contains: function contains ( index ) {
		return this.start < index && index < this.end;
	},

	eachNext: function eachNext ( fn ) {
		var chunk = this;
		while ( chunk ) {
			fn( chunk );
			chunk = chunk.next;
		}
	},

	eachPrevious: function eachPrevious ( fn ) {
		var chunk = this;
		while ( chunk ) {
			fn( chunk );
			chunk = chunk.previous;
		}
	},

	edit: function edit ( content, storeName, contentOnly ) {
		this.content = content;
		if ( !contentOnly ) {
			this.intro = '';
			this.outro = '';
		}
		this.storeName = storeName;

		this.edited = true;

		return this;
	},

	prependLeft: function prependLeft ( content ) {
		this.outro = content + this.outro;
	},

	prependRight: function prependRight ( content ) {
		this.intro = content + this.intro;
	},

	split: function split ( index ) {
		var sliceIndex = index - this.start;

		var originalBefore = this.original.slice( 0, sliceIndex );
		var originalAfter = this.original.slice( sliceIndex );

		this.original = originalBefore;

		var newChunk = new Chunk( index, this.end, originalAfter );
		newChunk.outro = this.outro;
		this.outro = '';

		this.end = index;

		if ( this.edited ) {
			// TODO is this block necessary?...
			newChunk.edit( '', false );
			this.content = '';
		} else {
			this.content = originalBefore;
		}

		newChunk.next = this.next;
		if ( newChunk.next ) { newChunk.next.previous = newChunk; }
		newChunk.previous = this;
		this.next = newChunk;

		return newChunk;
	},

	toString: function toString () {
		return this.intro + this.content + this.outro;
	},

	trimEnd: function trimEnd ( rx ) {
		this.outro = this.outro.replace( rx, '' );
		if ( this.outro.length ) { return true; }

		var trimmed = this.content.replace( rx, '' );

		if ( trimmed.length ) {
			if ( trimmed !== this.content ) {
				this.split( this.start + trimmed.length ).edit( '', false );
			}

			return true;
		} else {
			this.edit( '', false );

			this.intro = this.intro.replace( rx, '' );
			if ( this.intro.length ) { return true; }
		}
	},

	trimStart: function trimStart ( rx ) {
		this.intro = this.intro.replace( rx, '' );
		if ( this.intro.length ) { return true; }

		var trimmed = this.content.replace( rx, '' );

		if ( trimmed.length ) {
			if ( trimmed !== this.content ) {
				this.split( this.end - trimmed.length );
				this.edit( '', false );
			}

			return true;
		} else {
			this.edit( '', false );

			this.outro = this.outro.replace( rx, '' );
			if ( this.outro.length ) { return true; }
		}
	}
};

var _btoa;

if ( typeof window !== 'undefined' && typeof window.btoa === 'function' ) {
	_btoa = window.btoa;
} else if ( typeof Buffer === 'function' ) {
	_btoa = function (str) { return new Buffer( str ).toString( 'base64' ); };
} else {
	_btoa = function () {
		throw new Error( 'Unsupported environment: `window.btoa` or `Buffer` should be supported.' );
	};
}

var btoa = _btoa;

function SourceMap ( properties ) {
	this.version = 3;

	this.file           = properties.file;
	this.sources        = properties.sources;
	this.sourcesContent = properties.sourcesContent;
	this.names          = properties.names;
	this.mappings       = properties.mappings;
}

SourceMap.prototype = {
	toString: function toString () {
		return JSON.stringify( this );
	},

	toUrl: function toUrl () {
		return 'data:application/json;charset=utf-8;base64,' + btoa( this.toString() );
	}
};

function guessIndent ( code ) {
	var lines = code.split( '\n' );

	var tabbed = lines.filter( function (line) { return /^\t+/.test( line ); } );
	var spaced = lines.filter( function (line) { return /^ {2,}/.test( line ); } );

	if ( tabbed.length === 0 && spaced.length === 0 ) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if ( tabbed.length >= spaced.length ) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	var min = spaced.reduce( function ( previous, current ) {
		var numSpaces = /^ +/.exec( current )[0].length;
		return Math.min( numSpaces, previous );
	}, Infinity );

	return new Array( min + 1 ).join( ' ' );
}

function getRelativePath ( from, to ) {
	var fromParts = from.split( /[\/\\]/ );
	var toParts = to.split( /[\/\\]/ );

	fromParts.pop(); // get dirname

	while ( fromParts[0] === toParts[0] ) {
		fromParts.shift();
		toParts.shift();
	}

	if ( fromParts.length ) {
		var i = fromParts.length;
		while ( i-- ) { fromParts[i] = '..'; }
	}

	return fromParts.concat( toParts ).join( '/' );
}

var toString$1 = Object.prototype.toString;

function isObject ( thing ) {
	return toString$1.call( thing ) === '[object Object]';
}

function getLocator ( source ) {
	var originalLines = source.split( '\n' );

	var start = 0;
	var lineRanges = originalLines.map( function ( line, i ) {
		var end = start + line.length + 1;
		var range = { start: start, end: end, line: i };

		start = end;
		return range;
	});

	var i = 0;

	function rangeContains ( range, index ) {
		return range.start <= index && index < range.end;
	}

	function getLocation ( range, index ) {
		return { line: range.line, column: index - range.start };
	}

	return function locate ( index ) {
		var range = lineRanges[i];

		var d = index >= range.end ? 1 : -1;

		while ( range ) {
			if ( rangeContains( range, index ) ) { return getLocation( range, index ); }

			i += d;
			range = lineRanges[i];
		}
	};
}

function Mappings ( hires ) {
	var this$1 = this;

	var offsets = {
		generatedCodeColumn: 0,
		sourceIndex: 0,
		sourceCodeLine: 0,
		sourceCodeColumn: 0,
		sourceCodeName: 0
	};

	var generatedCodeLine = 0;
	var generatedCodeColumn = 0;

	this.raw = [];
	var rawSegments = this.raw[ generatedCodeLine ] = [];

	var pending = null;

	this.addEdit = function ( sourceIndex, content, original, loc, nameIndex ) {
		if ( content.length ) {
			rawSegments.push([
				generatedCodeColumn,
				sourceIndex,
				loc.line,
				loc.column,
				nameIndex ]);
		} else if ( pending ) {
			rawSegments.push( pending );
		}

		this$1.advance( content );
		pending = null;
	};

	this.addUneditedChunk = function ( sourceIndex, chunk, original, loc, sourcemapLocations ) {
		var originalCharIndex = chunk.start;
		var first = true;

		while ( originalCharIndex < chunk.end ) {
			if ( hires || first || sourcemapLocations[ originalCharIndex ] ) {
				rawSegments.push([
					generatedCodeColumn,
					sourceIndex,
					loc.line,
					loc.column,
					-1
				]);
			}

			if ( original[ originalCharIndex ] === '\n' ) {
				loc.line += 1;
				loc.column = 0;
				generatedCodeLine += 1;
				this$1.raw[ generatedCodeLine ] = rawSegments = [];
				generatedCodeColumn = 0;
			} else {
				loc.column += 1;
				generatedCodeColumn += 1;
			}

			originalCharIndex += 1;
			first = false;
		}

		pending = [
			generatedCodeColumn,
			sourceIndex,
			loc.line,
			loc.column,
			-1 ];
	};

	this.advance = function (str) {
		if ( !str ) { return; }

		var lines = str.split( '\n' );
		var lastLine = lines.pop();

		if ( lines.length ) {
			generatedCodeLine += lines.length;
			this$1.raw[ generatedCodeLine ] = rawSegments = [];
			generatedCodeColumn = lastLine.length;
		} else {
			generatedCodeColumn += lastLine.length;
		}
	};

	this.encode = function () {
		return this$1.raw.map( function (segments) {
			var generatedCodeColumn = 0;

			return segments.map( function (segment) {
				var arr = [
					segment[0] - generatedCodeColumn,
					segment[1] - offsets.sourceIndex,
					segment[2] - offsets.sourceCodeLine,
					segment[3] - offsets.sourceCodeColumn
				];

				generatedCodeColumn = segment[0];
				offsets.sourceIndex = segment[1];
				offsets.sourceCodeLine = segment[2];
				offsets.sourceCodeColumn = segment[3];

				if ( ~segment[4] ) {
					arr.push( segment[4] - offsets.sourceCodeName );
					offsets.sourceCodeName = segment[4];
				}

				return encode( arr );
			}).join( ',' );
		}).join( ';' );
	};
}

var Stats = function Stats () {
	Object.defineProperties( this, {
		startTimes: { value: {} }
	});
};

Stats.prototype.time = function time ( label ) {
	this.startTimes[ label ] = process.hrtime();
};

Stats.prototype.timeEnd = function timeEnd ( label ) {
	var elapsed = process.hrtime( this.startTimes[ label ] );

	if ( !this[ label ] ) { this[ label ] = 0; }
	this[ label ] += elapsed[0] * 1e3 + elapsed[1] * 1e-6;
};

var warned = {
	insertLeft: false,
	insertRight: false,
	storeName: false
};

function MagicString$1 ( string, options ) {
	if ( options === void 0 ) options = {};

	var chunk = new Chunk( 0, string.length, string );

	Object.defineProperties( this, {
		original:              { writable: true, value: string },
		outro:                 { writable: true, value: '' },
		intro:                 { writable: true, value: '' },
		firstChunk:            { writable: true, value: chunk },
		lastChunk:             { writable: true, value: chunk },
		lastSearchedChunk:     { writable: true, value: chunk },
		byStart:               { writable: true, value: {} },
		byEnd:                 { writable: true, value: {} },
		filename:              { writable: true, value: options.filename },
		indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
		sourcemapLocations:    { writable: true, value: {} },
		storedNames:           { writable: true, value: {} },
		indentStr:             { writable: true, value: guessIndent( string ) }
	});

	this.byStart[ 0 ] = chunk;
	this.byEnd[ string.length ] = chunk;
}

MagicString$1.prototype = {
	addSourcemapLocation: function addSourcemapLocation ( char ) {
		this.sourcemapLocations[ char ] = true;
	},

	append: function append ( content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'outro content must be a string' ); }

		this.outro += content;
		return this;
	},

	appendLeft: function appendLeft ( index, content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'inserted content must be a string' ); }

		this._split( index );

		var chunk = this.byEnd[ index ];

		if ( chunk ) {
			chunk.appendLeft( content );
		} else {
			this.intro += content;
		}

		return this;
	},

	appendRight: function appendRight ( index, content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'inserted content must be a string' ); }

		this._split( index );

		var chunk = this.byStart[ index ];

		if ( chunk ) {
			chunk.appendRight( content );
		} else {
			this.outro += content;
		}

		return this;
	},

	clone: function clone () {
		var cloned = new MagicString$1( this.original, { filename: this.filename });

		var originalChunk = this.firstChunk;
		var clonedChunk = cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone();

		while ( originalChunk ) {
			cloned.byStart[ clonedChunk.start ] = clonedChunk;
			cloned.byEnd[ clonedChunk.end ] = clonedChunk;

			var nextOriginalChunk = originalChunk.next;
			var nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

			if ( nextClonedChunk ) {
				clonedChunk.next = nextClonedChunk;
				nextClonedChunk.previous = clonedChunk;

				clonedChunk = nextClonedChunk;
			}

			originalChunk = nextOriginalChunk;
		}

		cloned.lastChunk = clonedChunk;

		if ( this.indentExclusionRanges ) {
			cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
		}

		Object.keys( this.sourcemapLocations ).forEach( function (loc) {
			cloned.sourcemapLocations[ loc ] = true;
		});

		return cloned;
	},

	generateMap: function generateMap ( options ) {
		var this$1 = this;

		options = options || {};

		var sourceIndex = 0;
		var names = Object.keys( this.storedNames );
		var mappings = new Mappings( options.hires );

		var locate = getLocator( this.original );

		if ( this.intro ) {
			mappings.advance( this.intro );
		}

		this.firstChunk.eachNext( function (chunk) {
			var loc = locate( chunk.start );

			if ( chunk.intro.length ) { mappings.advance( chunk.intro ); }

			if ( chunk.edited ) {
				mappings.addEdit( sourceIndex, chunk.content, chunk.original, loc, chunk.storeName ? names.indexOf( chunk.original ) : -1 );
			} else {
				mappings.addUneditedChunk( sourceIndex, chunk, this$1.original, loc, this$1.sourcemapLocations );
			}

			if ( chunk.outro.length ) { mappings.advance( chunk.outro ); }
		});

		var map = new SourceMap({
			file: ( options.file ? options.file.split( /[\/\\]/ ).pop() : null ),
			sources: [ options.source ? getRelativePath( options.file || '', options.source ) : null ],
			sourcesContent: options.includeContent ? [ this.original ] : [ null ],
			names: names,
			mappings: mappings.encode()
		});
		return map;
	},

	getIndentString: function getIndentString () {
		return this.indentStr === null ? '\t' : this.indentStr;
	},

	indent: function indent ( indentStr, options ) {
		var this$1 = this;

		var pattern = /^[^\r\n]/gm;

		if ( isObject( indentStr ) ) {
			options = indentStr;
			indentStr = undefined;
		}

		indentStr = indentStr !== undefined ? indentStr : ( this.indentStr || '\t' );

		if ( indentStr === '' ) { return this; } // noop

		options = options || {};

		// Process exclusion ranges
		var isExcluded = {};

		if ( options.exclude ) {
			var exclusions = typeof options.exclude[0] === 'number' ? [ options.exclude ] : options.exclude;
			exclusions.forEach( function (exclusion) {
				for ( var i = exclusion[0]; i < exclusion[1]; i += 1 ) {
					isExcluded[i] = true;
				}
			});
		}

		var shouldIndentNextCharacter = options.indentStart !== false;
		var replacer = function (match) {
			if ( shouldIndentNextCharacter ) { return ("" + indentStr + match); }
			shouldIndentNextCharacter = true;
			return match;
		};

		this.intro = this.intro.replace( pattern, replacer );

		var charIndex = 0;

		var chunk = this.firstChunk;

		while ( chunk ) {
			var end = chunk.end;

			if ( chunk.edited ) {
				if ( !isExcluded[ charIndex ] ) {
					chunk.content = chunk.content.replace( pattern, replacer );

					if ( chunk.content.length ) {
						shouldIndentNextCharacter = chunk.content[ chunk.content.length - 1 ] === '\n';
					}
				}
			} else {
				charIndex = chunk.start;

				while ( charIndex < end ) {
					if ( !isExcluded[ charIndex ] ) {
						var char = this$1.original[ charIndex ];

						if ( char === '\n' ) {
							shouldIndentNextCharacter = true;
						} else if ( char !== '\r' && shouldIndentNextCharacter ) {
							shouldIndentNextCharacter = false;

							if ( charIndex === chunk.start ) {
								chunk.prependRight( indentStr );
							} else {
								this$1._splitChunk( chunk, charIndex );
								chunk = chunk.next;
								chunk.prependRight( indentStr );
							}
						}
					}

					charIndex += 1;
				}
			}

			charIndex = chunk.end;
			chunk = chunk.next;
		}

		this.outro = this.outro.replace( pattern, replacer );

		return this;
	},

	insert: function insert () {
		throw new Error( 'magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)' );
	},

	insertLeft: function insertLeft ( index, content ) {
		if ( !warned.insertLeft ) {
			console.warn( 'magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead' ); // eslint-disable-line no-console
			warned.insertLeft = true;
		}

		return this.appendLeft( index, content );
	},

	insertRight: function insertRight ( index, content ) {
		if ( !warned.insertRight ) {
			console.warn( 'magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead' ); // eslint-disable-line no-console
			warned.insertRight = true;
		}

		return this.prependRight( index, content );
	},

	move: function move ( start, end, index ) {
		if ( index >= start && index <= end ) { throw new Error( 'Cannot move a selection inside itself' ); }

		this._split( start );
		this._split( end );
		this._split( index );

		var first = this.byStart[ start ];
		var last = this.byEnd[ end ];

		var oldLeft = first.previous;
		var oldRight = last.next;

		var newRight = this.byStart[ index ];
		if ( !newRight && last === this.lastChunk ) { return this; }
		var newLeft = newRight ? newRight.previous : this.lastChunk;

		if ( oldLeft ) { oldLeft.next = oldRight; }
		if ( oldRight ) { oldRight.previous = oldLeft; }

		if ( newLeft ) { newLeft.next = first; }
		if ( newRight ) { newRight.previous = last; }

		if ( !first.previous ) { this.firstChunk = last.next; }
		if ( !last.next ) {
			this.lastChunk = first.previous;
			this.lastChunk.next = null;
		}

		first.previous = newLeft;
		last.next = newRight || null;

		if ( !newLeft ) { this.firstChunk = first; }
		if ( !newRight ) { this.lastChunk = last; }

		return this;
	},

	overwrite: function overwrite ( start, end, content, options ) {
		var this$1 = this;

		if ( typeof content !== 'string' ) { throw new TypeError( 'replacement content must be a string' ); }

		while ( start < 0 ) { start += this$1.original.length; }
		while ( end < 0 ) { end += this$1.original.length; }

		if ( end > this.original.length ) { throw new Error( 'end is out of bounds' ); }
		if ( start === end ) { throw new Error( 'Cannot overwrite a zero-length range – use appendLeft or prependRight instead' ); }

		this._split( start );
		this._split( end );

		if ( options === true ) {
			if ( !warned.storeName ) {
				console.warn( 'The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string' ); // eslint-disable-line no-console
				warned.storeName = true;
			}

			options = { storeName: true };
		}
		var storeName = options !== undefined ? options.storeName : false;
		var contentOnly = options !== undefined ? options.contentOnly : false;

		if ( storeName ) {
			var original = this.original.slice( start, end );
			this.storedNames[ original ] = true;
		}

		var first = this.byStart[ start ];
		var last = this.byEnd[ end ];

		if ( first ) {
			if ( end > first.end && first.next !== this.byStart[ first.end ] ) {
				throw new Error( 'Cannot overwrite across a split point' );
			}

			first.edit( content, storeName, contentOnly );

			if ( first !== last ) {
				var chunk = first.next;
				while ( chunk !== last ) {
					chunk.edit( '', false );
					chunk = chunk.next;
				}

				chunk.edit( '', false );
			}
		}

		else {
			// must be inserting at the end
			var newChunk = new Chunk( start, end, '' ).edit( content, storeName );

			// TODO last chunk in the array may not be the last chunk, if it's moved...
			last.next = newChunk;
			newChunk.previous = last;
		}

		return this;
	},

	prepend: function prepend ( content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'outro content must be a string' ); }

		this.intro = content + this.intro;
		return this;
	},

	prependLeft: function prependLeft ( index, content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'inserted content must be a string' ); }

		this._split( index );

		var chunk = this.byEnd[ index ];

		if ( chunk ) {
			chunk.prependLeft( content );
		} else {
			this.intro = content + this.intro;
		}

		return this;
	},

	prependRight: function prependRight ( index, content ) {
		if ( typeof content !== 'string' ) { throw new TypeError( 'inserted content must be a string' ); }

		this._split( index );

		var chunk = this.byStart[ index ];

		if ( chunk ) {
			chunk.prependRight( content );
		} else {
			this.outro = content + this.outro;
		}

		return this;
	},

	remove: function remove ( start, end ) {
		var this$1 = this;

		while ( start < 0 ) { start += this$1.original.length; }
		while ( end < 0 ) { end += this$1.original.length; }

		if ( start === end ) { return this; }

		if ( start < 0 || end > this.original.length ) { throw new Error( 'Character is out of bounds' ); }
		if ( start > end ) { throw new Error( 'end must be greater than start' ); }

		this._split( start );
		this._split( end );

		var chunk = this.byStart[ start ];

		while ( chunk ) {
			chunk.intro = '';
			chunk.outro = '';
			chunk.edit( '' );

			chunk = end > chunk.end ? this$1.byStart[ chunk.end ] : null;
		}

		return this;
	},

	slice: function slice ( start, end ) {
		var this$1 = this;
		if ( start === void 0 ) start = 0;
		if ( end === void 0 ) end = this.original.length;

		while ( start < 0 ) { start += this$1.original.length; }
		while ( end < 0 ) { end += this$1.original.length; }

		var result = '';

		// find start chunk
		var chunk = this.firstChunk;
		while ( chunk && ( chunk.start > start || chunk.end <= start ) ) {

			// found end chunk before start
			if ( chunk.start < end && chunk.end >= end ) {
				return result;
			}

			chunk = chunk.next;
		}

		if ( chunk && chunk.edited && chunk.start !== start ) { throw new Error(("Cannot use replaced character " + start + " as slice start anchor.")); }

		var startChunk = chunk;
		while ( chunk ) {
			if ( chunk.intro && ( startChunk !== chunk || chunk.start === start ) ) {
				result += chunk.intro;
			}

			var containsEnd = chunk.start < end && chunk.end >= end;
			if ( containsEnd && chunk.edited && chunk.end !== end ) { throw new Error(("Cannot use replaced character " + end + " as slice end anchor.")); }

			var sliceStart = startChunk === chunk ? start - chunk.start : 0;
			var sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

			result += chunk.content.slice( sliceStart, sliceEnd );

			if ( chunk.outro && ( !containsEnd || chunk.end === end ) ) {
				result += chunk.outro;
			}

			if ( containsEnd ) {
				break;
			}

			chunk = chunk.next;
		}

		return result;
	},

	// TODO deprecate this? not really very useful
	snip: function snip ( start, end ) {
		var clone = this.clone();
		clone.remove( 0, start );
		clone.remove( end, clone.original.length );

		return clone;
	},

	_split: function _split ( index ) {
		var this$1 = this;

		if ( this.byStart[ index ] || this.byEnd[ index ] ) { return; }

		var chunk = this.lastSearchedChunk;
		var searchForward = index > chunk.end;

		while ( true ) {
			if ( chunk.contains( index ) ) { return this$1._splitChunk( chunk, index ); }

			chunk = searchForward ?
				this$1.byStart[ chunk.end ] :
				this$1.byEnd[ chunk.start ];
		}
	},

	_splitChunk: function _splitChunk ( chunk, index ) {
		if ( chunk.edited && chunk.content.length ) { // zero-length edited chunks are a special case (overlapping replacements)
			var loc = getLocator( this.original )( index );
			throw new Error( ("Cannot split a chunk that has already been edited (" + (loc.line) + ":" + (loc.column) + " – \"" + (chunk.original) + "\")") );
		}

		var newChunk = chunk.split( index );

		this.byEnd[ index ] = chunk;
		this.byStart[ index ] = newChunk;
		this.byEnd[ newChunk.end ] = newChunk;

		if ( chunk === this.lastChunk ) { this.lastChunk = newChunk; }

		this.lastSearchedChunk = chunk;
		return true;
	},

	toString: function toString () {
		var str = this.intro;

		var chunk = this.firstChunk;
		while ( chunk ) {
			str += chunk.toString();
			chunk = chunk.next;
		}

		return str + this.outro;
	},

	trimLines: function trimLines () {
		return this.trim('[\\r\\n]');
	},

	trim: function trim ( charType ) {
		return this.trimStart( charType ).trimEnd( charType );
	},

	trimEnd: function trimEnd ( charType ) {
		var this$1 = this;

		var rx = new RegExp( ( charType || '\\s' ) + '+$' );

		this.outro = this.outro.replace( rx, '' );
		if ( this.outro.length ) { return this; }

		var chunk = this.lastChunk;

		do {
			var end = chunk.end;
			var aborted = chunk.trimEnd( rx );

			// if chunk was trimmed, we have a new lastChunk
			if ( chunk.end !== end ) {
				if ( this$1.lastChunk === chunk ) {
					this$1.lastChunk = chunk.next;
				}

				this$1.byEnd[ chunk.end ] = chunk;
				this$1.byStart[ chunk.next.start ] = chunk.next;
				this$1.byEnd[ chunk.next.end ] = chunk.next;
			}

			if ( aborted ) { return this$1; }
			chunk = chunk.previous;
		} while ( chunk );

		return this;
	},

	trimStart: function trimStart ( charType ) {
		var this$1 = this;

		var rx = new RegExp( '^' + ( charType || '\\s' ) + '+' );

		this.intro = this.intro.replace( rx, '' );
		if ( this.intro.length ) { return this; }

		var chunk = this.firstChunk;

		do {
			var end = chunk.end;
			var aborted = chunk.trimStart( rx );

			if ( chunk.end !== end ) {
				// special case...
				if ( chunk === this$1.lastChunk ) { this$1.lastChunk = chunk.next; }

				this$1.byEnd[ chunk.end ] = chunk;
				this$1.byStart[ chunk.next.start ] = chunk.next;
				this$1.byEnd[ chunk.next.end ] = chunk.next;
			}

			if ( aborted ) { return this$1; }
			chunk = chunk.next;
		} while ( chunk );

		return this;
	}
};

var hasOwnProp = Object.prototype.hasOwnProperty;

function Bundle$1 ( options ) {
	if ( options === void 0 ) options = {};

	this.intro = options.intro || '';
	this.separator = options.separator !== undefined ? options.separator : '\n';

	this.sources = [];

	this.uniqueSources = [];
	this.uniqueSourceIndexByFilename = {};
}

Bundle$1.prototype = {
	addSource: function addSource ( source ) {
		if ( source instanceof MagicString$1 ) {
			return this.addSource({
				content: source,
				filename: source.filename,
				separator: this.separator
			});
		}

		if ( !isObject( source ) || !source.content ) {
			throw new Error( 'bundle.addSource() takes an object with a `content` property, which should be an instance of MagicString, and an optional `filename`' );
		}

		[ 'filename', 'indentExclusionRanges', 'separator' ].forEach( function (option) {
			if ( !hasOwnProp.call( source, option ) ) { source[ option ] = source.content[ option ]; }
		});

		if ( source.separator === undefined ) { // TODO there's a bunch of this sort of thing, needs cleaning up
			source.separator = this.separator;
		}

		if ( source.filename ) {
			if ( !hasOwnProp.call( this.uniqueSourceIndexByFilename, source.filename ) ) {
				this.uniqueSourceIndexByFilename[ source.filename ] = this.uniqueSources.length;
				this.uniqueSources.push({ filename: source.filename, content: source.content.original });
			} else {
				var uniqueSource = this.uniqueSources[ this.uniqueSourceIndexByFilename[ source.filename ] ];
				if ( source.content.original !== uniqueSource.content ) {
					throw new Error( ("Illegal source: same filename (" + (source.filename) + "), different contents") );
				}
			}
		}

		this.sources.push( source );
		return this;
	},

	append: function append ( str, options ) {
		this.addSource({
			content: new MagicString$1( str ),
			separator: ( options && options.separator ) || ''
		});

		return this;
	},

	clone: function clone () {
		var bundle = new Bundle$1({
			intro: this.intro,
			separator: this.separator
		});

		this.sources.forEach( function (source) {
			bundle.addSource({
				filename: source.filename,
				content: source.content.clone(),
				separator: source.separator
			});
		});

		return bundle;
	},

	generateMap: function generateMap ( options ) {
		var this$1 = this;
		if ( options === void 0 ) options = {};

		var names = [];
		this.sources.forEach( function (source) {
			Object.keys( source.content.storedNames ).forEach( function (name) {
				if ( !~names.indexOf( name ) ) { names.push( name ); }
			});
		});

		var mappings = new Mappings( options.hires );

		if ( this.intro ) {
			mappings.advance( this.intro );
		}

		this.sources.forEach( function ( source, i ) {
			if ( i > 0 ) {
				mappings.advance( this$1.separator );
			}

			var sourceIndex = source.filename ? this$1.uniqueSourceIndexByFilename[ source.filename ] : -1;
			var magicString = source.content;
			var locate = getLocator( magicString.original );

			if ( magicString.intro ) {
				mappings.advance( magicString.intro );
			}

			magicString.firstChunk.eachNext( function (chunk) {
				var loc = locate( chunk.start );

				if ( chunk.intro.length ) { mappings.advance( chunk.intro ); }

				if ( source.filename ) {
					if ( chunk.edited ) {
						mappings.addEdit( sourceIndex, chunk.content, chunk.original, loc, chunk.storeName ? names.indexOf( chunk.original ) : -1 );
					} else {
						mappings.addUneditedChunk( sourceIndex, chunk, magicString.original, loc, magicString.sourcemapLocations );
					}
				}

				else {
					mappings.advance( chunk.content );
				}

				if ( chunk.outro.length ) { mappings.advance( chunk.outro ); }
			});

			if ( magicString.outro ) {
				mappings.advance( magicString.outro );
			}
		});

		return new SourceMap({
			file: ( options.file ? options.file.split( /[\/\\]/ ).pop() : null ),
			sources: this.uniqueSources.map( function (source) {
				return options.file ? getRelativePath( options.file, source.filename ) : source.filename;
			}),
			sourcesContent: this.uniqueSources.map( function (source) {
				return options.includeContent ? source.content : null;
			}),
			names: names,
			mappings: mappings.encode()
		});
	},

	getIndentString: function getIndentString () {
		var indentStringCounts = {};

		this.sources.forEach( function (source) {
			var indentStr = source.content.indentStr;

			if ( indentStr === null ) { return; }

			if ( !indentStringCounts[ indentStr ] ) { indentStringCounts[ indentStr ] = 0; }
			indentStringCounts[ indentStr ] += 1;
		});

		return ( Object.keys( indentStringCounts ).sort( function ( a, b ) {
			return indentStringCounts[a] - indentStringCounts[b];
		})[0] ) || '\t';
	},

	indent: function indent ( indentStr ) {
		var this$1 = this;

		if ( !arguments.length ) {
			indentStr = this.getIndentString();
		}

		if ( indentStr === '' ) { return this; } // noop

		var trailingNewline = !this.intro || this.intro.slice( -1 ) === '\n';

		this.sources.forEach( function ( source, i ) {
			var separator = source.separator !== undefined ? source.separator : this$1.separator;
			var indentStart = trailingNewline || ( i > 0 && /\r?\n$/.test( separator ) );

			source.content.indent( indentStr, {
				exclude: source.indentExclusionRanges,
				indentStart: indentStart//: trailingNewline || /\r?\n$/.test( separator )  //true///\r?\n/.test( separator )
			});

			// TODO this is a very slow way to determine this
			trailingNewline = source.content.toString().slice( 0, -1 ) === '\n';
		});

		if ( this.intro ) {
			this.intro = indentStr + this.intro.replace( /^[^\n]/gm, function ( match, index ) {
				return index > 0 ? indentStr + match : match;
			});
		}

		return this;
	},

	prepend: function prepend ( str ) {
		this.intro = str + this.intro;
		return this;
	},

	toString: function toString () {
		var this$1 = this;

		var body = this.sources.map( function ( source, i ) {
			var separator = source.separator !== undefined ? source.separator : this$1.separator;
			var str = ( i > 0 ? separator : '' ) + source.content.toString();

			return str;
		}).join( '' );

		return this.intro + body;
	},

	trimLines: function trimLines () {
		return this.trim('[\\r\\n]');
	},

	trim: function trim ( charType ) {
		return this.trimStart( charType ).trimEnd( charType );
	},

	trimStart: function trimStart ( charType ) {
		var this$1 = this;

		var rx = new RegExp( '^' + ( charType || '\\s' ) + '+' );
		this.intro = this.intro.replace( rx, '' );

		if ( !this.intro ) {
			var source;
			var i = 0;

			do {
				source = this$1.sources[i];

				if ( !source ) {
					break;
				}

				source.content.trimStart( charType );
				i += 1;
			} while ( source.content.toString() === '' ); // TODO faster way to determine non-empty source?
		}

		return this;
	},

	trimEnd: function trimEnd ( charType ) {
		var this$1 = this;

		var rx = new RegExp( ( charType || '\\s' ) + '+$' );

		var source;
		var i = this.sources.length - 1;

		do {
			source = this$1.sources[i];

			if ( !source ) {
				this$1.intro = this$1.intro.replace( rx, '' );
				break;
			}

			source.content.trimEnd( charType );
			i -= 1;
		} while ( source.content.toString() === '' ); // TODO faster way to determine non-empty source?

		return this;
	}
};

// Return the first non-falsy result from an array of
// maybe-sync, maybe-promise-returning functions
function first ( candidates ) {
	return function () {
		var args = [], len = arguments.length;
		while ( len-- ) args[ len ] = arguments[ len ];

		return candidates.reduce( ( promise, candidate ) => {
			return promise.then( result => result != null ?
				result :
				Promise.resolve( candidate.apply( void 0, args ) ) );
		}, Promise.resolve() );
	};
}

function find ( array, fn ) {
	for ( let i = 0; i < array.length; i += 1 ) {
		if ( fn( array[i], i ) ) { return array[i]; }
	}

	return null;
}

// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  6: ecma5AndLessKeywords + " const class extends export import super"
};

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.

var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by bin/generate-identifier-regex.js

// eslint-disable-next-line comma-spacing
var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,54,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,264,8,2,36,18,0,50,29,881,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,65,0,32,6124,20,754,9486,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,60,67,1213,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541];

// eslint-disable-next-line comma-spacing
var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,7,0,161,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,87,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,838,7,2,7,17,9,57,21,2,13,19882,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,2214,6,110,6,6,9,792487,239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) { conf = {}; }

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true};
var startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords$1 = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) { options = {}; }

  options.keyword = name;
  return keywords$1[name] = new TokenType(name, options)
}

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import"),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
}

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

// Checks if an object has a property.

function has(obj, propName) {
  return hasOwnProperty.call(obj, propName)
}

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    var match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur)
    }
  }
}

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, 5, 6 (2015), 7 (2016), or 8 (2017). This influences support
  // for strict mode, the set of reserved words, and support for
  // new syntax features. The default is 7.
  ecmaVersion: 7,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // th position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false,
  plugins: {}
};

// Interpret and default an options object

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion >= 2015)
    { options.ecmaVersion -= 2009; }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Registered plugins
var plugins = {};

function keywordRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5]);
  var reserved = "";
  if (!options.allowReserved) {
    for (var v = options.ecmaVersion;; v--)
      { if (reserved = reservedWords[v]) { break } }
    if (options.sourceType == "module") { reserved += " await"; }
  }
  this.reservedWords = keywordRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = keywordRegexp(reservedStrict);
  this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Load plugins
  this.loadPlugins(options.plugins);

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Flags to track whether we are in a function, a generator, an async function.
  this.inFunction = this.inGenerator = this.inAsync = false;
  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = 0;
  // Labels in scope.
  this.labels = [];

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterFunctionScope();
};

// DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them
Parser.prototype.isKeyword = function isKeyword (word) { return this.keywords.test(word) };
Parser.prototype.isReservedWord = function isReservedWord (word) { return this.reservedWords.test(word) };

Parser.prototype.extend = function extend (name, f) {
  this[name] = f(this[name]);
};

Parser.prototype.loadPlugins = function loadPlugins (pluginConfigs) {
    var this$1 = this;

  for (var name in pluginConfigs) {
    var plugin = plugins[name];
    if (!plugin) { throw new Error("Plugin '" + name + "' not found") }
    plugin(this$1, pluginConfigs[name]);
  }
};

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

var pp = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/;
pp.strictDirective = function(start) {
  var this$1 = this;

  for (;;) {
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this$1.input)[0].length;
    var match = literal.exec(this$1.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) == "use strict") { return true }
    start += match[0].length;
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function(name) {
  return this.type === types.name && this.value === name
};

// Consumes contextual keyword if possible.

pp.eatContextual = function(name) {
  return this.value === name && this.eat(types.name)
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function() {
  return this.type === types.eof ||
    this.type === types.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function() {
  if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp.afterTrailingComma = function(tokType, notNext) {
  if (this.type == tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
    -1;
}

pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  var pos = refDestructuringErrors ? refDestructuringErrors.shorthandAssign : -1;
  if (!andThrow) { return pos >= 0 }
  if (pos > -1) { this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns"); }
};

pp.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$1 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$1.parseTopLevel = function(node) {
  var this$1 = this;

  var exports = {};
  if (!node.body) { node.body = []; }
  while (this.type !== types.eof) {
    var stmt = this$1.parseStatement(true, true, exports);
    node.body.push(stmt);
  }
  this.next();
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"};
var switchLabel = {kind: "switch"};

pp$1.isLet = function() {
  if (this.type !== types.name || this.options.ecmaVersion < 6 || this.value != "let") { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  if (nextCh === 91 || nextCh == 123) { return true } // '{' and '['
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(this.input.charCodeAt(pos), true)) { ++pos; }
    var ident = this.input.slice(next, pos);
    if (!this.isKeyword(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$1.isAsyncFunction = function() {
  if (this.type !== types.name || this.options.ecmaVersion < 8 || this.value != "async")
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 == this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$1.parseStatement = function(declaration, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet()) {
    starttype = types._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types._debugger: return this.parseDebuggerStatement(node)
  case types._do: return this.parseDoStatement(node)
  case types._for: return this.parseForStatement(node)
  case types._function:
    if (!declaration && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false)
  case types._class:
    if (!declaration) { this.unexpected(); }
    return this.parseClass(node, true)
  case types._if: return this.parseIfStatement(node)
  case types._return: return this.parseReturnStatement(node)
  case types._switch: return this.parseSwitchStatement(node)
  case types._throw: return this.parseThrowStatement(node)
  case types._try: return this.parseTryStatement(node)
  case types._const: case types._var:
    kind = kind || this.value;
    if (!declaration && kind != "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types._while: return this.parseWhileStatement(node)
  case types._with: return this.parseWithStatement(node)
  case types.braceL: return this.parseBlock()
  case types.semi: return this.parseEmptyStatement(node)
  case types._export:
  case types._import:
    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction() && declaration) {
      this.next();
      return this.parseFunctionStatement(node, true)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
      { return this.parseLabeledStatement(node, maybeName, expr) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$1.parseBreakContinueStatement = function(node, keyword) {
  var this$1 = this;

  var isBreak = keyword == "break";
  this.next();
  if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this$1.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$1.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$1.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  this.expect(types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$1.parseForStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  this.enterLexicalScope();
  this.expect(types.parenL);
  if (this.type === types.semi) { return this.parseFor(node, null) }
  var isLet = this.isLet();
  if (this.type === types._var || this.type === types._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1 &&
        !(kind !== "var" && init$1.declarations[0].init))
      { return this.parseForIn(node, init$1) }
    return this.parseFor(node, init$1)
  }
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    this.toAssignable(init);
    this.checkLVal(init);
    this.checkPatternErrors(refDestructuringErrors, true);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  return this.parseFor(node, init)
};

pp$1.parseFunctionStatement = function(node, isAsync) {
  this.next();
  return this.parseFunction(node, true, false, isAsync)
};

pp$1.isFunction = function() {
  return this.type === types._function || this.isAsyncFunction()
};

pp$1.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement(!this.strict && this.isFunction());
  node.alternate = this.eat(types._else) ? this.parseStatement(!this.strict && this.isFunction()) : null;
  return this.finishNode(node, "IfStatement")
};

pp$1.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$1.parseSwitchStatement = function(node) {
  var this$1 = this;

  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types.braceL);
  this.labels.push(switchLabel);
  this.enterLexicalScope();

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type != types.braceR;) {
    if (this$1.type === types._case || this$1.type === types._default) {
      var isCase = this$1.type === types._case;
      if (cur) { this$1.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this$1.startNode());
      cur.consequent = [];
      this$1.next();
      if (isCase) {
        cur.test = this$1.parseExpression();
      } else {
        if (sawDefault) { this$1.raiseRecoverable(this$1.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this$1.expect(types.colon);
    } else {
      if (!cur) { this$1.unexpected(); }
      cur.consequent.push(this$1.parseStatement(true));
    }
  }
  this.exitLexicalScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$1.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp$1.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types._catch) {
    var clause = this.startNode();
    this.next();
    this.expect(types.parenL);
    clause.param = this.parseBindingAtom();
    this.enterLexicalScope();
    this.checkLVal(clause.param, "let");
    this.expect(types.parenR);
    clause.body = this.parseBlock(false);
    this.exitLexicalScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$1.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$1.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$1.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement(false);
  return this.finishNode(node, "WithStatement")
};

pp$1.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$1.parseLabeledStatement = function(node, maybeName, expr) {
  var this$1 = this;

  for (var i$1 = 0, list = this$1.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this$1.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this$1.labels[i];
    if (label$1.statementStart == node.start) {
      label$1.statementStart = this$1.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(true);
  if (node.body.type == "ClassDeclaration" ||
      node.body.type == "VariableDeclaration" && node.body.kind != "var" ||
      node.body.type == "FunctionDeclaration" && (this.strict || node.body.generator))
    { this.raiseRecoverable(node.body.start, "Invalid labeled declaration"); }
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$1.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$1.parseBlock = function(createNewLexicalScope) {
  var this$1 = this;
  if ( createNewLexicalScope === void 0 ) { createNewLexicalScope = true; }

  var node = this.startNode();
  node.body = [];
  this.expect(types.braceL);
  if (createNewLexicalScope) {
    this.enterLexicalScope();
  }
  while (!this.eat(types.braceR)) {
    var stmt = this$1.parseStatement(true);
    node.body.push(stmt);
  }
  if (createNewLexicalScope) {
    this.exitLexicalScope();
  }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$1.parseFor = function(node, init) {
  node.init = init;
  this.expect(types.semi);
  node.test = this.type === types.semi ? null : this.parseExpression();
  this.expect(types.semi);
  node.update = this.type === types.parenR ? null : this.parseExpression();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$1.parseForIn = function(node, init) {
  var type = this.type === types._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.parseExpression();
  this.expect(types.parenR);
  this.exitLexicalScope();
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, type)
};

// Parse a list of variable declarations.

pp$1.parseVar = function(node, isFor, kind) {
  var this$1 = this;

  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this$1.startNode();
    this$1.parseVarId(decl, kind);
    if (this$1.eat(types.eq)) {
      decl.init = this$1.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this$1.type === types._in || (this$1.options.ecmaVersion >= 6 && this$1.isContextual("of")))) {
      this$1.unexpected();
    } else if (decl.id.type != "Identifier" && !(isFor && (this$1.type === types._in || this$1.isContextual("of")))) {
      this$1.raise(this$1.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this$1.finishNode(decl, "VariableDeclarator"));
    if (!this$1.eat(types.comma)) { break }
  }
  return node
};

pp$1.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom(kind);
  this.checkLVal(decl.id, kind, false);
};

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseFunction = function(node, isStatement, allowExpressionBody, isAsync) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6 && !isAsync)
    { node.generator = this.eat(types.star); }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (isStatement) {
    node.id = isStatement === "nullableID" && this.type != types.name ? null : this.parseIdent();
    if (node.id) {
      this.checkLVal(node.id, "var");
    }
  }

  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;
  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  if (!isStatement)
    { node.id = this.type == types.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
};

pp$1.parseFunctionParams = function(node) {
  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseClass = function(node, isStatement) {
  var this$1 = this;

  this.next();

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (this$1.eat(types.semi)) { continue }
    var method = this$1.startNode();
    var isGenerator = this$1.eat(types.star);
    var isAsync = false;
    var isMaybeStatic = this$1.type === types.name && this$1.value === "static";
    this$1.parsePropertyName(method);
    method.static = isMaybeStatic && this$1.type !== types.parenL;
    if (method.static) {
      if (isGenerator) { this$1.unexpected(); }
      isGenerator = this$1.eat(types.star);
      this$1.parsePropertyName(method);
    }
    if (this$1.options.ecmaVersion >= 8 && !isGenerator && !method.computed &&
        method.key.type === "Identifier" && method.key.name === "async" && this$1.type !== types.parenL &&
        !this$1.canInsertSemicolon()) {
      isAsync = true;
      this$1.parsePropertyName(method);
    }
    method.kind = "method";
    var isGetSet = false;
    if (!method.computed) {
      var key = method.key;
      if (!isGenerator && !isAsync && key.type === "Identifier" && this$1.type !== types.parenL && (key.name === "get" || key.name === "set")) {
        isGetSet = true;
        method.kind = key.name;
        key = this$1.parsePropertyName(method);
      }
      if (!method.static && (key.type === "Identifier" && key.name === "constructor" ||
          key.type === "Literal" && key.value === "constructor")) {
        if (hadConstructor) { this$1.raise(key.start, "Duplicate constructor in the same class"); }
        if (isGetSet) { this$1.raise(key.start, "Constructor can't have get/set modifier"); }
        if (isGenerator) { this$1.raise(key.start, "Constructor can't be a generator"); }
        if (isAsync) { this$1.raise(key.start, "Constructor can't be an async method"); }
        method.kind = "constructor";
        hadConstructor = true;
      }
    }
    this$1.parseClassMethod(classBody, method, isGenerator, isAsync);
    if (isGetSet) {
      var paramCount = method.kind === "get" ? 0 : 1;
      if (method.value.params.length !== paramCount) {
        var start = method.value.start;
        if (method.kind === "get")
          { this$1.raiseRecoverable(start, "getter should have no params"); }
        else
          { this$1.raiseRecoverable(start, "setter should have exactly one param"); }
      } else {
        if (method.kind === "set" && method.value.params[0].type === "RestElement")
          { this$1.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params"); }
      }
    }
  }
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$1.parseClassMethod = function(classBody, method, isGenerator, isAsync) {
  method.value = this.parseMethod(isGenerator, isAsync);
  classBody.body.push(this.finishNode(method, "MethodDefinition"));
};

pp$1.parseClassId = function(node, isStatement) {
  node.id = this.type === types.name ? this.parseIdent() : isStatement === true ? this.unexpected() : null;
};

pp$1.parseClassSuper = function(node) {
  node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp$1.parseExport = function(node, exports) {
  var this$1 = this;

  this.next();
  // export * from '...'
  if (this.eat(types.star)) {
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, "nullableID", false, isAsync);
    } else if (this.type === types._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(true);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
    } else {
      // check for keywords used as local names
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        var spec = list[i];

        this$1.checkUnreserved(spec.local);
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$1.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (has(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$1.checkPatternExport = function(exports, pat) {
  var this$1 = this;

  var type = pat.type;
  if (type == "Identifier")
    { this.checkExport(exports, pat.name, pat.start); }
  else if (type == "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this$1.checkPatternExport(exports, prop.value);
      } }
  else if (type == "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this$1.checkPatternExport(exports, elt); }
    } }
  else if (type == "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type == "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$1.checkVariableExport = function(exports, decls) {
  var this$1 = this;

  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this$1.checkPatternExport(exports, decl.id);
  }
};

pp$1.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$1.parseExportSpecifiers = function(exports) {
  var this$1 = this;

  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node = this$1.startNode();
    node.local = this$1.parseIdent(true);
    node.exported = this$1.eatContextual("as") ? this$1.parseIdent(true) : node.local;
    this$1.checkExport(exports, node.exported.name, node.exported.start);
    nodes.push(this$1.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$1.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$1.parseImportSpecifiers = function() {
  var this$1 = this;

  var nodes = [], first = true;
  if (this.type === types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLVal(node.local, "let");
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types.comma)) { return nodes }
  }
  if (this.type === types.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLVal(node$1.local, "let");
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node$2 = this$1.startNode();
    node$2.imported = this$1.parseIdent(true);
    if (this$1.eatContextual("as")) {
      node$2.local = this$1.parseIdent();
    } else {
      this$1.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this$1.checkLVal(node$2.local, "let");
    nodes.push(this$1.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

var pp$2 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$2.toAssignable = function(node, isBinding) {
  var this$1 = this;

  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Can not use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      if (prop.kind !== "init") { this$1.raise(prop.key.start, "Object pattern can't contain getter or setter"); }
        this$1.toAssignable(prop.value, isBinding);
      }
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      this.toAssignableList(node.elements, isBinding);
      break

    case "AssignmentExpression":
      if (node.operator === "=") {
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isBinding);
        // falls through to AssignmentPattern
      } else {
        this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        break
      }

    case "AssignmentPattern":
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding);
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  }
  return node
};

// Convert list of expression atoms to binding list.

pp$2.toAssignableList = function(exprList, isBinding) {
  var this$1 = this;

  var end = exprList.length;
  if (end) {
    var last = exprList[end - 1];
    if (last && last.type == "RestElement") {
      --end;
    } else if (last && last.type == "SpreadElement") {
      last.type = "RestElement";
      var arg = last.argument;
      this.toAssignable(arg, isBinding);
      --end;
    }

    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this$1.toAssignable(elt, isBinding); }
  }
  return exprList
};

// Parses spread element.

pp$2.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$2.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$2.parseBindingAtom = function() {
  if (this.options.ecmaVersion < 6) { return this.parseIdent() }
  switch (this.type) {
  case types.name:
    return this.parseIdent()

  case types.bracketL:
    var node = this.startNode();
    this.next();
    node.elements = this.parseBindingList(types.bracketR, true, true);
    return this.finishNode(node, "ArrayPattern")

  case types.braceL:
    return this.parseObj(true)

  default:
    this.unexpected();
  }
};

pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this$1.expect(types.comma); }
    if (allowEmpty && this$1.type === types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this$1.afterTrailingComma(close)) {
      break
    } else if (this$1.type === types.ellipsis) {
      var rest = this$1.parseRestBinding();
      this$1.parseBindingListItem(rest);
      elts.push(rest);
      if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
      this$1.expect(close);
      break
    } else {
      var elem = this$1.parseMaybeDefault(this$1.start, this$1.startLoc);
      this$1.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$2.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// Verify that a node is an lval — something that can be assigned
// to.
// bindingType can be either:
// 'var' indicating that the lval creates a 'var' binding
// 'let' indicating that the lval creates a lexical ('let' or 'const') binding
// 'none' indicating that the binding should be checked for illegal identifiers, but not for duplicate references

pp$2.checkLVal = function(expr, bindingType, checkClashes) {
  var this$1 = this;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (bindingType ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (checkClashes) {
      if (has(checkClashes, expr.name))
        { this.raiseRecoverable(expr.start, "Argument name clash"); }
      checkClashes[expr.name] = true;
    }
    if (bindingType && bindingType !== "none") {
      if (
        bindingType === "var" && !this.canDeclareVarName(expr.name) ||
        bindingType !== "var" && !this.canDeclareLexicalName(expr.name)
      ) {
        this.raiseRecoverable(expr.start, ("Identifier '" + (expr.name) + "' has already been declared"));
      }
      if (bindingType === "var") {
        this.declareVarName(expr.name);
      } else {
        this.declareLexicalName(expr.name);
      }
    }
    break

  case "MemberExpression":
    if (bindingType) { this.raiseRecoverable(expr.start, (bindingType ? "Binding" : "Assigning to") + " member expression"); }
    break

  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1)
      {
    var prop = list[i];

    this$1.checkLVal(prop.value, bindingType, checkClashes);
  }
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this$1.checkLVal(elem, bindingType, checkClashes); }
    }
    break

  case "AssignmentPattern":
    this.checkLVal(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLVal(expr.argument, bindingType, checkClashes);
    break

  case "ParenthesizedExpression":
    this.checkLVal(expr.expression, bindingType, checkClashes);
    break

  default:
    this.raise(expr.start, (bindingType ? "Binding" : "Assigning to") + " rvalue");
  }
};

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

var pp$3 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$3.checkPropClash = function(prop, propHash) {
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$3.parseExpression = function(noIn, refDestructuringErrors) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types.comma)) { node.expressions.push(this$1.parseMaybeAssign(noIn, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
  if (this.inGenerator && this.isContextual("yield")) { return this.parseYield() }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type == types.parenL || this.type == types.name)
    { this.potentialArrowAt = this.start; }
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    this.checkPatternErrors(refDestructuringErrors, true);
    if (!ownDestructuringErrors) { DestructuringErrors.call(refDestructuringErrors); }
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.left = this.type === types.eq ? this.toAssignable(left) : left;
    refDestructuringErrors.shorthandAssign = -1; // reset because shorthand default was used correctly
    this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start == startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== types._in)) {
    if (prec > minPrec) {
      var logical = this.type === types.logicalOR || this.type === types.logicalAND;
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical);
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
    }
  }
  return left
};

pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.inAsync && this.isContextual("await")) {
    expr = this.parseAwait(refDestructuringErrors);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLVal(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.operator = this$1.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this$1.checkLVal(expr);
      this$1.next();
      expr = this$1.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!sawUnary && this.eat(types.starstar))
    { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
  else
    { return expr }
};

// Parse call, dot, and `[]`-subscript expressions.

pp$3.parseExprSubscripts = function(refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
  if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts) { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
  }
  return result
};

pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  var this$1 = this;

  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd == base.end && !this.canInsertSemicolon();
  for (var computed = (void 0);;) {
    if ((computed = this$1.eat(types.bracketL)) || this$1.eat(types.dot)) {
      var node = this$1.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = computed ? this$1.parseExpression() : this$1.parseIdent(true);
      node.computed = !!computed;
      if (computed) { this$1.expect(types.bracketR); }
      base = this$1.finishNode(node, "MemberExpression");
    } else if (!noCalls && this$1.eat(types.parenL)) {
      var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this$1.yieldPos, oldAwaitPos = this$1.awaitPos;
      this$1.yieldPos = 0;
      this$1.awaitPos = 0;
      var exprList = this$1.parseExprList(types.parenR, this$1.options.ecmaVersion >= 8, false, refDestructuringErrors);
      if (maybeAsyncArrow && !this$1.canInsertSemicolon() && this$1.eat(types.arrow)) {
        this$1.checkPatternErrors(refDestructuringErrors, false);
        this$1.checkYieldAwaitInDefaultParams();
        this$1.yieldPos = oldYieldPos;
        this$1.awaitPos = oldAwaitPos;
        return this$1.parseArrowExpression(this$1.startNodeAt(startPos, startLoc), exprList, true)
      }
      this$1.checkExpressionErrors(refDestructuringErrors, true);
      this$1.yieldPos = oldYieldPos || this$1.yieldPos;
      this$1.awaitPos = oldAwaitPos || this$1.awaitPos;
      var node$1 = this$1.startNodeAt(startPos, startLoc);
      node$1.callee = base;
      node$1.arguments = exprList;
      base = this$1.finishNode(node$1, "CallExpression");
    } else if (this$1.type === types.backQuote) {
      var node$2 = this$1.startNodeAt(startPos, startLoc);
      node$2.tag = base;
      node$2.quasi = this$1.parseTemplate({isTagged: true});
      base = this$1.finishNode(node$2, "TaggedTemplateExpression");
    } else {
      return base
    }
  }
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$3.parseExprAtom = function(refDestructuringErrors) {
  var node, canBeArrow = this.potentialArrowAt == this.start;
  switch (this.type) {
  case types._super:
    if (!this.inFunction)
      { this.raise(this.start, "'super' outside of function or class"); }

  case types._this:
    var type = this.type === types._this ? "ThisExpression" : "Super";
    node = this.startNode();
    this.next();
    return this.finishNode(node, type)

  case types.name:
    var startPos = this.start, startLoc = this.startLoc;
    var id = this.parseIdent(this.type !== types.name);
    if (this.options.ecmaVersion >= 8 && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
      { return this.parseFunction(this.startNodeAt(startPos, startLoc), false, false, true) }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name) {
        id = this.parseIdent();
        if (this.canInsertSemicolon() || !this.eat(types.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
      }
    }
    return id

  case types.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types.num: case types.string:
    return this.parseLiteral(this.value)

  case types._null: case types._true: case types._false:
    node = this.startNode();
    node.value = this.type === types._null ? null : this.type === types._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types.braceL:
    return this.parseObj(false, refDestructuringErrors)

  case types._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, false)

  case types._class:
    return this.parseClass(this.startNode(), false)

  case types._new:
    return this.parseNew()

  case types.backQuote:
    return this.parseTemplate()

  default:
    this.unexpected();
  }
};

pp$3.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  this.next();
  return this.finishNode(node, "Literal")
};

pp$3.parseParenExpression = function() {
  this.expect(types.parenL);
  var val = this.parseExpression();
  this.expect(types.parenR);
  return val
};

pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
  var this$1 = this;

  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart, innerParenStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    while (this.type !== types.parenR) {
      first ? first = false : this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(types.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this$1.type === types.ellipsis) {
        spreadStart = this$1.start;
        exprList.push(this$1.parseParenItem(this$1.parseRestBinding()));
        if (this$1.type === types.comma) { this$1.raise(this$1.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        if (this$1.type === types.parenL && !innerParenStart) {
          innerParenStart = this$1.start;
        }
        exprList.push(this$1.parseMaybeAssign(false, refDestructuringErrors, this$1.parseParenItem));
      }
    }
    var innerEndPos = this.start, innerEndLoc = this.startLoc;
    this.expect(types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (innerParenStart) { this.unexpected(innerParenStart); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$3.parseParenItem = function(item) {
  return item
};

pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty$1 = [];

pp$3.parseNew = function() {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
    node.meta = meta;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target"); }
    if (!this.inFunction)
      { this.raiseRecoverable(node.start, "new.target can only be used in functions"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty$1; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$3.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$3.parseTemplate = function(ref) {
  var this$1 = this;
  if ( ref === void 0 ) { ref = {}; }
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) { isTagged = false; }

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    this$1.expect(types.dollarBraceL);
    node.expressions.push(this$1.parseExpression());
    this$1.expect(types.braceR);
    node.quasis.push(curElt = this$1.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

// Parse an object literal or binding pattern.

pp$3.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp$3.parseObj = function(isPattern, refDestructuringErrors) {
  var this$1 = this;

  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types.braceR)) {
    if (!first) {
      this$1.expect(types.comma);
      if (this$1.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var prop = this$1.startNode(), isGenerator = (void 0), isAsync = (void 0), startPos = (void 0), startLoc = (void 0);
    if (this$1.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refDestructuringErrors) {
        startPos = this$1.start;
        startLoc = this$1.startLoc;
      }
      if (!isPattern)
        { isGenerator = this$1.eat(types.star); }
    }
    this$1.parsePropertyName(prop);
    if (!isPattern && this$1.options.ecmaVersion >= 8 && !isGenerator && this$1.isAsyncProp(prop)) {
      isAsync = true;
      this$1.parsePropertyName(prop, refDestructuringErrors);
    } else {
      isAsync = false;
    }
    this$1.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors);
    this$1.checkPropClash(prop, propHash);
    node.properties.push(this$1.finishNode(prop, "Property"));
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors) {
  if ((isGenerator || isAsync) && this.type === types.colon)
    { this.unexpected(); }

  if (this.eat(types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type != types.comma && this.type != types.braceR)) {
    if (isGenerator || isAsync || isPattern) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    this.checkUnreserved(prop.key);
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else if (this.type === types.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$3.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(true)
};

// Initialize empty function node.

pp$3.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = false; }
};

// Parse object or class method.

pp$3.parseMethod = function(isGenerator, isAsync) {
  var node = this.startNode(), oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = node.generator;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;
  this.enterFunctionScope();

  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$3.parseArrowExpression = function(node, params, isAsync) {
  var oldInGen = this.inGenerator, oldInAsync = this.inAsync,
      oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldInFunc = this.inFunction;

  this.enterFunctionScope();
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.inGenerator = false;
  this.inAsync = node.async;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.inFunction = true;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);

  this.inGenerator = oldInGen;
  this.inAsync = oldInAsync;
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.inFunction = oldInFunc;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$3.parseFunctionBody = function(node, isArrowFunction) {
  var isExpression = isArrowFunction && this.type !== types.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && this.isSimpleParamList(node.params));
    node.body = this.parseBlock(false);
    node.expression = false;
    this.labels = oldLabels;
  }
  this.exitFunctionScope();

  if (this.strict && node.id) {
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    this.checkLVal(node.id, "none");
  }
  this.strict = oldStrict;
};

pp$3.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$3.checkParams = function(node, allowDuplicates) {
  var this$1 = this;

  var nameHash = {};
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this$1.checkLVal(param, "var", allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var this$1 = this;

  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this$1.expect(types.comma);
      if (allowTrailingComma && this$1.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this$1.type === types.comma)
      { elt = null; }
    else if (this$1.type === types.ellipsis) {
      elt = this$1.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this$1.type === types.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this$1.start; }
    } else {
      elt = this$1.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$3.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Can not use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Can not use 'await' as identifier inside an async function"); }
  if (this.isKeyword(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") != -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name))
    { this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved")); }
};

pp$3.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (liberal && this.options.allowReserved == "never") { liberal = false; }
  if (this.type === types.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "Identifier");
  if (!liberal) { this.checkUnreserved(node); }
  return node
};

// Parses yield expression inside generator.

pp$3.parseYield = function() {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type == types.semi || this.canInsertSemicolon() || (this.type != types.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression")
};

pp$3.parseAwait = function() {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$5 = Parser.prototype;

// Object.assign polyfill
var assign$1 = Object.assign || function(target) {
  var sources = [], len = arguments.length - 1;
  while ( len-- > 0 ) { sources[ len ] = arguments[ len + 1 ]; }

  for (var i = 0, list = sources; i < list.length; i += 1) {
    var source = list[i];

    for (var key in source) {
      if (has(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$5.enterFunctionScope = function() {
  // var: a hash of var-declared names in the current lexical scope
  // lexical: a hash of lexically-declared names in the current lexical scope
  // childVar: a hash of var-declared names in all child lexical scopes of the current lexical scope (within the current function scope)
  // parentLexical: a hash of lexically-declared names in all parent lexical scopes of the current lexical scope (within the current function scope)
  this.scopeStack.push({var: {}, lexical: {}, childVar: {}, parentLexical: {}});
};

pp$5.exitFunctionScope = function() {
  this.scopeStack.pop();
};

pp$5.enterLexicalScope = function() {
  var parentScope = this.scopeStack[this.scopeStack.length - 1];
  var childScope = {var: {}, lexical: {}, childVar: {}, parentLexical: {}};

  this.scopeStack.push(childScope);
  assign$1(childScope.parentLexical, parentScope.lexical, parentScope.parentLexical);
};

pp$5.exitLexicalScope = function() {
  var childScope = this.scopeStack.pop();
  var parentScope = this.scopeStack[this.scopeStack.length - 1];

  assign$1(parentScope.childVar, childScope.var, childScope.childVar);
};

/**
 * A name can be declared with `var` if there are no variables with the same name declared with `let`/`const`
 * in the current lexical scope or any of the parent lexical scopes in this function.
 */
pp$5.canDeclareVarName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.parentLexical, name)
};

/**
 * A name can be declared with `let`/`const` if there are no variables with the same name declared with `let`/`const`
 * in the current scope, and there are no variables with the same name declared with `var` in the current scope or in
 * any child lexical scopes in this function.
 */
pp$5.canDeclareLexicalName = function(name) {
  var currentScope = this.scopeStack[this.scopeStack.length - 1];

  return !has(currentScope.lexical, name) && !has(currentScope.var, name) && !has(currentScope.childVar, name)
};

pp$5.declareVarName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].var[name] = true;
};

pp$5.declareLexicalName = function(name) {
  this.scopeStack[this.scopeStack.length - 1].lexical[name] = true;
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$6 = Parser.prototype;

pp$6.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$6.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$6.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$6.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types$1 = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$7 = Parser.prototype;

pp$7.initialContext = function() {
  return [types$1.b_stat]
};

pp$7.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types$1.f_expr || parent === types$1.f_stat)
    { return true }
  if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types._return || prevType == types.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType == types.arrow)
    { return true }
  if (prevType == types.braceL)
    { return parent === types$1.b_stat }
  if (prevType == types._var || prevType == types.name)
    { return false }
  return !this.exprAllowed
};

pp$7.inGeneratorContext = function() {
  var this$1 = this;

  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this$1.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$7.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType == types.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Token-specific context update code

types.parenR.updateContext = types.braceR.updateContext = function() {
  if (this.context.length == 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types$1.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
  this.exprAllowed = true;
};

types.dollarBraceL.updateContext = function() {
  this.context.push(types$1.b_tmpl);
  this.exprAllowed = true;
};

types.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
  this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
  this.exprAllowed = true;
};

types.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types._function.updateContext = types._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types.semi && prevType !== types._else &&
      !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
    { this.context.push(types$1.f_expr); }
  else
    { this.context.push(types$1.f_stat); }
  this.exprAllowed = false;
};

types.backQuote.updateContext = function() {
  if (this.curContext() === types$1.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types$1.q_tmpl); }
  this.exprAllowed = false;
};

types.star.updateContext = function(prevType) {
  if (prevType == types._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types$1.f_expr)
      { this.context[index] = types$1.f_expr_gen; }
    else
      { this.context[index] = types$1.f_gen; }
  }
  this.exprAllowed = true;
};

types.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6) {
    if (this.value == "of" && !this.exprAllowed ||
        this.value == "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp$8 = Parser.prototype;

// Are we running under Rhino?
var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";

// Move to the next token

pp$8.next = function() {
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp$8.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp$8[Symbol.iterator] = function() {
    var this$1 = this;

    return {
      next: function () {
        var token = this$1.getToken();
        return {
          done: token.type === types.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp$8.curContext = function() {
  return this.context[this.context.length - 1]
};

// Read a single token, updating the parser object's token-related
// properties.

pp$8.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp$8.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp$8.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00
};

pp$8.skipBlockComment = function() {
  var this$1 = this;

  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    lineBreakG.lastIndex = start;
    var match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this$1.curLine;
      this$1.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp$8.skipLineComment = function(startSkip) {
  var this$1 = this;

  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this$1.input.charCodeAt(++this$1.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp$8.skipSpace = function() {
  var this$1 = this;

  loop: while (this.pos < this.input.length) {
    var ch = this$1.input.charCodeAt(this$1.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this$1.pos;
      break
    case 13:
      if (this$1.input.charCodeAt(this$1.pos + 1) === 10) {
        ++this$1.pos;
      }
    case 10: case 8232: case 8233:
      ++this$1.pos;
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      break
    case 47: // '/'
      switch (this$1.input.charCodeAt(this$1.pos + 1)) {
      case 42: // '*'
        this$1.skipBlockComment();
        break
      case 47:
        this$1.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this$1.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp$8.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp$8.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types.dot)
  }
};

pp$8.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.slash, 1)
};

pp$8.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types.star : types.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && next === 42) {
    ++size;
    tokentype = types.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp$8.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) { return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2) }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
};

pp$8.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.bitwiseXOR, 1)
};

pp$8.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next == 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) == 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.plusMin, 1)
};

pp$8.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
    return this.finishOp(types.bitShift, size)
  }
  if (next == 33 && code == 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) == 45 &&
      this.input.charCodeAt(this.pos + 3) == 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types.relational, size)
};

pp$8.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types.arrow)
  }
  return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
};

pp$8.getTokenFromCode = function(code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

    // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types.parenL)
  case 41: ++this.pos; return this.finishToken(types.parenR)
  case 59: ++this.pos; return this.finishToken(types.semi)
  case 44: ++this.pos; return this.finishToken(types.comma)
  case 91: ++this.pos; return this.finishToken(types.bracketL)
  case 93: ++this.pos; return this.finishToken(types.bracketR)
  case 123: ++this.pos; return this.finishToken(types.braceL)
  case 125: ++this.pos; return this.finishToken(types.braceR)
  case 58: ++this.pos; return this.finishToken(types.colon)
  case 63: ++this.pos; return this.finishToken(types.question)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

    // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 126: // '~'
    return this.finishOp(types.prefix, 1)
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp$8.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function tryCreateRegexp(src, flags, throwErrorAt, parser) {
  try {
    return new RegExp(src, flags)
  } catch (e) {
    if (throwErrorAt !== undefined) {
      if (e instanceof SyntaxError) { parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message); }
      throw e
    }
  }
}

var regexpUnicodeSupport = !!tryCreateRegexp("\uffff", "u");

pp$8.readRegexp = function() {
  var this$1 = this;

  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(start, "Unterminated regular expression"); }
    var ch = this$1.input.charAt(this$1.pos);
    if (lineBreak.test(ch)) { this$1.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this$1.pos;
  }
  var content = this.input.slice(start, this.pos);
  ++this.pos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = this.readWord1();
  var tmp = content, tmpFlags = "";
  if (mods) {
    var validFlags = /^[gim]*$/;
    if (this.options.ecmaVersion >= 6) { validFlags = /^[gimuy]*$/; }
    if (!validFlags.test(mods)) { this.raise(start, "Invalid regular expression flag"); }
    if (mods.indexOf("u") >= 0) {
      if (regexpUnicodeSupport) {
        tmpFlags = "u";
      } else {
        // Replace each astral symbol and every Unicode escape sequence that
        // possibly represents an astral symbol or a paired surrogate with a
        // single ASCII symbol to avoid throwing on regular expressions that
        // are only valid in combination with the `/u` flag.
        // Note: replacing with the ASCII symbol `x` might cause false
        // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
        // perfectly valid pattern that is equivalent to `[a-b]`, but it would
        // be replaced by `[x-b]` which throws an error.
        tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_match, code, offset) {
          code = Number("0x" + code);
          if (code > 0x10FFFF) { this$1.raise(start + offset + 3, "Code point out of bounds"); }
          return "x"
        });
        tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
        tmpFlags = tmpFlags.replace("u", "");
      }
    }
  }
  // Detect invalid regular expressions.
  var value = null;
  // Rhino's regular expression parser is flaky and throws uncatchable exceptions,
  // so don't do detection if we are running under Rhino
  if (!isRhino) {
    tryCreateRegexp(tmp, tmpFlags, start, this);
    // Get a regular expression object for this pattern-flag pair, or `null` in
    // case the current environment doesn't support the flags it uses.
    value = tryCreateRegexp(content, mods);
  }
  return this.finishToken(types.regexp, {pattern: content, flags: mods, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp$8.readInt = function(radix, len) {
  var this$1 = this;

  var start = this.pos, total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this$1.input.charCodeAt(this$1.pos), val = (void 0);
    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    ++this$1.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

pp$8.readRadixNumber = function(radix) {
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp$8.readNumber = function(startsWithDot) {
  var start = this.pos, isFloat = false, octal = this.input.charCodeAt(this.pos) === 48;
  if (!startsWithDot && this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  if (octal && this.pos == start + 1) { octal = false; }
  var next = this.input.charCodeAt(this.pos);
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    isFloat = true;
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
    isFloat = true;
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var str = this.input.slice(start, this.pos), val;
  if (isFloat) { val = parseFloat(str); }
  else if (!octal || str.length === 1) { val = parseInt(str, 10); }
  else if (this.strict) { this.raise(start, "Invalid number"); }
  else if (/[89]/.test(str)) { val = parseInt(str, 10); }
  else { val = parseInt(str, 8); }
  return this.finishToken(types.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp$8.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

pp$8.readString = function(quote) {
  var this$1 = this;

  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated string constant"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(false);
      chunkStart = this$1.pos;
    } else {
      if (isNewLine(ch)) { this$1.raise(this$1.start, "Unterminated string constant"); }
      ++this$1.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp$8.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp$8.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp$8.readTmplToken = function() {
  var this$1 = this;

  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this$1.pos >= this$1.input.length) { this$1.raise(this$1.start, "Unterminated template"); }
    var ch = this$1.input.charCodeAt(this$1.pos);
    if (ch === 96 || ch === 36 && this$1.input.charCodeAt(this$1.pos + 1) === 123) { // '`', '${'
      if (this$1.pos === this$1.start && (this$1.type === types.template || this$1.type === types.invalidTemplate)) {
        if (ch === 36) {
          this$1.pos += 2;
          return this$1.finishToken(types.dollarBraceL)
        } else {
          ++this$1.pos;
          return this$1.finishToken(types.backQuote)
        }
      }
      out += this$1.input.slice(chunkStart, this$1.pos);
      return this$1.finishToken(types.template, out)
    }
    if (ch === 92) { // '\'
      out += this$1.input.slice(chunkStart, this$1.pos);
      out += this$1.readEscapedChar(true);
      chunkStart = this$1.pos;
    } else if (isNewLine(ch)) {
      out += this$1.input.slice(chunkStart, this$1.pos);
      ++this$1.pos;
      switch (ch) {
      case 13:
        if (this$1.input.charCodeAt(this$1.pos) === 10) { ++this$1.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this$1.options.locations) {
        ++this$1.curLine;
        this$1.lineStart = this$1.pos;
      }
      chunkStart = this$1.pos;
    } else {
      ++this$1.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp$8.readInvalidTemplateToken = function() {
  var this$1 = this;

  for (; this.pos < this.input.length; this.pos++) {
    switch (this$1.input[this$1.pos]) {
    case "\\":
      ++this$1.pos;
      break

    case "$":
      if (this$1.input[this$1.pos + 1] !== "{") {
        break
      }
    // falls through

    case "`":
      return this$1.finishToken(types.invalidTemplate, this$1.input.slice(this$1.start, this$1.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp$8.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      if (octalStr !== "0" && (this.strict || inTemplate)) {
        this.invalidStringToken(this.pos - 2, "Octal literal in strict mode");
      }
      this.pos += octalStr.length - 1;
      return String.fromCharCode(octal)
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp$8.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp$8.readWord1 = function() {
  var this$1 = this;

  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this$1.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this$1.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this$1.containsEsc = true;
      word += this$1.input.slice(chunkStart, this$1.pos);
      var escStart = this$1.pos;
      if (this$1.input.charCodeAt(++this$1.pos) != 117) // "u"
        { this$1.invalidStringToken(this$1.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this$1.pos;
      var esc = this$1.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this$1.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString(esc);
      chunkStart = this$1.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp$8.readWord = function() {
  var word = this.readWord1();
  var type = types.name;
  if (this.keywords.test(word)) {
    if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword " + word); }
    type = keywords$1[word];
  }
  return this.finishToken(type, word)
};

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return new Parser(options, input).parse()
}

function getLocator$1(source, options) {
    if (options === void 0) { options = {}; }
    var offsetLine = options.offsetLine || 0;
    var offsetColumn = options.offsetColumn || 0;
    var originalLines = source.split('\n');
    var start = 0;
    var lineRanges = originalLines.map(function (line, i) {
        var end = start + line.length + 1;
        var range = { start: start, end: end, line: i };
        start = end;
        return range;
    });
    var i = 0;
    function rangeContains(range, index) {
        return range.start <= index && index < range.end;
    }
    function getLocation(range, index) {
        return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
    }
    function locate(search, startIndex) {
        if (typeof search === 'string') {
            search = source.indexOf(search, startIndex || 0);
        }
        var range = lineRanges[i];
        var d = search >= range.end ? 1 : -1;
        while (range) {
            if (rangeContains(range, search))
                return getLocation(range, search);
            i += d;
            range = lineRanges[i];
        }
    }
    
    return locate;
}
function locate(source, search, options) {
    if (typeof options === 'number') {
        throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
    }
    return getLocator$1(source, options)(search, options && options.startIndex);
}

const reservedWords$1 = 'break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public'.split( ' ' );
const builtins = 'Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl'.split( ' ' );

const blacklisted = blank();
reservedWords$1.concat( builtins ).forEach( word => blacklisted[ word ] = true );

const illegalCharacters = /[^$_a-zA-Z0-9]/g;

const startsWithDigit = str => /\d/.test( str[0] );

function isLegal ( str ) {
	if ( startsWithDigit(str) || blacklisted[ str ] ) {
		return false;
	}
	if ( illegalCharacters.test(str) ) {
		return false;
	}
	return true;
}

function makeLegal ( str ) {
	str = str
		.replace( /-(\w)/g, ( _, letter ) => letter.toUpperCase() )
		.replace( illegalCharacters, '_' );

	if ( startsWithDigit(str) || blacklisted[ str ] ) { str = `_${str}`; }

	return str;
}

function spaces ( i ) {
	let result = '';
	while ( i-- ) { result += ' '; }
	return result;
}


function tabsToSpaces ( str ) {
	return str.replace( /^\t+/, match => match.split( '\t' ).join( '  ' ) );
}

function getCodeFrame ( source, line, column ) {
	let lines = source.split( '\n' );

	const frameStart = Math.max( 0, line - 3 );
	let frameEnd = Math.min( line + 2, lines.length );

	lines = lines.slice( frameStart, frameEnd );
	while ( !/\S/.test( lines[ lines.length - 1 ] ) ) {
		lines.pop();
		frameEnd -= 1;
	}

	const digits = String( frameEnd ).length;

	return lines
		.map( ( str, i ) => {
			const isErrorLine = frameStart + i + 1 === line;

			let lineNum = String( i + frameStart + 1 );
			while ( lineNum.length < digits ) { lineNum = ` ${lineNum}`; }

			if ( isErrorLine ) {
				const indicator = spaces( digits + 2 + tabsToSpaces( str.slice( 0, column ) ).length ) + '^';
				return `${lineNum}: ${tabsToSpaces( str )}\n${indicator}`;
			}

			return `${lineNum}: ${tabsToSpaces( str )}`;
		})
		.join( '\n' );
}

function relativeId ( id ) {
	if ( typeof process === 'undefined' || !isAbsolute( id ) ) { return id; }
	return relative( process.cwd(), id );
}

class Variable {
	constructor ( name ) {
		this.name = name;
	}

	addCall () {}

	getName () {
		return this.name;
	}

	hasEffectsWhenCalled () {
		return true;
	}

	hasEffectsWhenMutated () {
		return true;
	}

	includeVariable () {
		if ( this.included ) {
			return false;
		}
		this.included = true;
		return true;
	}
}

class NamespaceVariable extends Variable {
	constructor ( module ) {
		super( module.basename() );
		this.isNamespace = true;
		this.module = module;
		this.needsNamespaceBlock = false;

		this.originals = blank();
		module.getExports().concat( module.getReexports() ).forEach( name => {
			this.originals[ name ] = module.traceExport( name );
		} );
	}

	addReference ( node ) {
		this.name = node.name;
	}

	assignExpression () {}

	includeVariable () {
		const hasBeenIncluded = super.includeVariable();
		if ( hasBeenIncluded ) {
			this.needsNamespaceBlock = true;
			forOwn( this.originals, original => original.includeVariable() );
		}
		return hasBeenIncluded;
	}

	renderBlock ( es, legacy, indentString ) {
		const members = keys( this.originals ).map( name => {
			const original = this.originals[ name ];

			if ( original.isReassigned && !legacy ) {
				return `${indentString}get ${name} () { return ${original.getName( es )}; }`;
			}

			if ( legacy && ~reservedWords$1.indexOf( name ) ) { name = `'${name}'`; }
			return `${indentString}${name}: ${original.getName( es )}`;
		} );

		const callee = legacy ? `(Object.freeze || Object)` : `Object.freeze`;
		return `${this.module.bundle.varOrConst} ${this.getName( es )} = ${callee}({\n${members.join( ',\n' )}\n});\n\n`;
	}
}

function extractNames ( param ) {
	const names = [];
	extractors[ param.type ]( names, param );
	return names;
}

const extractors = {
	Identifier ( names, param ) {
		names.push( param.name );
	},

	ObjectPattern ( names, param ) {
		param.properties.forEach( prop => {
			extractors[ prop.value.type ]( names, prop.value );
		});
	},

	ArrayPattern ( names, param ) {
		param.elements.forEach( element => {
			if ( element ) { extractors[ element.type ]( names, element ); }
		});
	},

	RestElement ( names, param ) {
		extractors[ param.argument.type ]( names, param.argument );
	},

	AssignmentPattern ( names, param ) {
		extractors[ param.left.type ]( names, param.left );
	}
};

const UNKNOWN_VALUE = { toString: () => '[[UNKNOWN]]' };

const UNKNOWN_ASSIGNMENT = {
	type: 'UNKNOWN',
	bindCall: () => {},
	hasEffectsWhenCalled: () => true,
	hasEffectsWhenMutated: () => true,
};

const UNDEFINED_ASSIGNMENT = {
	type: 'UNDEFINED',
	bindCall: () => {},
	hasEffectsWhenCalled: () => true,
	hasEffectsWhenMutated: () => true,
};

const UNKNOWN_OBJECT_LITERAL = {
	type: 'UNKNOWN_OBJECT_LITERAL',
	bindCall: () => {},
	hasEffectsWhenCalled: () => true,
	hasEffectsWhenMutated: () => false,
};

const OPTION_IGNORE_BREAK_STATEMENTS = 'IGNORE_BREAK_STATEMENTS';
const OPTION_IGNORE_RETURN_AWAIT_YIELD = 'IGNORE_RETURN_AWAIT_YIELD';
const OPTION_IGNORE_SAFE_THIS_MUTATIONS = 'IGNORE_SAFE_THIS_MUTATIONS';
const OPTION_CALLED_NODES = 'CALLED_NODES';
const OPTION_MUTATED_NODES = 'MUTATED_NODES';
const IGNORED_LABELS = 'IGNORED_LABELS';

/** Wrapper to ensure immutability */
class ExecutionPathOptions {
	/**
	 * @returns {ExecutionPathOptions}
	 */
	static create () {
		return new this( {} );
	}

	constructor ( optionValues ) {
		this._optionValues = optionValues;
	}

	/**
	 * Returns a new ExecutionPathOptions instance with the given option set to a new value.
	 * Does not mutate the current instance. Also works in sub-classes.
	 * @param {string} option - The name of an option
	 * @param {*} value - The new value of the option
	 * @returns {ExecutionPathOptions} A new options instance
	 */
	set ( option, value ) {
		return new this.constructor( Object.assign( {}, this._optionValues, { [option]: value } ) );
	}

	/**
	 * @param {string} option - The name of an option
	 * @returns {*} Its value
	 */
	get ( option ) {
		return this._optionValues[ option ];
	}

	/**
	 * @return {boolean}
	 */
	ignoreBreakStatements () {
		return this.get( OPTION_IGNORE_BREAK_STATEMENTS );
	}

	/**
	 * @param {boolean} [value=true]
	 * @return {ExecutionPathOptions}
	 */
	setIgnoreBreakStatements ( value ) {
		if ( value === void 0 ) value = true;

		return this.set( OPTION_IGNORE_BREAK_STATEMENTS, value );
	}

	/**
	 * @param {string} labelName
	 * @return {boolean}
	 */
	ignoreLabel ( labelName ) {
		const ignoredLabels = this.get( IGNORED_LABELS );
		return ignoredLabels && ignoredLabels.has( labelName );
	}

	/**
	 * @param {string} labelName
	 * @return {ExecutionPathOptions}
	 */
	setIgnoreLabel ( labelName ) {
		return this.set( IGNORED_LABELS, new Set( this.get( IGNORED_LABELS ) ).add( labelName ) );
	}

	/**
	 * @return {ExecutionPathOptions}
	 */
	setIgnoreNoLabels () {
		return this.set( IGNORED_LABELS, null );
	}

	/**
	 * @return {boolean}
	 */
	ignoreReturnAwaitYield () {
		return this.get( OPTION_IGNORE_RETURN_AWAIT_YIELD );
	}

	/**
	 * @param {boolean} [value=true]
	 * @return {ExecutionPathOptions}
	 */
	setIgnoreReturnAwaitYield ( value ) {
		if ( value === void 0 ) value = true;

		return this.set( OPTION_IGNORE_RETURN_AWAIT_YIELD, value );
	}

	/**
	 * @return {boolean}
	 */
	ignoreSafeThisMutations () {
		return this.get( OPTION_IGNORE_SAFE_THIS_MUTATIONS );
	}

	/**
	 * @param {boolean} [value=true]
	 * @return {ExecutionPathOptions}
	 */
	setIgnoreSafeThisMutations ( value ) {
		if ( value === void 0 ) value = true;

		return this.set( OPTION_IGNORE_SAFE_THIS_MUTATIONS, value );
	}

	/**
	 * @param {Node} node
	 * @return {ExecutionPathOptions}
	 */
	addMutatedNode ( node ) {
		return this.set( OPTION_MUTATED_NODES, new Set( this.get( OPTION_MUTATED_NODES ) ).add( node ) );
	}

	/**
	 * @param {Node} node
	 * @return {boolean}
	 */
	hasNodeBeenMutated ( node ) {
		const mutatedNodes = this.get( OPTION_MUTATED_NODES );
		return mutatedNodes && mutatedNodes.has( node );
	}

	/**
	 * @param {Node} node
	 * @return {ExecutionPathOptions}
	 */
	addCalledNode ( node ) {
		return this.set( OPTION_CALLED_NODES, new Set( this.get( OPTION_CALLED_NODES ) ).add( node ) );
	}

	/**
	 * @param {Node} node
	 * @return {boolean}
	 */
	hasNodeBeenCalled ( node ) {
		const calledNodes = this.get( OPTION_CALLED_NODES );
		return calledNodes && calledNodes.has( node );
	}

	/**
	 * @param {Node} calledNode
	 * @return {ExecutionPathOptions}
	 */
	getHasEffectsWhenCalledOptions ( calledNode ) {
		return this
			.addCalledNode( calledNode )
			.setIgnoreReturnAwaitYield()
			.setIgnoreBreakStatements( false )
			.setIgnoreNoLabels();
	}
}

class Node$1 {
	/**
	 * Called once all nodes have been initialised and the scopes have been populated.
	 * Use this to bind assignments and calls to variables.
	 */
	bind () {
		this.eachChild( child => child.bind() );
	}

	/**
	 * Bind an expression as an assignment to a node.
	 * The default noop implementation is ok as long as hasEffectsWhenAssigned
	 * always returns true for this node. Otherwise it should be overridden.
	 * @param {Node} expression
	 */
	bindAssignment () {}

	/**
	 * Binds ways a node is called to a node. Current options are:
	 * - withNew: boolean - Did this call use the "new" operator
	 * The default noop implementation is ok as long as hasEffectsWhenCalled
	 * always returns true for this node. Otherwise it should be overridden.
	 * @param callOptions
	 */
	bindCall () {}

	eachChild ( callback ) {
		this.keys.forEach( key => {
			const value = this[ key ];
			if ( !value ) { return; }

			if ( Array.isArray( value ) ) {
				value.forEach( child => child && callback( child ) );
			} else {
				callback( value );
			}
		} );
	}

	getValue () {
		return UNKNOWN_VALUE;
	}

	/**
	 * Determine if this Node would have an effect on the bundle.
	 * This is usually true for already included nodes. Exceptions are e.g. break statements
	 * which only have an effect if their surrounding loop or switch statement is included.
	 * The options pass on information like this about the current execution path.
	 * @param {ExecutionPathOptions} options
	 * @return {boolean}
	 */
	hasEffects ( options ) {
		return this.included || this.someChild( child => child.hasEffects( options ) );
	}

	/**
	 * Special make-shift logic to treat cases where apparently side-effect free statements
	 * are executed for side-effects. The most important case are getters with side-effects.
	 * Once we can reliably handle this case in member expressions, this function should
	 * probably be removed again.
	 * @param {ExecutionPathOptions} options
	 * @return {boolean}
	 */
	hasEffectsAsExpressionStatement () {
		return true;
	}

	/**
	 * @param {ExecutionPathOptions} options
	 * @return {boolean}
	 */
	hasEffectsWhenAssigned () {
		return true;
	}

	/**
	 * @param {ExecutionPathOptions} options
	 * @return {boolean}
	 */
	hasEffectsWhenCalled () {
		return true;
	}

	/**
	 * @param {ExecutionPathOptions} options
	 * @return {boolean}
	 */
	hasEffectsWhenMutated () {
		return true;
	}

	/**
	 * Includes the node in the bundle. Children are usually included if they are
	 * necessary for this node (e.g. a function body) or if they have effects.
	 * Necessary variables should be included as well. Should return true if any
	 * nodes or variables have been added that were missing before.
	 * @return {boolean}
	 */
	includeInBundle () {
		if ( this.isFullyIncluded() ) { return false; }
		let addedNewNodes = false;
		this.eachChild( childNode => {
			if ( childNode.includeInBundle() ) {
				addedNewNodes = true;
			}
		} );
		if ( this.included && !addedNewNodes ) {
			return false;
		}
		this.included = true;
		return true;
	}

	/**
	 * Alternative version of includeInBundle to override the default behaviour of
	 * declarations to only include nodes for declarators that have an effect. Necessary
	 * for for-loops that do not use a declared loop variable.
	 * @return {boolean}
	 */
	includeWithAllDeclarations () {
		return this.includeInBundle();
	}

	/**
	 * Assign a scope to this node and make sure all children have the right scopes.
	 * Perform any additional initialisation that does not depend on the scope being
	 * populated with variables.
	 * Usually one should not override this function but override initialiseScope,
	 * initialiseNode and/or initialiseChildren instead. BlockScopes have a special
	 * alternative initialisation initialiseAndReplaceScope.
	 * @param {Scope} parentScope
	 */
	initialise ( parentScope ) {
		this.initialiseScope( parentScope );
		this.initialiseNode( parentScope );
		this.initialiseChildren( parentScope );
	}

	/**
	 * Override to change how and with what scopes children are initialised
	 * @param {Scope} parentScope
	 */
	initialiseChildren () {
		this.eachChild( child => child.initialise( this.scope ) );
	}

	/**
	 * Override to perform special initialisation steps after the scope is initialised
	 * @param {Scope} parentScope
	 */
	initialiseNode () {}

	/**
	 * Override if this scope should receive a different scope than the parent scope.
	 * @param {Scope} parentScope
	 */
	initialiseScope ( parentScope ) {
		this.scope = parentScope;
	}

	insertSemicolon ( code ) {
		if ( code.original[ this.end - 1 ] !== ';' ) {
			code.appendLeft( this.end, ';' );
		}
	}

	/**
	 * Shortcut to skip checking this node for effects when all children have already
	 * been included.
	 * @param {Scope} parentScope
	 */
	isFullyIncluded () {
		if ( this._fullyIncluded ) {
			return true;
		}
		this._fullyIncluded = this.included && !this.someChild( child => !child.isFullyIncluded() );
	}

	locate () {
		// useful for debugging
		const location = locate( this.module.code, this.start, { offsetLine: 1 } );
		location.file = this.module.id;
		location.toString = () => JSON.stringify( location );

		return location;
	}

	render ( code, es ) {
		this.eachChild( child => child.render( code, es ) );
	}

	/**
	 * Start a new execution path to determine if this node has an effect on the bundle and
	 * should therefore be included. Unless they are fully included, included nodes should
	 * always be included again in subsequent visits as the inclusion of additional variables
	 * may require the inclusion of more child nodes in e.g. block statements.
	 * @return {boolean}
	 */
	shouldBeIncluded () {
		return this.hasEffects( ExecutionPathOptions.create() );
	}

	someChild ( callback ) {
		return this.keys.some( key => {
			const value = this[ key ];
			if ( !value ) { return false; }

			if ( Array.isArray( value ) ) {
				return value.some( child => child && callback( child ) );
			}
			return callback( value );
		} );
	}

	toString () {
		return this.module.code.slice( this.start, this.end );
	}
}

class ArrayPattern extends Node$1 {
	bindAssignment () {
		this.eachChild( child => child.bindAssignment( UNKNOWN_ASSIGNMENT ) );
	}

	hasEffectsWhenAssigned ( options ) {
		return this.someChild( child => child.hasEffectsWhenAssigned( options ) );
	}

	initialiseAndDeclare ( parentScope, kind ) {
		this.initialiseScope( parentScope );
		this.eachChild( child => child.initialiseAndDeclare( parentScope, kind, UNKNOWN_ASSIGNMENT ) );
	}
}

class LocalVariable extends Variable {
	constructor ( name, declarator, init ) {
		super( name );
		this.isReassigned = false;
		this.exportName = null;
		this.declarations = new Set( declarator ? [ declarator ] : null );
		this.assignedExpressions = new Set( init ? [ init ] : null );
		this.calls = new Set();
	}

	addDeclaration ( identifier ) {
		this.declarations.add( identifier );
	}

	addCall ( callOptions ) {
		// To prevent infinite loops
		if ( this.calls.has( callOptions ) ) { return; }
		this.calls.add( callOptions );
		Array.from( this.assignedExpressions ).forEach( expression => expression.bindCall( callOptions ) );
	}

	addReference () {}

	assignExpression ( expression ) {
		this.assignedExpressions.add( expression );
		this.isReassigned = true;
		Array.from( this.calls ).forEach( callOptions => expression.bindCall( callOptions ) );
	}

	getName ( es ) {
		if ( es ) { return this.name; }
		if ( !this.isReassigned || !this.exportName ) { return this.name; }

		return `exports.${this.exportName}`;
	}

	hasEffectsWhenCalled ( options ) {
		return Array.from( this.assignedExpressions ).some( node =>
			!options.hasNodeBeenCalled( node )
			&& node.hasEffectsWhenCalled( options.getHasEffectsWhenCalledOptions( node ) )
		);
	}

	hasEffectsWhenMutated ( options ) {
		return this.included
			|| Array.from( this.assignedExpressions ).some( node =>
				!options.hasNodeBeenMutated( node ) &&
				node.hasEffectsWhenMutated( options.addMutatedNode( node ) )
			);
	}

	includeVariable () {
		const hasBeenIncluded = super.includeVariable();
		if ( hasBeenIncluded ) {
			this.declarations.forEach( identifier => identifier.includeInBundle() );
		}
		return hasBeenIncluded;
	}

	toString () {
		return this.name;
	}
}

class ParameterVariable extends LocalVariable {
	constructor ( name, declarator ) {
		super( name, declarator, UNKNOWN_ASSIGNMENT );
	}

	getName () {
		return this.name;
	}
}

class Scope {
	constructor ( options ) {
	if ( options === void 0 ) options = {};

		this.parent = options.parent;
		this.isModuleScope = !!options.isModuleScope;

		this.children = [];
		if ( this.parent ) { this.parent.children.push( this ); }

		this.variables = blank();
	}

	addDeclaration ( identifier, isHoisted, init ) {
		const name = identifier.name;
		if ( this.variables[ name ] ) {
			const variable = this.variables[ name ];
			variable.addDeclaration( identifier );
			init && variable.assignExpression( init );
		} else {
			this.variables[ name ] = new LocalVariable( identifier.name, identifier, init );
		}
	}

	addParameterDeclaration ( identifier ) {
		const name = identifier.name;
		this.variables[ name ] = new ParameterVariable( name, identifier );
	}

	contains ( name ) {
		return !!this.variables[ name ] ||
			( this.parent ? this.parent.contains( name ) : false );
	}

	deshadow ( names ) {
		keys( this.variables ).forEach( key => {
			const declaration = this.variables[ key ];

			// we can disregard exports.foo etc
			if ( declaration.exportName && declaration.isReassigned ) { return; }

			const name = declaration.getName( true );
			let deshadowed = name;

			let i = 1;

			while ( names.has( deshadowed ) ) {
				deshadowed = `${name}$$${i++}`;
			}

			declaration.name = deshadowed;
		} );

		this.children.forEach( scope => scope.deshadow( names ) );
	}

	findLexicalBoundary () {
		return this.parent.findLexicalBoundary();
	}

	findVariable ( name ) {
		return this.variables[ name ] ||
			( this.parent && this.parent.findVariable( name ) );
	}
}

class ArrowFunctionExpression extends Node$1 {
	// Should receive an implementation once we start tracking parameter values
	bindCall () {}

	hasEffects () {
		return this.included;
	}

	hasEffectsWhenCalled ( options ) {
		return this.params.some( param => param.hasEffects( options ) )
			|| this.body.hasEffects( options );
	}

	hasEffectsWhenMutated () {
		return this.included;
	}

	initialiseChildren () {
		this.params.forEach( param => param.initialiseAndDeclare( this.scope, 'parameter' ) );
		if ( this.body.initialiseAndReplaceScope ) {
			this.body.initialiseAndReplaceScope( new Scope( { parent: this.scope } ) );
		} else {
			this.body.initialise( this.scope );
		}
	}

	initialiseScope ( parentScope ) {
		this.scope = new Scope( { parent: parentScope } );
	}
}

// TODO tidy this up a bit (e.g. they can both use node.module.imports)
function disallowIllegalReassignment ( scope, node ) {
	if ( node.type === 'MemberExpression' && node.object.type === 'Identifier' ) {
		const variable = scope.findVariable( node.object.name );
		if ( variable.isNamespace ) {
			node.module.error({
				code: 'ILLEGAL_NAMESPACE_REASSIGNMENT',
				message: `Illegal reassignment to import '${node.object.name}'`
			}, node.start );
		}
	}

	else if ( node.type === 'Identifier' ) {
		if ( node.module.imports[ node.name ] && !scope.contains( node.name ) ) {
			node.module.error({
				code: 'ILLEGAL_REASSIGNMENT',
				message: `Illegal reassignment to import '${node.name}'`
			}, node.start );
		}
	}
}

class AssignmentExpression extends Node$1 {
	bind () {
		super.bind();
		disallowIllegalReassignment( this.scope, this.left );
		this.left.bindAssignment( this.right );
	}

	hasEffects ( options ) {
		return super.hasEffects( options ) || this.left.hasEffectsWhenAssigned( options );
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}
}

class AssignmentPattern extends Node$1 {
	bind () {
		super.bind();
		this.left.bindAssignment( this.right );
	}

	bindAssignment ( expression ) {
		this.left.bindAssignment( expression );
	}

	hasEffectsWhenAssigned ( options ) {
		return this.left.hasEffectsWhenAssigned( options );
	}

	initialiseAndDeclare ( parentScope, kind, init ) {
		this.initialiseScope( parentScope );
		this.right.initialise( parentScope );
		this.left.initialiseAndDeclare( parentScope, kind, init );
	}
}

class AwaitExpression extends Node$1 {
	hasEffects ( options ) {
		return super.hasEffects( options )
			|| !options.ignoreReturnAwaitYield();
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}
}

const operators = {
	'==': ( left, right ) => left == right,
	'!=': ( left, right ) => left != right,
	'===': ( left, right ) => left === right,
	'!==': ( left, right ) => left !== right,
	'<': ( left, right ) => left < right,
	'<=': ( left, right ) => left <= right,
	'>': ( left, right ) => left > right,
	'>=': ( left, right ) => left >= right,
	'<<': ( left, right ) => left << right,
	'>>': ( left, right ) => left >> right,
	'>>>': ( left, right ) => left >>> right,
	'+': ( left, right ) => left + right,
	'-': ( left, right ) => left - right,
	'*': ( left, right ) => left * right,
	'/': ( left, right ) => left / right,
	'%': ( left, right ) => left % right,
	'|': ( left, right ) => left | right,
	'^': ( left, right ) => left ^ right,
	'&': ( left, right ) => left & right,
	'**': ( left, right ) => Math.pow( left, right ),
	in: ( left, right ) => left in right,
	instanceof: ( left, right ) => left instanceof right
};

class BinaryExpression extends Node$1 {
	getValue () {
		const leftValue = this.left.getValue();
		if ( leftValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		const rightValue = this.right.getValue();
		if ( rightValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		if ( !operators[ this.operator ] ) { return UNKNOWN_VALUE; }

		return operators[ this.operator ]( leftValue, rightValue );
	}
}

class Statement extends Node$1 {
	render ( code, es ) {
		if ( !this.module.bundle.treeshake || this.included ) {
			super.render( code, es );
		} else {
			code.remove( this.leadingCommentStart || this.start, this.next || this.end );
		}
	}
}

class BlockScope extends Scope {
	addDeclaration ( identifier, isHoisted, init ) {
		if ( isHoisted ) {
			this.parent.addDeclaration( identifier, isHoisted, init );
		} else {
			super.addDeclaration( identifier, false, init );
		}
	}
}

class BlockStatement extends Statement {
	bind () {
		this.body.forEach( node => node.bind() );
	}

	hasEffects ( options ) {
		// Empty block statements do not have effects even though they may be included as e.g. function body
		return this.body.some( child => child.hasEffects( options ) );
	}

	includeInBundle () {
		if ( this.isFullyIncluded() ) { return false; }
		let addedNewNodes = false;
		this.body.forEach( node => {
			if ( node.shouldBeIncluded() ) {
				if ( node.includeInBundle() ) {
					addedNewNodes = true;
				}
			}
		} );
		if ( !this.included || addedNewNodes ) {
			this.included = true;
			return true;
		}
		return false;
	}

	initialiseAndReplaceScope ( scope ) {
		this.scope = scope;
		this.initialiseNode();
		this.initialiseChildren( scope );
	}

	initialiseChildren () {
		let lastNode;
		for ( const node of this.body ) {
			node.initialise( this.scope );

			if ( lastNode ) { lastNode.next = node.start; }
			lastNode = node;
		}
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}

	render ( code, es ) {
		if ( this.body.length ) {
			for ( const node of this.body ) {
				node.render( code, es );
			}
		} else {
			Statement.prototype.render.call( this, code, es );
		}
	}
}

class BreakStatement extends Node$1 {
	hasEffects ( options ) {
		return super.hasEffects( options )
			|| !options.ignoreBreakStatements()
			|| (this.label && !options.ignoreLabel( this.label.name ));
	}
}

class CallExpression extends Node$1 {
	bind () {
		if ( this.callee.type === 'Identifier' ) {
			const variable = this.scope.findVariable( this.callee.name );

			if ( variable.isNamespace ) {
				this.module.error( {
					code: 'CANNOT_CALL_NAMESPACE',
					message: `Cannot call a namespace ('${this.callee.name}')`
				}, this.start );
			}

			if ( this.callee.name === 'eval' && variable.isGlobal ) {
				this.module.warn( {
					code: 'EVAL',
					message: `Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification`,
					url: 'https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval'
				}, this.start );
			}
		}

		super.bind();
		this.callee.bindCall( { withNew: false } );
	}

	hasEffects ( options ) {
		return this.included
			|| this.arguments.some( child => child.hasEffects( options ) )
			|| this.callee.hasEffectsWhenCalled( options.getHasEffectsWhenCalledOptions( this.callee ) );
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}
}

class CatchClause extends Node$1 {
	initialiseChildren () {
		this.param && this.param.initialiseAndDeclare( this.scope, 'parameter' );
		this.body.initialiseAndReplaceScope( this.scope );
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}
}

class ClassBody extends Node$1 {
	bindCall ( callOptions ) {
		if ( this.classConstructor ) {
			this.classConstructor.bindCall( callOptions );
		}
	}

	hasEffectsWhenCalled ( options ) {
		if ( this.classConstructor ) {
			return this.classConstructor.hasEffectsWhenCalled( options );
		}
		return false;
	}

	initialiseNode () {
		this.classConstructor = this.body.find( method => method.kind === 'constructor' );
	}
}

class ClassNode extends Node$1 {
	bindCall ( callOptions ) {
		if ( this.superClass ) {
			this.superClass.bindCall( callOptions );
		}
		this.body.bindCall( callOptions );
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}

	hasEffectsWhenCalled ( options ) {
		return this.body.hasEffectsWhenCalled( options )
			|| ( this.superClass && this.superClass.hasEffectsWhenCalled( options ) );
	}

	initialiseChildren () {
		if ( this.superClass ) {
			this.superClass.initialise( this.scope );
		}
		this.body.initialise( this.scope );
	}

	initialiseScope ( parentScope ) {
		this.scope = new Scope( { parent: parentScope } );
	}
}

class ClassDeclaration extends ClassNode {
	initialiseChildren ( parentScope ) {
		// Class declarations are like let declarations: Not hoisted, can be reassigned, cannot be redeclared
		this.id && this.id.initialiseAndDeclare( parentScope, 'class', this );
		super.initialiseChildren( parentScope );
	}

	render ( code, es ) {
		if ( !this.module.bundle.treeshake || this.included ) {
			super.render( code, es );
		} else {
			code.remove( this.leadingCommentStart || this.start, this.next || this.end );
		}
	}
}

class ClassExpression extends ClassNode {
	initialiseChildren ( parentScope ) {
		this.id && this.id.initialiseAndDeclare( this.scope, 'class', this );
		super.initialiseChildren( parentScope );
	}
}

class ConditionalExpression extends Node$1 {
	initialiseChildren ( parentScope ) {
		if ( this.module.bundle.treeshake ) {
			this.testValue = this.test.getValue();

			if ( this.testValue === UNKNOWN_VALUE ) {
				super.initialiseChildren( parentScope );
			} else if ( this.testValue ) {
				this.consequent.initialise( this.scope );
				this.alternate = null;
			} else if ( this.alternate ) {
				this.alternate.initialise( this.scope );
				this.consequent = null;
			}
		} else {
			super.initialiseChildren( parentScope );
		}
	}

	getValue () {
		const testValue = this.test.getValue();
		if ( testValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		return testValue ? this.consequent.getValue() : this.alternate.getValue();
	}

	render ( code, es ) {
		if ( !this.module.bundle.treeshake ) {
			super.render( code, es );
		}

		else {
			if ( this.testValue === UNKNOWN_VALUE ) {
				super.render( code, es );
			}

			else if ( this.testValue ) {
				code.remove( this.start, this.consequent.start );
				code.remove( this.consequent.end, this.end );
				if ( this.consequent.type === 'SequenceExpression' ) {
					code.prependRight( this.consequent.start, '(' );
					code.appendLeft( this.consequent.end, ')' );
				}
				this.consequent.render( code, es );
			} else {
				code.remove( this.start, this.alternate.start );
				code.remove( this.alternate.end, this.end );
				if ( this.alternate.type === 'SequenceExpression' ) {
					code.prependRight( this.alternate.start, '(' );
					code.appendLeft( this.alternate.end, ')' );
				}
				this.alternate.render( code, es );
			}
		}
	}
}

class DoWhileStatement extends Statement {
	hasEffects ( options ) {
		return (
			this.included
			|| this.test.hasEffects( options )
			|| this.body.hasEffects( options.setIgnoreBreakStatements() )
		);
	}
}

class EmptyStatement extends Statement {
	render ( code ) {
		if ( this.parent.type === 'BlockStatement' || this.parent.type === 'Program' ) {
			code.remove( this.start, this.end );
		}
	}
}

class ExportAllDeclaration extends Node$1 {
	initialiseNode () {
		this.isExportDeclaration = true;
	}

	render ( code ) {
		code.remove( this.leadingCommentStart || this.start, this.next || this.end );
	}
}

const functionOrClassDeclaration = /^(?:Function|Class)Declaration/;

class ExportDefaultDeclaration extends Node$1 {
	addCall ( options ) {
		this.declaration.bindCall( options );
	}

	addReference ( reference ) {
		this.name = reference.name;
		if ( this.original ) { this.original.addReference( reference ); }
	}

	bind () {
		const name = ( this.declaration.id && this.declaration.id.name ) || this.declaration.name;
		if ( name ) { this.original = this.scope.findVariable( name ); }

		this.declaration.bind();
	}

	getName ( es ) {
		if ( this.original && !this.original.isReassigned ) {
			return this.original.getName( es );
		}

		return this.name;
	}

	hasEffectsWhenCalled ( options ) {
		return this.declaration.hasEffectsWhenCalled( options );
	}

	includeVariable () {
		if ( this.included ) {
			return false;
		}
		this.included = true;
		this.declaration.includeInBundle();
		return true;
	}

	includeInBundle () {
		if ( this.declaration.shouldBeIncluded() ) {
			return this.declaration.includeInBundle();
		}
		return false;
	}

	initialiseNode () {
		this.isExportDeclaration = true;
		this.isDefault = true;

		this.name = ( this.declaration.id && this.declaration.id.name ) || this.declaration.name || this.module.basename();
		this.scope.variables.default = this;
	}

	// TODO this is total chaos, tidy it up
	render ( code, es ) {
		const treeshake = this.module.bundle.treeshake;
		const name = this.getName( es );

		// paren workaround: find first non-whitespace character position after `export default`
		let declaration_start;
		if ( this.declaration ) {
			const statementStr = code.original.slice( this.start, this.end );
			declaration_start = this.start + statementStr.match( /^\s*export\s+default\s*/ )[ 0 ].length;
		}

		if ( this.included || this.declaration.included ) {
			if ( this.included ) {
				if ( functionOrClassDeclaration.test( this.declaration.type ) ) {
					if ( this.declaration.id ) {
						code.remove( this.start, declaration_start );
					} else {
						code.overwrite( this.start, declaration_start, `var ${this.name} = ` );
						if ( code.original[ this.end - 1 ] !== ';' ) { code.appendLeft( this.end, ';' ); }
					}
				}

				else {
					if ( this.original && this.original.getName( es ) === name ) {
						// prevent `var foo = foo`
						code.remove( this.leadingCommentStart || this.start, this.next || this.end );
						return; // don't render children. TODO this seems like a bit of a hack
					} else {
						code.overwrite( this.start, declaration_start, `${this.module.bundle.varOrConst} ${name} = ` );
					}

					this.insertSemicolon( code );
				}
			} else {
				// remove `var foo` from `var foo = bar()`, if `foo` is unused
				code.remove( this.start, declaration_start );
			}

			super.render( code, es );
		} else {
			if ( treeshake ) {
				if ( functionOrClassDeclaration.test( this.declaration.type ) ) {
					code.remove( this.leadingCommentStart || this.start, this.next || this.end );
				} else {
					const hasEffects = this.declaration.hasEffects( ExecutionPathOptions.create() );
					code.remove( this.start, hasEffects ? declaration_start : this.next || this.end );
				}
			} else if ( name === this.declaration.name ) {
				code.remove( this.start, this.next || this.end );
			} else {
				code.overwrite( this.start, declaration_start, `${this.module.bundle.varOrConst} ${name} = ` );
			}
			// code.remove( this.start, this.next || this.end );
		}
	}
}

class ExportNamedDeclaration extends Node$1 {
	bind () {
		// Do not bind specifiers
		if ( this.declaration ) { this.declaration.bind(); }
	}

	hasEffects ( options ) {
		return this.included || (this.declaration && this.declaration.hasEffects( options ));
	}

	initialiseNode () {
		this.isExportDeclaration = true;
	}

	render ( code, es ) {
		if ( this.declaration ) {
			code.remove( this.start, this.declaration.start );
			this.declaration.render( code, es );
		} else {
			const start = this.leadingCommentStart || this.start;
			const end = this.next || this.end;

			if ( this.defaultExport ) {
				const name = this.defaultExport.getName( es );
				const originalName = this.defaultExport.original.getName( es );

				if ( name !== originalName ) {
					code.overwrite( start, end, `var ${name} = ${originalName};` );
					return;
				}
			}

			code.remove( start, end );
		}
	}
}

class ExpressionStatement extends Statement {
	hasEffects ( options ) {
		return super.hasEffects( options ) || this.expression.hasEffectsAsExpressionStatement(options);
	}

	render ( code, es ) {
		super.render( code, es );
		if ( this.included ) { this.insertSemicolon( code ); }
	}
}

class ForStatement extends Statement {
	hasEffects ( options ) {
		return (
			this.included
			|| this.init && this.init.hasEffects( options )
			|| this.test && this.test.hasEffects( options )
			|| this.update && this.update.hasEffects( options )
			|| this.body.hasEffects( options.setIgnoreBreakStatements() )
		);
	}

	initialiseChildren () {
		if ( this.init ) { this.init.initialise( this.scope ); }
		if ( this.test ) { this.test.initialise( this.scope ); }
		if ( this.update ) { this.update.initialise( this.scope ); }

		if ( this.body.type === 'BlockStatement' ) {
			this.body.initialiseScope( this.scope );
			this.body.initialiseChildren();
		} else {
			this.body.initialise( this.scope );
		}
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}
}

class ForInStatement extends Statement {
	hasEffects ( options ) {
		return (
			this.included
			|| this.left && (this.left.hasEffects( options ) || this.left.hasEffectsWhenAssigned( options ))
			|| this.right && this.right.hasEffects( options )
			|| this.body.hasEffects( options.setIgnoreBreakStatements() )
		);
	}

	initialiseChildren () {
		this.left.initialise( this.scope );
		this.right.initialise( this.scope.parent );
		this.body.initialiseAndReplaceScope ?
			this.body.initialiseAndReplaceScope( this.scope ) :
			this.body.initialise( this.scope );
	}

	includeInBundle () {
		let addedNewNodes = super.includeInBundle();
		if ( this.left.includeWithAllDeclarations() ) {
			addedNewNodes = true;
		}
		return addedNewNodes;
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}
}

class ForOfStatement extends Statement {
	bind () {
		super.bind();
		this.left.bindAssignment( UNKNOWN_ASSIGNMENT );
	}

	hasEffects ( options ) {
		return (
			this.included
			|| this.left && (this.left.hasEffects( options ) || this.left.hasEffectsWhenAssigned( options ))
			|| this.right && this.right.hasEffects( options )
			|| this.body.hasEffects( options.setIgnoreBreakStatements() )
		);
	}

	includeInBundle () {
		let addedNewNodes = super.includeInBundle();
		if ( this.left.includeWithAllDeclarations() ) {
			addedNewNodes = true;
		}
		return addedNewNodes;
	}

	initialiseChildren () {
		this.left.initialise( this.scope );
		this.right.initialise( this.scope.parent );
		this.body.initialiseAndReplaceScope ?
			this.body.initialiseAndReplaceScope( this.scope ) :
			this.body.initialise( this.scope );
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}
}

class FunctionScope extends Scope {
	constructor ( options ) {
		if ( options === void 0 ) options = {};

		super( options );
		this.variables.arguments = new ParameterVariable( 'arguments' );
		this.variables.this = new LocalVariable( 'this', null, null );
	}

	findLexicalBoundary () {
		return this;
	}
}

class FunctionNode extends Node$1 {
	bindCall ( ref ) {
		var withNew = ref.withNew;

		const thisVariable = this.scope.findVariable( 'this' );

		if ( withNew ) {
			thisVariable.assignExpression( UNKNOWN_OBJECT_LITERAL );
		} else {
			thisVariable.assignExpression( UNKNOWN_ASSIGNMENT );
		}
	}

	hasEffects ( options ) {
		return this.included || (this.id && this.id.hasEffects( options ));
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}

	hasEffectsWhenCalled ( options ) {
		const innerOptions = options.setIgnoreSafeThisMutations();
		return this.params.some( param => param.hasEffects( innerOptions ) )
			|| this.body.hasEffects( innerOptions );
	}

	hasEffectsWhenMutated () {
		return this.included;
	}

	initialiseScope ( parentScope ) {
		this.scope = new FunctionScope( { parent: parentScope } );
	}
}

class FunctionDeclaration extends FunctionNode {
	initialiseChildren ( parentScope ) {
		this.id && this.id.initialiseAndDeclare( parentScope, 'function', this );
		this.params.forEach( param => param.initialiseAndDeclare( this.scope, 'parameter' ) );
		this.body.initialiseAndReplaceScope( new Scope( { parent: this.scope } ) );
	}

	render ( code, es ) {
		if ( !this.module.bundle.treeshake || this.included ) {
			super.render( code, es );
		} else {
			code.remove( this.leadingCommentStart || this.start, this.next || this.end );
		}
	}
}

class FunctionExpression extends FunctionNode {
	initialiseChildren () {
		this.id && this.id.initialiseAndDeclare( this.scope, 'function', this );
		this.params.forEach( param => param.initialiseAndDeclare( this.scope, 'parameter' ) );
		this.body.initialiseAndReplaceScope( new Scope( { parent: this.scope } ) );
	}
}

function isReference (node, parent) {
	if (node.type === 'MemberExpression') {
		return !node.computed && isReference(node.object, node);
	}

	if (node.type === 'Identifier') {
		// the only time we could have an identifier node without a parent is
		// if it's the entire body of a function without a block statement –
		// i.e. an arrow function expression like `a => a`
		if (!parent) return true;

		// TODO is this right?
		if (parent.type === 'MemberExpression' || parent.type === 'MethodDefinition') {
			return parent.computed || node === parent.object;
		}

		// disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
		if (parent.type === 'Property') return parent.computed || node === parent.value;

		// disregard the `bar` in `class Foo { bar () {...} }`
		if (parent.type === 'MethodDefinition') return false;

		// disregard the `bar` in `export { foo as bar }`
		if (parent.type === 'ExportSpecifier' && node !== parent.local) return false;

		return true;
	}

	return false;
}

function isAssignmentPatternLhs ( node, parent ) {
	// special case: `({ foo = 42 }) => {...}`
	// `foo` actually has two different parents, the Property of the
	// ObjectPattern, and the AssignmentPattern. In one case it's a
	// reference, in one case it's not, because it's shorthand for
	// `({ foo: foo = 42 }) => {...}`. But unlike a regular shorthand
	// property, the `foo` node appears at different levels of the tree
	return (
		parent.type === 'Property' &&
		parent.shorthand &&
		parent.value.type === 'AssignmentPattern' &&
		parent.value.left === node
	);
}

class Identifier extends Node$1 {
	bind () {
		if ( isReference( this, this.parent ) || isAssignmentPatternLhs( this, this.parent ) ) {
			this.variable = this.scope.findVariable( this.name );
			this.variable.addReference( this );
		}
	}

	bindAssignment ( expression ) {
		if ( this.variable ) {
			this.variable.assignExpression( expression );
		}
	}

	bindCall ( callOptions ) {
		if ( this.variable ) {
			this.variable.addCall( callOptions );
		}
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options ) || this.variable.isGlobal;
	}

	hasEffectsWhenAssigned () {
		return this.variable && this.variable.included;
	}

	hasEffectsWhenCalled ( options ) {
		if ( !this.variable ) {
			return true;
		}
		return this.variable.hasEffectsWhenCalled( options );
	}

	hasEffectsWhenMutated ( options ) {
		return this.variable && this.variable.hasEffectsWhenMutated( options );
	}

	includeInBundle () {
		if ( this.included ) { return false; }
		this.included = true;
		this.variable && this.variable.includeVariable();
		return true;
	}

	initialiseAndDeclare ( parentScope, kind, init ) {
		this.initialiseScope( parentScope );
		switch ( kind ) {
			case 'var':
			case 'function':
				this.scope.addDeclaration( this, true, init );
				break;
			case 'let':
			case 'const':
			case 'class':
				this.scope.addDeclaration( this, false, init );
				break;
			case 'parameter':
				this.scope.addParameterDeclaration( this );
				break;
			default:
				throw new Error( 'Unexpected identifier kind', kind );
		}
	}

	render ( code, es ) {
		if ( this.variable ) {
			const name = this.variable.getName( es );
			if ( name !== this.name ) {
				code.overwrite( this.start, this.end, name, { storeName: true, contentOnly: false } );

				// special case
				if ( this.parent.type === 'Property' && this.parent.shorthand ) {
					code.appendLeft( this.start, `${this.name}: ` );
				}
			}
		}
	}
}

// Statement types which may contain if-statements as direct children.
const statementsWithIfStatements = new Set( [
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'IfStatement',
	'WhileStatement'
] );

function getHoistedVars ( node, scope ) {
	const hoistedVars = [];

	function visit ( node ) {
		if ( node.type === 'VariableDeclaration' && node.kind === 'var' ) {
			node.declarations.forEach( declarator => {
				declarator.init = null;
				declarator.initialise( scope );

				extractNames( declarator.id ).forEach( name => {
					if ( hoistedVars.indexOf( name ) < 0 ) { hoistedVars.push( name ); }
				} );
			} );
		}

		else if ( !/Function/.test( node.type ) ) {
			node.eachChild( visit );
		}
	}

	visit( node );

	return hoistedVars;
}

class IfStatement extends Statement {
	initialiseChildren ( parentScope ) {
		super.initialiseChildren( parentScope );
		if ( this.module.bundle.treeshake ) {
			this.testValue = this.test.getValue();

			if ( this.testValue === UNKNOWN_VALUE ) {
				return;
			}
			if ( this.testValue ) {
				if ( this.alternate ) {
					this.hoistedVars = getHoistedVars( this.alternate, this.scope );
					this.alternate = null;
				}
			} else {
				this.hoistedVars = getHoistedVars( this.consequent, this.scope );
				this.consequent = null;
			}
		}
	}

	render ( code, es ) {
		if ( this.module.bundle.treeshake ) {
			if ( this.testValue === UNKNOWN_VALUE ) {
				super.render( code, es );
			}

			else {
				code.overwrite( this.test.start, this.test.end, JSON.stringify( this.testValue ) );

				// TODO if no block-scoped declarations, remove enclosing
				// curlies and dedent block (if there is a block)

				if ( this.hoistedVars ) {
					const names = this.hoistedVars
						.map( name => {
							const variable = this.scope.findVariable( name );
							return variable.included ? variable.getName() : null;
						} )
						.filter( Boolean );

					if ( names.length > 0 ) {
						code.appendLeft( this.start, `var ${names.join( ', ' )};\n\n` );
					}
				}

				if ( this.testValue ) {
					code.remove( this.start, this.consequent.start );
					code.remove( this.consequent.end, this.end );
					this.consequent.render( code, es );
				}

				else {
					code.remove( this.start, this.alternate ? this.alternate.start : this.next || this.end );

					if ( this.alternate ) {
						this.alternate.render( code, es );
					}

					else if ( statementsWithIfStatements.has( this.parent.type ) ) {
						code.prependRight( this.start, '{}' );
					}
				}
			}
		}

		else {
			super.render( code, es );
		}
	}
}

class ImportDeclaration extends Node$1 {
	bind () {
		// noop
		// TODO do the inter-module binding setup here?
	}

	initialiseNode () {
		this.isImportDeclaration = true;
	}

	render ( code ) {
		code.remove( this.start, this.next || this.end );
	}
}

class LabeledStatement extends Statement {
	hasEffects ( options ) {
		return this.body.hasEffects(
			options
				.setIgnoreLabel( this.label.name )
				.setIgnoreBreakStatements()
		);
	}
}

class Literal extends Node$1 {
	getValue () {
		return this.value;
	}

	hasEffectsWhenMutated () {
		return false;
	}

	render ( code ) {
		if ( typeof this.value === 'string' ) {
			code.indentExclusionRanges.push( [ this.start + 1, this.end - 1 ] );
		}
	}
}

const operators$1 = {
	'&&': ( left, right ) => left && right,
	'||': ( left, right ) => left || right
};

class LogicalExpression extends Node$1 {
	getValue () {
		const leftValue = this.left.getValue();
		if ( leftValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		const rightValue = this.right.getValue();
		if ( rightValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		return operators$1[ this.operator ]( leftValue, rightValue );
	}

	hasEffectsWhenMutated ( options ) {
		const leftValue = this.left.getValue();
		if ( leftValue === UNKNOWN_VALUE ) {
			return this.left.hasEffectsWhenMutated( options ) || this.right.hasEffectsWhenMutated( options );
		}
		if ((leftValue && this.operator === '||') || (!leftValue && this.operator === '&&')) {
			return this.left.hasEffectsWhenMutated( options );
		}
		return this.right.hasEffectsWhenMutated( options );
	}
}

function flatten ( node ) {
	const parts = [];
	while ( node.type === 'MemberExpression' ) {
		if ( node.computed ) { return null; }
		parts.unshift( node.property.name );

		node = node.object;
	}

	if ( node.type !== 'Identifier' ) { return null; }

	const name = node.name;
	parts.unshift( name );

	return { name, keypath: parts.join( '.' ) };
}

const pureFunctions = {};

const arrayTypes = 'Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array'.split( ' ' );
const simdTypes = 'Int8x16 Int16x8 Int32x4 Float32x4 Float64x2'.split( ' ' );
const simdMethods = 'abs add and bool check div equal extractLane fromFloat32x4 fromFloat32x4Bits fromFloat64x2 fromFloat64x2Bits fromInt16x8Bits fromInt32x4 fromInt32x4Bits fromInt8x16Bits greaterThan greaterThanOrEqual lessThan lessThanOrEqual load max maxNum min minNum mul neg not notEqual or reciprocalApproximation reciprocalSqrtApproximation replaceLane select selectBits shiftLeftByScalar shiftRightArithmeticByScalar shiftRightLogicalByScalar shuffle splat sqrt store sub swizzle xor'.split( ' ' );
const allSimdMethods = [];
simdTypes.forEach( t => {
	simdMethods.forEach( m => {
		allSimdMethods.push( `SIMD.${t}.${m}` );
	});
});

[
	'Array.isArray',
	'Error', 'EvalError', 'InternalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
	'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape',
	'Object', 'Object.create', 'Object.getNotifier', 'Object.getOwn', 'Object.getOwnPropertyDescriptor', 'Object.getOwnPropertyNames', 'Object.getOwnPropertySymbols', 'Object.getPrototypeOf', 'Object.is', 'Object.isExtensible', 'Object.isFrozen', 'Object.isSealed', 'Object.keys',
	'Function', 'Boolean',
	'Number', 'Number.isFinite', 'Number.isInteger', 'Number.isNaN', 'Number.isSafeInteger', 'Number.parseFloat', 'Number.parseInt',
	'Symbol', 'Symbol.for', 'Symbol.keyFor',
	'Math.abs', 'Math.acos', 'Math.acosh', 'Math.asin', 'Math.asinh', 'Math.atan', 'Math.atan2', 'Math.atanh', 'Math.cbrt', 'Math.ceil', 'Math.clz32', 'Math.cos', 'Math.cosh', 'Math.exp', 'Math.expm1', 'Math.floor', 'Math.fround', 'Math.hypot', 'Math.imul', 'Math.log', 'Math.log10', 'Math.log1p', 'Math.log2', 'Math.max', 'Math.min', 'Math.pow', 'Math.random', 'Math.round', 'Math.sign', 'Math.sin', 'Math.sinh', 'Math.sqrt', 'Math.tan', 'Math.tanh', 'Math.trunc',
	'Date', 'Date.UTC', 'Date.now', 'Date.parse',
	'String', 'String.fromCharCode', 'String.fromCodePoint', 'String.raw',
	'RegExp',
	'Map', 'Set', 'WeakMap', 'WeakSet',
	'ArrayBuffer', 'ArrayBuffer.isView',
	'DataView',
	'JSON.parse', 'JSON.stringify',
	'Promise.all', 'Promise.race', 'Promise.resolve',
	'Intl.Collator', 'Intl.Collator.supportedLocalesOf', 'Intl.DateTimeFormat', 'Intl.DateTimeFormat.supportedLocalesOf', 'Intl.NumberFormat', 'Intl.NumberFormat.supportedLocalesOf'

	// TODO properties of e.g. window...
].concat(
	arrayTypes,
	arrayTypes.map( t => `${t}.from` ),
	arrayTypes.map( t => `${t}.of` ),
	simdTypes.map( t => `SIMD.${t}` ),
	allSimdMethods
).forEach( name => pureFunctions[ name ] = true );

const validProp = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

class Keypath {
	constructor ( node ) {
		this.parts = [];

		while ( node.type === 'MemberExpression' ) {
			const prop = node.property;

			if ( node.computed ) {
				if ( prop.type !== 'Literal' || typeof prop.value !== 'string' || !validProp.test( prop.value ) ) {
					this.computed = true;
					return;
				}
			}

			this.parts.unshift( prop );
			node = node.object;
		}

		this.root = node;
	}
}

class MemberExpression extends Node$1 {
	bind () {
		// if this resolves to a namespaced declaration, prepare
		// to replace it
		// TODO this code is a bit inefficient
		const keypath = new Keypath( this );

		if ( !keypath.computed && keypath.root.type === 'Identifier' ) {
			let variable = this.scope.findVariable( keypath.root.name );

			while ( variable.isNamespace && keypath.parts.length ) {
				const exporterId = variable.module.id;

				const part = keypath.parts[ 0 ];
				variable = variable.module.traceExport( part.name || part.value );

				if ( !variable ) {
					this.module.warn( {
						code: 'MISSING_EXPORT',
						missing: part.name || part.value,
						importer: relativeId( this.module.id ),
						exporter: relativeId( exporterId ),
						message: `'${part.name || part.value}' is not exported by '${relativeId( exporterId )}'`,
						url: `https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module`
					}, part.start );
					this.replacement = 'undefined';
					return;
				}

				keypath.parts.shift();
			}

			if ( keypath.parts.length ) {
				super.bind();
				return; // not a namespaced declaration
			}

			this.variable = variable;

			if ( variable.isExternal ) {
				variable.module.suggestName( keypath.root.name );
			}
		}

		else {
			super.bind();
		}
	}

	bindCall ( callOptions ) {
		if ( this.variable ) {
			this.variable.addCall( callOptions );
		}
	}

	hasEffectsWhenAssigned ( options ) {
		return this.object.hasEffectsWhenMutated( options );
	}

	includeInBundle () {
		let addedNewNodes = super.includeInBundle();
		if ( this.variable && !this.variable.included ) {
			this.variable.includeVariable();
			addedNewNodes = true;
		}
		return addedNewNodes;
	}

	hasEffectsWhenCalled ( options ) {
		if ( this.variable ) {
			return this.variable.hasEffectsWhenCalled( options );
		}
		if ( !isReference( this ) ) {
			return true;
		}
		const flattenedNode = flatten( this );
		return !(this.scope.findVariable( flattenedNode.name ).isGlobal && pureFunctions[ flattenedNode.keypath ]);
	}

	render ( code, es ) {
		if ( this.variable ) {
			const name = this.variable.getName( es );
			if ( name !== this.name ) { code.overwrite( this.start, this.end, name, { storeName: true, contentOnly: false } ); }
		}

		else if ( this.replacement ) {
			code.overwrite( this.start, this.end, this.replacement, { storeName: true, contentOnly: false } );
		}

		super.render( code, es );
	}
}

class MethodDefinition extends Node$1 {
	bindCall ( callOptions ) {
		this.value.bindCall( callOptions );
	}

	hasEffects ( options ) {
		return this.key.hasEffects( options );
	}

	hasEffectsWhenCalled ( options ) {
		return this.value.hasEffectsWhenCalled( options );
	}
}

class NewExpression extends Node$1 {
	bind () {
		super.bind();
		this.callee.bindCall( { withNew: true } );
	}

	hasEffects ( options ) {
		return this.included
			|| this.arguments.some( child => child.hasEffects( options ) )
			|| this.callee.hasEffectsWhenCalled( options.getHasEffectsWhenCalledOptions( this.callee ) );
	}
}

class ObjectExpression extends Node$1 {
	hasEffectsWhenMutated () {
		return false;
	}
}

class ObjectPattern extends Node$1 {
	bindAssignment ( expression ) {
		this.properties.forEach( child => child.bindAssignment( expression ) );
	}

	hasEffectsWhenAssigned ( options ) {
		return this.someChild( child => child.hasEffectsWhenAssigned( options ) );
	}

	initialiseAndDeclare ( parentScope, kind, init ) {
		this.initialiseScope( parentScope );
		this.properties.forEach( child => child.initialiseAndDeclare( parentScope, kind, init ) );
	}
}

class Property extends Node$1 {
	bindAssignment () {
		this.value.bindAssignment( UNKNOWN_ASSIGNMENT );
	}

	hasEffectsWhenAssigned ( options ) {
		return this.value.hasEffectsWhenAssigned( options );
	}

	initialiseAndDeclare ( parentScope, kind, init ) {
		this.initialiseScope( parentScope );
		this.key.initialise( parentScope );
		this.value.initialiseAndDeclare( parentScope, kind, init && UNKNOWN_ASSIGNMENT );
	}

	render ( code, es ) {
		if ( !this.shorthand ) {
			this.key.render( code, es );
		}
		this.value.render( code, es );
	}
}

class RestElement extends Node$1 {
	bindAssignment () {
		this.argument.bindAssignment( UNKNOWN_ASSIGNMENT );
	}

	hasEffectsWhenAssigned ( options ) {
		return this.argument.hasEffectsWhenAssigned( options );
	}

	initialiseAndDeclare ( parentScope, kind ) {
		this.initialiseScope( parentScope );
		this.argument.initialiseAndDeclare( parentScope, kind, UNKNOWN_ASSIGNMENT );
	}
}

class ReturnStatement extends Statement {
	hasEffects ( options ) {
		return super.hasEffects( options )
			|| !options.ignoreReturnAwaitYield();
	}
}

class SwitchCase extends Node$1 {
	includeInBundle () {
		if ( this.isFullyIncluded() ) { return false; }
		let addedNewNodes = false;
		if (this.test && this.test.includeInBundle()) {
			addedNewNodes = true;
		}
		this.consequent.forEach( node => {
			if ( node.shouldBeIncluded() ) {
				if ( node.includeInBundle() ) {
					addedNewNodes = true;
				}
			}
		} );
		if ( !this.included || addedNewNodes ) {
			this.included = true;
			return true;
		}
		return false;
	}
}

class SwitchStatement extends Statement {
	hasEffects ( options ) {
		return super.hasEffects( options.setIgnoreBreakStatements() );
	}

	initialiseScope ( parentScope ) {
		this.scope = new BlockScope( { parent: parentScope } );
	}
}

class TaggedTemplateExpression extends Node$1 {
	bind () {
		if ( this.tag.type === 'Identifier' ) {
			const variable = this.scope.findVariable( this.tag.name );

			if ( variable.isNamespace ) {
				this.module.error( {
					code: 'CANNOT_CALL_NAMESPACE',
					message: `Cannot call a namespace ('${this.tag.name}')`
				}, this.start );
			}

			if ( this.tag.name === 'eval' && variable.isGlobal ) {
				this.module.warn( {
					code: 'EVAL',
					message: `Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification`,
					url: 'https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval'
				}, this.start );
			}
		}

		super.bind();
		this.tag.bindCall( { withNew: false } );
	}

	hasEffects ( options ) {
		return super.hasEffects( options )
			|| this.tag.hasEffectsWhenCalled( options.getHasEffectsWhenCalledOptions( this.tag ) );
	}
}

class TemplateElement extends Node$1 {
	hasEffects() {
		return false;
	}
}

class TemplateLiteral extends Node$1 {
	render ( code, es ) {
		code.indentExclusionRanges.push( [ this.start, this.end ] );
		super.render( code, es );
	}
}

class ThisExpression extends Node$1 {
	initialiseNode () {
		const lexicalBoundary = this.scope.findLexicalBoundary();

		if ( lexicalBoundary.isModuleScope ) {
			this.alias = this.module.context;
			if ( this.alias === 'undefined' ) {
				this.module.warn( {
					code: 'THIS_IS_UNDEFINED',
					message: `The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten`,
					url: `https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined`
				}, this.start );
			}
		}
	}

	bind () {
		this.variable = this.scope.findVariable( 'this' );
	}

	hasEffectsWhenMutated ( options ) {
		return !options.ignoreSafeThisMutations() || this.variable.hasEffectsWhenMutated( options );
	}

	render ( code ) {
		if ( this.alias ) {
			code.overwrite( this.start, this.end, this.alias, { storeName: true, contentOnly: false } );
		}
	}
}

class ThrowStatement extends Node$1 {
	hasEffects () {
		return true;
	}
}

const operators$2 = {
	'-': value => -value,
	'+': value => +value,
	'!': value => !value,
	'~': value => ~value,
	typeof: value => typeof value,
	void: () => undefined,
	delete: () => UNKNOWN_VALUE
};

class UnaryExpression extends Node$1 {
	bind () {
		if ( this.value === UNKNOWN_VALUE ) { super.bind(); }
	}

	getValue () {
		const argumentValue = this.argument.getValue();
		if ( argumentValue === UNKNOWN_VALUE ) { return UNKNOWN_VALUE; }

		return operators$2[ this.operator ]( argumentValue );
	}

	hasEffects ( options ) {
		return this.included
			|| this.argument.hasEffects( options )
			|| (this.operator === 'delete' && (
				this.argument.type !== 'MemberExpression'
				|| this.argument.object.hasEffectsWhenMutated( options )
			));
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}

	initialiseNode () {
		this.value = this.getValue();
	}
}

class UpdateExpression extends Node$1 {
	bind () {
		disallowIllegalReassignment( this.scope, this.argument );
		if ( this.argument.type === 'Identifier' ) {
			const variable = this.scope.findVariable( this.argument.name );
			variable.isReassigned = true;
		}
		super.bind();
	}

	hasEffects ( options ) {
		return this.included || this.argument.hasEffectsWhenAssigned( options );
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}
}

class VariableDeclarator extends Node$1 {
	bindAssignment ( expression ) {
		this.id.bindAssignment( expression );
	}

	initialiseDeclarator ( parentScope, kind ) {
		this.initialiseScope( parentScope );
		this.init && this.init.initialise( this.scope );
		this.id.initialiseAndDeclare( this.scope, kind, this.init );
	}

	// TODO Deleting this does not break any tests. Find meaningful test or delete.
	render ( code, es ) {
		extractNames( this.id ).forEach( name => {
			const variable = this.scope.findVariable( name );

			if ( !es && variable.exportName && variable.isReassigned ) {
				if ( this.init ) {
					code.overwrite( this.start, this.id.end, variable.getName( es ) );
				} else if ( this.module.bundle.treeshake ) {
					code.remove( this.start, this.end );
				}
			}
		} );

		super.render( code, es );
	}
}

function getSeparator ( code, start ) {
	let c = start;

	while ( c > 0 && code[ c - 1 ] !== '\n' ) {
		c -= 1;
		if ( code[ c ] === ';' || code[ c ] === '{' ) { return '; '; }
	}

	const lineStart = code.slice( c, start ).match( /^\s*/ )[ 0 ];

	return `;\n${lineStart}`;
}

const forStatement = /^For(?:Of|In)?Statement/;

class VariableDeclaration extends Node$1 {
	bindAssignment () {
		this.eachChild( child => child.bindAssignment( UNKNOWN_ASSIGNMENT ) );
	}

	hasEffectsWhenAssigned () {
		return false;
	}

	includeWithAllDeclarations () {
		if ( this.isFullyIncluded() ) { return false; }
		let addedNewNodes = false;
		this.declarations.forEach( declarator => {
			if ( declarator.includeInBundle() ) {
				addedNewNodes = true;
			}
		} );
		if ( !this.included || addedNewNodes ) {
			this.included = true;
			return true;
		}
		return false;
	}

	includeInBundle () {
		if ( this.isFullyIncluded() ) { return false; }
		let addedNewNodes = false;
		this.declarations.forEach( declarator => {
			if ( declarator.shouldBeIncluded() ) {
				if ( declarator.includeInBundle() ) {
					addedNewNodes = true;
				}
			}
		} );
		if ( !this.included || addedNewNodes ) {
			this.included = true;
			return true;
		}
		return false;
	}

	initialiseChildren () {
		this.declarations.forEach( child => child.initialiseDeclarator( this.scope, this.kind ) );
	}

	render ( code, es ) {
		const treeshake = this.module.bundle.treeshake;

		let shouldSeparate = false;
		let separator;

		if ( this.scope.isModuleScope && !forStatement.test( this.parent.type ) ) {
			shouldSeparate = true;
			separator = getSeparator( this.module.code, this.start );
		}

		let c = this.start;
		let empty = true;

		for ( let i = 0; i < this.declarations.length; i += 1 ) {
			const declarator = this.declarations[ i ];

			const prefix = empty ? '' : separator; // TODO indentation

			if ( declarator.id.type === 'Identifier' ) {
				const variable = this.scope.findVariable( declarator.id.name );
				const isExportedAndReassigned = !es && variable.exportName && variable.isReassigned;

				if ( isExportedAndReassigned ) {
					if ( declarator.init ) {
						if ( shouldSeparate ) { code.overwrite( c, declarator.start, prefix ); }
						c = declarator.end;
						empty = false;
					}
				} else if ( !treeshake || variable.included ) {
					if ( shouldSeparate ) { code.overwrite( c, declarator.start, `${prefix}${this.kind} ` ); } // TODO indentation
					c = declarator.end;
					empty = false;
				}
			} else {
				const exportAssignments = [];
				let isIncluded = false;

				extractNames( declarator.id ).forEach( name => {
					const variable = this.scope.findVariable( name );
					const isExportedAndReassigned = !es && variable.exportName && variable.isReassigned;

					if ( isExportedAndReassigned ) {
						// code.overwrite( c, declarator.start, prefix );
						// c = declarator.end;
						// empty = false;
						exportAssignments.push( 'TODO' );
					} else if ( declarator.included ) {
						isIncluded = true;
					}
				} );

				if ( !treeshake || isIncluded ) {
					if ( shouldSeparate ) { code.overwrite( c, declarator.start, `${prefix}${this.kind} ` ); } // TODO indentation
					c = declarator.end;
					empty = false;
				}

				if ( exportAssignments.length ) {
					throw new Error( 'TODO' );
				}
			}

			declarator.render( code, es );
		}

		if ( treeshake && empty ) {
			code.remove( this.leadingCommentStart || this.start, this.next || this.end );
		} else {
			// always include a semi-colon (https://github.com/rollup/rollup/pull/1013),
			// unless it's a var declaration in a loop head
			const needsSemicolon = !forStatement.test( this.parent.type ) || this === this.parent.body;

			if ( this.end > c ) {
				code.overwrite( c, this.end, needsSemicolon ? ';' : '' );
			} else if ( needsSemicolon ) {
				this.insertSemicolon( code );
			}
		}
	}
}

class WhileStatement extends Statement {
	hasEffects ( options ) {
		return (
			this.included
			|| this.test.hasEffects( options )
			|| this.body.hasEffects( options.setIgnoreBreakStatements() )
		);
	}
}

class YieldExpression extends Node$1 {
	hasEffects ( options ) {
		return super.hasEffects( options )
			|| !options.ignoreReturnAwaitYield();
	}

	hasEffectsAsExpressionStatement ( options ) {
		return this.hasEffects( options );
	}
}

var nodes = {
	ArrayExpression: Node$1,
	ArrayPattern,
	ArrowFunctionExpression,
	AssignmentExpression,
	AssignmentPattern,
	AwaitExpression,
	BinaryExpression,
	BlockStatement,
	BreakStatement,
	CallExpression,
	CatchClause,
	ClassBody,
	ClassDeclaration,
	ClassExpression,
	ConditionalExpression,
	DoWhileStatement,
	EmptyStatement,
	ExportAllDeclaration,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	ExpressionStatement,
	ForStatement,
	ForInStatement,
	ForOfStatement,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	IfStatement,
	ImportDeclaration,
	LabeledStatement,
	Literal,
	LogicalExpression,
	MemberExpression,
	MethodDefinition,
	NewExpression,
	ObjectExpression,
	ObjectPattern,
	Property,
	RestElement,
	ReturnStatement,
	SwitchCase,
	SwitchStatement,
	TaggedTemplateExpression,
	TemplateElement,
	TemplateLiteral,
	ThisExpression,
	ThrowStatement,
	TryStatement: Statement,
	UnaryExpression,
	UpdateExpression,
	VariableDeclarator,
	VariableDeclaration,
	WhileStatement,
	YieldExpression
};

class UnknownNode extends Node$1 {
	hasEffects () {
		return true;
	}
}

var keys$1 = {
	Program: [ 'body' ],
	Literal: []
};

const newline = /\n/;

function enhance ( ast, module, comments ) {
	enhanceNode( ast, module, module, module.magicString );

	let comment = comments.shift();

	for ( const node of ast.body ) {
		if ( comment && ( comment.start < node.start ) ) {
			node.leadingCommentStart = comment.start;
		}

		while ( comment && comment.end < node.end ) { comment = comments.shift(); }

		// if the next comment is on the same line as the end of the node,
		// treat is as a trailing comment
		if ( comment && !newline.test( module.code.slice( node.end, comment.start ) ) ) {
			node.trailingCommentEnd = comment.end; // TODO is node.trailingCommentEnd used anywhere?
			comment = comments.shift();
		}

		node.initialise( module.scope );
	}
}

function enhanceNode ( raw, parent, module, code ) {
	if ( !raw ) { return; }

	if ( 'length' in raw ) {
		for ( let i = 0; i < raw.length; i += 1 ) {
			enhanceNode( raw[i], parent, module, code );
		}

		return;
	}

	// with e.g. shorthand properties, key and value are
	// the same node. We don't want to enhance an object twice
	if ( raw.__enhanced ) { return; }
	raw.__enhanced = true;

	if ( !keys$1[ raw.type ] ) {
		keys$1[ raw.type ] = Object.keys( raw ).filter( key => typeof raw[ key ] === 'object' );
	}

	raw.parent = parent;
	raw.module = module;
	raw.keys = keys$1[ raw.type ];

	code.addSourcemapLocation( raw.start );
	code.addSourcemapLocation( raw.end );

	for ( const key of keys$1[ raw.type ] ) {
		enhanceNode( raw[ key ], raw, module, code );
	}

	const type = nodes[ raw.type ] || UnknownNode;
	raw.__proto__ = type.prototype;
}

function clone ( node ) {
	if ( !node ) { return node; }
	if ( typeof node !== 'object' ) { return node; }

	if ( Array.isArray( node ) ) {
		const cloned = new Array( node.length );
		for ( let i = 0; i < node.length; i += 1 ) { cloned[i] = clone( node[i] ); }
		return cloned;
	}

	const cloned = {};
	for ( const key in node ) {
		cloned[ key ] = clone( node[ key ] );
	}

	return cloned;
}

class ModuleScope extends Scope {
	constructor ( module ) {
		super( {
			isModuleScope: true,
			parent: module.bundle.scope
		} );

		this.module = module;
		this.variables.this = new LocalVariable( 'this', null, UNDEFINED_ASSIGNMENT );
	}

	deshadow ( names ) {
		names = new Set( names );

		forOwn( this.module.imports, specifier => {
			if ( specifier.module.isExternal ) { return; }

			const addDeclaration = declaration => {
				if ( declaration.isNamespace && !declaration.isExternal ) {
					declaration.module.getExports().forEach( name => {
						addDeclaration( declaration.module.traceExport( name ) );
					} );
				}

				names.add( declaration.name );
			};

			specifier.module.getExports().forEach( name => {
				addDeclaration( specifier.module.traceExport( name ) );
			} );

			if ( specifier.name !== '*' ) {
				const declaration = specifier.module.traceExport( specifier.name );
				if ( !declaration ) {
					this.module.warn( {
						code: 'NON_EXISTENT_EXPORT',
						name: specifier.name,
						source: specifier.module.id,
						message: `Non-existent export '${specifier.name}' is imported from ${relativeId( specifier.module.id )}`
					}, specifier.specifier.start );
					return;
				}

				const name = declaration.getName( true );
				if ( name !== specifier.name ) {
					names.add( declaration.getName( true ) );
				}

				if ( specifier.name !== 'default' && specifier.specifier.imported.name !== specifier.specifier.local.name ) {
					names.add( specifier.specifier.imported.name );
				}
			}
		} );

		super.deshadow( names );
	}

	findLexicalBoundary () {
		return this;
	}

	findVariable ( name ) {
		if ( this.variables[ name ] ) {
			return this.variables[ name ];
		}

		return this.module.trace( name ) || this.parent.findVariable( name );
	}
}

function tryParse ( module, acornOptions ) {
	try {
		return parse( module.code, assign( {
			ecmaVersion: 8,
			sourceType: 'module',
			onComment: ( block, text, start, end ) => module.comments.push( { block, text, start, end } ),
			preserveParens: false
		}, acornOptions ) );
	} catch ( err ) {
		module.error( {
			code: 'PARSE_ERROR',
			message: err.message.replace( / \(\d+:\d+\)$/, '' )
		}, err.pos );
	}
}

function includeFully ( node ) {
	node.includeInBundle();
	node.eachChild( includeFully );
}

class Module {
	constructor ( ref ) {
	var id = ref.id;
	var code = ref.code;
	var originalCode = ref.originalCode;
	var originalSourcemap = ref.originalSourcemap;
	var ast = ref.ast;
	var sourcemapChain = ref.sourcemapChain;
	var resolvedIds = ref.resolvedIds;
	var resolvedExternalIds = ref.resolvedExternalIds;
	var bundle = ref.bundle;

		this.code = code;
		this.id = id;
		this.bundle = bundle;
		this.originalCode = originalCode;
		this.originalSourcemap = originalSourcemap;
		this.sourcemapChain = sourcemapChain;

		this.comments = [];

		timeStart( 'ast' );

		if ( ast ) {
			// prevent mutating the provided AST, as it may be reused on
			// subsequent incremental rebuilds
			this.ast = clone( ast );
			this.astClone = ast;
		} else {
			this.ast = tryParse( this, bundle.acornOptions ); // TODO what happens to comments if AST is provided?
			this.astClone = clone( this.ast );
		}

		timeEnd( 'ast' );

		this.excludeFromSourcemap = /\0/.test( id );
		this.context = bundle.getModuleContext( id );

		// all dependencies
		this.sources = [];
		this.dependencies = [];
		this.resolvedIds = resolvedIds || blank();
		this.resolvedExternalIds = resolvedExternalIds || blank();

		// imports and exports, indexed by local name
		this.imports = blank();
		this.exports = blank();
		this.exportsAll = blank();
		this.reexports = blank();

		this.exportAllSources = [];
		this.exportAllModules = null;

		// By default, `id` is the filename. Custom resolvers and loaders
		// can change that, but it makes sense to use it for the source filename
		this.magicString = new MagicString$1( code, {
			filename: this.excludeFromSourcemap ? null : id, // don't include plugin helpers in sourcemap
			indentExclusionRanges: []
		} );

		// remove existing sourceMappingURL comments
		this.comments = this.comments.filter( comment => {
			//only one line comment can contain source maps
			const isSourceMapComment = !comment.block && SOURCEMAPPING_URL_RE.test( comment.text );
			if ( isSourceMapComment ) {
				this.magicString.remove( comment.start, comment.end );
			}
			return !isSourceMapComment;
		} );

		this.declarations = blank();
		this.type = 'Module'; // TODO only necessary so that Scope knows this should be treated as a function scope... messy
		this.scope = new ModuleScope( this );

		timeStart( 'analyse' );

		this.analyse();

		timeEnd( 'analyse' );

		this.strongDependencies = [];
	}

	addExport ( node ) {
		const source = node.source && node.source.value;

		// export { name } from './other.js'
		if ( source ) {
			if ( !~this.sources.indexOf( source ) ) { this.sources.push( source ); }

			if ( node.type === 'ExportAllDeclaration' ) {
				// Store `export * from '...'` statements in an array of delegates.
				// When an unknown import is encountered, we see if one of them can satisfy it.
				this.exportAllSources.push( source );
			}

			else {
				node.specifiers.forEach( specifier => {
					const name = specifier.exported.name;

					if ( this.exports[ name ] || this.reexports[ name ] ) {
						this.error( {
							code: 'DUPLICATE_EXPORT',
							message: `A module cannot have multiple exports with the same name ('${name}')`
						}, specifier.start );
					}

					this.reexports[ name ] = {
						start: specifier.start,
						source,
						localName: specifier.local.name,
						module: null // filled in later
					};
				} );
			}
		}

		// export default function foo () {}
		// export default foo;
		// export default 42;
		else if ( node.type === 'ExportDefaultDeclaration' ) {
			const identifier = ( node.declaration.id && node.declaration.id.name ) || node.declaration.name;

			if ( this.exports.default ) {
				this.error( {
					code: 'DUPLICATE_EXPORT',
					message: `A module can only have one default export`
				}, node.start );
			}

			this.exports.default = {
				localName: 'default',
				identifier
			};
		}

		// export var { foo, bar } = ...
		// export var foo = 42;
		// export var a = 1, b = 2, c = 3;
		// export function foo () {}
		else if ( node.declaration ) {
			const declaration = node.declaration;

			if ( declaration.type === 'VariableDeclaration' ) {
				declaration.declarations.forEach( decl => {
					extractNames( decl.id ).forEach( localName => {
						this.exports[ localName ] = { localName };
					} );
				} );
			} else {
				// export function foo () {}
				const localName = declaration.id.name;
				this.exports[ localName ] = { localName };
			}
		}

		// export { foo, bar, baz }
		else {
			node.specifiers.forEach( specifier => {
				const localName = specifier.local.name;
				const exportedName = specifier.exported.name;

				if ( this.exports[ exportedName ] || this.reexports[ exportedName ] ) {
					this.error( {
						code: 'DUPLICATE_EXPORT',
						message: `A module cannot have multiple exports with the same name ('${exportedName}')`
					}, specifier.start );
				}

				this.exports[ exportedName ] = { localName };
			} );
		}
	}

	addImport ( node ) {
		const source = node.source.value;

		if ( !~this.sources.indexOf( source ) ) { this.sources.push( source ); }

		node.specifiers.forEach( specifier => {
			const localName = specifier.local.name;

			if ( this.imports[ localName ] ) {
				this.error( {
					code: 'DUPLICATE_IMPORT',
					message: `Duplicated import '${localName}'`
				}, specifier.start );
			}

			const isDefault = specifier.type === 'ImportDefaultSpecifier';
			const isNamespace = specifier.type === 'ImportNamespaceSpecifier';

			const name = isDefault ? 'default' : isNamespace ? '*' : specifier.imported.name;
			this.imports[ localName ] = { source, specifier, name, module: null };
		} );
	}

	analyse () {
		enhance( this.ast, this, this.comments );

		// discover this module's imports and exports
		let lastNode;

		for ( const node of this.ast.body ) {
			if ( node.isImportDeclaration ) {
				this.addImport( node );
			} else if ( node.isExportDeclaration ) {
				this.addExport( node );
			}

			if ( lastNode ) { lastNode.next = node.leadingCommentStart || node.start; }
			lastNode = node;
		}
	}

	basename () {
		const base = basename( this.id );
		const ext = extname( this.id );

		return makeLegal( ext ? base.slice( 0, -ext.length ) : base );
	}

	bindImportSpecifiers () {
		[ this.imports, this.reexports ].forEach( specifiers => {
			keys( specifiers ).forEach( name => {
				const specifier = specifiers[ name ];

				const id = this.resolvedIds[ specifier.source ] || this.resolvedExternalIds[ specifier.source ];
				specifier.module = this.bundle.moduleById.get( id );
			} );
		} );

		this.exportAllModules = this.exportAllSources.map( source => {
			const id = this.resolvedIds[ source ] || this.resolvedExternalIds[ source ];
			return this.bundle.moduleById.get( id );
		} );

		this.sources.forEach( source => {
			const id = this.resolvedIds[ source ];

			if ( id ) {
				const module = this.bundle.moduleById.get( id );
				this.dependencies.push( module );
			}
		} );
	}

	bindReferences () {
		for ( const node of this.ast.body ) {
			node.bind();
		}

		// if ( this.declarations.default ) {
		// 	if ( this.exports.default.identifier ) {
		// 		const declaration = this.trace( this.exports.default.identifier );
		// 		if ( declaration ) this.declarations.default.bind( declaration );
		// 	}
		// }
	}

	error ( props, pos ) {
		if ( pos !== undefined ) {
			props.pos = pos;

			var ref = locate( this.code, pos, { offsetLine: 1 } );
			var line = ref.line;
			var column = ref.column; // TODO trace sourcemaps

			props.loc = { file: this.id, line, column };
			props.frame = getCodeFrame( this.code, line, column );
		}

		error( props );
	}

	getExports () {
		return keys( this.exports );
	}

	getReexports () {
		const reexports = blank();

		keys( this.reexports ).forEach( name => {
			reexports[ name ] = true;
		} );

		this.exportAllModules.forEach( module => {
			if ( module.isExternal ) {
				reexports[ `*${module.id}` ] = true;
				return;
			}

			module.getExports().concat( module.getReexports() ).forEach( name => {
				if ( name !== 'default' ) { reexports[ name ] = true; }
			} );
		} );

		return keys( reexports );
	}

	includeAllInBundle () {
		this.ast.body.forEach( includeFully );
	}

	includeInBundle () {
		let addedNewNodes = false;
		this.ast.body.forEach( node => {
			if ( node.shouldBeIncluded() ) {
				if ( node.includeInBundle() ) {
					addedNewNodes = true;
				}
			}
		} );
		return addedNewNodes;
	}

	namespace () {
		if ( !this.declarations[ '*' ] ) {
			this.declarations[ '*' ] = new NamespaceVariable( this );
		}

		return this.declarations[ '*' ];
	}

	render ( es, legacy ) {
		const magicString = this.magicString.clone();

		for ( const node of this.ast.body ) {
			node.render( magicString, es );
		}

		if ( this.namespace().needsNamespaceBlock ) {
			magicString.append( '\n\n' + this.namespace().renderBlock( es, legacy, '\t' ) ); // TODO use correct indentation
		}

		return magicString.trim();
	}

	toJSON () {
		return {
			id: this.id,
			dependencies: this.dependencies.map( module => module.id ),
			code: this.code,
			originalCode: this.originalCode,
			originalSourcemap: this.originalSourcemap,
			ast: this.astClone,
			sourcemapChain: this.sourcemapChain,
			resolvedIds: this.resolvedIds,
			resolvedExternalIds: this.resolvedExternalIds
		};
	}

	trace ( name ) {
		// TODO this is slightly circular
		if ( name in this.scope.variables ) {
			return this.scope.variables[ name ];
		}

		if ( name in this.imports ) {
			const importDeclaration = this.imports[ name ];
			const otherModule = importDeclaration.module;

			if ( importDeclaration.name === '*' && !otherModule.isExternal ) {
				return otherModule.namespace();
			}

			const declaration = otherModule.traceExport( importDeclaration.name );

			if ( !declaration ) {
				this.error( {
					code: 'MISSING_EXPORT',
					message: `'${importDeclaration.name}' is not exported by ${relativeId( otherModule.id )}`,
					url: `https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module`
				}, importDeclaration.specifier.start );
			}

			return declaration;
		}

		return null;
	}

	traceExport ( name ) {
		// export * from 'external'
		if ( name[ 0 ] === '*' ) {
			const module = this.bundle.moduleById.get( name.slice( 1 ) );
			return module.traceExport( '*' );
		}

		// export { foo } from './other.js'
		const reexportDeclaration = this.reexports[ name ];
		if ( reexportDeclaration ) {
			const declaration = reexportDeclaration.module.traceExport( reexportDeclaration.localName );

			if ( !declaration ) {
				this.error( {
					code: 'MISSING_EXPORT',
					message: `'${reexportDeclaration.localName}' is not exported by ${relativeId( reexportDeclaration.module.id )}`,
					url: `https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module`
				}, reexportDeclaration.start );
			}

			return declaration;
		}

		const exportDeclaration = this.exports[ name ];
		if ( exportDeclaration ) {
			const name = exportDeclaration.localName;
			const declaration = this.trace( name );

			return declaration || this.bundle.scope.findVariable( name );
		}

		if ( name === 'default' ) { return; }

		for ( let i = 0; i < this.exportAllModules.length; i += 1 ) {
			const module = this.exportAllModules[ i ];
			const declaration = module.traceExport( name );

			if ( declaration ) { return declaration; }
		}
	}

	warn ( warning, pos ) {
		if ( pos !== undefined ) {
			warning.pos = pos;

			var ref = locate( this.code, pos, { offsetLine: 1 } );
			var line = ref.line;
			var column = ref.column; // TODO trace sourcemaps

			warning.loc = { file: this.id, line, column };
			warning.frame = getCodeFrame( this.code, line, column );
		}

		warning.id = this.id;
		this.bundle.warn( warning );
	}
}

class ExternalVariable extends Variable {
	constructor ( module, name ) {
		super( name );
		this.module = module;
		this.safeName = null;
		this.isExternal = true;
		this.isNamespace = name === '*';
	}

	addReference ( reference ) {
		if ( this.name === 'default' || this.name === '*' ) {
			this.module.suggestName( reference.name );
		}
	}

	getName ( es ) {
		if ( this.name === '*' ) {
			return this.module.name;
		}

		if ( this.name === 'default' ) {
			return this.module.exportsNamespace || ( !es && this.module.exportsNames ) ?
				`${this.module.name}__default` :
				this.module.name;
		}

		return es ? this.safeName : `${this.module.name}.${this.name}`;
	}

	includeDeclaration () {
		if ( this.included ) {
			return false;
		}
		this.included = true;
		this.module.used = true;
		return true;
	}

	setSafeName ( name ) {
		this.safeName = name;
	}
}

class ExternalModule {
	constructor ( id ) {
		this.id = id;

		const parts = id.split( /[\\/]/ );
		this.name = makeLegal( parts.pop() );

		this.nameSuggestions = blank();
		this.mostCommonSuggestion = 0;

		this.isExternal = true;
		this.used = false;
		this.declarations = blank();

		this.exportsNames = false;
	}

	suggestName ( name ) {
		if ( !this.nameSuggestions[ name ] ) { this.nameSuggestions[ name ] = 0; }
		this.nameSuggestions[ name ] += 1;

		if ( this.nameSuggestions[ name ] > this.mostCommonSuggestion ) {
			this.mostCommonSuggestion = this.nameSuggestions[ name ];
			this.name = name;
		}
	}

	traceExport ( name ) {
		if ( name !== 'default' && name !== '*' ) { this.exportsNames = true; }
		if ( name === '*' ) { this.exportsNamespace = true; }

		return this.declarations[ name ]
			|| (this.declarations[ name ] = new ExternalVariable( this, name ));
	}
}

function getInteropBlock ( bundle, options ) {
	return bundle.externalModules
		.map( module => {
			if ( !module.declarations.default || options.interop === false ) { return null; }

			if ( module.exportsNamespace ) {
				return `${bundle.varOrConst} ${module.name}__default = ${module.name}['default'];`;
			}

			if ( module.exportsNames ) {
				return `${bundle.varOrConst} ${module.name}__default = 'default' in ${module.name} ? ${module.name}['default'] : ${module.name};`;
			}

			return `${module.name} = ${module.name} && ${module.name}.hasOwnProperty('default') ? ${module.name}['default'] : ${module.name};`;
		})
		.filter( Boolean )
		.join( '\n' );
}

function getExportBlock ( bundle, exportMode, mechanism ) {
	if ( mechanism === void 0 ) mechanism = 'return';

	const entryModule = bundle.entryModule;

	if ( exportMode === 'default' ) {
		return `${mechanism} ${entryModule.traceExport( 'default' ).getName( false )};`;
	}

	const exports = entryModule.getExports().concat( entryModule.getReexports() )
		.map( name => {
			if ( name[0] === '*' ) {
				// export all from external
				const id = name.slice( 1 );
				const module = bundle.moduleById.get( id );

				return `Object.keys(${module.name}).forEach(function (key) { exports[key] = ${module.name}[key]; });`;
			}

			const prop = name === 'default' ? `['default']` : `.${name}`;
			const declaration = entryModule.traceExport( name );

			const lhs = `exports${prop}`;
			const rhs = declaration ?
				declaration.getName( false ) :
				name; // exporting a global

			// prevent `exports.count = exports.count`
			if ( lhs === rhs ) { return null; }

			return `${lhs} = ${rhs};`;
		});

	return exports
		.filter( Boolean )
		.join( '\n' );
}

var esModuleExport = `Object.defineProperty(exports, '__esModule', { value: true });`;

const builtins$1 = {
	process: true,
	events: true,
	stream: true,
	util: true,
	path: true,
	buffer: true,
	querystring: true,
	url: true,
	string_decoder: true,
	punycode: true,
	http: true,
	https: true,
	os: true,
	assert: true,
	constants: true,
	timers: true,
	console: true,
	vm: true,
	zlib: true,
	tty: true,
	domain: true
};

// Creating a browser bundle that depends on Node.js built-in modules ('util'). You might need to include https://www.npmjs.com/package/rollup-plugin-node-builtins

function warnOnBuiltins ( bundle ) {
	const externalBuiltins = bundle.externalModules
		.filter( mod => mod.id in builtins$1 )
		.map( mod => mod.id );

	if ( !externalBuiltins.length ) { return; }

	const detail = externalBuiltins.length === 1 ?
		`module ('${externalBuiltins[0]}')` :
		`modules (${externalBuiltins.slice( 0, -1 ).map( name => `'${name}'` ).join( ', ' )} and '${externalBuiltins.slice( -1 )}')`;

	bundle.warn({
		code: 'MISSING_NODE_BUILTINS',
		modules: externalBuiltins,
		message: `Creating a browser bundle that depends on Node.js built-in ${detail}. You might need to include https://www.npmjs.com/package/rollup-plugin-node-builtins`
	});
}

function amd ( bundle, magicString, ref, options ) {
	var exportMode = ref.exportMode;
	var getPath = ref.getPath;
	var indentString = ref.indentString;
	var intro = ref.intro;
	var outro = ref.outro;

	warnOnBuiltins( bundle );
	const deps = bundle.externalModules.map( m => `'${getPath(m.id)}'` );
	const args = bundle.externalModules.map( m => m.name );

	if ( exportMode === 'named' ) {
		args.unshift( `exports` );
		deps.unshift( `'exports'` );
	}

	const amdOptions = options.amd || {};

	const params =
		( amdOptions.id ? `'${amdOptions.id}', ` : `` ) +
		( deps.length ? `[${deps.join( ', ' )}], ` : `` );

	const useStrict = options.strict !== false ? ` 'use strict';` : ``;
	const define = amdOptions.define || 'define';
	const wrapperStart = `${define}(${params}function (${args.join( ', ' )}) {${useStrict}\n\n`;

	// var foo__default = 'default' in foo ? foo['default'] : foo;
	const interopBlock = getInteropBlock( bundle, options );
	if ( interopBlock ) { magicString.prepend( interopBlock + '\n\n' ); }

	if ( intro ) { magicString.prepend( intro ); }

	const exportBlock = getExportBlock( bundle, exportMode );
	if ( exportBlock ) { magicString.append( '\n\n' + exportBlock ); }
	if ( exportMode === 'named' && options.legacy !== true ) { magicString.append( `\n\n${esModuleExport}` ); }
	if ( outro ) { magicString.append( outro ); }

	return magicString
		.indent( indentString )
		.append( '\n\n});' )
		.prepend( wrapperStart );
}

function cjs ( bundle, magicString, ref, options ) {
	var exportMode = ref.exportMode;
	var getPath = ref.getPath;
	var intro = ref.intro;
	var outro = ref.outro;

	intro = ( options.strict === false ? intro : `'use strict';\n\n${intro}` ) +
	        ( exportMode === 'named' && options.legacy !== true ? `${esModuleExport}\n\n` : '' );

	let needsInterop = false;

	const varOrConst = bundle.varOrConst;
	const interop = options.interop !== false;

	// TODO handle empty imports, once they're supported
	const importBlock = bundle.externalModules
		.map( module => {
			if ( interop && module.declarations.default ) {
				if ( module.exportsNamespace ) {
					return `${varOrConst} ${module.name} = require('${getPath(module.id)}');` +
						`\n${varOrConst} ${module.name}__default = ${module.name}['default'];`;
				}

				needsInterop = true;

				if ( module.exportsNames ) {
					return `${varOrConst} ${module.name} = require('${getPath(module.id)}');` +
						`\n${varOrConst} ${module.name}__default = _interopDefault(${module.name});`;
				}

				return `${varOrConst} ${module.name} = _interopDefault(require('${getPath(module.id)}'));`;
			} else {
				const includedDeclarations = Object.keys( module.declarations )
					.filter( name => module.declarations[ name ].included );

				const needsVar = includedDeclarations.length || module.reexported;

				return needsVar ?
					`${varOrConst} ${module.name} = require('${getPath(module.id)}');` :
					`require('${getPath(module.id)}');`;
			}
		})
		.join( '\n' );

	if ( needsInterop ) {
		intro += `function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }\n\n`;
	}

	if ( importBlock ) {
		intro += importBlock + '\n\n';
	}

	magicString.prepend( intro );

	const exportBlock = getExportBlock( bundle, exportMode, 'module.exports =' );
	if ( exportBlock ) { magicString.append( '\n\n' + exportBlock ); }
	if ( outro ) { magicString.append( outro ); }

	return magicString;
}

function notDefault ( name ) {
	return name !== 'default';
}

function es ( bundle, magicString, ref ) {
	var getPath = ref.getPath;
	var intro = ref.intro;
	var outro = ref.outro;

	const importBlock = bundle.externalModules
		.map( module => {
			const specifiers = [];
			const specifiersList = [specifiers];
			const importedNames = keys( module.declarations )
				.filter( name => name !== '*' && name !== 'default' )
				.filter( name => module.declarations[ name ].included )
				.map( name => {
					if ( name[0] === '*' ) {
						return `* as ${module.name}`;
					}

					const declaration = module.declarations[ name ];

					if ( declaration.name === declaration.safeName ) { return declaration.name; }
					return `${declaration.name} as ${declaration.safeName}`;
				})
				.filter( Boolean );

			if ( module.declarations.default ) {
				if ( module.exportsNamespace ) {
					specifiersList.push([ `${module.name}__default` ]);
				} else {
					specifiers.push( module.name );
				}
			}

			const namespaceSpecifier = module.declarations['*'] && module.declarations['*'].included ? `* as ${module.name}` : null; // TODO prevent unnecessary namespace import, e.g form/external-imports
			const namedSpecifier = importedNames.length ? `{ ${importedNames.sort().join( ', ' )} }` : null;

			if ( namespaceSpecifier && namedSpecifier ) {
				// Namespace and named specifiers cannot be combined.
				specifiersList.push( [namespaceSpecifier] );
				specifiers.push( namedSpecifier );
			} else if ( namedSpecifier ) {
				specifiers.push( namedSpecifier );
			} else if ( namespaceSpecifier ) {
				specifiers.push( namespaceSpecifier );
			}

			return specifiersList
				.map( specifiers => {
					if ( specifiers.length ) {
						return `import ${specifiers.join( ', ' )} from '${getPath(module.id)}';`;
					}

					return module.reexported ?
						null :
						`import '${getPath(module.id)}';`;
				})
				.filter( Boolean )
				.join( '\n' );
		})
		.join( '\n' );

	if ( importBlock ) { intro += importBlock + '\n\n'; }
	if ( intro ) { magicString.prepend( intro ); }

	const module = bundle.entryModule;

	const exportInternalSpecifiers = [];
	const exportExternalSpecifiers = new Map();
	const exportAllDeclarations = [];

	module.getExports()
		.filter( notDefault )
		.forEach( name => {
			const declaration = module.traceExport( name );
			const rendered = declaration.getName( true );
			exportInternalSpecifiers.push( rendered === name ? name : `${rendered} as ${name}` );
		});

	module.getReexports()
		.filter( notDefault )
		.forEach( name => {
			const declaration = module.traceExport( name );

			if ( declaration.isExternal ) {
				if ( name[0] === '*' ) {
					// export * from 'external'
					exportAllDeclarations.push( `export * from '${name.slice( 1 )}';` );
				} else {
					if ( !exportExternalSpecifiers.has( declaration.module.id ) ) { exportExternalSpecifiers.set( declaration.module.id, [] ); }
					exportExternalSpecifiers.get( declaration.module.id ).push( name );
				}

				return;
			}

			const rendered = declaration.getName( true );
			exportInternalSpecifiers.push( rendered === name ? name : `${rendered} as ${name}` );
		});

	const exportBlock = [];
	if ( exportInternalSpecifiers.length ) { exportBlock.push( `export { ${exportInternalSpecifiers.join(', ')} };` ); }
	if ( module.exports.default || module.reexports.default ) { exportBlock.push( `export default ${module.traceExport( 'default' ).getName( true )};` ); }
	if ( exportAllDeclarations.length ) { exportBlock.push( exportAllDeclarations.join( '\n' ) ); }
	if ( exportExternalSpecifiers.size ) {
		exportExternalSpecifiers.forEach( ( specifiers, id ) => {
			exportBlock.push( `export { ${specifiers.join( ', ' )} } from '${id}';` );
		});
	}

	if ( exportBlock.length ) { magicString.append( '\n\n' + exportBlock.join( '\n' ).trim() ); }

	if ( outro ) { magicString.append( outro ); }

	return magicString.trim();
}

function getGlobalNameMaker ( globals, bundle, fallback ) {
	if ( fallback === void 0 ) fallback = null;

	const fn = typeof globals === 'function' ? globals : id => globals[ id ];

	return function ( module ) {
		const name = fn( module.id );
		if ( name ) { return name; }

		if ( Object.keys( module.declarations ).length > 0 ) {
			bundle.warn({
				code: 'MISSING_GLOBAL_NAME',
				source: module.id,
				guess: module.name,
				message: `No name was provided for external module '${module.id}' in options.globals – guessing '${module.name}'`
			});

			return module.name;
		}

		return fallback;
	};
}

// Generate strings which dereference dotted properties, but use array notation `['prop-deref']`
// if the property name isn't trivial
const shouldUseDot = /^[a-zA-Z$_][a-zA-Z0-9$_]*$/;

function property ( prop ) {
	return shouldUseDot.test( prop ) ? `.${prop}` : `['${prop}']`;
}

function keypath ( keypath ) {
	return keypath.split( '.' ).map( property ).join( '' );
}

function trimEmptyImports ( modules ) {
	let i = modules.length;

	while ( i-- ) {
		const module = modules[i];
		if ( Object.keys( module.declarations ).length > 0 ) {
			return modules.slice( 0, i + 1 );
		}
	}

	return [];
}

function setupNamespace ( keypath$$1 ) {
	const parts = keypath$$1.split( '.' );

	parts.pop();

	let acc = 'this';

	return parts
		.map( part => ( acc += property( part ), `${acc} = ${acc} || {};` ) )
		.join( '\n' ) + '\n';
}

const thisProp = name => `this${keypath( name )}`;

function iife ( bundle, magicString, ref, options ) {
	var exportMode = ref.exportMode;
	var indentString = ref.indentString;
	var intro = ref.intro;
	var outro = ref.outro;

	const globalNameMaker = getGlobalNameMaker( options.globals || blank(), bundle, 'null' );

	var extend = options.extend;
	var name = options.name;
	const isNamespaced = name && name.indexOf( '.' ) !== -1;
	const possibleVariableAssignment = !extend && !isNamespaced;

	if ( name && possibleVariableAssignment && !isLegal(name) ) {
		error({
			code: 'ILLEGAL_IDENTIFIER_AS_NAME',
			message: `Given name (${name}) is not legal JS identifier. If you need this you can try --extend option`
		});
	}

	warnOnBuiltins( bundle );

	const external = trimEmptyImports( bundle.externalModules );
	const dependencies = external.map( globalNameMaker );
	const args = external.map( m => m.name );

	if ( exportMode !== 'none' && !name ) {
		error({
			code: 'INVALID_OPTION',
			message: `You must supply options.name for IIFE bundles`
		});
	}

	if ( extend ) {
		dependencies.unshift( `(${thisProp(name)} = ${thisProp(name)} || {})` );
		args.unshift( 'exports' );
	} else if ( exportMode === 'named' ) {
		dependencies.unshift( '{}' );
		args.unshift( 'exports' );
	}

	const useStrict = options.strict !== false ? `${indentString}'use strict';\n\n` : ``;

	let wrapperIntro = `(function (${args}) {\n${useStrict}`;

	if ( exportMode !== 'none' && !extend) {
		wrapperIntro = ( isNamespaced ? thisProp(name) : `${bundle.varOrConst} ${name}` ) + ` = ${wrapperIntro}`;
	}

	if ( isNamespaced ) {
		wrapperIntro = setupNamespace( name ) + wrapperIntro;
	}

	let wrapperOutro = `\n\n}(${dependencies}));`;

	if (!extend && exportMode === 'named') {
		wrapperOutro = `\n\n${indentString}return exports;${wrapperOutro}`;
	}

	// var foo__default = 'default' in foo ? foo['default'] : foo;
	const interopBlock = getInteropBlock( bundle, options );
	if ( interopBlock ) { magicString.prepend( interopBlock + '\n\n' ); }

	if ( intro ) { magicString.prepend( intro ); }

	const exportBlock = getExportBlock( bundle, exportMode );
	if ( exportBlock ) { magicString.append( '\n\n' + exportBlock ); }
	if ( outro ) { magicString.append( outro ); }

	return magicString
		.indent( indentString )
		.prepend( wrapperIntro )
		.append( wrapperOutro );
}

function globalProp ( name ) {
	if ( !name ) { return 'null'; }
	return `global${ keypath( name ) }`;
}

function setupNamespace$1 ( name ) {
	const parts = name.split( '.' );
	const last = property( parts.pop() );

	let acc = 'global';
	return parts
		.map( part => ( acc += property( part ), `${acc} = ${acc} || {}` ) )
		.concat( `${acc}${last}` )
		.join( ', ' );
}

function safeAccess ( name ) {
	const parts = name.split( '.' );

	let acc = 'global';
	return parts
		.map( part => ( acc += property( part ), acc ) )
		.join( ` && ` );
}

const wrapperOutro = '\n\n})));';

function umd ( bundle, magicString, ref, options ) {
	var exportMode = ref.exportMode;
	var getPath = ref.getPath;
	var indentString = ref.indentString;
	var intro = ref.intro;
	var outro = ref.outro;

	if ( exportMode !== 'none' && !options.name ) {
		error({
			code: 'INVALID_OPTION',
			message: 'You must supply options.name for UMD bundles'
		});
	}

	warnOnBuiltins( bundle );

	const globalNameMaker = getGlobalNameMaker( options.globals || blank(), bundle );

	const amdDeps = bundle.externalModules.map( m => `'${getPath(m.id)}'` );
	const cjsDeps = bundle.externalModules.map( m => `require('${getPath(m.id)}')` );

	const trimmed = trimEmptyImports( bundle.externalModules );
	const globalDeps = trimmed.map( module => globalProp( globalNameMaker( module ) ) );
	const args = trimmed.map( m => m.name );

	if ( exportMode === 'named' ) {
		amdDeps.unshift( `'exports'` );
		cjsDeps.unshift( `exports` );
		globalDeps.unshift( `(${setupNamespace$1(options.name)} = ${options.extend ? `${globalProp(options.name)} || ` : '' }{})` );

		args.unshift( 'exports' );
	}

	const amdOptions = options.amd || {};

	const amdParams =
		( amdOptions.id ? `'${amdOptions.id}', ` : `` ) +
		( amdDeps.length ? `[${amdDeps.join( ', ' )}], ` : `` );

	const define = amdOptions.define || 'define';

	const cjsExport = exportMode === 'default' ? `module.exports = ` : ``;
	const defaultExport = exportMode === 'default' ? `${setupNamespace$1(options.name)} = ` : '';

	const useStrict = options.strict !== false ? ` 'use strict';` : ``;

	let globalExport;

	if (options.noConflict === true) {
		let factory;

		if ( exportMode === 'default' ) {
			factory = `var exports = factory(${globalDeps});`;
		} else if ( exportMode === 'named' ) {
			const module = globalDeps.shift();
			factory = `var exports = ${module};
				factory(${['exports'].concat(globalDeps)});`;
		}
		globalExport = `(function() {
				var current = ${safeAccess(options.name)};
				${factory}
				${globalProp(options.name)} = exports;
				exports.noConflict = function() { ${globalProp(options.name)} = current; return exports; };
			})()`;
	} else {
		globalExport = `(${defaultExport}factory(${globalDeps}))`;
	}

	const wrapperIntro =
		`(function (global, factory) {
			typeof exports === 'object' && typeof module !== 'undefined' ? ${cjsExport}factory(${cjsDeps.join( ', ' )}) :
			typeof ${define} === 'function' && ${define}.amd ? ${define}(${amdParams}factory) :
			${globalExport};
		}(this, (function (${args}) {${useStrict}

		`.replace( /^\t\t/gm, '' ).replace( /^\t/gm, indentString || '\t' );

	// var foo__default = 'default' in foo ? foo['default'] : foo;
	const interopBlock = getInteropBlock( bundle, options );
	if ( interopBlock ) { magicString.prepend( interopBlock + '\n\n' ); }

	if ( intro ) { magicString.prepend( intro ); }

	const exportBlock = getExportBlock( bundle, exportMode );
	if ( exportBlock ) { magicString.append( '\n\n' + exportBlock ); }
	if ( exportMode === 'named' && options.legacy !== true ) { magicString.append( `\n\n${esModuleExport}` ); }
	if ( outro ) { magicString.append( outro ); }

	return magicString
		.trim()
		.indent( indentString )
		.append( wrapperOutro )
		.prepend( wrapperIntro );
}

var finalisers = { amd, cjs, es, iife, umd };

function ensureArray ( thing ) {
	if ( Array.isArray( thing ) ) { return thing; }
	if ( thing == undefined ) { return []; }
	return [ thing ];
}

function load ( id ) {
	return readFileSync( id, 'utf-8' );
}

function findFile ( file ) {
	try {
		const stats = lstatSync( file );
		if ( stats.isSymbolicLink() ) { return findFile( realpathSync( file ) ); }
		if ( stats.isFile() ) {
			// check case
			const name = basename( file );
			const files = readdirSync( dirname( file ) );

			if ( ~files.indexOf( name ) ) { return file; }
		}
	} catch ( err ) {
		// suppress
	}
}

function addJsExtensionIfNecessary ( file ) {
	return findFile( file ) || findFile( file + '.js' );
}

function resolveId ( importee, importer ) {
	if ( typeof process === 'undefined' ) {
		error({
			code: 'MISSING_PROCESS',
			message: `It looks like you're using Rollup in a non-Node.js environment. This means you must supply a plugin with custom resolveId and load functions`,
			url: 'https://github.com/rollup/rollup/wiki/Plugins'
		});
	}

	// external modules (non-entry modules that start with neither '.' or '/')
	// are skipped at this stage.
	if ( importer !== undefined && !isAbsolute( importee ) && importee[0] !== '.' ) { return null; }

	// `resolve` processes paths from right to left, prepending them until an
	// absolute path is created. Absolute importees therefore shortcircuit the
	// resolve call and require no special handing on our part.
	// See https://nodejs.org/api/path.html#path_path_resolve_paths
	return addJsExtensionIfNecessary(
		resolve( importer ? dirname( importer ) : resolve(), importee ) );
}


function makeOnwarn () {
	const warned = blank();

	return warning => {
		const str = warning.toString();
		if ( str in warned ) { return; }
		console.error( str ); //eslint-disable-line no-console
		warned[ str ] = true;
	};
}

function badExports ( option, keys$$1 ) {
	error({
		code: 'INVALID_EXPORT_OPTION',
		message: `'${option}' was specified for options.exports, but entry module has following exports: ${keys$$1.join(', ')}`
	});
}

function getExportMode ( bundle, ref ) {
	var exportMode = ref.exports;
	var name = ref.name;
	var format = ref.format;

	const exportKeys = keys( bundle.entryModule.exports )
		.concat( keys( bundle.entryModule.reexports ) )
		.concat( bundle.entryModule.exportAllSources ); // not keys, but makes our job easier this way

	if ( exportMode === 'default' ) {
		if ( exportKeys.length !== 1 || exportKeys[0] !== 'default' ) {
			badExports( 'default', exportKeys );
		}
	} else if ( exportMode === 'none' && exportKeys.length ) {
		badExports( 'none', exportKeys );
	}

	if ( !exportMode || exportMode === 'auto' ) {
		if ( exportKeys.length === 0 ) {
			exportMode = 'none';
		} else if ( exportKeys.length === 1 && exportKeys[0] === 'default' ) {
			exportMode = 'default';
		} else {
			if ( bundle.entryModule.exports.default && format !== 'es') {
				bundle.warn({
					code: 'MIXED_EXPORTS',
					message: `Using named and default exports together. Consumers of your bundle will have to use ${name || 'bundle'}['default'] to access the default export, which may not be what you want. Use \`exports: 'named'\` to disable this warning`,
					url: `https://github.com/rollup/rollup/wiki/JavaScript-API#exports`
				});
			}
			exportMode = 'named';
		}
	}

	if ( !/(?:default|named|none)/.test( exportMode ) ) {
		error({
			code: 'INVALID_EXPORT_OPTION',
			message: `options.exports must be 'default', 'named', 'none', 'auto', or left unspecified (defaults to 'auto')`
		});
	}

	return exportMode;
}

function getIndentString ( magicString, options ) {
	if ( options.indent === true ) {
		return magicString.getIndentString();
	}

	return options.indent || '';
}

function transform ( bundle, source, id, plugins ) {
	const sourcemapChain = [];

	const originalSourcemap = typeof source.map === 'string' ? JSON.parse( source.map ) : source.map;

	if ( originalSourcemap && typeof originalSourcemap.mappings === 'string' ) {
		originalSourcemap.mappings = decode$$1( originalSourcemap.mappings );
	}

	const originalCode = source.code;
	let ast = source.ast;

	let promise = Promise.resolve( source.code );

	plugins.forEach( plugin => {
		if ( !plugin.transform ) { return; }

		promise = promise.then( previous => {
			function augment ( object, pos, code ) {
				if ( typeof object === 'string' ) {
					object = { message: object };
				}

				if ( object.code ) { object.pluginCode = object.code; }
				object.code = code;

				if ( pos !== undefined ) {
					if ( pos.line !== undefined && pos.column !== undefined ) {
						var line = pos.line;
						var column = pos.column;
						object.loc = { file: id, line, column };
						object.frame = getCodeFrame( previous, line, column );
					}
					else {
						object.pos = pos;
						var ref = locate( previous, pos, { offsetLine: 1 });
						var line = ref.line;
						var column = ref.column;
						object.loc = { file: id, line, column };
						object.frame = getCodeFrame( previous, line, column );
					}
				}

				object.plugin = plugin.name;
				object.id = id;

				return object;
			}

			let throwing;

			const context = {
				warn: ( warning, pos ) => {
					warning = augment( warning, pos, 'PLUGIN_WARNING' );
					bundle.warn( warning );
				},

				error ( err, pos ) {
					err = augment( err, pos, 'PLUGIN_ERROR' );
					throwing = true;
					error( err );
				}
			};

			let transformed;

			try {
				transformed = plugin.transform.call( context, previous, id );
			} catch ( err ) {
				if ( !throwing ) { context.error( err ); }
				error( err );
			}

			return Promise.resolve( transformed )
				.then( result => {
					if ( result == null ) { return previous; }

					if ( typeof result === 'string' ) {
						result = {
							code: result,
							ast: null,
							map: null
						};
					}

					// `result.map` can only be a string if `result` isn't
					else if ( typeof result.map === 'string' ) {
						result.map = JSON.parse( result.map );
					}

					if ( result.map && typeof result.map.mappings === 'string' ) {
						result.map.mappings = decode$$1( result.map.mappings );
					}

					sourcemapChain.push( result.map || { missing: true, plugin: plugin.name }); // lil' bit hacky but it works
					ast = result.ast;

					return result.code;
				})
				.catch( err => {
					err = augment( err, undefined, 'PLUGIN_ERROR' );
					error( err );
				});
		});
	});

	return promise.then( code => ({ code, originalCode, originalSourcemap, ast, sourcemapChain }) );
}

function transformBundle ( code, plugins, sourcemapChain, options ) {
	return plugins.reduce( ( promise, plugin ) => {
		if ( !plugin.transformBundle ) { return promise; }

		return promise.then( code => {
			return Promise.resolve().then( () => {
				return plugin.transformBundle( code, { format : options.format } );
			}).then( result => {
				if ( result == null ) { return code; }

				if ( typeof result === 'string' ) {
					result = {
						code: result,
						map: null
					};
				}

				const map = typeof result.map === 'string' ? JSON.parse( result.map ) : result.map;
				if ( map && typeof map.mappings === 'string' ) {
					map.mappings = decode$$1( map.mappings );
				}

				sourcemapChain.push( map );

				return result.code;
			}).catch( err => {
				error({
					code: 'BAD_BUNDLE_TRANSFORMER',
					message: `Error transforming bundle${plugin.name ? ` with '${plugin.name}' plugin` : ''}: ${err.message}`,
					plugin: plugin.name
				});
			});
		});

	}, Promise.resolve( code ) );
}

class Source {
	constructor ( filename, content ) {
		this.isOriginal = true;
		this.filename = filename;
		this.content = content;
	}

	traceSegment ( line, column, name ) {
		return { line, column, name, source: this };
	}
}

class Link {
	constructor ( map, sources ) {
		this.sources = sources;
		this.names = map.names;
		this.mappings = map.mappings;
	}

	traceMappings () {
		const sources = [];
		const sourcesContent = [];
		const names = [];

		const mappings = this.mappings.map( line => {
			const tracedLine = [];

			line.forEach( segment => {
				const source = this.sources[ segment[1] ];

				if ( !source ) { return; }

				const traced = source.traceSegment( segment[2], segment[3], this.names[ segment[4] ] );

				if ( traced ) {
					let sourceIndex = null;
					let nameIndex = null;
					segment = [
						segment[0],
						null,
						traced.line,
						traced.column
					];

					// newer sources are more likely to be used, so search backwards.
					sourceIndex = sources.lastIndexOf( traced.source.filename );
					if ( sourceIndex === -1 ) {
						sourceIndex = sources.length;
						sources.push( traced.source.filename );
						sourcesContent[ sourceIndex ] = traced.source.content;
					} else if ( sourcesContent[ sourceIndex ] == null ) {
						sourcesContent[ sourceIndex ] = traced.source.content;
					} else if ( traced.source.content != null && sourcesContent[ sourceIndex ] !== traced.source.content ) {
						error({
							message: `Multiple conflicting contents for sourcemap source ${source.filename}`
						});
					}

					segment[1] = sourceIndex;

					if ( traced.name ) {
						nameIndex = names.indexOf( traced.name );
						if ( nameIndex === -1 ) {
							nameIndex = names.length;
							names.push( traced.name );
						}

						segment[4] = nameIndex;
					}

					tracedLine.push( segment );
				}
			});

			return tracedLine;
		});

		return { sources, sourcesContent, names, mappings };
	}

	traceSegment ( line, column, name ) {
		const segments = this.mappings[ line ];

		if ( !segments ) { return null; }

		for ( let i = 0; i < segments.length; i += 1 ) {
			const segment = segments[i];

			if ( segment[0] > column ) { return null; }

			if ( segment[0] === column ) {
				const source = this.sources[ segment[1] ];
				if ( !source ) { return null; }

				return source.traceSegment( segment[2], segment[3], this.names[ segment[4] ] || name );
			}
		}

		return null;
	}
}

function collapseSourcemaps ( bundle, file, map, modules, bundleSourcemapChain ) {
	const moduleSources = modules.filter( module => !module.excludeFromSourcemap ).map( module => {
		let sourcemapChain = module.sourcemapChain;

		let source;
		if ( module.originalSourcemap == null ) {
			source = new Source( module.id, module.originalCode );
		} else {
			const sources = module.originalSourcemap.sources;
			const sourcesContent = module.originalSourcemap.sourcesContent || [];

			if ( sources == null || ( sources.length <= 1 && sources[0] == null ) ) {
				source = new Source( module.id, sourcesContent[0] );
				sourcemapChain = [ module.originalSourcemap ].concat( sourcemapChain );
			} else {
				// TODO indiscriminately treating IDs and sources as normal paths is probably bad.
				const directory = dirname( module.id ) || '.';
				const sourceRoot = module.originalSourcemap.sourceRoot || '.';

				const baseSources = sources.map( (source, i) => {
					return new Source( resolve( directory, sourceRoot, source ), sourcesContent[i] );
				});

				source = new Link( module.originalSourcemap, baseSources );
			}
		}

		sourcemapChain.forEach( map => {
			if ( map.missing ) {
				bundle.warn({
					code: 'SOURCEMAP_BROKEN',
					plugin: map.plugin,
					message: `Sourcemap is likely to be incorrect: a plugin${map.plugin ? ` ('${map.plugin}')` : ``} was used to transform files, but didn't generate a sourcemap for the transformation. Consult the plugin documentation for help`,
					url: `https://github.com/rollup/rollup/wiki/Troubleshooting#sourcemap-is-likely-to-be-incorrect`
				});

				map = {
					names: [],
					mappings: ''
				};
			}

			source = new Link( map, [ source ]);
		});

		return source;
	});

	let source = new Link( map, moduleSources );

	bundleSourcemapChain.forEach( map => {
		source = new Link( map, [ source ] );
	});

	var ref = source.traceMappings();
	var sources = ref.sources;
	var sourcesContent = ref.sourcesContent;
	var names = ref.names;
	var mappings = ref.mappings;

	if ( file ) {
		const directory = dirname( file );
		sources = sources.map( source => relative( directory, source ) );

		map.file = basename( file );
	}

	// we re-use the `map` object because it has convenient toString/toURL methods
	map.sources = sources;
	map.sourcesContent = sourcesContent;
	map.names = names;
	map.mappings = encode$$1( mappings );

	return map;
}

function callIfFunction ( thing ) {
	return typeof thing === 'function' ? thing() : thing;
}

class GlobalVariable extends Variable {
	constructor ( name ) {
		super( name );
		this.isExternal = true;
		this.isGlobal = true;
		this.isReassigned = false;
		this.included = true;
	}

	addReference ( reference ) {
		if ( reference.isReassignment ) { this.isReassigned = true; }
	}

	assignExpression () {}

	hasEffectsWhenCalled () {
		return !pureFunctions[ this.name ];
	}
}

class BundleScope extends Scope {
	findVariable ( name ) {
		if ( !this.variables[ name ] ) {
			this.variables[ name ] = new GlobalVariable( name );
		}

		return this.variables[ name ];
	}
}

class Bundle$$1 {
	constructor ( options ) {
		this.cachedModules = new Map();
		if ( options.cache ) {
			options.cache.modules.forEach( module => {
				this.cachedModules.set( module.id, module );
			} );
		}

		this.plugins = ensureArray( options.plugins );

		options = this.plugins.reduce( ( acc, plugin ) => {
			if ( plugin.options ) { return plugin.options( acc ) || acc; }
			return acc;
		}, options );

		if ( !options.input ) {
			throw new Error( 'You must supply options.input to rollup' );
		}

		this.entry = options.input;
		this.entryId = null;
		this.entryModule = null;

		this.treeshake = options.treeshake !== false;

		if ( options.pureExternalModules === true ) {
			this.isPureExternalModule = () => true;
		} else if ( typeof options.pureExternalModules === 'function' ) {
			this.isPureExternalModule = options.pureExternalModules;
		} else if ( Array.isArray( options.pureExternalModules ) ) {
			const pureExternalModules = new Set( options.pureExternalModules );
			this.isPureExternalModule = id => pureExternalModules.has( id );
		} else {
			this.isPureExternalModule = () => false;
		}

		this.resolveId = first(
			[ id => this.isExternal( id ) ? false : null ]
				.concat( this.plugins.map( plugin => plugin.resolveId ).filter( Boolean ) )
				.concat( resolveId )
		);

		const loaders = this.plugins
			.map( plugin => plugin.load )
			.filter( Boolean );
		this.hasLoaders = loaders.length !== 0;
		this.load = first( loaders.concat( load ) );

		this.scope = new BundleScope();
		// TODO strictly speaking, this only applies with non-ES6, non-default-only bundles
		[ 'module', 'exports', '_interopDefault' ].forEach( name => {
			this.scope.findVariable( name ); // creates global variable as side-effect
		} );

		this.moduleById = new Map();
		this.modules = [];
		this.externalModules = [];

		this.context = String( options.context );

		const optionsModuleContext = options.moduleContext;
		if ( typeof optionsModuleContext === 'function' ) {
			this.getModuleContext = id => optionsModuleContext( id ) || this.context;
		} else if ( typeof optionsModuleContext === 'object' ) {
			const moduleContext = new Map();
			Object.keys( optionsModuleContext ).forEach( key => {
				moduleContext.set( resolve( key ), optionsModuleContext[ key ] );
			} );
			this.getModuleContext = id => moduleContext.get( id ) || this.context;
		} else {
			this.getModuleContext = () => this.context;
		}

		if ( typeof options.external === 'function' ) {
			this.isExternal = options.external;
		} else {
			const ids = ensureArray( options.external );
			this.isExternal = id => ids.indexOf( id ) !== -1;
		}

		this.onwarn = options.onwarn || makeOnwarn();

		this.varOrConst = options.preferConst ? 'const' : 'var';
		this.legacy = options.legacy;
		this.acornOptions = options.acorn || {};
	}

	build () {
		// Phase 1 – discovery. We load the entry module and find which
		// modules it imports, and import those, until we have all
		// of the entry module's dependencies
		return this.resolveId( this.entry, undefined )
			.then( id => {
				if ( id === false ) {
					error( {
						code: 'UNRESOLVED_ENTRY',
						message: `Entry module cannot be external`
					} );
				}

				if ( id == null ) {
					error( {
						code: 'UNRESOLVED_ENTRY',
						message: `Could not resolve entry (${this.entry})`
					} );
				}

				this.entryId = id;
				return this.fetchModule( id, undefined );
			} )
			.then( entryModule => {
				this.entryModule = entryModule;

				// Phase 2 – binding. We link references to their variables
				// to generate a complete picture of the bundle

				timeStart( 'phase 2' );

				this.modules.forEach( module => module.bindImportSpecifiers() );
				this.modules.forEach( module => module.bindReferences() );

				timeEnd( 'phase 2' );

				// Phase 3 – marking. We include all statements that should be included

				timeStart( 'phase 3' );

				// mark all export statements
				entryModule.getExports().forEach( name => {
					const variable = entryModule.traceExport( name );

					variable.exportName = name;
					variable.includeVariable();

					if ( variable.isNamespace ) {
						variable.needsNamespaceBlock = true;
					}
				} );

				entryModule.getReexports().forEach( name => {
					const variable = entryModule.traceExport( name );

					if ( variable.isExternal ) {
						variable.reexported = variable.module.reexported = true;
					} else {
						variable.exportName = name;
						variable.includeVariable();
					}
				} );

				// mark statements that should appear in the bundle
				if ( this.treeshake ) {
					let addedNewNodes;
					do {
						addedNewNodes = false;
						this.modules.forEach( module => {
							if ( module.includeInBundle() ) {
								addedNewNodes = true;
							}
						} );
					} while ( addedNewNodes );
				} else {
					// Necessary to properly replace namespace imports
					this.modules.forEach( module => module.includeAllInBundle() );
				}

				timeEnd( 'phase 3' );

				// Phase 4 – final preparation. We order the modules with an
				// enhanced topological sort that accounts for cycles, then
				// ensure that names are deconflicted throughout the bundle

				timeStart( 'phase 4' );

				// while we're here, check for unused external imports
				this.externalModules.forEach( module => {
					const unused = Object.keys( module.declarations )
						.filter( name => name !== '*' )
						.filter( name => !module.declarations[ name ].included && !module.declarations[ name ].reexported );

					if ( unused.length === 0 ) { return; }

					const names = unused.length === 1 ?
						`'${unused[ 0 ]}' is` :
						`${unused.slice( 0, -1 ).map( name => `'${name}'` ).join( ', ' )} and '${unused.slice( -1 )}' are`;

					this.warn( {
						code: 'UNUSED_EXTERNAL_IMPORT',
						source: module.id,
						names: unused,
						message: `${names} imported from external module '${module.id}' but never used`
					} );
				} );

				// prune unused external imports
				this.externalModules = this.externalModules.filter( module => {
					return module.used || !this.isPureExternalModule( module.id );
				} );

				this.orderedModules = this.sort();
				this.deconflict();

				timeEnd( 'phase 4' );
			} );
	}

	deconflict () {
		const used = blank();

		// ensure no conflicts with globals
		keys( this.scope.variables ).forEach( name => used[ name ] = 1 );

		function getSafeName ( name ) {
			while ( used[ name ] ) {
				name += `$${used[ name ]++}`;
			}

			used[ name ] = 1;
			return name;
		}

		const toDeshadow = new Set();

		this.externalModules.forEach( module => {
			const safeName = getSafeName( module.name );
			toDeshadow.add( safeName );
			module.name = safeName;

			// ensure we don't shadow named external imports, if
			// we're creating an ES6 bundle
			forOwn( module.declarations, ( declaration, name ) => {
				const safeName = getSafeName( name );
				toDeshadow.add( safeName );
				declaration.setSafeName( safeName );
			} );
		} );

		this.modules.forEach( module => {
			forOwn( module.scope.variables, variable => {
				if ( variable.isDefault && variable.declaration.id ) {
					return;
				}

				variable.name = getSafeName( variable.name );
			} );

			// deconflict reified namespaces
			const namespace = module.namespace();
			if ( namespace.needsNamespaceBlock ) {
				namespace.name = getSafeName( namespace.name );
			}
		} );

		this.scope.deshadow( toDeshadow );
	}

	fetchModule ( id, importer ) {
		// short-circuit cycles
		if ( this.moduleById.has( id ) ) { return null; }
		this.moduleById.set( id, null );

		return this.load( id )
			.catch( err => {
				let msg = `Could not load ${id}`;
				if ( importer ) { msg += ` (imported by ${importer})`; }

				msg += `: ${err.message}`;
				throw new Error( msg );
			} )
			.then( source => {
				if ( typeof source === 'string' ) { return source; }
				if ( source && typeof source === 'object' && source.code ) { return source; }

				// TODO report which plugin failed
				error( {
					code: 'BAD_LOADER',
					message: `Error loading ${relativeId( id )}: plugin load hook should return a string, a { code, map } object, or nothing/null`
				} );
			} )
			.then( source => {
				if ( typeof source === 'string' ) {
					source = {
						code: source,
						ast: null
					};
				}

				if ( this.cachedModules.has( id ) && this.cachedModules.get( id ).originalCode === source.code ) {
					return this.cachedModules.get( id );
				}

				return transform( this, source, id, this.plugins );
			} )
			.then( source => {
				var code = source.code;
				var originalCode = source.originalCode;
				var originalSourcemap = source.originalSourcemap;
				var ast = source.ast;
				var sourcemapChain = source.sourcemapChain;
				var resolvedIds = source.resolvedIds;

				const module = new Module( {
					id,
					code,
					originalCode,
					originalSourcemap,
					ast,
					sourcemapChain,
					resolvedIds,
					bundle: this
				} );

				this.modules.push( module );
				this.moduleById.set( id, module );

				return this.fetchAllDependencies( module ).then( () => {
					keys( module.exports ).forEach( name => {
						if ( name !== 'default' ) {
							module.exportsAll[ name ] = module.id;
						}
					} );
					module.exportAllSources.forEach( source => {
						const id = module.resolvedIds[ source ] || module.resolvedExternalIds[ source ];
						const exportAllModule = this.moduleById.get( id );
						if ( exportAllModule.isExternal ) { return; }

						keys( exportAllModule.exportsAll ).forEach( name => {
							if ( name in module.exportsAll ) {
								this.warn( {
									code: 'NAMESPACE_CONFLICT',
									reexporter: module.id,
									name,
									sources: [ module.exportsAll[ name ], exportAllModule.exportsAll[ name ] ],
									message: `Conflicting namespaces: ${relativeId( module.id )} re-exports '${name}' from both ${relativeId(
										module.exportsAll[ name ] )} and ${relativeId( exportAllModule.exportsAll[ name ] )} (will be ignored)`
								} );
							} else {
								module.exportsAll[ name ] = exportAllModule.exportsAll[ name ];
							}
						} );
					} );
					return module;
				} );
			} );
	}

	fetchAllDependencies ( module ) {
		return mapSequence( module.sources, source => {
			const resolvedId = module.resolvedIds[ source ];
			return ( resolvedId ? Promise.resolve( resolvedId ) : this.resolveId( source, module.id ) )
				.then( resolvedId => {
					const externalId = resolvedId || (isRelative( source ) ? resolve( module.id, '..', source ) : source);
					let isExternal = this.isExternal( externalId );

					if ( !resolvedId && !isExternal ) {
						if ( isRelative( source ) ) {
							error( {
								code: 'UNRESOLVED_IMPORT',
								message: `Could not resolve '${source}' from ${relativeId( module.id )}`
							} );
						}

						this.warn( {
							code: 'UNRESOLVED_IMPORT',
							source,
							importer: relativeId( module.id ),
							message: `'${source}' is imported by ${relativeId(
								module.id )}, but could not be resolved – treating it as an external dependency`,
							url: 'https://github.com/rollup/rollup/wiki/Troubleshooting#treating-module-as-external-dependency'
						} );
						isExternal = true;
					}

					if ( isExternal ) {
						module.resolvedExternalIds[ source ] = externalId;

						if ( !this.moduleById.has( externalId ) ) {
							const module = new ExternalModule( externalId );
							this.externalModules.push( module );
							this.moduleById.set( externalId, module );
						}

						const externalModule = this.moduleById.get( externalId );

						// add external declarations so we can detect which are never used
						Object.keys( module.imports ).forEach( name => {
							const importDeclaration = module.imports[ name ];
							if ( importDeclaration.source !== source ) { return; }

							externalModule.traceExport( importDeclaration.name );
						} );
					} else {
						if ( resolvedId === module.id ) {
							// need to find the actual import declaration, so we can provide
							// a useful error message. Bit hoop-jumpy but what can you do
							const declaration = module.ast.body.find( node => {
								return ( node.isImportDeclaration || node.isExportDeclaration ) && node.source.value === source;
							} );
							const declarationType = /Export/.test( declaration.type ) ? 'export' : 'import';
							module.error( {
								code: 'CANNOT_IMPORT_SELF',
								message: `A module cannot ${declarationType} itself`
							}, declaration.start );
						}

						module.resolvedIds[ source ] = resolvedId;
						return this.fetchModule( resolvedId, module.id );
					}
				} );
		} );
	}

	getPathRelativeToEntryDirname ( resolvedId ) {
		if ( isRelative( resolvedId ) || isAbsolute( resolvedId ) ) {
			const entryDirname = dirname( this.entryId );
			const relativeToEntry = normalize( relative( entryDirname, resolvedId ) );

			return isRelative( relativeToEntry ) ? relativeToEntry : `./${relativeToEntry}`;
		}

		return resolvedId;
	}

	render ( options ) {
		if ( options === void 0 ) options = {};

		return Promise.resolve().then( () => {
			// Determine export mode - 'default', 'named', 'none'
			const exportMode = getExportMode( this, options );

			let magicString = new Bundle$1( { separator: '\n\n' } );
			const usedModules = [];

			timeStart( 'render modules' );

			this.orderedModules.forEach( module => {
				const source = module.render( options.format === 'es', this.legacy );
				if ( source.toString().length ) {
					magicString.addSource( source );
					usedModules.push( module );
				}
			} );

			if ( !magicString.toString().trim() && this.entryModule.getExports().length === 0 && this.entryModule.getReexports().length === 0 ) {
				this.warn( {
					code: 'EMPTY_BUNDLE',
					message: 'Generated an empty bundle'
				} );
			}

			timeEnd( 'render modules' );

			let intro = [ options.intro ]
				.concat(
					this.plugins.map( plugin => plugin.intro && plugin.intro() )
				)
				.filter( Boolean )
				.join( '\n\n' );

			if ( intro ) { intro += '\n\n'; }

			let outro = [ options.outro ]
				.concat(
					this.plugins.map( plugin => plugin.outro && plugin.outro() )
				)
				.filter( Boolean )
				.join( '\n\n' );

			if ( outro ) { outro = `\n\n${outro}`; }

			const indentString = getIndentString( magicString, options );

			const finalise = finalisers[ options.format ];
			if ( !finalise ) {
				error( {
					code: 'INVALID_OPTION',
					message: `Invalid format: ${options.format} - valid options are ${keys( finalisers ).join( ', ' )}`
				} );
			}

			timeStart( 'render format' );

			const optionsPaths = options.paths;
			const getPath = (
				typeof optionsPaths === 'function' ?
					( id => optionsPaths( id ) || this.getPathRelativeToEntryDirname( id ) ) :
					optionsPaths ?
						( id => optionsPaths.hasOwnProperty( id ) ? optionsPaths[ id ] : this.getPathRelativeToEntryDirname( id ) ) :
						id => this.getPathRelativeToEntryDirname( id )
			);

			magicString = finalise( this, magicString.trim(), { exportMode, getPath, indentString, intro, outro }, options );

			timeEnd( 'render format' );

			const banner = [ options.banner ]
				.concat( this.plugins.map( plugin => plugin.banner ) )
				.map( callIfFunction )
				.filter( Boolean )
				.join( '\n' );

			const footer = [ options.footer ]
				.concat( this.plugins.map( plugin => plugin.footer ) )
				.map( callIfFunction )
				.filter( Boolean )
				.join( '\n' );

			if ( banner ) { magicString.prepend( banner + '\n' ); }
			if ( footer ) { magicString.append( '\n' + footer ); }

			const prevCode = magicString.toString();
			let map = null;
			const bundleSourcemapChain = [];

			return transformBundle( prevCode, this.plugins, bundleSourcemapChain, options ).then( code => {
				if ( options.sourcemap ) {
					timeStart( 'sourcemap' );

					let file = options.sourcemapFile || options.file;
					if ( file ) { file = resolve( typeof process !== 'undefined' ? process.cwd() : '', file ); }

					if ( this.hasLoaders || find( this.plugins, plugin => plugin.transform || plugin.transformBundle ) ) {
						map = magicString.generateMap( {} );
						if ( typeof map.mappings === 'string' ) {
							map.mappings = decode$$1( map.mappings );
						}
						map = collapseSourcemaps( this, file, map, usedModules, bundleSourcemapChain );
					} else {
						map = magicString.generateMap( { file, includeContent: true } );
					}

					map.sources = map.sources.map( normalize );

					timeEnd( 'sourcemap' );
				}

				if ( code[ code.length - 1 ] !== '\n' ) { code += '\n'; }
				return { code, map };
			} );
		} );
	}

	sort () {
		let hasCycles;
		const seen = {};
		const ordered = [];

		const stronglyDependsOn = blank();
		const dependsOn = blank();

		this.modules.forEach( module => {
			stronglyDependsOn[ module.id ] = blank();
			dependsOn[ module.id ] = blank();
		} );

		this.modules.forEach( module => {
			function processStrongDependency ( dependency ) {
				if ( dependency === module || stronglyDependsOn[ module.id ][ dependency.id ] ) { return; }

				stronglyDependsOn[ module.id ][ dependency.id ] = true;
				dependency.strongDependencies.forEach( processStrongDependency );
			}

			function processDependency ( dependency ) {
				if ( dependency === module || dependsOn[ module.id ][ dependency.id ] ) { return; }

				dependsOn[ module.id ][ dependency.id ] = true;
				dependency.dependencies.forEach( processDependency );
			}

			module.strongDependencies.forEach( processStrongDependency );
			module.dependencies.forEach( processDependency );
		} );

		const visit = module => {
			if ( seen[ module.id ] ) {
				hasCycles = true;
				return;
			}

			seen[ module.id ] = true;

			module.dependencies.forEach( visit );
			ordered.push( module );
		};

		visit( this.entryModule );

		if ( hasCycles ) {
			ordered.forEach( ( a, i ) => {
				for ( i += 1; i < ordered.length; i += 1 ) {
					const b = ordered[ i ];

					// TODO reinstate this! it no longer works
					if ( stronglyDependsOn[ a.id ][ b.id ] ) {
						// somewhere, there is a module that imports b before a. Because
						// b imports a, a is placed before b. We need to find the module
						// in question, so we can provide a useful error message
						let parent = '[[unknown]]';
						const visited = {};

						const findParent = module => {
							if ( dependsOn[ module.id ][ a.id ] && dependsOn[ module.id ][ b.id ] ) {
								parent = module.id;
								return true;
							}
							visited[ module.id ] = true;
							for ( let i = 0; i < module.dependencies.length; i += 1 ) {
								const dependency = module.dependencies[ i ];
								if ( !visited[ dependency.id ] && findParent( dependency ) ) { return true; }
							}
						};

						findParent( this.entryModule );

						this.onwarn(
							`Module ${a.id} may be unable to evaluate without ${b.id}, but is included first due to a cyclical dependency. Consider swapping the import statements in ${parent} to ensure correct ordering`
						);
					}
				}
			} );
		}

		return ordered;
	}

	warn ( warning ) {
		warning.toString = () => {
			let str = '';

			if ( warning.plugin ) { str += `(${warning.plugin} plugin) `; }
			if ( warning.loc ) { str += `${relativeId( warning.loc.file )} (${warning.loc.line}:${warning.loc.column}) `; }
			str += warning.message;

			return str;
		};

		this.onwarn( warning );
	}
}

const ALLOWED_KEYS = [
	'acorn',
	'amd',
	'banner',
	'cache',
	'context',
	'entry',
	'exports',
	'extend',
	'external',
	'file',
	'footer',
	'format',
	'globals',
	'indent',
	'input',
	'interop',
	'intro',
	'legacy',
	'moduleContext',
	'name',
	'noConflict',
	'onwarn',
	'output',
	'outro',
	'paths',
	'plugins',
	'preferConst',
	'pureExternalModules',
	'sourcemap',
	'sourcemapFile',
	'strict',
	'targets',
	'treeshake',
	'watch'
];

function checkAmd ( options ) {
	if ( options.moduleId ) {
		if ( options.amd ) { throw new Error( 'Cannot have both options.amd and options.moduleId' ); }

		options.amd = { id: options.moduleId };
		delete options.moduleId;

		const message = `options.moduleId is deprecated in favour of options.amd = { id: moduleId }`;
		if ( options.onwarn ) {
			options.onwarn({ message });
		} else {
			console.warn( message ); // eslint-disable-line no-console
		}
	}
}

function checkInputOptions ( options, warn ) {
	if ( options.transform || options.load || options.resolveId || options.resolveExternal ) {
		throw new Error( 'The `transform`, `load`, `resolveId` and `resolveExternal` options are deprecated in favour of a unified plugin API. See https://github.com/rollup/rollup/wiki/Plugins for details' );
	}

	if ( options.entry && !options.input ) {
		options.input = options.entry;
		warn({
			message: `options.entry is deprecated, use options.input`
		});
	}

	const err = validateKeys( keys(options), ALLOWED_KEYS );
	if ( err ) { throw err; }
}

const deprecated = {
	dest: 'file',
	moduleName: 'name',
	sourceMap: 'sourcemap',
	sourceMapFile: 'sourcemapFile',
	useStrict: 'strict'
};

function checkOutputOptions ( options, warn ) {
	if ( options.format === 'es6' ) {
		error({
			message: 'The `es6` output format is deprecated – use `es` instead',
			url: `https://github.com/rollup/rollup/wiki/JavaScript-API#format`
		});
	}

	if ( !options.format ) {
		error({
			message: `You must specify options.format, which can be one of 'amd', 'cjs', 'es', 'iife' or 'umd'`,
			url: `https://github.com/rollup/rollup/wiki/JavaScript-API#format`
		});
	}

	if ( options.moduleId ) {
		if ( options.amd ) { throw new Error( 'Cannot have both options.amd and options.moduleId' ); }

		options.amd = { id: options.moduleId };
		delete options.moduleId;

		warn({
			message: `options.moduleId is deprecated in favour of options.amd = { id: moduleId }`
		});
	}

	const deprecations = [];
	Object.keys( deprecated ).forEach( old => {
		if ( old in options ) {
			deprecations.push({ old, new: deprecated[ old ] });
			options[ deprecated[ old ] ] = options[ old ];
			delete options[ old ];
		}
	});

	if ( deprecations.length ) {
		const message = `The following options have been renamed — please update your config: ${deprecations.map(option => `${option.old} -> ${option.new}`).join(', ')}`;
		warn({
			code: 'DEPRECATED_OPTIONS',
			message,
			deprecations
		});
	}
}

const throwAsyncGenerateError = {
	get () {
		throw new Error( `bundle.generate(...) now returns a Promise instead of a { code, map } object` );
	}
};

function rollup ( options ) {
	try {
		if ( !options ) {
			throw new Error( 'You must supply an options object to rollup' );
		}

		const warn = options.onwarn || (warning => console.warn( warning.message )); // eslint-disable-line no-console

		checkInputOptions( options, warn );
		const bundle = new Bundle$$1( options );

		timeStart( '--BUILD--' );

		return bundle.build().then( () => {
			timeEnd( '--BUILD--' );

			function generate ( options ) {
				if ( !options ) {
					throw new Error( 'You must supply an options object' );
				}
				checkOutputOptions( options, warn );
				checkAmd( options );

				timeStart( '--GENERATE--' );

				const promise = Promise.resolve()
					.then( () => bundle.render( options ) )
					.then( rendered => {
						timeEnd( '--GENERATE--' );

						bundle.plugins.forEach( plugin => {
							if ( plugin.ongenerate ) {
								plugin.ongenerate( assign({
									bundle: result
								}, options ), rendered);
							}
						});

						flushTime();

						return rendered;
					});

				Object.defineProperty( promise, 'code', throwAsyncGenerateError );
				Object.defineProperty( promise, 'map', throwAsyncGenerateError );

				return promise;
			}

			const result = {
				imports: bundle.externalModules.map( module => module.id ),
				exports: keys( bundle.entryModule.exports ),
				modules: bundle.orderedModules.map( module => module.toJSON() ),

				generate,
				write: options => {
					if ( !options || (!options.file && !options.dest) ) {
						error({
							code: 'MISSING_OPTION',
							message: 'You must specify options.file'
						});
					}

					return generate( options ).then( result => {
						const file = options.file;
						var code = result.code;
						var map = result.map;

						const promises = [];

						if ( options.sourcemap ) {
							let url;

							if ( options.sourcemap === 'inline' ) {
								url = map.toUrl();
							} else {
								url = `${basename( file )}.map`;
								promises.push( writeFile( file + '.map', map.toString() ) );
							}

							code += `//# ${SOURCEMAPPING_URL}=${url}\n`;
						}

						promises.push( writeFile( file, code ) );
						return Promise.all( promises ).then( () => {
							return mapSequence( bundle.plugins.filter( plugin => plugin.onwrite ), plugin => {
								return Promise.resolve( plugin.onwrite( assign({
									bundle: result
								}, options ), result));
							});
						});
					});
				}
			};

			return result;
		});
	} catch ( err ) {
		return Promise.reject( err );
	}
}

var version$1 = "0.50.0";

exports.rollup = rollup;
exports.VERSION = version$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=rollup.browser.js.map
