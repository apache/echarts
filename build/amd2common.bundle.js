/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var glob = __webpack_require__(1);
	var fsExtra = __webpack_require__(18);
	var esprima = __webpack_require__(63);


	glob('**/*.js', {
	    cwd: __dirname + '/../src/'
	}, function (err, files) {
	    files.forEach(function (filePath) {
	        var code = parse(fsExtra.readFileSync(
	            __dirname + '/../src/' + filePath, 'utf-8'));
	        code = code.replace(/require\(([\'"])zrender\//g, 'require($1zrender/lib/');
	        fsExtra.outputFileSync(
	            __dirname + '/../lib/' + filePath,
	            code, 'utf-8');
	    });
	});


	var MAGIC_DEPS = {
	    'exports' : true,
	    'module' : true,
	    'require' : true
	};

	var SIMPLIFIED_CJS = ['require', 'exports', 'module'];

	// Convert AMD-style JavaScript string into node.js compatible module
	function parse (raw){
	    var output = '';
	    var ast = esprima.parse(raw, {
	        range: true,
	        raw: true
	    });

	    var defines = ast.body.filter(isDefine);

	    if ( defines.length > 1 ){
	        throw new Error('Each file can have only a single define call. Found "'+ defines.length +'"');
	    } else if (!defines.length){
	        return raw;
	    }

	    var def = defines[0];
	    var args = def.expression['arguments'];
	    var factory = getFactory( args );
	    var useStrict = getUseStrict( factory );

	    // do replacements in-place to avoid modifying the code more than needed
	    if (useStrict) {
	        output += useStrict.expression.raw +';\n';
	    }
	    output += raw.substring( 0, def.range[0] ); // anything before define
	    output += getRequires(args, factory); // add requires
	    output += getBody(raw, factory.body, useStrict); // module body

	    output += raw.substring( def.range[1], raw.length ); // anything after define

	    return output;
	}


	function getRequires(args, factory){
	    var requires = [];
	    var deps = getDependenciesNames( args );
	    var params = factory.params.map(function(param, i){
	        return {
	            name : param.name,
	            // simplified cjs doesn't have deps
	            dep : (deps.length)? deps[i] : SIMPLIFIED_CJS[i]
	        };
	    });

	    params.forEach(function(param){
	        if ( MAGIC_DEPS[param.dep] && !MAGIC_DEPS[param.name] ) {
	            // if user remaped magic dependency we declare a var
	            requires.push( 'var '+ param.name +' = '+ param.dep +';' );
	        } else if ( param.dep && !MAGIC_DEPS[param.dep] ) {
	            // only do require for params that have a matching dependency also
	            // skip "magic" dependencies
	            requires.push( 'var '+ param.name +' = require(\''+ param.dep +'\');' );
	        }
	    });

	    return requires.join('\n');
	}


	function getDependenciesNames(args){
	    var deps = [];
	    var arr = args.filter(function(arg){
	        return arg.type === 'ArrayExpression';
	    })[0];

	    if (arr) {
	        deps = arr.elements.map(function(el){
	            return el.value;
	        });
	    }

	    return deps;
	}


	function isDefine(node){
	    return node.type === 'ExpressionStatement' &&
	           node.expression.type === 'CallExpression' &&
	           node.expression.callee.type === 'Identifier' &&
	           node.expression.callee.name === 'define';
	}


	function getFactory(args){
	    return args.filter(function(arg){
	        return arg.type === 'FunctionExpression';
	    })[0];
	}


	function getBody(raw, factoryBody, useStrict){
	    var returnStatement = factoryBody.body.filter(function(node){
	        return node.type === 'ReturnStatement';
	    })[0];

	    var body = '';
	    var bodyStart = useStrict? useStrict.expression.range[1] + 1 : factoryBody.range[0] + 1;

	    if (returnStatement) {
	        body += raw.substring( bodyStart, returnStatement.range[0] );
	        // "return ".length === 7 so we add "6" to returnStatement start
	        body += 'module.exports ='+ raw.substring( returnStatement.range[0] + 6, factoryBody.range[1] - 1 );
	    } else {
	        // if using exports or module.exports or just a private module we
	        // simply return the factoryBody content
	        body = raw.substring( bodyStart, factoryBody.range[1] - 1 );
	    }

	    return body;
	}


	function getUseStrict(factory){
	    return factory.body.body.filter(isUseStrict)[0];
	}


	function isUseStrict(node){
	    return node.type === 'ExpressionStatement' &&
	            node.expression.type === 'Literal' &&
	            node.expression.value === 'use strict';
	}


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// Approach:
	//
	// 1. Get the minimatch set
	// 2. For each pattern in the set, PROCESS(pattern, false)
	// 3. Store matches per-set, then uniq them
	//
	// PROCESS(pattern, inGlobStar)
	// Get the first [n] items from pattern that are all strings
	// Join these together.  This is PREFIX.
	//   If there is no more remaining, then stat(PREFIX) and
	//   add to matches if it succeeds.  END.
	//
	// If inGlobStar and PREFIX is symlink and points to dir
	//   set ENTRIES = []
	// else readdir(PREFIX) as ENTRIES
	//   If fail, END
	//
	// with ENTRIES
	//   If pattern[n] is GLOBSTAR
	//     // handle the case where the globstar match is empty
	//     // by pruning it out, and testing the resulting pattern
	//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
	//     // handle other cases.
	//     for ENTRY in ENTRIES (not dotfiles)
	//       // attach globstar + tail onto the entry
	//       // Mark that this entry is a globstar match
	//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
	//
	//   else // not globstar
	//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
	//       Test ENTRY against pattern[n]
	//       If fails, continue
	//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
	//
	// Caveat:
	//   Cache all stats and readdirs results to minimize syscall.  Since all
	//   we ever care about is existence and directory-ness, we can just keep
	//   `true` for files, and [children,...] for directories, or `false` for
	//   things that don't exist.

	module.exports = glob

	var fs = __webpack_require__(2)
	var minimatch = __webpack_require__(3)
	var Minimatch = minimatch.Minimatch
	var inherits = __webpack_require__(8)
	var EE = __webpack_require__(10).EventEmitter
	var path = __webpack_require__(4)
	var assert = __webpack_require__(11)
	var isAbsolute = __webpack_require__(12)
	var globSync = __webpack_require__(13)
	var common = __webpack_require__(14)
	var alphasort = common.alphasort
	var alphasorti = common.alphasorti
	var setopts = common.setopts
	var ownProp = common.ownProp
	var inflight = __webpack_require__(15)
	var util = __webpack_require__(9)
	var childrenIgnored = common.childrenIgnored
	var isIgnored = common.isIgnored

	var once = __webpack_require__(17)

	function glob (pattern, options, cb) {
	  if (typeof options === 'function') cb = options, options = {}
	  if (!options) options = {}

	  if (options.sync) {
	    if (cb)
	      throw new TypeError('callback provided to sync glob')
	    return globSync(pattern, options)
	  }

	  return new Glob(pattern, options, cb)
	}

	glob.sync = globSync
	var GlobSync = glob.GlobSync = globSync.GlobSync

	// old api surface
	glob.glob = glob

	function extend (origin, add) {
	  if (add === null || typeof add !== 'object') {
	    return origin
	  }

	  var keys = Object.keys(add)
	  var i = keys.length
	  while (i--) {
	    origin[keys[i]] = add[keys[i]]
	  }
	  return origin
	}

	glob.hasMagic = function (pattern, options_) {
	  var options = extend({}, options_)
	  options.noprocess = true

	  var g = new Glob(pattern, options)
	  var set = g.minimatch.set
	  if (set.length > 1)
	    return true

	  for (var j = 0; j < set[0].length; j++) {
	    if (typeof set[0][j] !== 'string')
	      return true
	  }

	  return false
	}

	glob.Glob = Glob
	inherits(Glob, EE)
	function Glob (pattern, options, cb) {
	  if (typeof options === 'function') {
	    cb = options
	    options = null
	  }

	  if (options && options.sync) {
	    if (cb)
	      throw new TypeError('callback provided to sync glob')
	    return new GlobSync(pattern, options)
	  }

	  if (!(this instanceof Glob))
	    return new Glob(pattern, options, cb)

	  setopts(this, pattern, options)
	  this._didRealPath = false

	  // process each pattern in the minimatch set
	  var n = this.minimatch.set.length

	  // The matches are stored as {<filename>: true,...} so that
	  // duplicates are automagically pruned.
	  // Later, we do an Object.keys() on these.
	  // Keep them as a list so we can fill in when nonull is set.
	  this.matches = new Array(n)

	  if (typeof cb === 'function') {
	    cb = once(cb)
	    this.on('error', cb)
	    this.on('end', function (matches) {
	      cb(null, matches)
	    })
	  }

	  var self = this
	  var n = this.minimatch.set.length
	  this._processing = 0
	  this.matches = new Array(n)

	  this._emitQueue = []
	  this._processQueue = []
	  this.paused = false

	  if (this.noprocess)
	    return this

	  if (n === 0)
	    return done()

	  for (var i = 0; i < n; i ++) {
	    this._process(this.minimatch.set[i], i, false, done)
	  }

	  function done () {
	    --self._processing
	    if (self._processing <= 0)
	      self._finish()
	  }
	}

	Glob.prototype._finish = function () {
	  assert(this instanceof Glob)
	  if (this.aborted)
	    return

	  if (this.realpath && !this._didRealpath)
	    return this._realpath()

	  common.finish(this)
	  this.emit('end', this.found)
	}

	Glob.prototype._realpath = function () {
	  if (this._didRealpath)
	    return

	  this._didRealpath = true

	  var n = this.matches.length
	  if (n === 0)
	    return this._finish()

	  var self = this
	  for (var i = 0; i < this.matches.length; i++)
	    this._realpathSet(i, next)

	  function next () {
	    if (--n === 0)
	      self._finish()
	  }
	}

	Glob.prototype._realpathSet = function (index, cb) {
	  var matchset = this.matches[index]
	  if (!matchset)
	    return cb()

	  var found = Object.keys(matchset)
	  var self = this
	  var n = found.length

	  if (n === 0)
	    return cb()

	  var set = this.matches[index] = Object.create(null)
	  found.forEach(function (p, i) {
	    // If there's a problem with the stat, then it means that
	    // one or more of the links in the realpath couldn't be
	    // resolved.  just return the abs value in that case.
	    p = self._makeAbs(p)
	    fs.realpath(p, self.realpathCache, function (er, real) {
	      if (!er)
	        set[real] = true
	      else if (er.syscall === 'stat')
	        set[p] = true
	      else
	        self.emit('error', er) // srsly wtf right here

	      if (--n === 0) {
	        self.matches[index] = set
	        cb()
	      }
	    })
	  })
	}

	Glob.prototype._mark = function (p) {
	  return common.mark(this, p)
	}

	Glob.prototype._makeAbs = function (f) {
	  return common.makeAbs(this, f)
	}

	Glob.prototype.abort = function () {
	  this.aborted = true
	  this.emit('abort')
	}

	Glob.prototype.pause = function () {
	  if (!this.paused) {
	    this.paused = true
	    this.emit('pause')
	  }
	}

	Glob.prototype.resume = function () {
	  if (this.paused) {
	    this.emit('resume')
	    this.paused = false
	    if (this._emitQueue.length) {
	      var eq = this._emitQueue.slice(0)
	      this._emitQueue.length = 0
	      for (var i = 0; i < eq.length; i ++) {
	        var e = eq[i]
	        this._emitMatch(e[0], e[1])
	      }
	    }
	    if (this._processQueue.length) {
	      var pq = this._processQueue.slice(0)
	      this._processQueue.length = 0
	      for (var i = 0; i < pq.length; i ++) {
	        var p = pq[i]
	        this._processing--
	        this._process(p[0], p[1], p[2], p[3])
	      }
	    }
	  }
	}

	Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
	  assert(this instanceof Glob)
	  assert(typeof cb === 'function')

	  if (this.aborted)
	    return

	  this._processing++
	  if (this.paused) {
	    this._processQueue.push([pattern, index, inGlobStar, cb])
	    return
	  }

	  //console.error('PROCESS %d', this._processing, pattern)

	  // Get the first [n] parts of pattern that are all strings.
	  var n = 0
	  while (typeof pattern[n] === 'string') {
	    n ++
	  }
	  // now n is the index of the first one that is *not* a string.

	  // see if there's anything else
	  var prefix
	  switch (n) {
	    // if not, then this is rather simple
	    case pattern.length:
	      this._processSimple(pattern.join('/'), index, cb)
	      return

	    case 0:
	      // pattern *starts* with some non-trivial item.
	      // going to readdir(cwd), but not include the prefix in matches.
	      prefix = null
	      break

	    default:
	      // pattern has some string bits in the front.
	      // whatever it starts with, whether that's 'absolute' like /foo/bar,
	      // or 'relative' like '../baz'
	      prefix = pattern.slice(0, n).join('/')
	      break
	  }

	  var remain = pattern.slice(n)

	  // get the list of entries.
	  var read
	  if (prefix === null)
	    read = '.'
	  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
	    if (!prefix || !isAbsolute(prefix))
	      prefix = '/' + prefix
	    read = prefix
	  } else
	    read = prefix

	  var abs = this._makeAbs(read)

	  //if ignored, skip _processing
	  if (childrenIgnored(this, read))
	    return cb()

	  var isGlobStar = remain[0] === minimatch.GLOBSTAR
	  if (isGlobStar)
	    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
	  else
	    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
	}

	Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
	  var self = this
	  this._readdir(abs, inGlobStar, function (er, entries) {
	    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
	  })
	}

	Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

	  // if the abs isn't a dir, then nothing can match!
	  if (!entries)
	    return cb()

	  // It will only match dot entries if it starts with a dot, or if
	  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
	  var pn = remain[0]
	  var negate = !!this.minimatch.negate
	  var rawGlob = pn._glob
	  var dotOk = this.dot || rawGlob.charAt(0) === '.'

	  var matchedEntries = []
	  for (var i = 0; i < entries.length; i++) {
	    var e = entries[i]
	    if (e.charAt(0) !== '.' || dotOk) {
	      var m
	      if (negate && !prefix) {
	        m = !e.match(pn)
	      } else {
	        m = e.match(pn)
	      }
	      if (m)
	        matchedEntries.push(e)
	    }
	  }

	  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

	  var len = matchedEntries.length
	  // If there are no matched entries, then nothing matches.
	  if (len === 0)
	    return cb()

	  // if this is the last remaining pattern bit, then no need for
	  // an additional stat *unless* the user has specified mark or
	  // stat explicitly.  We know they exist, since readdir returned
	  // them.

	  if (remain.length === 1 && !this.mark && !this.stat) {
	    if (!this.matches[index])
	      this.matches[index] = Object.create(null)

	    for (var i = 0; i < len; i ++) {
	      var e = matchedEntries[i]
	      if (prefix) {
	        if (prefix !== '/')
	          e = prefix + '/' + e
	        else
	          e = prefix + e
	      }

	      if (e.charAt(0) === '/' && !this.nomount) {
	        e = path.join(this.root, e)
	      }
	      this._emitMatch(index, e)
	    }
	    // This was the last one, and no stats were needed
	    return cb()
	  }

	  // now test all matched entries as stand-ins for that part
	  // of the pattern.
	  remain.shift()
	  for (var i = 0; i < len; i ++) {
	    var e = matchedEntries[i]
	    var newPattern
	    if (prefix) {
	      if (prefix !== '/')
	        e = prefix + '/' + e
	      else
	        e = prefix + e
	    }
	    this._process([e].concat(remain), index, inGlobStar, cb)
	  }
	  cb()
	}

	Glob.prototype._emitMatch = function (index, e) {
	  if (this.aborted)
	    return

	  if (this.matches[index][e])
	    return

	  if (isIgnored(this, e))
	    return

	  if (this.paused) {
	    this._emitQueue.push([index, e])
	    return
	  }

	  var abs = this._makeAbs(e)

	  if (this.nodir) {
	    var c = this.cache[abs]
	    if (c === 'DIR' || Array.isArray(c))
	      return
	  }

	  if (this.mark)
	    e = this._mark(e)

	  this.matches[index][e] = true

	  var st = this.statCache[abs]
	  if (st)
	    this.emit('stat', e, st)

	  this.emit('match', e)
	}

	Glob.prototype._readdirInGlobStar = function (abs, cb) {
	  if (this.aborted)
	    return

	  // follow all symlinked directories forever
	  // just proceed as if this is a non-globstar situation
	  if (this.follow)
	    return this._readdir(abs, false, cb)

	  var lstatkey = 'lstat\0' + abs
	  var self = this
	  var lstatcb = inflight(lstatkey, lstatcb_)

	  if (lstatcb)
	    fs.lstat(abs, lstatcb)

	  function lstatcb_ (er, lstat) {
	    if (er)
	      return cb()

	    var isSym = lstat.isSymbolicLink()
	    self.symlinks[abs] = isSym

	    // If it's not a symlink or a dir, then it's definitely a regular file.
	    // don't bother doing a readdir in that case.
	    if (!isSym && !lstat.isDirectory()) {
	      self.cache[abs] = 'FILE'
	      cb()
	    } else
	      self._readdir(abs, false, cb)
	  }
	}

	Glob.prototype._readdir = function (abs, inGlobStar, cb) {
	  if (this.aborted)
	    return

	  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
	  if (!cb)
	    return

	  //console.error('RD %j %j', +inGlobStar, abs)
	  if (inGlobStar && !ownProp(this.symlinks, abs))
	    return this._readdirInGlobStar(abs, cb)

	  if (ownProp(this.cache, abs)) {
	    var c = this.cache[abs]
	    if (!c || c === 'FILE')
	      return cb()

	    if (Array.isArray(c))
	      return cb(null, c)
	  }

	  var self = this
	  fs.readdir(abs, readdirCb(this, abs, cb))
	}

	function readdirCb (self, abs, cb) {
	  return function (er, entries) {
	    if (er)
	      self._readdirError(abs, er, cb)
	    else
	      self._readdirEntries(abs, entries, cb)
	  }
	}

	Glob.prototype._readdirEntries = function (abs, entries, cb) {
	  if (this.aborted)
	    return

	  // if we haven't asked to stat everything, then just
	  // assume that everything in there exists, so we can avoid
	  // having to stat it a second time.
	  if (!this.mark && !this.stat) {
	    for (var i = 0; i < entries.length; i ++) {
	      var e = entries[i]
	      if (abs === '/')
	        e = abs + e
	      else
	        e = abs + '/' + e
	      this.cache[e] = true
	    }
	  }

	  this.cache[abs] = entries
	  return cb(null, entries)
	}

	Glob.prototype._readdirError = function (f, er, cb) {
	  if (this.aborted)
	    return

	  // handle errors, and cache the information
	  switch (er.code) {
	    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
	    case 'ENOTDIR': // totally normal. means it *does* exist.
	      this.cache[this._makeAbs(f)] = 'FILE'
	      if (f === this.cwd) {
	        var error = new Error(er.code + ' invalid cwd ' + f)
	        error.path = f
	        error.code = er.code
	        this.emit('error', error)
	        this.abort()
	      }
	      break

	    case 'ENOENT': // not terribly unusual
	    case 'ELOOP':
	    case 'ENAMETOOLONG':
	    case 'UNKNOWN':
	      this.cache[this._makeAbs(f)] = false
	      break

	    default: // some unusual error.  Treat as failure.
	      this.cache[this._makeAbs(f)] = false
	      if (this.strict) {
	        this.emit('error', er)
	        // If the error is handled, then we abort
	        // if not, we threw out of here
	        this.abort()
	      }
	      if (!this.silent)
	        console.error('glob error', er)
	      break
	  }

	  return cb()
	}

	Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
	  var self = this
	  this._readdir(abs, inGlobStar, function (er, entries) {
	    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
	  })
	}


	Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
	  //console.error('pgs2', prefix, remain[0], entries)

	  // no entries means not a dir, so it can never have matches
	  // foo.txt/** doesn't match foo.txt
	  if (!entries)
	    return cb()

	  // test without the globstar, and with every child both below
	  // and replacing the globstar.
	  var remainWithoutGlobStar = remain.slice(1)
	  var gspref = prefix ? [ prefix ] : []
	  var noGlobStar = gspref.concat(remainWithoutGlobStar)

	  // the noGlobStar pattern exits the inGlobStar state
	  this._process(noGlobStar, index, false, cb)

	  var isSym = this.symlinks[abs]
	  var len = entries.length

	  // If it's a symlink, and we're in a globstar, then stop
	  if (isSym && inGlobStar)
	    return cb()

	  for (var i = 0; i < len; i++) {
	    var e = entries[i]
	    if (e.charAt(0) === '.' && !this.dot)
	      continue

	    // these two cases enter the inGlobStar state
	    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
	    this._process(instead, index, true, cb)

	    var below = gspref.concat(entries[i], remain)
	    this._process(below, index, true, cb)
	  }

	  cb()
	}

	Glob.prototype._processSimple = function (prefix, index, cb) {
	  // XXX review this.  Shouldn't it be doing the mounting etc
	  // before doing stat?  kinda weird?
	  var self = this
	  this._stat(prefix, function (er, exists) {
	    self._processSimple2(prefix, index, er, exists, cb)
	  })
	}
	Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

	  //console.error('ps2', prefix, exists)

	  if (!this.matches[index])
	    this.matches[index] = Object.create(null)

	  // If it doesn't exist, then just mark the lack of results
	  if (!exists)
	    return cb()

	  if (prefix && isAbsolute(prefix) && !this.nomount) {
	    var trail = /[\/\\]$/.test(prefix)
	    if (prefix.charAt(0) === '/') {
	      prefix = path.join(this.root, prefix)
	    } else {
	      prefix = path.resolve(this.root, prefix)
	      if (trail)
	        prefix += '/'
	    }
	  }

	  if (process.platform === 'win32')
	    prefix = prefix.replace(/\\/g, '/')

	  // Mark this as a match
	  this._emitMatch(index, prefix)
	  cb()
	}

	// Returns either 'DIR', 'FILE', or false
	Glob.prototype._stat = function (f, cb) {
	  var abs = this._makeAbs(f)
	  var needDir = f.slice(-1) === '/'

	  if (f.length > this.maxLength)
	    return cb()

	  if (!this.stat && ownProp(this.cache, abs)) {
	    var c = this.cache[abs]

	    if (Array.isArray(c))
	      c = 'DIR'

	    // It exists, but maybe not how we need it
	    if (!needDir || c === 'DIR')
	      return cb(null, c)

	    if (needDir && c === 'FILE')
	      return cb()

	    // otherwise we have to stat, because maybe c=true
	    // if we know it exists, but not what it is.
	  }

	  var exists
	  var stat = this.statCache[abs]
	  if (stat !== undefined) {
	    if (stat === false)
	      return cb(null, stat)
	    else {
	      var type = stat.isDirectory() ? 'DIR' : 'FILE'
	      if (needDir && type === 'FILE')
	        return cb()
	      else
	        return cb(null, type, stat)
	    }
	  }

	  var self = this
	  var statcb = inflight('stat\0' + abs, lstatcb_)
	  if (statcb)
	    fs.lstat(abs, statcb)

	  function lstatcb_ (er, lstat) {
	    if (lstat && lstat.isSymbolicLink()) {
	      // If it's a symlink, then treat it as the target, unless
	      // the target does not exist, then treat it as a file.
	      return fs.stat(abs, function (er, stat) {
	        if (er)
	          self._stat2(f, abs, null, lstat, cb)
	        else
	          self._stat2(f, abs, er, stat, cb)
	      })
	    } else {
	      self._stat2(f, abs, er, lstat, cb)
	    }
	  }
	}

	Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
	  if (er) {
	    this.statCache[abs] = false
	    return cb()
	  }

	  var needDir = f.slice(-1) === '/'
	  this.statCache[abs] = stat

	  if (abs.slice(-1) === '/' && !stat.isDirectory())
	    return cb(null, false, stat)

	  var c = stat.isDirectory() ? 'DIR' : 'FILE'
	  this.cache[abs] = this.cache[abs] || c

	  if (needDir && c !== 'DIR')
	    return cb()

	  return cb(null, c, stat)
	}


/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = minimatch
	minimatch.Minimatch = Minimatch

	var path = { sep: '/' }
	try {
	  path = __webpack_require__(4)
	} catch (er) {}

	var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
	var expand = __webpack_require__(5)

	// any single thing other than /
	// don't need to escape / when using new RegExp()
	var qmark = '[^/]'

	// * => any number of characters
	var star = qmark + '*?'

	// ** when dots are allowed.  Anything goes, except .. and .
	// not (^ or / followed by one or two dots followed by $ or /),
	// followed by anything, any number of times.
	var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

	// not a ^ or / followed by a dot,
	// followed by anything, any number of times.
	var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

	// characters that need to be escaped in RegExp.
	var reSpecials = charSet('().*{}+?[]^$\\!')

	// "abc" -> { a:true, b:true, c:true }
	function charSet (s) {
	  return s.split('').reduce(function (set, c) {
	    set[c] = true
	    return set
	  }, {})
	}

	// normalizes slashes.
	var slashSplit = /\/+/

	minimatch.filter = filter
	function filter (pattern, options) {
	  options = options || {}
	  return function (p, i, list) {
	    return minimatch(p, pattern, options)
	  }
	}

	function ext (a, b) {
	  a = a || {}
	  b = b || {}
	  var t = {}
	  Object.keys(b).forEach(function (k) {
	    t[k] = b[k]
	  })
	  Object.keys(a).forEach(function (k) {
	    t[k] = a[k]
	  })
	  return t
	}

	minimatch.defaults = function (def) {
	  if (!def || !Object.keys(def).length) return minimatch

	  var orig = minimatch

	  var m = function minimatch (p, pattern, options) {
	    return orig.minimatch(p, pattern, ext(def, options))
	  }

	  m.Minimatch = function Minimatch (pattern, options) {
	    return new orig.Minimatch(pattern, ext(def, options))
	  }

	  return m
	}

	Minimatch.defaults = function (def) {
	  if (!def || !Object.keys(def).length) return Minimatch
	  return minimatch.defaults(def).Minimatch
	}

	function minimatch (p, pattern, options) {
	  if (typeof pattern !== 'string') {
	    throw new TypeError('glob pattern string required')
	  }

	  if (!options) options = {}

	  // shortcut: comments match nothing.
	  if (!options.nocomment && pattern.charAt(0) === '#') {
	    return false
	  }

	  // "" only matches ""
	  if (pattern.trim() === '') return p === ''

	  return new Minimatch(pattern, options).match(p)
	}

	function Minimatch (pattern, options) {
	  if (!(this instanceof Minimatch)) {
	    return new Minimatch(pattern, options)
	  }

	  if (typeof pattern !== 'string') {
	    throw new TypeError('glob pattern string required')
	  }

	  if (!options) options = {}
	  pattern = pattern.trim()

	  // windows support: need to use /, not \
	  if (path.sep !== '/') {
	    pattern = pattern.split(path.sep).join('/')
	  }

	  this.options = options
	  this.set = []
	  this.pattern = pattern
	  this.regexp = null
	  this.negate = false
	  this.comment = false
	  this.empty = false

	  // make the set of regexps etc.
	  this.make()
	}

	Minimatch.prototype.debug = function () {}

	Minimatch.prototype.make = make
	function make () {
	  // don't do it more than once.
	  if (this._made) return

	  var pattern = this.pattern
	  var options = this.options

	  // empty patterns and comments match nothing.
	  if (!options.nocomment && pattern.charAt(0) === '#') {
	    this.comment = true
	    return
	  }
	  if (!pattern) {
	    this.empty = true
	    return
	  }

	  // step 1: figure out negation, etc.
	  this.parseNegate()

	  // step 2: expand braces
	  var set = this.globSet = this.braceExpand()

	  if (options.debug) this.debug = console.error

	  this.debug(this.pattern, set)

	  // step 3: now we have a set, so turn each one into a series of path-portion
	  // matching patterns.
	  // These will be regexps, except in the case of "**", which is
	  // set to the GLOBSTAR object for globstar behavior,
	  // and will not contain any / characters
	  set = this.globParts = set.map(function (s) {
	    return s.split(slashSplit)
	  })

	  this.debug(this.pattern, set)

	  // glob --> regexps
	  set = set.map(function (s, si, set) {
	    return s.map(this.parse, this)
	  }, this)

	  this.debug(this.pattern, set)

	  // filter out everything that didn't compile properly.
	  set = set.filter(function (s) {
	    return s.indexOf(false) === -1
	  })

	  this.debug(this.pattern, set)

	  this.set = set
	}

	Minimatch.prototype.parseNegate = parseNegate
	function parseNegate () {
	  var pattern = this.pattern
	  var negate = false
	  var options = this.options
	  var negateOffset = 0

	  if (options.nonegate) return

	  for (var i = 0, l = pattern.length
	    ; i < l && pattern.charAt(i) === '!'
	    ; i++) {
	    negate = !negate
	    negateOffset++
	  }

	  if (negateOffset) this.pattern = pattern.substr(negateOffset)
	  this.negate = negate
	}

	// Brace expansion:
	// a{b,c}d -> abd acd
	// a{b,}c -> abc ac
	// a{0..3}d -> a0d a1d a2d a3d
	// a{b,c{d,e}f}g -> abg acdfg acefg
	// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
	//
	// Invalid sets are not expanded.
	// a{2..}b -> a{2..}b
	// a{b}c -> a{b}c
	minimatch.braceExpand = function (pattern, options) {
	  return braceExpand(pattern, options)
	}

	Minimatch.prototype.braceExpand = braceExpand

	function braceExpand (pattern, options) {
	  if (!options) {
	    if (this instanceof Minimatch) {
	      options = this.options
	    } else {
	      options = {}
	    }
	  }

	  pattern = typeof pattern === 'undefined'
	    ? this.pattern : pattern

	  if (typeof pattern === 'undefined') {
	    throw new Error('undefined pattern')
	  }

	  if (options.nobrace ||
	    !pattern.match(/\{.*\}/)) {
	    // shortcut. no need to expand.
	    return [pattern]
	  }

	  return expand(pattern)
	}

	// parse a component of the expanded set.
	// At this point, no pattern may contain "/" in it
	// so we're going to return a 2d array, where each entry is the full
	// pattern, split on '/', and then turned into a regular expression.
	// A regexp is made at the end which joins each array with an
	// escaped /, and another full one which joins each regexp with |.
	//
	// Following the lead of Bash 4.1, note that "**" only has special meaning
	// when it is the *only* thing in a path portion.  Otherwise, any series
	// of * is equivalent to a single *.  Globstar behavior is enabled by
	// default, and can be disabled by setting options.noglobstar.
	Minimatch.prototype.parse = parse
	var SUBPARSE = {}
	function parse (pattern, isSub) {
	  var options = this.options

	  // shortcuts
	  if (!options.noglobstar && pattern === '**') return GLOBSTAR
	  if (pattern === '') return ''

	  var re = ''
	  var hasMagic = !!options.nocase
	  var escaping = false
	  // ? => one single character
	  var patternListStack = []
	  var negativeLists = []
	  var plType
	  var stateChar
	  var inClass = false
	  var reClassStart = -1
	  var classStart = -1
	  // . and .. never match anything that doesn't start with .,
	  // even when options.dot is set.
	  var patternStart = pattern.charAt(0) === '.' ? '' // anything
	  // not (start or / followed by . or .. followed by / or end)
	  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
	  : '(?!\\.)'
	  var self = this

	  function clearStateChar () {
	    if (stateChar) {
	      // we had some state-tracking character
	      // that wasn't consumed by this pass.
	      switch (stateChar) {
	        case '*':
	          re += star
	          hasMagic = true
	        break
	        case '?':
	          re += qmark
	          hasMagic = true
	        break
	        default:
	          re += '\\' + stateChar
	        break
	      }
	      self.debug('clearStateChar %j %j', stateChar, re)
	      stateChar = false
	    }
	  }

	  for (var i = 0, len = pattern.length, c
	    ; (i < len) && (c = pattern.charAt(i))
	    ; i++) {
	    this.debug('%s\t%s %s %j', pattern, i, re, c)

	    // skip over any that are escaped.
	    if (escaping && reSpecials[c]) {
	      re += '\\' + c
	      escaping = false
	      continue
	    }

	    switch (c) {
	      case '/':
	        // completely not allowed, even escaped.
	        // Should already be path-split by now.
	        return false

	      case '\\':
	        clearStateChar()
	        escaping = true
	      continue

	      // the various stateChar values
	      // for the "extglob" stuff.
	      case '?':
	      case '*':
	      case '+':
	      case '@':
	      case '!':
	        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

	        // all of those are literals inside a class, except that
	        // the glob [!a] means [^a] in regexp
	        if (inClass) {
	          this.debug('  in class')
	          if (c === '!' && i === classStart + 1) c = '^'
	          re += c
	          continue
	        }

	        // if we already have a stateChar, then it means
	        // that there was something like ** or +? in there.
	        // Handle the stateChar, then proceed with this one.
	        self.debug('call clearStateChar %j', stateChar)
	        clearStateChar()
	        stateChar = c
	        // if extglob is disabled, then +(asdf|foo) isn't a thing.
	        // just clear the statechar *now*, rather than even diving into
	        // the patternList stuff.
	        if (options.noext) clearStateChar()
	      continue

	      case '(':
	        if (inClass) {
	          re += '('
	          continue
	        }

	        if (!stateChar) {
	          re += '\\('
	          continue
	        }

	        plType = stateChar
	        patternListStack.push({
	          type: plType,
	          start: i - 1,
	          reStart: re.length
	        })
	        // negation is (?:(?!js)[^/]*)
	        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
	        this.debug('plType %j %j', stateChar, re)
	        stateChar = false
	      continue

	      case ')':
	        if (inClass || !patternListStack.length) {
	          re += '\\)'
	          continue
	        }

	        clearStateChar()
	        hasMagic = true
	        re += ')'
	        var pl = patternListStack.pop()
	        plType = pl.type
	        // negation is (?:(?!js)[^/]*)
	        // The others are (?:<pattern>)<type>
	        switch (plType) {
	          case '!':
	            negativeLists.push(pl)
	            re += ')[^/]*?)'
	            pl.reEnd = re.length
	            break
	          case '?':
	          case '+':
	          case '*':
	            re += plType
	            break
	          case '@': break // the default anyway
	        }
	      continue

	      case '|':
	        if (inClass || !patternListStack.length || escaping) {
	          re += '\\|'
	          escaping = false
	          continue
	        }

	        clearStateChar()
	        re += '|'
	      continue

	      // these are mostly the same in regexp and glob
	      case '[':
	        // swallow any state-tracking char before the [
	        clearStateChar()

	        if (inClass) {
	          re += '\\' + c
	          continue
	        }

	        inClass = true
	        classStart = i
	        reClassStart = re.length
	        re += c
	      continue

	      case ']':
	        //  a right bracket shall lose its special
	        //  meaning and represent itself in
	        //  a bracket expression if it occurs
	        //  first in the list.  -- POSIX.2 2.8.3.2
	        if (i === classStart + 1 || !inClass) {
	          re += '\\' + c
	          escaping = false
	          continue
	        }

	        // handle the case where we left a class open.
	        // "[z-a]" is valid, equivalent to "\[z-a\]"
	        if (inClass) {
	          // split where the last [ was, make sure we don't have
	          // an invalid re. if so, re-walk the contents of the
	          // would-be class to re-translate any characters that
	          // were passed through as-is
	          // TODO: It would probably be faster to determine this
	          // without a try/catch and a new RegExp, but it's tricky
	          // to do safely.  For now, this is safe and works.
	          var cs = pattern.substring(classStart + 1, i)
	          try {
	            RegExp('[' + cs + ']')
	          } catch (er) {
	            // not a valid class!
	            var sp = this.parse(cs, SUBPARSE)
	            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
	            hasMagic = hasMagic || sp[1]
	            inClass = false
	            continue
	          }
	        }

	        // finish up the class.
	        hasMagic = true
	        inClass = false
	        re += c
	      continue

	      default:
	        // swallow any state char that wasn't consumed
	        clearStateChar()

	        if (escaping) {
	          // no need
	          escaping = false
	        } else if (reSpecials[c]
	          && !(c === '^' && inClass)) {
	          re += '\\'
	        }

	        re += c

	    } // switch
	  } // for

	  // handle the case where we left a class open.
	  // "[abc" is valid, equivalent to "\[abc"
	  if (inClass) {
	    // split where the last [ was, and escape it
	    // this is a huge pita.  We now have to re-walk
	    // the contents of the would-be class to re-translate
	    // any characters that were passed through as-is
	    cs = pattern.substr(classStart + 1)
	    sp = this.parse(cs, SUBPARSE)
	    re = re.substr(0, reClassStart) + '\\[' + sp[0]
	    hasMagic = hasMagic || sp[1]
	  }

	  // handle the case where we had a +( thing at the *end*
	  // of the pattern.
	  // each pattern list stack adds 3 chars, and we need to go through
	  // and escape any | chars that were passed through as-is for the regexp.
	  // Go through and escape them, taking care not to double-escape any
	  // | chars that were already escaped.
	  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
	    var tail = re.slice(pl.reStart + 3)
	    // maybe some even number of \, then maybe 1 \, followed by a |
	    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
	      if (!$2) {
	        // the | isn't already escaped, so escape it.
	        $2 = '\\'
	      }

	      // need to escape all those slashes *again*, without escaping the
	      // one that we need for escaping the | character.  As it works out,
	      // escaping an even number of slashes can be done by simply repeating
	      // it exactly after itself.  That's why this trick works.
	      //
	      // I am sorry that you have to see this.
	      return $1 + $1 + $2 + '|'
	    })

	    this.debug('tail=%j\n   %s', tail, tail)
	    var t = pl.type === '*' ? star
	      : pl.type === '?' ? qmark
	      : '\\' + pl.type

	    hasMagic = true
	    re = re.slice(0, pl.reStart) + t + '\\(' + tail
	  }

	  // handle trailing things that only matter at the very end.
	  clearStateChar()
	  if (escaping) {
	    // trailing \\
	    re += '\\\\'
	  }

	  // only need to apply the nodot start if the re starts with
	  // something that could conceivably capture a dot
	  var addPatternStart = false
	  switch (re.charAt(0)) {
	    case '.':
	    case '[':
	    case '(': addPatternStart = true
	  }

	  // Hack to work around lack of negative lookbehind in JS
	  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
	  // like 'a.xyz.yz' doesn't match.  So, the first negative
	  // lookahead, has to look ALL the way ahead, to the end of
	  // the pattern.
	  for (var n = negativeLists.length - 1; n > -1; n--) {
	    var nl = negativeLists[n]

	    var nlBefore = re.slice(0, nl.reStart)
	    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
	    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
	    var nlAfter = re.slice(nl.reEnd)

	    nlLast += nlAfter

	    // Handle nested stuff like *(*.js|!(*.json)), where open parens
	    // mean that we should *not* include the ) in the bit that is considered
	    // "after" the negated section.
	    var openParensBefore = nlBefore.split('(').length - 1
	    var cleanAfter = nlAfter
	    for (i = 0; i < openParensBefore; i++) {
	      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
	    }
	    nlAfter = cleanAfter

	    var dollar = ''
	    if (nlAfter === '' && isSub !== SUBPARSE) {
	      dollar = '$'
	    }
	    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
	    re = newRe
	  }

	  // if the re is not "" at this point, then we need to make sure
	  // it doesn't match against an empty path part.
	  // Otherwise a/* will match a/, which it should not.
	  if (re !== '' && hasMagic) {
	    re = '(?=.)' + re
	  }

	  if (addPatternStart) {
	    re = patternStart + re
	  }

	  // parsing just a piece of a larger pattern.
	  if (isSub === SUBPARSE) {
	    return [re, hasMagic]
	  }

	  // skip the regexp for non-magical patterns
	  // unescape anything in it, though, so that it'll be
	  // an exact match against a file etc.
	  if (!hasMagic) {
	    return globUnescape(pattern)
	  }

	  var flags = options.nocase ? 'i' : ''
	  var regExp = new RegExp('^' + re + '$', flags)

	  regExp._glob = pattern
	  regExp._src = re

	  return regExp
	}

	minimatch.makeRe = function (pattern, options) {
	  return new Minimatch(pattern, options || {}).makeRe()
	}

	Minimatch.prototype.makeRe = makeRe
	function makeRe () {
	  if (this.regexp || this.regexp === false) return this.regexp

	  // at this point, this.set is a 2d array of partial
	  // pattern strings, or "**".
	  //
	  // It's better to use .match().  This function shouldn't
	  // be used, really, but it's pretty convenient sometimes,
	  // when you just want to work with a regex.
	  var set = this.set

	  if (!set.length) {
	    this.regexp = false
	    return this.regexp
	  }
	  var options = this.options

	  var twoStar = options.noglobstar ? star
	    : options.dot ? twoStarDot
	    : twoStarNoDot
	  var flags = options.nocase ? 'i' : ''

	  var re = set.map(function (pattern) {
	    return pattern.map(function (p) {
	      return (p === GLOBSTAR) ? twoStar
	      : (typeof p === 'string') ? regExpEscape(p)
	      : p._src
	    }).join('\\\/')
	  }).join('|')

	  // must match entire pattern
	  // ending in a * or ** will make it less strict.
	  re = '^(?:' + re + ')$'

	  // can match anything, as long as it's not this.
	  if (this.negate) re = '^(?!' + re + ').*$'

	  try {
	    this.regexp = new RegExp(re, flags)
	  } catch (ex) {
	    this.regexp = false
	  }
	  return this.regexp
	}

	minimatch.match = function (list, pattern, options) {
	  options = options || {}
	  var mm = new Minimatch(pattern, options)
	  list = list.filter(function (f) {
	    return mm.match(f)
	  })
	  if (mm.options.nonull && !list.length) {
	    list.push(pattern)
	  }
	  return list
	}

	Minimatch.prototype.match = match
	function match (f, partial) {
	  this.debug('match', f, this.pattern)
	  // short-circuit in the case of busted things.
	  // comments, etc.
	  if (this.comment) return false
	  if (this.empty) return f === ''

	  if (f === '/' && partial) return true

	  var options = this.options

	  // windows: need to use /, not \
	  if (path.sep !== '/') {
	    f = f.split(path.sep).join('/')
	  }

	  // treat the test path as a set of pathparts.
	  f = f.split(slashSplit)
	  this.debug(this.pattern, 'split', f)

	  // just ONE of the pattern sets in this.set needs to match
	  // in order for it to be valid.  If negating, then just one
	  // match means that we have failed.
	  // Either way, return on the first hit.

	  var set = this.set
	  this.debug(this.pattern, 'set', set)

	  // Find the basename of the path by looking for the last non-empty segment
	  var filename
	  var i
	  for (i = f.length - 1; i >= 0; i--) {
	    filename = f[i]
	    if (filename) break
	  }

	  for (i = 0; i < set.length; i++) {
	    var pattern = set[i]
	    var file = f
	    if (options.matchBase && pattern.length === 1) {
	      file = [filename]
	    }
	    var hit = this.matchOne(file, pattern, partial)
	    if (hit) {
	      if (options.flipNegate) return true
	      return !this.negate
	    }
	  }

	  // didn't get any hits.  this is success if it's a negative
	  // pattern, failure otherwise.
	  if (options.flipNegate) return false
	  return this.negate
	}

	// set partial to true to test if, for example,
	// "/a/b" matches the start of "/*/b/*/d"
	// Partial means, if you run out of file before you run
	// out of pattern, then that's fine, as long as all
	// the parts match.
	Minimatch.prototype.matchOne = function (file, pattern, partial) {
	  var options = this.options

	  this.debug('matchOne',
	    { 'this': this, file: file, pattern: pattern })

	  this.debug('matchOne', file.length, pattern.length)

	  for (var fi = 0,
	      pi = 0,
	      fl = file.length,
	      pl = pattern.length
	      ; (fi < fl) && (pi < pl)
	      ; fi++, pi++) {
	    this.debug('matchOne loop')
	    var p = pattern[pi]
	    var f = file[fi]

	    this.debug(pattern, p, f)

	    // should be impossible.
	    // some invalid regexp stuff in the set.
	    if (p === false) return false

	    if (p === GLOBSTAR) {
	      this.debug('GLOBSTAR', [pattern, p, f])

	      // "**"
	      // a/**/b/**/c would match the following:
	      // a/b/x/y/z/c
	      // a/x/y/z/b/c
	      // a/b/x/b/x/c
	      // a/b/c
	      // To do this, take the rest of the pattern after
	      // the **, and see if it would match the file remainder.
	      // If so, return success.
	      // If not, the ** "swallows" a segment, and try again.
	      // This is recursively awful.
	      //
	      // a/**/b/**/c matching a/b/x/y/z/c
	      // - a matches a
	      // - doublestar
	      //   - matchOne(b/x/y/z/c, b/**/c)
	      //     - b matches b
	      //     - doublestar
	      //       - matchOne(x/y/z/c, c) -> no
	      //       - matchOne(y/z/c, c) -> no
	      //       - matchOne(z/c, c) -> no
	      //       - matchOne(c, c) yes, hit
	      var fr = fi
	      var pr = pi + 1
	      if (pr === pl) {
	        this.debug('** at the end')
	        // a ** at the end will just swallow the rest.
	        // We have found a match.
	        // however, it will not swallow /.x, unless
	        // options.dot is set.
	        // . and .. are *never* matched by **, for explosively
	        // exponential reasons.
	        for (; fi < fl; fi++) {
	          if (file[fi] === '.' || file[fi] === '..' ||
	            (!options.dot && file[fi].charAt(0) === '.')) return false
	        }
	        return true
	      }

	      // ok, let's see if we can swallow whatever we can.
	      while (fr < fl) {
	        var swallowee = file[fr]

	        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

	        // XXX remove this slice.  Just pass the start index.
	        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
	          this.debug('globstar found match!', fr, fl, swallowee)
	          // found a match.
	          return true
	        } else {
	          // can't swallow "." or ".." ever.
	          // can only swallow ".foo" when explicitly asked.
	          if (swallowee === '.' || swallowee === '..' ||
	            (!options.dot && swallowee.charAt(0) === '.')) {
	            this.debug('dot detected!', file, fr, pattern, pr)
	            break
	          }

	          // ** swallows a segment, and continue.
	          this.debug('globstar swallow a segment, and continue')
	          fr++
	        }
	      }

	      // no match was found.
	      // However, in partial mode, we can't say this is necessarily over.
	      // If there's more *pattern* left, then
	      if (partial) {
	        // ran out of file
	        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
	        if (fr === fl) return true
	      }
	      return false
	    }

	    // something other than **
	    // non-magic patterns just have to match exactly
	    // patterns with magic have been turned into regexps.
	    var hit
	    if (typeof p === 'string') {
	      if (options.nocase) {
	        hit = f.toLowerCase() === p.toLowerCase()
	      } else {
	        hit = f === p
	      }
	      this.debug('string match', p, f, hit)
	    } else {
	      hit = f.match(p)
	      this.debug('pattern match', p, f, hit)
	    }

	    if (!hit) return false
	  }

	  // Note: ending in / means that we'll get a final ""
	  // at the end of the pattern.  This can only match a
	  // corresponding "" at the end of the file.
	  // If the file ends in /, then it can only match a
	  // a pattern that ends in /, unless the pattern just
	  // doesn't have any more for it. But, a/b/ should *not*
	  // match "a/b/*", even though "" matches against the
	  // [^/]*? pattern, except in partial mode, where it might
	  // simply not be reached yet.
	  // However, a/b/ should still satisfy a/*

	  // now either we fell off the end of the pattern, or we're done.
	  if (fi === fl && pi === pl) {
	    // ran out of pattern and filename at the same time.
	    // an exact hit!
	    return true
	  } else if (fi === fl) {
	    // ran out of file, but still had pattern left.
	    // this is ok if we're doing the match as part of
	    // a glob fs traversal.
	    return partial
	  } else if (pi === pl) {
	    // ran out of pattern, still have file left.
	    // this is only acceptable if we're on the very last
	    // empty segment of a file with a trailing slash.
	    // a/* should match a/b/
	    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
	    return emptyFileEnd
	  }

	  // should be unreachable.
	  throw new Error('wtf?')
	}

	// replace stuff like \* with *
	function globUnescape (s) {
	  return s.replace(/\\(.)/g, '$1')
	}

	function regExpEscape (s) {
	  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
	}


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var concatMap = __webpack_require__(6);
	var balanced = __webpack_require__(7);

	module.exports = expandTop;

	var escSlash = '\0SLASH'+Math.random()+'\0';
	var escOpen = '\0OPEN'+Math.random()+'\0';
	var escClose = '\0CLOSE'+Math.random()+'\0';
	var escComma = '\0COMMA'+Math.random()+'\0';
	var escPeriod = '\0PERIOD'+Math.random()+'\0';

	function numeric(str) {
	  return parseInt(str, 10) == str
	    ? parseInt(str, 10)
	    : str.charCodeAt(0);
	}

	function escapeBraces(str) {
	  return str.split('\\\\').join(escSlash)
	            .split('\\{').join(escOpen)
	            .split('\\}').join(escClose)
	            .split('\\,').join(escComma)
	            .split('\\.').join(escPeriod);
	}

	function unescapeBraces(str) {
	  return str.split(escSlash).join('\\')
	            .split(escOpen).join('{')
	            .split(escClose).join('}')
	            .split(escComma).join(',')
	            .split(escPeriod).join('.');
	}


	// Basically just str.split(","), but handling cases
	// where we have nested braced sections, which should be
	// treated as individual members, like {a,{b,c},d}
	function parseCommaParts(str) {
	  if (!str)
	    return [''];

	  var parts = [];
	  var m = balanced('{', '}', str);

	  if (!m)
	    return str.split(',');

	  var pre = m.pre;
	  var body = m.body;
	  var post = m.post;
	  var p = pre.split(',');

	  p[p.length-1] += '{' + body + '}';
	  var postParts = parseCommaParts(post);
	  if (post.length) {
	    p[p.length-1] += postParts.shift();
	    p.push.apply(p, postParts);
	  }

	  parts.push.apply(parts, p);

	  return parts;
	}

	function expandTop(str) {
	  if (!str)
	    return [];

	  return expand(escapeBraces(str), true).map(unescapeBraces);
	}

	function identity(e) {
	  return e;
	}

	function embrace(str) {
	  return '{' + str + '}';
	}
	function isPadded(el) {
	  return /^-?0\d/.test(el);
	}

	function lte(i, y) {
	  return i <= y;
	}
	function gte(i, y) {
	  return i >= y;
	}

	function expand(str, isTop) {
	  var expansions = [];

	  var m = balanced('{', '}', str);
	  if (!m || /\$$/.test(m.pre)) return [str];

	  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
	  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
	  var isSequence = isNumericSequence || isAlphaSequence;
	  var isOptions = /^(.*,)+(.+)?$/.test(m.body);
	  if (!isSequence && !isOptions) {
	    // {a},b}
	    if (m.post.match(/,.*\}/)) {
	      str = m.pre + '{' + m.body + escClose + m.post;
	      return expand(str);
	    }
	    return [str];
	  }

	  var n;
	  if (isSequence) {
	    n = m.body.split(/\.\./);
	  } else {
	    n = parseCommaParts(m.body);
	    if (n.length === 1) {
	      // x{{a,b}}y ==> x{a}y x{b}y
	      n = expand(n[0], false).map(embrace);
	      if (n.length === 1) {
	        var post = m.post.length
	          ? expand(m.post, false)
	          : [''];
	        return post.map(function(p) {
	          return m.pre + n[0] + p;
	        });
	      }
	    }
	  }

	  // at this point, n is the parts, and we know it's not a comma set
	  // with a single entry.

	  // no need to expand pre, since it is guaranteed to be free of brace-sets
	  var pre = m.pre;
	  var post = m.post.length
	    ? expand(m.post, false)
	    : [''];

	  var N;

	  if (isSequence) {
	    var x = numeric(n[0]);
	    var y = numeric(n[1]);
	    var width = Math.max(n[0].length, n[1].length)
	    var incr = n.length == 3
	      ? Math.abs(numeric(n[2]))
	      : 1;
	    var test = lte;
	    var reverse = y < x;
	    if (reverse) {
	      incr *= -1;
	      test = gte;
	    }
	    var pad = n.some(isPadded);

	    N = [];

	    for (var i = x; test(i, y); i += incr) {
	      var c;
	      if (isAlphaSequence) {
	        c = String.fromCharCode(i);
	        if (c === '\\')
	          c = '';
	      } else {
	        c = String(i);
	        if (pad) {
	          var need = width - c.length;
	          if (need > 0) {
	            var z = new Array(need + 1).join('0');
	            if (i < 0)
	              c = '-' + z + c.slice(1);
	            else
	              c = z + c;
	          }
	        }
	      }
	      N.push(c);
	    }
	  } else {
	    N = concatMap(n, function(el) { return expand(el, false) });
	  }

	  for (var j = 0; j < N.length; j++) {
	    for (var k = 0; k < post.length; k++) {
	      var expansion = pre + N[j] + post[k];
	      if (!isTop || isSequence || expansion)
	        expansions.push(expansion);
	    }
	  }

	  return expansions;
	}



/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = function (xs, fn) {
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        var x = fn(xs[i], i);
	        if (isArray(x)) res.push.apply(res, x);
	        else res.push(x);
	    }
	    return res;
	};

	var isArray = Array.isArray || function (xs) {
	    return Object.prototype.toString.call(xs) === '[object Array]';
	};


/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = balanced;
	function balanced(a, b, str) {
	  var r = range(a, b, str);

	  return r && {
	    start: r[0],
	    end: r[1],
	    pre: str.slice(0, r[0]),
	    body: str.slice(r[0] + a.length, r[1]),
	    post: str.slice(r[1] + b.length)
	  };
	}

	balanced.range = range;
	function range(a, b, str) {
	  var begs, beg, left, right, result;
	  var ai = str.indexOf(a);
	  var bi = str.indexOf(b, ai + 1);
	  var i = ai;

	  if (ai >= 0 && bi > 0) {
	    begs = [];
	    left = str.length;

	    while (i < str.length && i >= 0 && ! result) {
	      if (i == ai) {
	        begs.push(i);
	        ai = str.indexOf(a, i + 1);
	      } else if (begs.length == 1) {
	        result = [ begs.pop(), bi ];
	      } else {
	        beg = begs.pop();
	        if (beg < left) {
	          left = beg;
	          right = bi;
	        }

	        bi = str.indexOf(b, i + 1);
	      }

	      i = ai < bi && ai >= 0 ? ai : bi;
	    }

	    if (begs.length) {
	      result = [ left, right ];
	    }
	  }

	  return result;
	}


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(9).inherits


/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = require("util");

/***/ },
/* 10 */
/***/ function(module, exports) {

	module.exports = require("events");

/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = require("assert");

/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';

	function posix(path) {
		return path.charAt(0) === '/';
	};

	function win32(path) {
		// https://github.com/joyent/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
		var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
		var result = splitDeviceRe.exec(path);
		var device = result[1] || '';
		var isUnc = !!device && device.charAt(1) !== ':';

		// UNC paths are always absolute
		return !!result[2] || isUnc;
	};

	module.exports = process.platform === 'win32' ? win32 : posix;
	module.exports.posix = posix;
	module.exports.win32 = win32;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = globSync
	globSync.GlobSync = GlobSync

	var fs = __webpack_require__(2)
	var minimatch = __webpack_require__(3)
	var Minimatch = minimatch.Minimatch
	var Glob = __webpack_require__(1).Glob
	var util = __webpack_require__(9)
	var path = __webpack_require__(4)
	var assert = __webpack_require__(11)
	var isAbsolute = __webpack_require__(12)
	var common = __webpack_require__(14)
	var alphasort = common.alphasort
	var alphasorti = common.alphasorti
	var setopts = common.setopts
	var ownProp = common.ownProp
	var childrenIgnored = common.childrenIgnored

	function globSync (pattern, options) {
	  if (typeof options === 'function' || arguments.length === 3)
	    throw new TypeError('callback provided to sync glob\n'+
	                        'See: https://github.com/isaacs/node-glob/issues/167')

	  return new GlobSync(pattern, options).found
	}

	function GlobSync (pattern, options) {
	  if (!pattern)
	    throw new Error('must provide pattern')

	  if (typeof options === 'function' || arguments.length === 3)
	    throw new TypeError('callback provided to sync glob\n'+
	                        'See: https://github.com/isaacs/node-glob/issues/167')

	  if (!(this instanceof GlobSync))
	    return new GlobSync(pattern, options)

	  setopts(this, pattern, options)

	  if (this.noprocess)
	    return this

	  var n = this.minimatch.set.length
	  this.matches = new Array(n)
	  for (var i = 0; i < n; i ++) {
	    this._process(this.minimatch.set[i], i, false)
	  }
	  this._finish()
	}

	GlobSync.prototype._finish = function () {
	  assert(this instanceof GlobSync)
	  if (this.realpath) {
	    var self = this
	    this.matches.forEach(function (matchset, index) {
	      var set = self.matches[index] = Object.create(null)
	      for (var p in matchset) {
	        try {
	          p = self._makeAbs(p)
	          var real = fs.realpathSync(p, self.realpathCache)
	          set[real] = true
	        } catch (er) {
	          if (er.syscall === 'stat')
	            set[self._makeAbs(p)] = true
	          else
	            throw er
	        }
	      }
	    })
	  }
	  common.finish(this)
	}


	GlobSync.prototype._process = function (pattern, index, inGlobStar) {
	  assert(this instanceof GlobSync)

	  // Get the first [n] parts of pattern that are all strings.
	  var n = 0
	  while (typeof pattern[n] === 'string') {
	    n ++
	  }
	  // now n is the index of the first one that is *not* a string.

	  // See if there's anything else
	  var prefix
	  switch (n) {
	    // if not, then this is rather simple
	    case pattern.length:
	      this._processSimple(pattern.join('/'), index)
	      return

	    case 0:
	      // pattern *starts* with some non-trivial item.
	      // going to readdir(cwd), but not include the prefix in matches.
	      prefix = null
	      break

	    default:
	      // pattern has some string bits in the front.
	      // whatever it starts with, whether that's 'absolute' like /foo/bar,
	      // or 'relative' like '../baz'
	      prefix = pattern.slice(0, n).join('/')
	      break
	  }

	  var remain = pattern.slice(n)

	  // get the list of entries.
	  var read
	  if (prefix === null)
	    read = '.'
	  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
	    if (!prefix || !isAbsolute(prefix))
	      prefix = '/' + prefix
	    read = prefix
	  } else
	    read = prefix

	  var abs = this._makeAbs(read)

	  //if ignored, skip processing
	  if (childrenIgnored(this, read))
	    return

	  var isGlobStar = remain[0] === minimatch.GLOBSTAR
	  if (isGlobStar)
	    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
	  else
	    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
	}


	GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
	  var entries = this._readdir(abs, inGlobStar)

	  // if the abs isn't a dir, then nothing can match!
	  if (!entries)
	    return

	  // It will only match dot entries if it starts with a dot, or if
	  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
	  var pn = remain[0]
	  var negate = !!this.minimatch.negate
	  var rawGlob = pn._glob
	  var dotOk = this.dot || rawGlob.charAt(0) === '.'

	  var matchedEntries = []
	  for (var i = 0; i < entries.length; i++) {
	    var e = entries[i]
	    if (e.charAt(0) !== '.' || dotOk) {
	      var m
	      if (negate && !prefix) {
	        m = !e.match(pn)
	      } else {
	        m = e.match(pn)
	      }
	      if (m)
	        matchedEntries.push(e)
	    }
	  }

	  var len = matchedEntries.length
	  // If there are no matched entries, then nothing matches.
	  if (len === 0)
	    return

	  // if this is the last remaining pattern bit, then no need for
	  // an additional stat *unless* the user has specified mark or
	  // stat explicitly.  We know they exist, since readdir returned
	  // them.

	  if (remain.length === 1 && !this.mark && !this.stat) {
	    if (!this.matches[index])
	      this.matches[index] = Object.create(null)

	    for (var i = 0; i < len; i ++) {
	      var e = matchedEntries[i]
	      if (prefix) {
	        if (prefix.slice(-1) !== '/')
	          e = prefix + '/' + e
	        else
	          e = prefix + e
	      }

	      if (e.charAt(0) === '/' && !this.nomount) {
	        e = path.join(this.root, e)
	      }
	      this.matches[index][e] = true
	    }
	    // This was the last one, and no stats were needed
	    return
	  }

	  // now test all matched entries as stand-ins for that part
	  // of the pattern.
	  remain.shift()
	  for (var i = 0; i < len; i ++) {
	    var e = matchedEntries[i]
	    var newPattern
	    if (prefix)
	      newPattern = [prefix, e]
	    else
	      newPattern = [e]
	    this._process(newPattern.concat(remain), index, inGlobStar)
	  }
	}


	GlobSync.prototype._emitMatch = function (index, e) {
	  var abs = this._makeAbs(e)
	  if (this.mark)
	    e = this._mark(e)

	  if (this.matches[index][e])
	    return

	  if (this.nodir) {
	    var c = this.cache[this._makeAbs(e)]
	    if (c === 'DIR' || Array.isArray(c))
	      return
	  }

	  this.matches[index][e] = true
	  if (this.stat)
	    this._stat(e)
	}


	GlobSync.prototype._readdirInGlobStar = function (abs) {
	  // follow all symlinked directories forever
	  // just proceed as if this is a non-globstar situation
	  if (this.follow)
	    return this._readdir(abs, false)

	  var entries
	  var lstat
	  var stat
	  try {
	    lstat = fs.lstatSync(abs)
	  } catch (er) {
	    // lstat failed, doesn't exist
	    return null
	  }

	  var isSym = lstat.isSymbolicLink()
	  this.symlinks[abs] = isSym

	  // If it's not a symlink or a dir, then it's definitely a regular file.
	  // don't bother doing a readdir in that case.
	  if (!isSym && !lstat.isDirectory())
	    this.cache[abs] = 'FILE'
	  else
	    entries = this._readdir(abs, false)

	  return entries
	}

	GlobSync.prototype._readdir = function (abs, inGlobStar) {
	  var entries

	  if (inGlobStar && !ownProp(this.symlinks, abs))
	    return this._readdirInGlobStar(abs)

	  if (ownProp(this.cache, abs)) {
	    var c = this.cache[abs]
	    if (!c || c === 'FILE')
	      return null

	    if (Array.isArray(c))
	      return c
	  }

	  try {
	    return this._readdirEntries(abs, fs.readdirSync(abs))
	  } catch (er) {
	    this._readdirError(abs, er)
	    return null
	  }
	}

	GlobSync.prototype._readdirEntries = function (abs, entries) {
	  // if we haven't asked to stat everything, then just
	  // assume that everything in there exists, so we can avoid
	  // having to stat it a second time.
	  if (!this.mark && !this.stat) {
	    for (var i = 0; i < entries.length; i ++) {
	      var e = entries[i]
	      if (abs === '/')
	        e = abs + e
	      else
	        e = abs + '/' + e
	      this.cache[e] = true
	    }
	  }

	  this.cache[abs] = entries

	  // mark and cache dir-ness
	  return entries
	}

	GlobSync.prototype._readdirError = function (f, er) {
	  // handle errors, and cache the information
	  switch (er.code) {
	    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
	    case 'ENOTDIR': // totally normal. means it *does* exist.
	      this.cache[this._makeAbs(f)] = 'FILE'
	      if (f === this.cwd) {
	        var error = new Error(er.code + ' invalid cwd ' + f)
	        error.path = f
	        error.code = er.code
	        throw error
	      }
	      break

	    case 'ENOENT': // not terribly unusual
	    case 'ELOOP':
	    case 'ENAMETOOLONG':
	    case 'UNKNOWN':
	      this.cache[this._makeAbs(f)] = false
	      break

	    default: // some unusual error.  Treat as failure.
	      this.cache[this._makeAbs(f)] = false
	      if (this.strict)
	        throw er
	      if (!this.silent)
	        console.error('glob error', er)
	      break
	  }
	}

	GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

	  var entries = this._readdir(abs, inGlobStar)

	  // no entries means not a dir, so it can never have matches
	  // foo.txt/** doesn't match foo.txt
	  if (!entries)
	    return

	  // test without the globstar, and with every child both below
	  // and replacing the globstar.
	  var remainWithoutGlobStar = remain.slice(1)
	  var gspref = prefix ? [ prefix ] : []
	  var noGlobStar = gspref.concat(remainWithoutGlobStar)

	  // the noGlobStar pattern exits the inGlobStar state
	  this._process(noGlobStar, index, false)

	  var len = entries.length
	  var isSym = this.symlinks[abs]

	  // If it's a symlink, and we're in a globstar, then stop
	  if (isSym && inGlobStar)
	    return

	  for (var i = 0; i < len; i++) {
	    var e = entries[i]
	    if (e.charAt(0) === '.' && !this.dot)
	      continue

	    // these two cases enter the inGlobStar state
	    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
	    this._process(instead, index, true)

	    var below = gspref.concat(entries[i], remain)
	    this._process(below, index, true)
	  }
	}

	GlobSync.prototype._processSimple = function (prefix, index) {
	  // XXX review this.  Shouldn't it be doing the mounting etc
	  // before doing stat?  kinda weird?
	  var exists = this._stat(prefix)

	  if (!this.matches[index])
	    this.matches[index] = Object.create(null)

	  // If it doesn't exist, then just mark the lack of results
	  if (!exists)
	    return

	  if (prefix && isAbsolute(prefix) && !this.nomount) {
	    var trail = /[\/\\]$/.test(prefix)
	    if (prefix.charAt(0) === '/') {
	      prefix = path.join(this.root, prefix)
	    } else {
	      prefix = path.resolve(this.root, prefix)
	      if (trail)
	        prefix += '/'
	    }
	  }

	  if (process.platform === 'win32')
	    prefix = prefix.replace(/\\/g, '/')

	  // Mark this as a match
	  this.matches[index][prefix] = true
	}

	// Returns either 'DIR', 'FILE', or false
	GlobSync.prototype._stat = function (f) {
	  var abs = this._makeAbs(f)
	  var needDir = f.slice(-1) === '/'

	  if (f.length > this.maxLength)
	    return false

	  if (!this.stat && ownProp(this.cache, abs)) {
	    var c = this.cache[abs]

	    if (Array.isArray(c))
	      c = 'DIR'

	    // It exists, but maybe not how we need it
	    if (!needDir || c === 'DIR')
	      return c

	    if (needDir && c === 'FILE')
	      return false

	    // otherwise we have to stat, because maybe c=true
	    // if we know it exists, but not what it is.
	  }

	  var exists
	  var stat = this.statCache[abs]
	  if (!stat) {
	    var lstat
	    try {
	      lstat = fs.lstatSync(abs)
	    } catch (er) {
	      return false
	    }

	    if (lstat.isSymbolicLink()) {
	      try {
	        stat = fs.statSync(abs)
	      } catch (er) {
	        stat = lstat
	      }
	    } else {
	      stat = lstat
	    }
	  }

	  this.statCache[abs] = stat

	  var c = stat.isDirectory() ? 'DIR' : 'FILE'
	  this.cache[abs] = this.cache[abs] || c

	  if (needDir && c !== 'DIR')
	    return false

	  return c
	}

	GlobSync.prototype._mark = function (p) {
	  return common.mark(this, p)
	}

	GlobSync.prototype._makeAbs = function (f) {
	  return common.makeAbs(this, f)
	}


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	exports.alphasort = alphasort
	exports.alphasorti = alphasorti
	exports.setopts = setopts
	exports.ownProp = ownProp
	exports.makeAbs = makeAbs
	exports.finish = finish
	exports.mark = mark
	exports.isIgnored = isIgnored
	exports.childrenIgnored = childrenIgnored

	function ownProp (obj, field) {
	  return Object.prototype.hasOwnProperty.call(obj, field)
	}

	var path = __webpack_require__(4)
	var minimatch = __webpack_require__(3)
	var isAbsolute = __webpack_require__(12)
	var Minimatch = minimatch.Minimatch

	function alphasorti (a, b) {
	  return a.toLowerCase().localeCompare(b.toLowerCase())
	}

	function alphasort (a, b) {
	  return a.localeCompare(b)
	}

	function setupIgnores (self, options) {
	  self.ignore = options.ignore || []

	  if (!Array.isArray(self.ignore))
	    self.ignore = [self.ignore]

	  if (self.ignore.length) {
	    self.ignore = self.ignore.map(ignoreMap)
	  }
	}

	// ignore patterns are always in dot:true mode.
	function ignoreMap (pattern) {
	  var gmatcher = null
	  if (pattern.slice(-3) === '/**') {
	    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
	    gmatcher = new Minimatch(gpattern, { dot: true })
	  }

	  return {
	    matcher: new Minimatch(pattern, { dot: true }),
	    gmatcher: gmatcher
	  }
	}

	function setopts (self, pattern, options) {
	  if (!options)
	    options = {}

	  // base-matching: just use globstar for that.
	  if (options.matchBase && -1 === pattern.indexOf("/")) {
	    if (options.noglobstar) {
	      throw new Error("base matching requires globstar")
	    }
	    pattern = "**/" + pattern
	  }

	  self.silent = !!options.silent
	  self.pattern = pattern
	  self.strict = options.strict !== false
	  self.realpath = !!options.realpath
	  self.realpathCache = options.realpathCache || Object.create(null)
	  self.follow = !!options.follow
	  self.dot = !!options.dot
	  self.mark = !!options.mark
	  self.nodir = !!options.nodir
	  if (self.nodir)
	    self.mark = true
	  self.sync = !!options.sync
	  self.nounique = !!options.nounique
	  self.nonull = !!options.nonull
	  self.nosort = !!options.nosort
	  self.nocase = !!options.nocase
	  self.stat = !!options.stat
	  self.noprocess = !!options.noprocess

	  self.maxLength = options.maxLength || Infinity
	  self.cache = options.cache || Object.create(null)
	  self.statCache = options.statCache || Object.create(null)
	  self.symlinks = options.symlinks || Object.create(null)

	  setupIgnores(self, options)

	  self.changedCwd = false
	  var cwd = process.cwd()
	  if (!ownProp(options, "cwd"))
	    self.cwd = cwd
	  else {
	    self.cwd = path.resolve(options.cwd)
	    self.changedCwd = self.cwd !== cwd
	  }

	  self.root = options.root || path.resolve(self.cwd, "/")
	  self.root = path.resolve(self.root)
	  if (process.platform === "win32")
	    self.root = self.root.replace(/\\/g, "/")

	  self.nomount = !!options.nomount

	  // disable comments and negation in Minimatch.
	  // Note that they are not supported in Glob itself anyway.
	  options.nonegate = true
	  options.nocomment = true

	  self.minimatch = new Minimatch(pattern, options)
	  self.options = self.minimatch.options
	}

	function finish (self) {
	  var nou = self.nounique
	  var all = nou ? [] : Object.create(null)

	  for (var i = 0, l = self.matches.length; i < l; i ++) {
	    var matches = self.matches[i]
	    if (!matches || Object.keys(matches).length === 0) {
	      if (self.nonull) {
	        // do like the shell, and spit out the literal glob
	        var literal = self.minimatch.globSet[i]
	        if (nou)
	          all.push(literal)
	        else
	          all[literal] = true
	      }
	    } else {
	      // had matches
	      var m = Object.keys(matches)
	      if (nou)
	        all.push.apply(all, m)
	      else
	        m.forEach(function (m) {
	          all[m] = true
	        })
	    }
	  }

	  if (!nou)
	    all = Object.keys(all)

	  if (!self.nosort)
	    all = all.sort(self.nocase ? alphasorti : alphasort)

	  // at *some* point we statted all of these
	  if (self.mark) {
	    for (var i = 0; i < all.length; i++) {
	      all[i] = self._mark(all[i])
	    }
	    if (self.nodir) {
	      all = all.filter(function (e) {
	        return !(/\/$/.test(e))
	      })
	    }
	  }

	  if (self.ignore.length)
	    all = all.filter(function(m) {
	      return !isIgnored(self, m)
	    })

	  self.found = all
	}

	function mark (self, p) {
	  var abs = makeAbs(self, p)
	  var c = self.cache[abs]
	  var m = p
	  if (c) {
	    var isDir = c === 'DIR' || Array.isArray(c)
	    var slash = p.slice(-1) === '/'

	    if (isDir && !slash)
	      m += '/'
	    else if (!isDir && slash)
	      m = m.slice(0, -1)

	    if (m !== p) {
	      var mabs = makeAbs(self, m)
	      self.statCache[mabs] = self.statCache[abs]
	      self.cache[mabs] = self.cache[abs]
	    }
	  }

	  return m
	}

	// lotta situps...
	function makeAbs (self, f) {
	  var abs = f
	  if (f.charAt(0) === '/') {
	    abs = path.join(self.root, f)
	  } else if (isAbsolute(f) || f === '') {
	    abs = f
	  } else if (self.changedCwd) {
	    abs = path.resolve(self.cwd, f)
	  } else {
	    abs = path.resolve(f)
	  }
	  return abs
	}


	// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
	// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
	function isIgnored (self, path) {
	  if (!self.ignore.length)
	    return false

	  return self.ignore.some(function(item) {
	    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
	  })
	}

	function childrenIgnored (self, path) {
	  if (!self.ignore.length)
	    return false

	  return self.ignore.some(function(item) {
	    return !!(item.gmatcher && item.gmatcher.match(path))
	  })
	}


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var wrappy = __webpack_require__(16)
	var reqs = Object.create(null)
	var once = __webpack_require__(17)

	module.exports = wrappy(inflight)

	function inflight (key, cb) {
	  if (reqs[key]) {
	    reqs[key].push(cb)
	    return null
	  } else {
	    reqs[key] = [cb]
	    return makeres(key)
	  }
	}

	function makeres (key) {
	  return once(function RES () {
	    var cbs = reqs[key]
	    var len = cbs.length
	    var args = slice(arguments)
	    for (var i = 0; i < len; i++) {
	      cbs[i].apply(null, args)
	    }
	    if (cbs.length > len) {
	      // added more in the interim.
	      // de-zalgo, just in case, but don't call again.
	      cbs.splice(0, len)
	      process.nextTick(function () {
	        RES.apply(null, args)
	      })
	    } else {
	      delete reqs[key]
	    }
	  })
	}

	function slice (args) {
	  var length = args.length
	  var array = []

	  for (var i = 0; i < length; i++) array[i] = args[i]
	  return array
	}


/***/ },
/* 16 */
/***/ function(module, exports) {

	// Returns a wrapper function that returns a wrapped callback
	// The wrapper function should do some stuff, and return a
	// presumably different callback function.
	// This makes sure that own properties are retained, so that
	// decorations and such are not lost along the way.
	module.exports = wrappy
	function wrappy (fn, cb) {
	  if (fn && cb) return wrappy(fn)(cb)

	  if (typeof fn !== 'function')
	    throw new TypeError('need wrapper function')

	  Object.keys(fn).forEach(function (k) {
	    wrapper[k] = fn[k]
	  })

	  return wrapper

	  function wrapper() {
	    var args = new Array(arguments.length)
	    for (var i = 0; i < args.length; i++) {
	      args[i] = arguments[i]
	    }
	    var ret = fn.apply(this, args)
	    var cb = args[args.length-1]
	    if (typeof ret === 'function' && ret !== cb) {
	      Object.keys(cb).forEach(function (k) {
	        ret[k] = cb[k]
	      })
	    }
	    return ret
	  }
	}


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var wrappy = __webpack_require__(16)
	module.exports = wrappy(once)

	once.proto = once(function () {
	  Object.defineProperty(Function.prototype, 'once', {
	    value: function () {
	      return once(this)
	    },
	    configurable: true
	  })
	})

	function once (fn) {
	  var f = function () {
	    if (f.called) return f.value
	    f.called = true
	    return f.value = fn.apply(this, arguments)
	  }
	  f.called = false
	  return f
	}


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var assign = __webpack_require__(19)

	var fse = {}
	var gfs = __webpack_require__(20)

	// attach fs methods to fse
	Object.keys(gfs).forEach(function (key) {
	  fse[key] = gfs[key]
	})

	var fs = fse

	assign(fs, __webpack_require__(26))
	assign(fs, __webpack_require__(34))
	assign(fs, __webpack_require__(31))
	assign(fs, __webpack_require__(37))
	assign(fs, __webpack_require__(44))
	assign(fs, __webpack_require__(49))
	assign(fs, __webpack_require__(50))
	assign(fs, __webpack_require__(52))
	assign(fs, __webpack_require__(53))
	assign(fs, __webpack_require__(59))
	assign(fs, __webpack_require__(60))

	module.exports = fs

	// maintain backwards compatibility for awhile
	var jsonfile = {}
	Object.defineProperty(jsonfile, 'spaces', {
	  get: function () {
	    return fs.spaces // found in ./json
	  },
	  set: function (val) {
	    fs.spaces = val
	  }
	})

	module.exports.jsonfile = jsonfile // so users of fs-extra can modify jsonFile.spaces


/***/ },
/* 19 */
/***/ function(module, exports) {

	// simple mutable assign
	function assign () {
	  var args = [].slice.call(arguments).filter(function (i) { return i })
	  var dest = args.shift()
	  args.forEach(function (src) {
	    Object.keys(src).forEach(function (key) {
	      dest[key] = src[key]
	    })
	  })

	  return dest
	}

	module.exports = assign


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(2)
	var polyfills = __webpack_require__(21)
	var legacy = __webpack_require__(24)
	var queue = []

	var util = __webpack_require__(9)

	function noop () {}

	var debug = noop
	if (util.debuglog)
	  debug = util.debuglog('gfs4')
	else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
	  debug = function() {
	    var m = util.format.apply(util, arguments)
	    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
	    console.error(m)
	  }

	if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
	  process.on('exit', function() {
	    debug(queue)
	    __webpack_require__(11).equal(queue.length, 0)
	  })
	}

	module.exports = patch(__webpack_require__(22))
	if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
	  module.exports = patch(fs)
	}

	// Always patch fs.close/closeSync, because we want to
	// retry() whenever a close happens *anywhere* in the program.
	// This is essential when multiple graceful-fs instances are
	// in play at the same time.
	module.exports.close =
	fs.close = (function (fs$close) { return function (fd, cb) {
	  return fs$close.call(fs, fd, function (err) {
	    if (!err)
	      retry()

	    if (typeof cb === 'function')
	      cb.apply(this, arguments)
	  })
	}})(fs.close)

	module.exports.closeSync =
	fs.closeSync = (function (fs$closeSync) { return function (fd) {
	  // Note that graceful-fs also retries when fs.closeSync() fails.
	  // Looks like a bug to me, although it's probably a harmless one.
	  var rval = fs$closeSync.apply(fs, arguments)
	  retry()
	  return rval
	}})(fs.closeSync)

	function patch (fs) {
	  // Everything that references the open() function needs to be in here
	  polyfills(fs)
	  fs.gracefulify = patch
	  fs.FileReadStream = ReadStream;  // Legacy name.
	  fs.FileWriteStream = WriteStream;  // Legacy name.
	  fs.createReadStream = createReadStream
	  fs.createWriteStream = createWriteStream
	  var fs$readFile = fs.readFile
	  fs.readFile = readFile
	  function readFile (path, options, cb) {
	    if (typeof options === 'function')
	      cb = options, options = null

	    return go$readFile(path, options, cb)

	    function go$readFile (path, options, cb) {
	      return fs$readFile(path, options, function (err) {
	        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
	          enqueue([go$readFile, [path, options, cb]])
	        else {
	          if (typeof cb === 'function')
	            cb.apply(this, arguments)
	          retry()
	        }
	      })
	    }
	  }

	  var fs$writeFile = fs.writeFile
	  fs.writeFile = writeFile
	  function writeFile (path, data, options, cb) {
	    if (typeof options === 'function')
	      cb = options, options = null

	    return go$writeFile(path, data, options, cb)

	    function go$writeFile (path, data, options, cb) {
	      return fs$writeFile(path, data, options, function (err) {
	        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
	          enqueue([go$writeFile, [path, data, options, cb]])
	        else {
	          if (typeof cb === 'function')
	            cb.apply(this, arguments)
	          retry()
	        }
	      })
	    }
	  }

	  var fs$appendFile = fs.appendFile
	  if (fs$appendFile)
	    fs.appendFile = appendFile
	  function appendFile (path, data, options, cb) {
	    if (typeof options === 'function')
	      cb = options, options = null

	    return go$appendFile(path, data, options, cb)

	    function go$appendFile (path, data, options, cb) {
	      return fs$appendFile(path, data, options, function (err) {
	        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
	          enqueue([go$appendFile, [path, data, options, cb]])
	        else {
	          if (typeof cb === 'function')
	            cb.apply(this, arguments)
	          retry()
	        }
	      })
	    }
	  }

	  var fs$readdir = fs.readdir
	  fs.readdir = readdir
	  function readdir (path, cb) {
	    return go$readdir(path, cb)

	    function go$readdir () {
	      return fs$readdir(path, function (err, files) {
	        if (files && files.sort)
	          files.sort();  // Backwards compatibility with graceful-fs.

	        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
	          enqueue([go$readdir, [path, cb]])
	        else {
	          if (typeof cb === 'function')
	            cb.apply(this, arguments)
	          retry()
	        }
	      })
	    }
	  }


	  if (process.version.substr(0, 4) === 'v0.8') {
	    var legStreams = legacy(fs)
	    ReadStream = legStreams.ReadStream
	    WriteStream = legStreams.WriteStream
	  }

	  var fs$ReadStream = fs.ReadStream
	  ReadStream.prototype = Object.create(fs$ReadStream.prototype)
	  ReadStream.prototype.open = ReadStream$open

	  var fs$WriteStream = fs.WriteStream
	  WriteStream.prototype = Object.create(fs$WriteStream.prototype)
	  WriteStream.prototype.open = WriteStream$open

	  fs.ReadStream = ReadStream
	  fs.WriteStream = WriteStream

	  function ReadStream (path, options) {
	    if (this instanceof ReadStream)
	      return fs$ReadStream.apply(this, arguments), this
	    else
	      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
	  }

	  function ReadStream$open () {
	    var that = this
	    open(that.path, that.flags, that.mode, function (err, fd) {
	      if (err) {
	        if (that.autoClose)
	          that.destroy()

	        that.emit('error', err)
	      } else {
	        that.fd = fd
	        that.emit('open', fd)
	        that.read()
	      }
	    })
	  }

	  function WriteStream (path, options) {
	    if (this instanceof WriteStream)
	      return fs$WriteStream.apply(this, arguments), this
	    else
	      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
	  }

	  function WriteStream$open () {
	    var that = this
	    open(that.path, that.flags, that.mode, function (err, fd) {
	      if (err) {
	        that.destroy()
	        that.emit('error', err)
	      } else {
	        that.fd = fd
	        that.emit('open', fd)
	      }
	    })
	  }

	  function createReadStream (path, options) {
	    return new ReadStream(path, options)
	  }

	  function createWriteStream (path, options) {
	    return new WriteStream(path, options)
	  }

	  var fs$open = fs.open
	  fs.open = open
	  function open (path, flags, mode, cb) {
	    if (typeof mode === 'function')
	      cb = mode, mode = null

	    return go$open(path, flags, mode, cb)

	    function go$open (path, flags, mode, cb) {
	      return fs$open(path, flags, mode, function (err, fd) {
	        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
	          enqueue([go$open, [path, flags, mode, cb]])
	        else {
	          if (typeof cb === 'function')
	            cb.apply(this, arguments)
	          retry()
	        }
	      })
	    }
	  }

	  return fs
	}

	function enqueue (elem) {
	  debug('ENQUEUE', elem[0].name, elem[1])
	  queue.push(elem)
	}

	function retry () {
	  var elem = queue.shift()
	  if (elem) {
	    debug('RETRY', elem[0].name, elem[1])
	    elem[0].apply(null, elem[1])
	  }
	}


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(22)
	var constants = __webpack_require__(23)

	var origCwd = process.cwd
	var cwd = null
	process.cwd = function() {
	  if (!cwd)
	    cwd = origCwd.call(process)
	  return cwd
	}
	try {
	  process.cwd()
	} catch (er) {}

	var chdir = process.chdir
	process.chdir = function(d) {
	  cwd = null
	  chdir.call(process, d)
	}

	module.exports = patch

	function patch (fs) {
	  // (re-)implement some things that are known busted or missing.

	  // lchmod, broken prior to 0.6.2
	  // back-port the fix here.
	  if (constants.hasOwnProperty('O_SYMLINK') &&
	      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
	    patchLchmod(fs)
	  }

	  // lutimes implementation, or no-op
	  if (!fs.lutimes) {
	    patchLutimes(fs)
	  }

	  // https://github.com/isaacs/node-graceful-fs/issues/4
	  // Chown should not fail on einval or eperm if non-root.
	  // It should not fail on enosys ever, as this just indicates
	  // that a fs doesn't support the intended operation.

	  fs.chown = chownFix(fs.chown)
	  fs.fchown = chownFix(fs.fchown)
	  fs.lchown = chownFix(fs.lchown)

	  fs.chmod = chownFix(fs.chmod)
	  fs.fchmod = chownFix(fs.fchmod)
	  fs.lchmod = chownFix(fs.lchmod)

	  fs.chownSync = chownFixSync(fs.chownSync)
	  fs.fchownSync = chownFixSync(fs.fchownSync)
	  fs.lchownSync = chownFixSync(fs.lchownSync)

	  fs.chmodSync = chownFix(fs.chmodSync)
	  fs.fchmodSync = chownFix(fs.fchmodSync)
	  fs.lchmodSync = chownFix(fs.lchmodSync)

	  // if lchmod/lchown do not exist, then make them no-ops
	  if (!fs.lchmod) {
	    fs.lchmod = function (path, mode, cb) {
	      process.nextTick(cb)
	    }
	    fs.lchmodSync = function () {}
	  }
	  if (!fs.lchown) {
	    fs.lchown = function (path, uid, gid, cb) {
	      process.nextTick(cb)
	    }
	    fs.lchownSync = function () {}
	  }

	  // on Windows, A/V software can lock the directory, causing this
	  // to fail with an EACCES or EPERM if the directory contains newly
	  // created files.  Try again on failure, for up to 1 second.
	  if (process.platform === "win32") {
	    fs.rename = (function (fs$rename) { return function (from, to, cb) {
	      var start = Date.now()
	      fs$rename(from, to, function CB (er) {
	        if (er
	            && (er.code === "EACCES" || er.code === "EPERM")
	            && Date.now() - start < 1000) {
	          return fs$rename(from, to, CB)
	        }
	        if (cb) cb(er)
	      })
	    }})(fs.rename)
	  }

	  // if read() returns EAGAIN, then just try it again.
	  fs.read = (function (fs$read) { return function (fd, buffer, offset, length, position, callback_) {
	    var callback
	    if (callback_ && typeof callback_ === 'function') {
	      var eagCounter = 0
	      callback = function (er, _, __) {
	        if (er && er.code === 'EAGAIN' && eagCounter < 10) {
	          eagCounter ++
	          return fs$read.call(fs, fd, buffer, offset, length, position, callback)
	        }
	        callback_.apply(this, arguments)
	      }
	    }
	    return fs$read.call(fs, fd, buffer, offset, length, position, callback)
	  }})(fs.read)

	  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
	    var eagCounter = 0
	    while (true) {
	      try {
	        return fs$readSync.call(fs, fd, buffer, offset, length, position)
	      } catch (er) {
	        if (er.code === 'EAGAIN' && eagCounter < 10) {
	          eagCounter ++
	          continue
	        }
	        throw er
	      }
	    }
	  }})(fs.readSync)
	}

	function patchLchmod (fs) {
	  fs.lchmod = function (path, mode, callback) {
	    callback = callback || noop
	    fs.open( path
	           , constants.O_WRONLY | constants.O_SYMLINK
	           , mode
	           , function (err, fd) {
	      if (err) {
	        callback(err)
	        return
	      }
	      // prefer to return the chmod error, if one occurs,
	      // but still try to close, and report closing errors if they occur.
	      fs.fchmod(fd, mode, function (err) {
	        fs.close(fd, function(err2) {
	          callback(err || err2)
	        })
	      })
	    })
	  }

	  fs.lchmodSync = function (path, mode) {
	    var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

	    // prefer to return the chmod error, if one occurs,
	    // but still try to close, and report closing errors if they occur.
	    var threw = true
	    var ret
	    try {
	      ret = fs.fchmodSync(fd, mode)
	      threw = false
	    } finally {
	      if (threw) {
	        try {
	          fs.closeSync(fd)
	        } catch (er) {}
	      } else {
	        fs.closeSync(fd)
	      }
	    }
	    return ret
	  }
	}

	function patchLutimes (fs) {
	  if (constants.hasOwnProperty("O_SYMLINK")) {
	    fs.lutimes = function (path, at, mt, cb) {
	      fs.open(path, constants.O_SYMLINK, function (er, fd) {
	        cb = cb || noop
	        if (er) return cb(er)
	        fs.futimes(fd, at, mt, function (er) {
	          fs.close(fd, function (er2) {
	            return cb(er || er2)
	          })
	        })
	      })
	    }

	    fs.lutimesSync = function (path, at, mt) {
	      var fd = fs.openSync(path, constants.O_SYMLINK)
	      var ret
	      var threw = true
	      try {
	        ret = fs.futimesSync(fd, at, mt)
	        threw = false
	      } finally {
	        if (threw) {
	          try {
	            fs.closeSync(fd)
	          } catch (er) {}
	        } else {
	          fs.closeSync(fd)
	        }
	      }
	      return ret
	    }

	  } else {
	    fs.lutimes = function (_a, _b, _c, cb) { process.nextTick(cb) }
	    fs.lutimesSync = function () {}
	  }
	}

	function chownFix (orig) {
	  if (!orig) return orig
	  return function (target, uid, gid, cb) {
	    return orig.call(fs, target, uid, gid, function (er, res) {
	      if (chownErOk(er)) er = null
	      cb(er, res)
	    })
	  }
	}

	function chownFixSync (orig) {
	  if (!orig) return orig
	  return function (target, uid, gid) {
	    try {
	      return orig.call(fs, target, uid, gid)
	    } catch (er) {
	      if (!chownErOk(er)) throw er
	    }
	  }
	}

	// ENOSYS means that the fs doesn't support the op. Just ignore
	// that, because it doesn't matter.
	//
	// if there's no getuid, or if getuid() is something other
	// than 0, and the error is EINVAL or EPERM, then just ignore
	// it.
	//
	// This specific case is a silent failure in cp, install, tar,
	// and most other unix tools that manage permissions.
	//
	// When running as root, or if other types of errors are
	// encountered, then it's strict.
	function chownErOk (er) {
	  if (!er)
	    return true

	  if (er.code === "ENOSYS")
	    return true

	  var nonroot = !process.getuid || process.getuid() !== 0
	  if (nonroot) {
	    if (er.code === "EINVAL" || er.code === "EPERM")
	      return true
	  }

	  return false
	}


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var fs = __webpack_require__(2)

	module.exports = clone(fs)

	function clone (obj) {
	  if (obj === null || typeof obj !== 'object')
	    return obj

	  if (obj instanceof Object)
	    var copy = { __proto__: obj.__proto__ }
	  else
	    var copy = Object.create(null)

	  Object.getOwnPropertyNames(obj).forEach(function (key) {
	    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
	  })

	  return copy
	}


/***/ },
/* 23 */
/***/ function(module, exports) {

	module.exports = require("constants");

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var Stream = __webpack_require__(25).Stream

	module.exports = legacy

	function legacy (fs) {
	  return {
	    ReadStream: ReadStream,
	    WriteStream: WriteStream
	  }

	  function ReadStream (path, options) {
	    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

	    Stream.call(this);

	    var self = this;

	    this.path = path;
	    this.fd = null;
	    this.readable = true;
	    this.paused = false;

	    this.flags = 'r';
	    this.mode = 438; /*=0666*/
	    this.bufferSize = 64 * 1024;

	    options = options || {};

	    // Mixin options into this
	    var keys = Object.keys(options);
	    for (var index = 0, length = keys.length; index < length; index++) {
	      var key = keys[index];
	      this[key] = options[key];
	    }

	    if (this.encoding) this.setEncoding(this.encoding);

	    if (this.start !== undefined) {
	      if ('number' !== typeof this.start) {
	        throw TypeError('start must be a Number');
	      }
	      if (this.end === undefined) {
	        this.end = Infinity;
	      } else if ('number' !== typeof this.end) {
	        throw TypeError('end must be a Number');
	      }

	      if (this.start > this.end) {
	        throw new Error('start must be <= end');
	      }

	      this.pos = this.start;
	    }

	    if (this.fd !== null) {
	      process.nextTick(function() {
	        self._read();
	      });
	      return;
	    }

	    fs.open(this.path, this.flags, this.mode, function (err, fd) {
	      if (err) {
	        self.emit('error', err);
	        self.readable = false;
	        return;
	      }

	      self.fd = fd;
	      self.emit('open', fd);
	      self._read();
	    })
	  }

	  function WriteStream (path, options) {
	    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

	    Stream.call(this);

	    this.path = path;
	    this.fd = null;
	    this.writable = true;

	    this.flags = 'w';
	    this.encoding = 'binary';
	    this.mode = 438; /*=0666*/
	    this.bytesWritten = 0;

	    options = options || {};

	    // Mixin options into this
	    var keys = Object.keys(options);
	    for (var index = 0, length = keys.length; index < length; index++) {
	      var key = keys[index];
	      this[key] = options[key];
	    }

	    if (this.start !== undefined) {
	      if ('number' !== typeof this.start) {
	        throw TypeError('start must be a Number');
	      }
	      if (this.start < 0) {
	        throw new Error('start must be >= zero');
	      }

	      this.pos = this.start;
	    }

	    this.busy = false;
	    this._queue = [];

	    if (this.fd === null) {
	      this._open = fs.open;
	      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
	      this.flush();
	    }
	  }
	}


/***/ },
/* 25 */
/***/ function(module, exports) {

	module.exports = require("stream");

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  copy: __webpack_require__(27)
	}


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var ncp = __webpack_require__(28)
	var mkdir = __webpack_require__(31)

	function copy (src, dest, options, callback) {
	  if (typeof options === 'function' && !callback) {
	    callback = options
	    options = {}
	  } else if (typeof options === 'function' || options instanceof RegExp) {
	    options = {filter: options}
	  }
	  callback = callback || function () {}
	  options = options || {}

	  fs.lstat(src, function (err, stats) {
	    if (err) return callback(err)

	    var dir = null
	    if (stats.isDirectory()) {
	      var parts = dest.split(path.sep)
	      parts.pop()
	      dir = parts.join(path.sep)
	    } else {
	      dir = path.dirname(dest)
	    }

	    fs.exists(dir, function (dirExists) {
	      if (dirExists) return ncp(src, dest, options, callback)
	      mkdir.mkdirs(dir, function (err) {
	        if (err) return callback(err)
	        ncp(src, dest, options, callback)
	      })
	    })
	  })
	}

	module.exports = copy


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	// imported from ncp (this is temporary, will rewrite)

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var utimes = __webpack_require__(29)

	function ncp (source, dest, options, callback) {
	  if (!callback) {
	    callback = options
	    options = {}
	  }

	  var basePath = process.cwd()
	  var currentPath = path.resolve(basePath, source)
	  var targetPath = path.resolve(basePath, dest)

	  var filter = options.filter
	  var transform = options.transform
	  var clobber = options.clobber !== false
	  var dereference = options.dereference
	  var preserveTimestamps = options.preserveTimestamps === true

	  var errs = null

	  var started = 0
	  var finished = 0
	  var running = 0
	  // this is pretty useless now that we're using graceful-fs
	  // consider removing
	  var limit = options.limit || 512

	  startCopy(currentPath)

	  function startCopy (source) {
	    started++
	    if (filter) {
	      if (filter instanceof RegExp) {
	        if (!filter.test(source)) {
	          return doneOne(true)
	        }
	      } else if (typeof filter === 'function') {
	        if (!filter(source)) {
	          return doneOne(true)
	        }
	      }
	    }
	    return getStats(source)
	  }

	  function getStats (source) {
	    var stat = dereference ? fs.stat : fs.lstat
	    if (running >= limit) {
	      return setImmediate(function () {
	        getStats(source)
	      })
	    }
	    running++
	    stat(source, function (err, stats) {
	      if (err) return onError(err)

	      // We need to get the mode from the stats object and preserve it.
	      var item = {
	        name: source,
	        mode: stats.mode,
	        mtime: stats.mtime, // modified time
	        atime: stats.atime, // access time
	        stats: stats // temporary
	      }

	      if (stats.isDirectory()) {
	        return onDir(item)
	      } else if (stats.isFile() || stats.isCharacterDevice() || stats.isBlockDevice()) {
	        return onFile(item)
	      } else if (stats.isSymbolicLink()) {
	        // Symlinks don't really need to know about the mode.
	        return onLink(source)
	      }
	    })
	  }

	  function onFile (file) {
	    var target = file.name.replace(currentPath, targetPath)
	    isWritable(target, function (writable) {
	      if (writable) {
	        copyFile(file, target)
	      } else {
	        if (clobber) {
	          rmFile(target, function () {
	            copyFile(file, target)
	          })
	        } else {
	          doneOne()
	        }
	      }
	    })
	  }

	  function copyFile (file, target) {
	    var readStream = fs.createReadStream(file.name)
	    var writeStream = fs.createWriteStream(target, { mode: file.mode })

	    readStream.on('error', onError)
	    writeStream.on('error', onError)

	    if (transform) {
	      transform(readStream, writeStream, file)
	    } else {
	      writeStream.on('open', function () {
	        readStream.pipe(writeStream)
	      })
	    }

	    writeStream.once('finish', function () {
	      fs.chmod(target, file.mode, function (err) {
	        if (err) return onError(err)
	        if (preserveTimestamps) {
	          utimes.utimesMillis(target, file.atime, file.mtime, function (err) {
	            if (err) return onError(err)
	            return doneOne()
	          })
	        } else {
	          doneOne()
	        }
	      })
	    })
	  }

	  function rmFile (file, done) {
	    fs.unlink(file, function (err) {
	      if (err) return onError(err)
	      return done()
	    })
	  }

	  function onDir (dir) {
	    var target = dir.name.replace(currentPath, targetPath)
	    isWritable(target, function (writable) {
	      if (writable) {
	        return mkDir(dir, target)
	      }
	      copyDir(dir.name)
	    })
	  }

	  function mkDir (dir, target) {
	    fs.mkdir(target, dir.mode, function (err) {
	      if (err) return onError(err)
	      // despite setting mode in fs.mkdir, doesn't seem to work
	      // so we set it here.
	      fs.chmod(target, dir.mode, function (err) {
	        if (err) return onError(err)
	        copyDir(dir.name)
	      })
	    })
	  }

	  function copyDir (dir) {
	    fs.readdir(dir, function (err, items) {
	      if (err) return onError(err)
	      items.forEach(function (item) {
	        startCopy(path.join(dir, item))
	      })
	      return doneOne()
	    })
	  }

	  function onLink (link) {
	    var target = link.replace(currentPath, targetPath)
	    fs.readlink(link, function (err, resolvedPath) {
	      if (err) return onError(err)
	      checkLink(resolvedPath, target)
	    })
	  }

	  function checkLink (resolvedPath, target) {
	    if (dereference) {
	      resolvedPath = path.resolve(basePath, resolvedPath)
	    }
	    isWritable(target, function (writable) {
	      if (writable) {
	        return makeLink(resolvedPath, target)
	      }
	      fs.readlink(target, function (err, targetDest) {
	        if (err) return onError(err)

	        if (dereference) {
	          targetDest = path.resolve(basePath, targetDest)
	        }
	        if (targetDest === resolvedPath) {
	          return doneOne()
	        }
	        return rmFile(target, function () {
	          makeLink(resolvedPath, target)
	        })
	      })
	    })
	  }

	  function makeLink (linkPath, target) {
	    fs.symlink(linkPath, target, function (err) {
	      if (err) return onError(err)
	      return doneOne()
	    })
	  }

	  function isWritable (path, done) {
	    fs.lstat(path, function (err) {
	      if (err) {
	        if (err.code === 'ENOENT') return done(true)
	        return done(false)
	      }
	      return done(false)
	    })
	  }

	  function onError (err) {
	    if (options.stopOnError) {
	      return callback(err)
	    } else if (!errs && options.errs) {
	      errs = fs.createWriteStream(options.errs)
	    } else if (!errs) {
	      errs = []
	    }
	    if (typeof errs.write === 'undefined') {
	      errs.push(err)
	    } else {
	      errs.write(err.stack + '\n\n')
	    }
	    return doneOne()
	  }

	  function doneOne (skipped) {
	    if (!skipped) running--
	    finished++
	    if ((started === finished) && (running === 0)) {
	      if (callback !== undefined) {
	        return errs ? callback(errs) : callback(null)
	      }
	    }
	  }
	}

	module.exports = ncp


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var os = __webpack_require__(30)

	// HFS, ext{2,3}, FAT do not, Node.js v0.10 does not
	function hasMillisResSync () {
	  var tmpfile = path.join('millis-test-sync' + Date.now().toString() + Math.random().toString().slice(2))
	  tmpfile = path.join(os.tmpdir(), tmpfile)

	  // 550 millis past UNIX epoch
	  var d = new Date(1435410243862)
	  fs.writeFileSync(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141')
	  var fd = fs.openSync(tmpfile, 'r+')
	  fs.futimesSync(fd, d, d)
	  fs.closeSync(fd)
	  return fs.statSync(tmpfile).mtime > 1435410243000
	}

	function hasMillisRes (callback) {
	  var tmpfile = path.join('millis-test' + Date.now().toString() + Math.random().toString().slice(2))
	  tmpfile = path.join(os.tmpdir(), tmpfile)

	  // 550 millis past UNIX epoch
	  var d = new Date(1435410243862)
	  fs.writeFile(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141', function (err) {
	    if (err) return callback(err)
	    fs.open(tmpfile, 'r+', function (err, fd) {
	      if (err) return callback(err)
	      fs.futimes(fd, d, d, function (err) {
	        if (err) return callback(err)
	        fs.close(fd, function (err) {
	          if (err) return callback(err)
	          fs.stat(tmpfile, function (err, stats) {
	            if (err) return callback(err)
	            callback(null, stats.mtime > 1435410243000)
	          })
	        })
	      })
	    })
	  })
	}

	function timeRemoveMillis (timestamp) {
	  if (typeof timestamp === 'number') {
	    return Math.floor(timestamp / 1000) * 1000
	  } else if (timestamp instanceof Date) {
	    return new Date(Math.floor(timestamp.getTime() / 1000) * 1000)
	  } else {
	    throw new Error('fs-extra: timeRemoveMillis() unknown parameter type')
	  }
	}

	function utimesMillis (path, atime, mtime, callback) {
	  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
	  fs.open(path, 'r+', function (err, fd) {
	    if (err) return callback(err)
	    fs.futimes(fd, atime, mtime, function (err) {
	      if (err) return callback(err)
	      fs.close(fd, callback)
	    })
	  })
	}

	module.exports = {
	  hasMillisRes: hasMillisRes,
	  hasMillisResSync: hasMillisResSync,
	  timeRemoveMillis: timeRemoveMillis,
	  utimesMillis: utimesMillis
	}


/***/ },
/* 30 */
/***/ function(module, exports) {

	module.exports = require("os");

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  mkdirs: __webpack_require__(32),
	  mkdirsSync: __webpack_require__(33),
	  // alias
	  mkdirp: __webpack_require__(32),
	  mkdirpSync: __webpack_require__(33),
	  ensureDir: __webpack_require__(32),
	  ensureDirSync: __webpack_require__(33)
	}


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)

	var o777 = parseInt('0777', 8)

	function mkdirs (p, opts, callback, made) {
	  if (typeof opts === 'function') {
	    callback = opts
	    opts = {}
	  } else if (!opts || typeof opts !== 'object') {
	    opts = { mode: opts }
	  }

	  var mode = opts.mode
	  var xfs = opts.fs || fs

	  if (mode === undefined) {
	    mode = o777 & (~process.umask())
	  }
	  if (!made) made = null

	  callback = callback || function () {}
	  p = path.resolve(p)

	  xfs.mkdir(p, mode, function (er) {
	    if (!er) {
	      made = made || p
	      return callback(null, made)
	    }
	    switch (er.code) {
	      case 'ENOENT':
	        if (path.dirname(p) === p) return callback(er)
	        mkdirs(path.dirname(p), opts, function (er, made) {
	          if (er) callback(er, made)
	          else mkdirs(p, opts, callback, made)
	        })
	        break

	      // In the case of any other error, just see if there's a dir
	      // there already.  If so, then hooray!  If not, then something
	      // is borked.
	      default:
	        xfs.stat(p, function (er2, stat) {
	          // if the stat fails, then that's super weird.
	          // let the original error be the failure reason.
	          if (er2 || !stat.isDirectory()) callback(er, made)
	          else callback(null, made)
	        })
	        break
	    }
	  })
	}

	module.exports = mkdirs


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)

	var o777 = parseInt('0777', 8)

	function mkdirsSync (p, opts, made) {
	  if (!opts || typeof opts !== 'object') {
	    opts = { mode: opts }
	  }

	  var mode = opts.mode
	  var xfs = opts.fs || fs

	  if (mode === undefined) {
	    mode = o777 & (~process.umask())
	  }
	  if (!made) made = null

	  p = path.resolve(p)

	  try {
	    xfs.mkdirSync(p, mode)
	    made = made || p
	  } catch (err0) {
	    switch (err0.code) {
	      case 'ENOENT' :
	        made = mkdirsSync(path.dirname(p), opts, made)
	        mkdirsSync(p, opts, made)
	        break

	      // In the case of any other error, just see if there's a dir
	      // there already.  If so, then hooray!  If not, then something
	      // is borked.
	      default:
	        var stat
	        try {
	          stat = xfs.statSync(p)
	        } catch (err1) {
	          throw err0
	        }
	        if (!stat.isDirectory()) throw err0
	        break
	    }
	  }

	  return made
	}

	module.exports = mkdirsSync


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  copySync: __webpack_require__(35)
	}


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var copyFileSync = __webpack_require__(36)
	var mkdir = __webpack_require__(31)

	function copySync (src, dest, options) {
	  if (typeof options === 'function' || options instanceof RegExp) {
	    options = {filter: options}
	  }

	  options = options || {}
	  options.recursive = !!options.recursive

	  // default to true for now
	  options.clobber = 'clobber' in options ? !!options.clobber : true
	  options.preserveTimestamps = 'preserveTimestamps' in options ? !!options.preserveTimestamps : false

	  options.filter = options.filter || function () { return true }

	  var stats = options.recursive ? fs.lstatSync(src) : fs.statSync(src)
	  var destFolder = path.dirname(dest)
	  var destFolderExists = fs.existsSync(destFolder)
	  var performCopy = false

	  if (stats.isFile()) {
	    if (options.filter instanceof RegExp) performCopy = options.filter.test(src)
	    else if (typeof options.filter === 'function') performCopy = options.filter(src)

	    if (performCopy) {
	      if (!destFolderExists) mkdir.mkdirsSync(destFolder)
	      copyFileSync(src, dest, {clobber: options.clobber, preserveTimestamps: options.preserveTimestamps})
	    }
	  } else if (stats.isDirectory()) {
	    if (!fs.existsSync(dest)) mkdir.mkdirsSync(dest)
	    var contents = fs.readdirSync(src)
	    contents.forEach(function (content) {
	      var opts = options
	      opts.recursive = true
	      copySync(path.join(src, content), path.join(dest, content), opts)
	    })
	  } else if (options.recursive && stats.isSymbolicLink()) {
	    var srcPath = fs.readlinkSync(src)
	    fs.symlinkSync(srcPath, dest)
	  }
	}

	module.exports = copySync


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)

	var BUF_LENGTH = 64 * 1024
	var _buff = new Buffer(BUF_LENGTH)

	function copyFileSync (srcFile, destFile, options) {
	  var clobber = options.clobber
	  var preserveTimestamps = options.preserveTimestamps

	  if (fs.existsSync(destFile)) {
	    if (clobber) {
	      fs.chmodSync(destFile, parseInt('777', 8))
	      fs.unlinkSync(destFile)
	    } else {
	      throw Error('EEXIST')
	    }
	  }

	  var fdr = fs.openSync(srcFile, 'r')
	  var stat = fs.fstatSync(fdr)
	  var fdw = fs.openSync(destFile, 'w', stat.mode)
	  var bytesRead = 1
	  var pos = 0

	  while (bytesRead > 0) {
	    bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos)
	    fs.writeSync(fdw, _buff, 0, bytesRead)
	    pos += bytesRead
	  }

	  if (preserveTimestamps) {
	    fs.futimesSync(fdw, stat.atime, stat.mtime)
	  }

	  fs.closeSync(fdr)
	  fs.closeSync(fdw)
	}

	module.exports = copyFileSync


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var rimraf = __webpack_require__(38)

	function removeSync (dir) {
	  return rimraf.sync(dir)
	}

	function remove (dir, callback) {
	  return callback ? rimraf(dir, callback) : rimraf(dir, function () {})
	}

	module.exports = {
	  remove: remove,
	  removeSync: removeSync
	}


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = rimraf
	rimraf.sync = rimrafSync

	var assert = __webpack_require__(11)
	var path = __webpack_require__(4)
	var fs = __webpack_require__(2)
	var glob = __webpack_require__(39)

	var defaultGlobOpts = {
	  nosort: true,
	  silent: true
	}

	// for EMFILE handling
	var timeout = 0

	var isWindows = (process.platform === "win32")

	function defaults (options) {
	  var methods = [
	    'unlink',
	    'chmod',
	    'stat',
	    'lstat',
	    'rmdir',
	    'readdir'
	  ]
	  methods.forEach(function(m) {
	    options[m] = options[m] || fs[m]
	    m = m + 'Sync'
	    options[m] = options[m] || fs[m]
	  })

	  options.maxBusyTries = options.maxBusyTries || 3
	  options.emfileWait = options.emfileWait || 1000
	  if (options.glob === false) {
	    options.disableGlob = true
	  }
	  options.disableGlob = options.disableGlob || false
	  options.glob = options.glob || defaultGlobOpts
	}

	function rimraf (p, options, cb) {
	  if (typeof options === 'function') {
	    cb = options
	    options = {}
	  }

	  assert(p, 'rimraf: missing path')
	  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
	  assert(options, 'rimraf: missing options')
	  assert.equal(typeof options, 'object', 'rimraf: options should be object')
	  assert.equal(typeof cb, 'function', 'rimraf: callback function required')

	  defaults(options)

	  var busyTries = 0
	  var errState = null
	  var n = 0

	  if (options.disableGlob || !glob.hasMagic(p))
	    return afterGlob(null, [p])

	  fs.lstat(p, function (er, stat) {
	    if (!er)
	      return afterGlob(null, [p])

	    glob(p, options.glob, afterGlob)
	  })

	  function next (er) {
	    errState = errState || er
	    if (--n === 0)
	      cb(errState)
	  }

	  function afterGlob (er, results) {
	    if (er)
	      return cb(er)

	    n = results.length
	    if (n === 0)
	      return cb()

	    results.forEach(function (p) {
	      rimraf_(p, options, function CB (er) {
	        if (er) {
	          if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
	              busyTries < options.maxBusyTries) {
	            busyTries ++
	            var time = busyTries * 100
	            // try again, with the same exact callback as this one.
	            return setTimeout(function () {
	              rimraf_(p, options, CB)
	            }, time)
	          }

	          // this one won't happen if graceful-fs is used.
	          if (er.code === "EMFILE" && timeout < options.emfileWait) {
	            return setTimeout(function () {
	              rimraf_(p, options, CB)
	            }, timeout ++)
	          }

	          // already gone
	          if (er.code === "ENOENT") er = null
	        }

	        timeout = 0
	        next(er)
	      })
	    })
	  }
	}

	// Two possible strategies.
	// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
	// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
	//
	// Both result in an extra syscall when you guess wrong.  However, there
	// are likely far more normal files in the world than directories.  This
	// is based on the assumption that a the average number of files per
	// directory is >= 1.
	//
	// If anyone ever complains about this, then I guess the strategy could
	// be made configurable somehow.  But until then, YAGNI.
	function rimraf_ (p, options, cb) {
	  assert(p)
	  assert(options)
	  assert(typeof cb === 'function')

	  // sunos lets the root user unlink directories, which is... weird.
	  // so we have to lstat here and make sure it's not a dir.
	  options.lstat(p, function (er, st) {
	    if (er && er.code === "ENOENT")
	      return cb(null)

	    if (st && st.isDirectory())
	      return rmdir(p, options, er, cb)

	    options.unlink(p, function (er) {
	      if (er) {
	        if (er.code === "ENOENT")
	          return cb(null)
	        if (er.code === "EPERM")
	          return (isWindows)
	            ? fixWinEPERM(p, options, er, cb)
	            : rmdir(p, options, er, cb)
	        if (er.code === "EISDIR")
	          return rmdir(p, options, er, cb)
	      }
	      return cb(er)
	    })
	  })
	}

	function fixWinEPERM (p, options, er, cb) {
	  assert(p)
	  assert(options)
	  assert(typeof cb === 'function')
	  if (er)
	    assert(er instanceof Error)

	  options.chmod(p, 666, function (er2) {
	    if (er2)
	      cb(er2.code === "ENOENT" ? null : er)
	    else
	      options.stat(p, function(er3, stats) {
	        if (er3)
	          cb(er3.code === "ENOENT" ? null : er)
	        else if (stats.isDirectory())
	          rmdir(p, options, er, cb)
	        else
	          options.unlink(p, cb)
	      })
	  })
	}

	function fixWinEPERMSync (p, options, er) {
	  assert(p)
	  assert(options)
	  if (er)
	    assert(er instanceof Error)

	  try {
	    options.chmodSync(p, 666)
	  } catch (er2) {
	    if (er2.code === "ENOENT")
	      return
	    else
	      throw er
	  }

	  try {
	    var stats = options.statSync(p)
	  } catch (er3) {
	    if (er3.code === "ENOENT")
	      return
	    else
	      throw er
	  }

	  if (stats.isDirectory())
	    rmdirSync(p, options, er)
	  else
	    options.unlinkSync(p)
	}

	function rmdir (p, options, originalEr, cb) {
	  assert(p)
	  assert(options)
	  if (originalEr)
	    assert(originalEr instanceof Error)
	  assert(typeof cb === 'function')

	  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
	  // if we guessed wrong, and it's not a directory, then
	  // raise the original error.
	  options.rmdir(p, function (er) {
	    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
	      rmkids(p, options, cb)
	    else if (er && er.code === "ENOTDIR")
	      cb(originalEr)
	    else
	      cb(er)
	  })
	}

	function rmkids(p, options, cb) {
	  assert(p)
	  assert(options)
	  assert(typeof cb === 'function')

	  options.readdir(p, function (er, files) {
	    if (er)
	      return cb(er)
	    var n = files.length
	    if (n === 0)
	      return options.rmdir(p, cb)
	    var errState
	    files.forEach(function (f) {
	      rimraf(path.join(p, f), options, function (er) {
	        if (errState)
	          return
	        if (er)
	          return cb(errState = er)
	        if (--n === 0)
	          options.rmdir(p, cb)
	      })
	    })
	  })
	}

	// this looks simpler, and is strictly *faster*, but will
	// tie up the JavaScript thread and fail on excessively
	// deep directory trees.
	function rimrafSync (p, options) {
	  options = options || {}
	  defaults(options)

	  assert(p, 'rimraf: missing path')
	  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
	  assert(options, 'rimraf: missing options')
	  assert.equal(typeof options, 'object', 'rimraf: options should be object')

	  var results

	  if (options.disableGlob || !glob.hasMagic(p)) {
	    results = [p]
	  } else {
	    try {
	      fs.lstatSync(p)
	      results = [p]
	    } catch (er) {
	      results = glob.sync(p, options.glob)
	    }
	  }

	  if (!results.length)
	    return

	  for (var i = 0; i < results.length; i++) {
	    var p = results[i]

	    try {
	      var st = options.lstatSync(p)
	    } catch (er) {
	      if (er.code === "ENOENT")
	        return
	    }

	    try {
	      // sunos lets the root user unlink directories, which is... weird.
	      if (st && st.isDirectory())
	        rmdirSync(p, options, null)
	      else
	        options.unlinkSync(p)
	    } catch (er) {
	      if (er.code === "ENOENT")
	        return
	      if (er.code === "EPERM")
	        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
	      if (er.code !== "EISDIR")
	        throw er
	      rmdirSync(p, options, er)
	    }
	  }
	}

	function rmdirSync (p, options, originalEr) {
	  assert(p)
	  assert(options)
	  if (originalEr)
	    assert(originalEr instanceof Error)

	  try {
	    options.rmdirSync(p)
	  } catch (er) {
	    if (er.code === "ENOENT")
	      return
	    if (er.code === "ENOTDIR")
	      throw originalEr
	    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
	      rmkidsSync(p, options)
	  }
	}

	function rmkidsSync (p, options) {
	  assert(p)
	  assert(options)
	  options.readdirSync(p).forEach(function (f) {
	    rimrafSync(path.join(p, f), options)
	  })
	  options.rmdirSync(p, options)
	}


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	// Approach:
	//
	// 1. Get the minimatch set
	// 2. For each pattern in the set, PROCESS(pattern, false)
	// 3. Store matches per-set, then uniq them
	//
	// PROCESS(pattern, inGlobStar)
	// Get the first [n] items from pattern that are all strings
	// Join these together.  This is PREFIX.
	//   If there is no more remaining, then stat(PREFIX) and
	//   add to matches if it succeeds.  END.
	//
	// If inGlobStar and PREFIX is symlink and points to dir
	//   set ENTRIES = []
	// else readdir(PREFIX) as ENTRIES
	//   If fail, END
	//
	// with ENTRIES
	//   If pattern[n] is GLOBSTAR
	//     // handle the case where the globstar match is empty
	//     // by pruning it out, and testing the resulting pattern
	//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
	//     // handle other cases.
	//     for ENTRY in ENTRIES (not dotfiles)
	//       // attach globstar + tail onto the entry
	//       // Mark that this entry is a globstar match
	//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
	//
	//   else // not globstar
	//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
	//       Test ENTRY against pattern[n]
	//       If fails, continue
	//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
	//
	// Caveat:
	//   Cache all stats and readdirs results to minimize syscall.  Since all
	//   we ever care about is existence and directory-ness, we can just keep
	//   `true` for files, and [children,...] for directories, or `false` for
	//   things that don't exist.

	module.exports = glob

	var fs = __webpack_require__(2)
	var minimatch = __webpack_require__(40)
	var Minimatch = minimatch.Minimatch
	var inherits = __webpack_require__(41)
	var EE = __webpack_require__(10).EventEmitter
	var path = __webpack_require__(4)
	var assert = __webpack_require__(11)
	var isAbsolute = __webpack_require__(12)
	var globSync = __webpack_require__(42)
	var common = __webpack_require__(43)
	var alphasort = common.alphasort
	var alphasorti = common.alphasorti
	var setopts = common.setopts
	var ownProp = common.ownProp
	var inflight = __webpack_require__(15)
	var util = __webpack_require__(9)
	var childrenIgnored = common.childrenIgnored
	var isIgnored = common.isIgnored

	var once = __webpack_require__(17)

	function glob (pattern, options, cb) {
	  if (typeof options === 'function') cb = options, options = {}
	  if (!options) options = {}

	  if (options.sync) {
	    if (cb)
	      throw new TypeError('callback provided to sync glob')
	    return globSync(pattern, options)
	  }

	  return new Glob(pattern, options, cb)
	}

	glob.sync = globSync
	var GlobSync = glob.GlobSync = globSync.GlobSync

	// old api surface
	glob.glob = glob

	function extend (origin, add) {
	  if (add === null || typeof add !== 'object') {
	    return origin
	  }

	  var keys = Object.keys(add)
	  var i = keys.length
	  while (i--) {
	    origin[keys[i]] = add[keys[i]]
	  }
	  return origin
	}

	glob.hasMagic = function (pattern, options_) {
	  var options = extend({}, options_)
	  options.noprocess = true

	  var g = new Glob(pattern, options)
	  var set = g.minimatch.set
	  if (set.length > 1)
	    return true

	  for (var j = 0; j < set[0].length; j++) {
	    if (typeof set[0][j] !== 'string')
	      return true
	  }

	  return false
	}

	glob.Glob = Glob
	inherits(Glob, EE)
	function Glob (pattern, options, cb) {
	  if (typeof options === 'function') {
	    cb = options
	    options = null
	  }

	  if (options && options.sync) {
	    if (cb)
	      throw new TypeError('callback provided to sync glob')
	    return new GlobSync(pattern, options)
	  }

	  if (!(this instanceof Glob))
	    return new Glob(pattern, options, cb)

	  setopts(this, pattern, options)
	  this._didRealPath = false

	  // process each pattern in the minimatch set
	  var n = this.minimatch.set.length

	  // The matches are stored as {<filename>: true,...} so that
	  // duplicates are automagically pruned.
	  // Later, we do an Object.keys() on these.
	  // Keep them as a list so we can fill in when nonull is set.
	  this.matches = new Array(n)

	  if (typeof cb === 'function') {
	    cb = once(cb)
	    this.on('error', cb)
	    this.on('end', function (matches) {
	      cb(null, matches)
	    })
	  }

	  var self = this
	  var n = this.minimatch.set.length
	  this._processing = 0
	  this.matches = new Array(n)

	  this._emitQueue = []
	  this._processQueue = []
	  this.paused = false

	  if (this.noprocess)
	    return this

	  if (n === 0)
	    return done()

	  for (var i = 0; i < n; i ++) {
	    this._process(this.minimatch.set[i], i, false, done)
	  }

	  function done () {
	    --self._processing
	    if (self._processing <= 0)
	      self._finish()
	  }
	}

	Glob.prototype._finish = function () {
	  assert(this instanceof Glob)
	  if (this.aborted)
	    return

	  if (this.realpath && !this._didRealpath)
	    return this._realpath()

	  common.finish(this)
	  this.emit('end', this.found)
	}

	Glob.prototype._realpath = function () {
	  if (this._didRealpath)
	    return

	  this._didRealpath = true

	  var n = this.matches.length
	  if (n === 0)
	    return this._finish()

	  var self = this
	  for (var i = 0; i < this.matches.length; i++)
	    this._realpathSet(i, next)

	  function next () {
	    if (--n === 0)
	      self._finish()
	  }
	}

	Glob.prototype._realpathSet = function (index, cb) {
	  var matchset = this.matches[index]
	  if (!matchset)
	    return cb()

	  var found = Object.keys(matchset)
	  var self = this
	  var n = found.length

	  if (n === 0)
	    return cb()

	  var set = this.matches[index] = Object.create(null)
	  found.forEach(function (p, i) {
	    // If there's a problem with the stat, then it means that
	    // one or more of the links in the realpath couldn't be
	    // resolved.  just return the abs value in that case.
	    p = self._makeAbs(p)
	    fs.realpath(p, self.realpathCache, function (er, real) {
	      if (!er)
	        set[real] = true
	      else if (er.syscall === 'stat')
	        set[p] = true
	      else
	        self.emit('error', er) // srsly wtf right here

	      if (--n === 0) {
	        self.matches[index] = set
	        cb()
	      }
	    })
	  })
	}

	Glob.prototype._mark = function (p) {
	  return common.mark(this, p)
	}

	Glob.prototype._makeAbs = function (f) {
	  return common.makeAbs(this, f)
	}

	Glob.prototype.abort = function () {
	  this.aborted = true
	  this.emit('abort')
	}

	Glob.prototype.pause = function () {
	  if (!this.paused) {
	    this.paused = true
	    this.emit('pause')
	  }
	}

	Glob.prototype.resume = function () {
	  if (this.paused) {
	    this.emit('resume')
	    this.paused = false
	    if (this._emitQueue.length) {
	      var eq = this._emitQueue.slice(0)
	      this._emitQueue.length = 0
	      for (var i = 0; i < eq.length; i ++) {
	        var e = eq[i]
	        this._emitMatch(e[0], e[1])
	      }
	    }
	    if (this._processQueue.length) {
	      var pq = this._processQueue.slice(0)
	      this._processQueue.length = 0
	      for (var i = 0; i < pq.length; i ++) {
	        var p = pq[i]
	        this._processing--
	        this._process(p[0], p[1], p[2], p[3])
	      }
	    }
	  }
	}

	Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
	  assert(this instanceof Glob)
	  assert(typeof cb === 'function')

	  if (this.aborted)
	    return

	  this._processing++
	  if (this.paused) {
	    this._processQueue.push([pattern, index, inGlobStar, cb])
	    return
	  }

	  //console.error('PROCESS %d', this._processing, pattern)

	  // Get the first [n] parts of pattern that are all strings.
	  var n = 0
	  while (typeof pattern[n] === 'string') {
	    n ++
	  }
	  // now n is the index of the first one that is *not* a string.

	  // see if there's anything else
	  var prefix
	  switch (n) {
	    // if not, then this is rather simple
	    case pattern.length:
	      this._processSimple(pattern.join('/'), index, cb)
	      return

	    case 0:
	      // pattern *starts* with some non-trivial item.
	      // going to readdir(cwd), but not include the prefix in matches.
	      prefix = null
	      break

	    default:
	      // pattern has some string bits in the front.
	      // whatever it starts with, whether that's 'absolute' like /foo/bar,
	      // or 'relative' like '../baz'
	      prefix = pattern.slice(0, n).join('/')
	      break
	  }

	  var remain = pattern.slice(n)

	  // get the list of entries.
	  var read
	  if (prefix === null)
	    read = '.'
	  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
	    if (!prefix || !isAbsolute(prefix))
	      prefix = '/' + prefix
	    read = prefix
	  } else
	    read = prefix

	  var abs = this._makeAbs(read)

	  //if ignored, skip _processing
	  if (childrenIgnored(this, read))
	    return cb()

	  var isGlobStar = remain[0] === minimatch.GLOBSTAR
	  if (isGlobStar)
	    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
	  else
	    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
	}

	Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
	  var self = this
	  this._readdir(abs, inGlobStar, function (er, entries) {
	    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
	  })
	}

	Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

	  // if the abs isn't a dir, then nothing can match!
	  if (!entries)
	    return cb()

	  // It will only match dot entries if it starts with a dot, or if
	  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
	  var pn = remain[0]
	  var negate = !!this.minimatch.negate
	  var rawGlob = pn._glob
	  var dotOk = this.dot || rawGlob.charAt(0) === '.'

	  var matchedEntries = []
	  for (var i = 0; i < entries.length; i++) {
	    var e = entries[i]
	    if (e.charAt(0) !== '.' || dotOk) {
	      var m
	      if (negate && !prefix) {
	        m = !e.match(pn)
	      } else {
	        m = e.match(pn)
	      }
	      if (m)
	        matchedEntries.push(e)
	    }
	  }

	  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

	  var len = matchedEntries.length
	  // If there are no matched entries, then nothing matches.
	  if (len === 0)
	    return cb()

	  // if this is the last remaining pattern bit, then no need for
	  // an additional stat *unless* the user has specified mark or
	  // stat explicitly.  We know they exist, since readdir returned
	  // them.

	  if (remain.length === 1 && !this.mark && !this.stat) {
	    if (!this.matches[index])
	      this.matches[index] = Object.create(null)

	    for (var i = 0; i < len; i ++) {
	      var e = matchedEntries[i]
	      if (prefix) {
	        if (prefix !== '/')
	          e = prefix + '/' + e
	        else
	          e = prefix + e
	      }

	      if (e.charAt(0) === '/' && !this.nomount) {
	        e = path.join(this.root, e)
	      }
	      this._emitMatch(index, e)
	    }
	    // This was the last one, and no stats were needed
	    return cb()
	  }

	  // now test all matched entries as stand-ins for that part
	  // of the pattern.
	  remain.shift()
	  for (var i = 0; i < len; i ++) {
	    var e = matchedEntries[i]
	    var newPattern
	    if (prefix) {
	      if (prefix !== '/')
	        e = prefix + '/' + e
	      else
	        e = prefix + e
	    }
	    this._process([e].concat(remain), index, inGlobStar, cb)
	  }
	  cb()
	}

	Glob.prototype._emitMatch = function (index, e) {
	  if (this.aborted)
	    return

	  if (this.matches[index][e])
	    return

	  if (isIgnored(this, e))
	    return

	  if (this.paused) {
	    this._emitQueue.push([index, e])
	    return
	  }

	  var abs = this._makeAbs(e)

	  if (this.nodir) {
	    var c = this.cache[abs]
	    if (c === 'DIR' || Array.isArray(c))
	      return
	  }

	  if (this.mark)
	    e = this._mark(e)

	  this.matches[index][e] = true

	  var st = this.statCache[abs]
	  if (st)
	    this.emit('stat', e, st)

	  this.emit('match', e)
	}

	Glob.prototype._readdirInGlobStar = function (abs, cb) {
	  if (this.aborted)
	    return

	  // follow all symlinked directories forever
	  // just proceed as if this is a non-globstar situation
	  if (this.follow)
	    return this._readdir(abs, false, cb)

	  var lstatkey = 'lstat\0' + abs
	  var self = this
	  var lstatcb = inflight(lstatkey, lstatcb_)

	  if (lstatcb)
	    fs.lstat(abs, lstatcb)

	  function lstatcb_ (er, lstat) {
	    if (er)
	      return cb()

	    var isSym = lstat.isSymbolicLink()
	    self.symlinks[abs] = isSym

	    // If it's not a symlink or a dir, then it's definitely a regular file.
	    // don't bother doing a readdir in that case.
	    if (!isSym && !lstat.isDirectory()) {
	      self.cache[abs] = 'FILE'
	      cb()
	    } else
	      self._readdir(abs, false, cb)
	  }
	}

	Glob.prototype._readdir = function (abs, inGlobStar, cb) {
	  if (this.aborted)
	    return

	  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
	  if (!cb)
	    return

	  //console.error('RD %j %j', +inGlobStar, abs)
	  if (inGlobStar && !ownProp(this.symlinks, abs))
	    return this._readdirInGlobStar(abs, cb)

	  if (ownProp(this.cache, abs)) {
	    var c = this.cache[abs]
	    if (!c || c === 'FILE')
	      return cb()

	    if (Array.isArray(c))
	      return cb(null, c)
	  }

	  var self = this
	  fs.readdir(abs, readdirCb(this, abs, cb))
	}

	function readdirCb (self, abs, cb) {
	  return function (er, entries) {
	    if (er)
	      self._readdirError(abs, er, cb)
	    else
	      self._readdirEntries(abs, entries, cb)
	  }
	}

	Glob.prototype._readdirEntries = function (abs, entries, cb) {
	  if (this.aborted)
	    return

	  // if we haven't asked to stat everything, then just
	  // assume that everything in there exists, so we can avoid
	  // having to stat it a second time.
	  if (!this.mark && !this.stat) {
	    for (var i = 0; i < entries.length; i ++) {
	      var e = entries[i]
	      if (abs === '/')
	        e = abs + e
	      else
	        e = abs + '/' + e
	      this.cache[e] = true
	    }
	  }

	  this.cache[abs] = entries
	  return cb(null, entries)
	}

	Glob.prototype._readdirError = function (f, er, cb) {
	  if (this.aborted)
	    return

	  // handle errors, and cache the information
	  switch (er.code) {
	    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
	    case 'ENOTDIR': // totally normal. means it *does* exist.
	      this.cache[this._makeAbs(f)] = 'FILE'
	      if (f === this.cwd) {
	        var error = new Error(er.code + ' invalid cwd ' + f)
	        error.path = f
	        error.code = er.code
	        this.emit('error', error)
	        this.abort()
	      }
	      break

	    case 'ENOENT': // not terribly unusual
	    case 'ELOOP':
	    case 'ENAMETOOLONG':
	    case 'UNKNOWN':
	      this.cache[this._makeAbs(f)] = false
	      break

	    default: // some unusual error.  Treat as failure.
	      this.cache[this._makeAbs(f)] = false
	      if (this.strict) {
	        this.emit('error', er)
	        // If the error is handled, then we abort
	        // if not, we threw out of here
	        this.abort()
	      }
	      if (!this.silent)
	        console.error('glob error', er)
	      break
	  }

	  return cb()
	}

	Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
	  var self = this
	  this._readdir(abs, inGlobStar, function (er, entries) {
	    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
	  })
	}


	Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
	  //console.error('pgs2', prefix, remain[0], entries)

	  // no entries means not a dir, so it can never have matches
	  // foo.txt/** doesn't match foo.txt
	  if (!entries)
	    return cb()

	  // test without the globstar, and with every child both below
	  // and replacing the globstar.
	  var remainWithoutGlobStar = remain.slice(1)
	  var gspref = prefix ? [ prefix ] : []
	  var noGlobStar = gspref.concat(remainWithoutGlobStar)

	  // the noGlobStar pattern exits the inGlobStar state
	  this._process(noGlobStar, index, false, cb)

	  var isSym = this.symlinks[abs]
	  var len = entries.length

	  // If it's a symlink, and we're in a globstar, then stop
	  if (isSym && inGlobStar)
	    return cb()

	  for (var i = 0; i < len; i++) {
	    var e = entries[i]
	    if (e.charAt(0) === '.' && !this.dot)
	      continue

	    // these two cases enter the inGlobStar state
	    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
	    this._process(instead, index, true, cb)

	    var below = gspref.concat(entries[i], remain)
	    this._process(below, index, true, cb)
	  }

	  cb()
	}

	Glob.prototype._processSimple = function (prefix, index, cb) {
	  // XXX review this.  Shouldn't it be doing the mounting etc
	  // before doing stat?  kinda weird?
	  var self = this
	  this._stat(prefix, function (er, exists) {
	    self._processSimple2(prefix, index, er, exists, cb)
	  })
	}
	Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

	  //console.error('ps2', prefix, exists)

	  if (!this.matches[index])
	    this.matches[index] = Object.create(null)

	  // If it doesn't exist, then just mark the lack of results
	  if (!exists)
	    return cb()

	  if (prefix && isAbsolute(prefix) && !this.nomount) {
	    var trail = /[\/\\]$/.test(prefix)
	    if (prefix.charAt(0) === '/') {
	      prefix = path.join(this.root, prefix)
	    } else {
	      prefix = path.resolve(this.root, prefix)
	      if (trail)
	        prefix += '/'
	    }
	  }

	  if (process.platform === 'win32')
	    prefix = prefix.replace(/\\/g, '/')

	  // Mark this as a match
	  this._emitMatch(index, prefix)
	  cb()
	}

	// Returns either 'DIR', 'FILE', or false
	Glob.prototype._stat = function (f, cb) {
	  var abs = this._makeAbs(f)
	  var needDir = f.slice(-1) === '/'

	  if (f.length > this.maxLength)
	    return cb()

	  if (!this.stat && ownProp(this.cache, abs)) {
	    var c = this.cache[abs]

	    if (Array.isArray(c))
	      c = 'DIR'

	    // It exists, but maybe not how we need it
	    if (!needDir || c === 'DIR')
	      return cb(null, c)

	    if (needDir && c === 'FILE')
	      return cb()

	    // otherwise we have to stat, because maybe c=true
	    // if we know it exists, but not what it is.
	  }

	  var exists
	  var stat = this.statCache[abs]
	  if (stat !== undefined) {
	    if (stat === false)
	      return cb(null, stat)
	    else {
	      var type = stat.isDirectory() ? 'DIR' : 'FILE'
	      if (needDir && type === 'FILE')
	        return cb()
	      else
	        return cb(null, type, stat)
	    }
	  }

	  var self = this
	  var statcb = inflight('stat\0' + abs, lstatcb_)
	  if (statcb)
	    fs.lstat(abs, statcb)

	  function lstatcb_ (er, lstat) {
	    if (lstat && lstat.isSymbolicLink()) {
	      // If it's a symlink, then treat it as the target, unless
	      // the target does not exist, then treat it as a file.
	      return fs.stat(abs, function (er, stat) {
	        if (er)
	          self._stat2(f, abs, null, lstat, cb)
	        else
	          self._stat2(f, abs, er, stat, cb)
	      })
	    } else {
	      self._stat2(f, abs, er, lstat, cb)
	    }
	  }
	}

	Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
	  if (er) {
	    this.statCache[abs] = false
	    return cb()
	  }

	  var needDir = f.slice(-1) === '/'
	  this.statCache[abs] = stat

	  if (abs.slice(-1) === '/' && !stat.isDirectory())
	    return cb(null, false, stat)

	  var c = stat.isDirectory() ? 'DIR' : 'FILE'
	  this.cache[abs] = this.cache[abs] || c

	  if (needDir && c !== 'DIR')
	    return cb()

	  return cb(null, c, stat)
	}


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = minimatch
	minimatch.Minimatch = Minimatch

	var path = { sep: '/' }
	try {
	  path = __webpack_require__(4)
	} catch (er) {}

	var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
	var expand = __webpack_require__(5)

	// any single thing other than /
	// don't need to escape / when using new RegExp()
	var qmark = '[^/]'

	// * => any number of characters
	var star = qmark + '*?'

	// ** when dots are allowed.  Anything goes, except .. and .
	// not (^ or / followed by one or two dots followed by $ or /),
	// followed by anything, any number of times.
	var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

	// not a ^ or / followed by a dot,
	// followed by anything, any number of times.
	var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

	// characters that need to be escaped in RegExp.
	var reSpecials = charSet('().*{}+?[]^$\\!')

	// "abc" -> { a:true, b:true, c:true }
	function charSet (s) {
	  return s.split('').reduce(function (set, c) {
	    set[c] = true
	    return set
	  }, {})
	}

	// normalizes slashes.
	var slashSplit = /\/+/

	minimatch.filter = filter
	function filter (pattern, options) {
	  options = options || {}
	  return function (p, i, list) {
	    return minimatch(p, pattern, options)
	  }
	}

	function ext (a, b) {
	  a = a || {}
	  b = b || {}
	  var t = {}
	  Object.keys(b).forEach(function (k) {
	    t[k] = b[k]
	  })
	  Object.keys(a).forEach(function (k) {
	    t[k] = a[k]
	  })
	  return t
	}

	minimatch.defaults = function (def) {
	  if (!def || !Object.keys(def).length) return minimatch

	  var orig = minimatch

	  var m = function minimatch (p, pattern, options) {
	    return orig.minimatch(p, pattern, ext(def, options))
	  }

	  m.Minimatch = function Minimatch (pattern, options) {
	    return new orig.Minimatch(pattern, ext(def, options))
	  }

	  return m
	}

	Minimatch.defaults = function (def) {
	  if (!def || !Object.keys(def).length) return Minimatch
	  return minimatch.defaults(def).Minimatch
	}

	function minimatch (p, pattern, options) {
	  if (typeof pattern !== 'string') {
	    throw new TypeError('glob pattern string required')
	  }

	  if (!options) options = {}

	  // shortcut: comments match nothing.
	  if (!options.nocomment && pattern.charAt(0) === '#') {
	    return false
	  }

	  // "" only matches ""
	  if (pattern.trim() === '') return p === ''

	  return new Minimatch(pattern, options).match(p)
	}

	function Minimatch (pattern, options) {
	  if (!(this instanceof Minimatch)) {
	    return new Minimatch(pattern, options)
	  }

	  if (typeof pattern !== 'string') {
	    throw new TypeError('glob pattern string required')
	  }

	  if (!options) options = {}
	  pattern = pattern.trim()

	  // windows support: need to use /, not \
	  if (path.sep !== '/') {
	    pattern = pattern.split(path.sep).join('/')
	  }

	  this.options = options
	  this.set = []
	  this.pattern = pattern
	  this.regexp = null
	  this.negate = false
	  this.comment = false
	  this.empty = false

	  // make the set of regexps etc.
	  this.make()
	}

	Minimatch.prototype.debug = function () {}

	Minimatch.prototype.make = make
	function make () {
	  // don't do it more than once.
	  if (this._made) return

	  var pattern = this.pattern
	  var options = this.options

	  // empty patterns and comments match nothing.
	  if (!options.nocomment && pattern.charAt(0) === '#') {
	    this.comment = true
	    return
	  }
	  if (!pattern) {
	    this.empty = true
	    return
	  }

	  // step 1: figure out negation, etc.
	  this.parseNegate()

	  // step 2: expand braces
	  var set = this.globSet = this.braceExpand()

	  if (options.debug) this.debug = console.error

	  this.debug(this.pattern, set)

	  // step 3: now we have a set, so turn each one into a series of path-portion
	  // matching patterns.
	  // These will be regexps, except in the case of "**", which is
	  // set to the GLOBSTAR object for globstar behavior,
	  // and will not contain any / characters
	  set = this.globParts = set.map(function (s) {
	    return s.split(slashSplit)
	  })

	  this.debug(this.pattern, set)

	  // glob --> regexps
	  set = set.map(function (s, si, set) {
	    return s.map(this.parse, this)
	  }, this)

	  this.debug(this.pattern, set)

	  // filter out everything that didn't compile properly.
	  set = set.filter(function (s) {
	    return s.indexOf(false) === -1
	  })

	  this.debug(this.pattern, set)

	  this.set = set
	}

	Minimatch.prototype.parseNegate = parseNegate
	function parseNegate () {
	  var pattern = this.pattern
	  var negate = false
	  var options = this.options
	  var negateOffset = 0

	  if (options.nonegate) return

	  for (var i = 0, l = pattern.length
	    ; i < l && pattern.charAt(i) === '!'
	    ; i++) {
	    negate = !negate
	    negateOffset++
	  }

	  if (negateOffset) this.pattern = pattern.substr(negateOffset)
	  this.negate = negate
	}

	// Brace expansion:
	// a{b,c}d -> abd acd
	// a{b,}c -> abc ac
	// a{0..3}d -> a0d a1d a2d a3d
	// a{b,c{d,e}f}g -> abg acdfg acefg
	// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
	//
	// Invalid sets are not expanded.
	// a{2..}b -> a{2..}b
	// a{b}c -> a{b}c
	minimatch.braceExpand = function (pattern, options) {
	  return braceExpand(pattern, options)
	}

	Minimatch.prototype.braceExpand = braceExpand

	function braceExpand (pattern, options) {
	  if (!options) {
	    if (this instanceof Minimatch) {
	      options = this.options
	    } else {
	      options = {}
	    }
	  }

	  pattern = typeof pattern === 'undefined'
	    ? this.pattern : pattern

	  if (typeof pattern === 'undefined') {
	    throw new Error('undefined pattern')
	  }

	  if (options.nobrace ||
	    !pattern.match(/\{.*\}/)) {
	    // shortcut. no need to expand.
	    return [pattern]
	  }

	  return expand(pattern)
	}

	// parse a component of the expanded set.
	// At this point, no pattern may contain "/" in it
	// so we're going to return a 2d array, where each entry is the full
	// pattern, split on '/', and then turned into a regular expression.
	// A regexp is made at the end which joins each array with an
	// escaped /, and another full one which joins each regexp with |.
	//
	// Following the lead of Bash 4.1, note that "**" only has special meaning
	// when it is the *only* thing in a path portion.  Otherwise, any series
	// of * is equivalent to a single *.  Globstar behavior is enabled by
	// default, and can be disabled by setting options.noglobstar.
	Minimatch.prototype.parse = parse
	var SUBPARSE = {}
	function parse (pattern, isSub) {
	  var options = this.options

	  // shortcuts
	  if (!options.noglobstar && pattern === '**') return GLOBSTAR
	  if (pattern === '') return ''

	  var re = ''
	  var hasMagic = !!options.nocase
	  var escaping = false
	  // ? => one single character
	  var patternListStack = []
	  var negativeLists = []
	  var plType
	  var stateChar
	  var inClass = false
	  var reClassStart = -1
	  var classStart = -1
	  // . and .. never match anything that doesn't start with .,
	  // even when options.dot is set.
	  var patternStart = pattern.charAt(0) === '.' ? '' // anything
	  // not (start or / followed by . or .. followed by / or end)
	  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
	  : '(?!\\.)'
	  var self = this

	  function clearStateChar () {
	    if (stateChar) {
	      // we had some state-tracking character
	      // that wasn't consumed by this pass.
	      switch (stateChar) {
	        case '*':
	          re += star
	          hasMagic = true
	        break
	        case '?':
	          re += qmark
	          hasMagic = true
	        break
	        default:
	          re += '\\' + stateChar
	        break
	      }
	      self.debug('clearStateChar %j %j', stateChar, re)
	      stateChar = false
	    }
	  }

	  for (var i = 0, len = pattern.length, c
	    ; (i < len) && (c = pattern.charAt(i))
	    ; i++) {
	    this.debug('%s\t%s %s %j', pattern, i, re, c)

	    // skip over any that are escaped.
	    if (escaping && reSpecials[c]) {
	      re += '\\' + c
	      escaping = false
	      continue
	    }

	    switch (c) {
	      case '/':
	        // completely not allowed, even escaped.
	        // Should already be path-split by now.
	        return false

	      case '\\':
	        clearStateChar()
	        escaping = true
	      continue

	      // the various stateChar values
	      // for the "extglob" stuff.
	      case '?':
	      case '*':
	      case '+':
	      case '@':
	      case '!':
	        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

	        // all of those are literals inside a class, except that
	        // the glob [!a] means [^a] in regexp
	        if (inClass) {
	          this.debug('  in class')
	          if (c === '!' && i === classStart + 1) c = '^'
	          re += c
	          continue
	        }

	        // if we already have a stateChar, then it means
	        // that there was something like ** or +? in there.
	        // Handle the stateChar, then proceed with this one.
	        self.debug('call clearStateChar %j', stateChar)
	        clearStateChar()
	        stateChar = c
	        // if extglob is disabled, then +(asdf|foo) isn't a thing.
	        // just clear the statechar *now*, rather than even diving into
	        // the patternList stuff.
	        if (options.noext) clearStateChar()
	      continue

	      case '(':
	        if (inClass) {
	          re += '('
	          continue
	        }

	        if (!stateChar) {
	          re += '\\('
	          continue
	        }

	        plType = stateChar
	        patternListStack.push({
	          type: plType,
	          start: i - 1,
	          reStart: re.length
	        })
	        // negation is (?:(?!js)[^/]*)
	        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
	        this.debug('plType %j %j', stateChar, re)
	        stateChar = false
	      continue

	      case ')':
	        if (inClass || !patternListStack.length) {
	          re += '\\)'
	          continue
	        }

	        clearStateChar()
	        hasMagic = true
	        re += ')'
	        var pl = patternListStack.pop()
	        plType = pl.type
	        // negation is (?:(?!js)[^/]*)
	        // The others are (?:<pattern>)<type>
	        switch (plType) {
	          case '!':
	            negativeLists.push(pl)
	            re += ')[^/]*?)'
	            pl.reEnd = re.length
	            break
	          case '?':
	          case '+':
	          case '*':
	            re += plType
	            break
	          case '@': break // the default anyway
	        }
	      continue

	      case '|':
	        if (inClass || !patternListStack.length || escaping) {
	          re += '\\|'
	          escaping = false
	          continue
	        }

	        clearStateChar()
	        re += '|'
	      continue

	      // these are mostly the same in regexp and glob
	      case '[':
	        // swallow any state-tracking char before the [
	        clearStateChar()

	        if (inClass) {
	          re += '\\' + c
	          continue
	        }

	        inClass = true
	        classStart = i
	        reClassStart = re.length
	        re += c
	      continue

	      case ']':
	        //  a right bracket shall lose its special
	        //  meaning and represent itself in
	        //  a bracket expression if it occurs
	        //  first in the list.  -- POSIX.2 2.8.3.2
	        if (i === classStart + 1 || !inClass) {
	          re += '\\' + c
	          escaping = false
	          continue
	        }

	        // handle the case where we left a class open.
	        // "[z-a]" is valid, equivalent to "\[z-a\]"
	        if (inClass) {
	          // split where the last [ was, make sure we don't have
	          // an invalid re. if so, re-walk the contents of the
	          // would-be class to re-translate any characters that
	          // were passed through as-is
	          // TODO: It would probably be faster to determine this
	          // without a try/catch and a new RegExp, but it's tricky
	          // to do safely.  For now, this is safe and works.
	          var cs = pattern.substring(classStart + 1, i)
	          try {
	            RegExp('[' + cs + ']')
	          } catch (er) {
	            // not a valid class!
	            var sp = this.parse(cs, SUBPARSE)
	            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
	            hasMagic = hasMagic || sp[1]
	            inClass = false
	            continue
	          }
	        }

	        // finish up the class.
	        hasMagic = true
	        inClass = false
	        re += c
	      continue

	      default:
	        // swallow any state char that wasn't consumed
	        clearStateChar()

	        if (escaping) {
	          // no need
	          escaping = false
	        } else if (reSpecials[c]
	          && !(c === '^' && inClass)) {
	          re += '\\'
	        }

	        re += c

	    } // switch
	  } // for

	  // handle the case where we left a class open.
	  // "[abc" is valid, equivalent to "\[abc"
	  if (inClass) {
	    // split where the last [ was, and escape it
	    // this is a huge pita.  We now have to re-walk
	    // the contents of the would-be class to re-translate
	    // any characters that were passed through as-is
	    cs = pattern.substr(classStart + 1)
	    sp = this.parse(cs, SUBPARSE)
	    re = re.substr(0, reClassStart) + '\\[' + sp[0]
	    hasMagic = hasMagic || sp[1]
	  }

	  // handle the case where we had a +( thing at the *end*
	  // of the pattern.
	  // each pattern list stack adds 3 chars, and we need to go through
	  // and escape any | chars that were passed through as-is for the regexp.
	  // Go through and escape them, taking care not to double-escape any
	  // | chars that were already escaped.
	  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
	    var tail = re.slice(pl.reStart + 3)
	    // maybe some even number of \, then maybe 1 \, followed by a |
	    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
	      if (!$2) {
	        // the | isn't already escaped, so escape it.
	        $2 = '\\'
	      }

	      // need to escape all those slashes *again*, without escaping the
	      // one that we need for escaping the | character.  As it works out,
	      // escaping an even number of slashes can be done by simply repeating
	      // it exactly after itself.  That's why this trick works.
	      //
	      // I am sorry that you have to see this.
	      return $1 + $1 + $2 + '|'
	    })

	    this.debug('tail=%j\n   %s', tail, tail)
	    var t = pl.type === '*' ? star
	      : pl.type === '?' ? qmark
	      : '\\' + pl.type

	    hasMagic = true
	    re = re.slice(0, pl.reStart) + t + '\\(' + tail
	  }

	  // handle trailing things that only matter at the very end.
	  clearStateChar()
	  if (escaping) {
	    // trailing \\
	    re += '\\\\'
	  }

	  // only need to apply the nodot start if the re starts with
	  // something that could conceivably capture a dot
	  var addPatternStart = false
	  switch (re.charAt(0)) {
	    case '.':
	    case '[':
	    case '(': addPatternStart = true
	  }

	  // Hack to work around lack of negative lookbehind in JS
	  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
	  // like 'a.xyz.yz' doesn't match.  So, the first negative
	  // lookahead, has to look ALL the way ahead, to the end of
	  // the pattern.
	  for (var n = negativeLists.length - 1; n > -1; n--) {
	    var nl = negativeLists[n]

	    var nlBefore = re.slice(0, nl.reStart)
	    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
	    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
	    var nlAfter = re.slice(nl.reEnd)

	    nlLast += nlAfter

	    // Handle nested stuff like *(*.js|!(*.json)), where open parens
	    // mean that we should *not* include the ) in the bit that is considered
	    // "after" the negated section.
	    var openParensBefore = nlBefore.split('(').length - 1
	    var cleanAfter = nlAfter
	    for (i = 0; i < openParensBefore; i++) {
	      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
	    }
	    nlAfter = cleanAfter

	    var dollar = ''
	    if (nlAfter === '' && isSub !== SUBPARSE) {
	      dollar = '$'
	    }
	    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
	    re = newRe
	  }

	  // if the re is not "" at this point, then we need to make sure
	  // it doesn't match against an empty path part.
	  // Otherwise a/* will match a/, which it should not.
	  if (re !== '' && hasMagic) {
	    re = '(?=.)' + re
	  }

	  if (addPatternStart) {
	    re = patternStart + re
	  }

	  // parsing just a piece of a larger pattern.
	  if (isSub === SUBPARSE) {
	    return [re, hasMagic]
	  }

	  // skip the regexp for non-magical patterns
	  // unescape anything in it, though, so that it'll be
	  // an exact match against a file etc.
	  if (!hasMagic) {
	    return globUnescape(pattern)
	  }

	  var flags = options.nocase ? 'i' : ''
	  var regExp = new RegExp('^' + re + '$', flags)

	  regExp._glob = pattern
	  regExp._src = re

	  return regExp
	}

	minimatch.makeRe = function (pattern, options) {
	  return new Minimatch(pattern, options || {}).makeRe()
	}

	Minimatch.prototype.makeRe = makeRe
	function makeRe () {
	  if (this.regexp || this.regexp === false) return this.regexp

	  // at this point, this.set is a 2d array of partial
	  // pattern strings, or "**".
	  //
	  // It's better to use .match().  This function shouldn't
	  // be used, really, but it's pretty convenient sometimes,
	  // when you just want to work with a regex.
	  var set = this.set

	  if (!set.length) {
	    this.regexp = false
	    return this.regexp
	  }
	  var options = this.options

	  var twoStar = options.noglobstar ? star
	    : options.dot ? twoStarDot
	    : twoStarNoDot
	  var flags = options.nocase ? 'i' : ''

	  var re = set.map(function (pattern) {
	    return pattern.map(function (p) {
	      return (p === GLOBSTAR) ? twoStar
	      : (typeof p === 'string') ? regExpEscape(p)
	      : p._src
	    }).join('\\\/')
	  }).join('|')

	  // must match entire pattern
	  // ending in a * or ** will make it less strict.
	  re = '^(?:' + re + ')$'

	  // can match anything, as long as it's not this.
	  if (this.negate) re = '^(?!' + re + ').*$'

	  try {
	    this.regexp = new RegExp(re, flags)
	  } catch (ex) {
	    this.regexp = false
	  }
	  return this.regexp
	}

	minimatch.match = function (list, pattern, options) {
	  options = options || {}
	  var mm = new Minimatch(pattern, options)
	  list = list.filter(function (f) {
	    return mm.match(f)
	  })
	  if (mm.options.nonull && !list.length) {
	    list.push(pattern)
	  }
	  return list
	}

	Minimatch.prototype.match = match
	function match (f, partial) {
	  this.debug('match', f, this.pattern)
	  // short-circuit in the case of busted things.
	  // comments, etc.
	  if (this.comment) return false
	  if (this.empty) return f === ''

	  if (f === '/' && partial) return true

	  var options = this.options

	  // windows: need to use /, not \
	  if (path.sep !== '/') {
	    f = f.split(path.sep).join('/')
	  }

	  // treat the test path as a set of pathparts.
	  f = f.split(slashSplit)
	  this.debug(this.pattern, 'split', f)

	  // just ONE of the pattern sets in this.set needs to match
	  // in order for it to be valid.  If negating, then just one
	  // match means that we have failed.
	  // Either way, return on the first hit.

	  var set = this.set
	  this.debug(this.pattern, 'set', set)

	  // Find the basename of the path by looking for the last non-empty segment
	  var filename
	  var i
	  for (i = f.length - 1; i >= 0; i--) {
	    filename = f[i]
	    if (filename) break
	  }

	  for (i = 0; i < set.length; i++) {
	    var pattern = set[i]
	    var file = f
	    if (options.matchBase && pattern.length === 1) {
	      file = [filename]
	    }
	    var hit = this.matchOne(file, pattern, partial)
	    if (hit) {
	      if (options.flipNegate) return true
	      return !this.negate
	    }
	  }

	  // didn't get any hits.  this is success if it's a negative
	  // pattern, failure otherwise.
	  if (options.flipNegate) return false
	  return this.negate
	}

	// set partial to true to test if, for example,
	// "/a/b" matches the start of "/*/b/*/d"
	// Partial means, if you run out of file before you run
	// out of pattern, then that's fine, as long as all
	// the parts match.
	Minimatch.prototype.matchOne = function (file, pattern, partial) {
	  var options = this.options

	  this.debug('matchOne',
	    { 'this': this, file: file, pattern: pattern })

	  this.debug('matchOne', file.length, pattern.length)

	  for (var fi = 0,
	      pi = 0,
	      fl = file.length,
	      pl = pattern.length
	      ; (fi < fl) && (pi < pl)
	      ; fi++, pi++) {
	    this.debug('matchOne loop')
	    var p = pattern[pi]
	    var f = file[fi]

	    this.debug(pattern, p, f)

	    // should be impossible.
	    // some invalid regexp stuff in the set.
	    if (p === false) return false

	    if (p === GLOBSTAR) {
	      this.debug('GLOBSTAR', [pattern, p, f])

	      // "**"
	      // a/**/b/**/c would match the following:
	      // a/b/x/y/z/c
	      // a/x/y/z/b/c
	      // a/b/x/b/x/c
	      // a/b/c
	      // To do this, take the rest of the pattern after
	      // the **, and see if it would match the file remainder.
	      // If so, return success.
	      // If not, the ** "swallows" a segment, and try again.
	      // This is recursively awful.
	      //
	      // a/**/b/**/c matching a/b/x/y/z/c
	      // - a matches a
	      // - doublestar
	      //   - matchOne(b/x/y/z/c, b/**/c)
	      //     - b matches b
	      //     - doublestar
	      //       - matchOne(x/y/z/c, c) -> no
	      //       - matchOne(y/z/c, c) -> no
	      //       - matchOne(z/c, c) -> no
	      //       - matchOne(c, c) yes, hit
	      var fr = fi
	      var pr = pi + 1
	      if (pr === pl) {
	        this.debug('** at the end')
	        // a ** at the end will just swallow the rest.
	        // We have found a match.
	        // however, it will not swallow /.x, unless
	        // options.dot is set.
	        // . and .. are *never* matched by **, for explosively
	        // exponential reasons.
	        for (; fi < fl; fi++) {
	          if (file[fi] === '.' || file[fi] === '..' ||
	            (!options.dot && file[fi].charAt(0) === '.')) return false
	        }
	        return true
	      }

	      // ok, let's see if we can swallow whatever we can.
	      while (fr < fl) {
	        var swallowee = file[fr]

	        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

	        // XXX remove this slice.  Just pass the start index.
	        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
	          this.debug('globstar found match!', fr, fl, swallowee)
	          // found a match.
	          return true
	        } else {
	          // can't swallow "." or ".." ever.
	          // can only swallow ".foo" when explicitly asked.
	          if (swallowee === '.' || swallowee === '..' ||
	            (!options.dot && swallowee.charAt(0) === '.')) {
	            this.debug('dot detected!', file, fr, pattern, pr)
	            break
	          }

	          // ** swallows a segment, and continue.
	          this.debug('globstar swallow a segment, and continue')
	          fr++
	        }
	      }

	      // no match was found.
	      // However, in partial mode, we can't say this is necessarily over.
	      // If there's more *pattern* left, then
	      if (partial) {
	        // ran out of file
	        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
	        if (fr === fl) return true
	      }
	      return false
	    }

	    // something other than **
	    // non-magic patterns just have to match exactly
	    // patterns with magic have been turned into regexps.
	    var hit
	    if (typeof p === 'string') {
	      if (options.nocase) {
	        hit = f.toLowerCase() === p.toLowerCase()
	      } else {
	        hit = f === p
	      }
	      this.debug('string match', p, f, hit)
	    } else {
	      hit = f.match(p)
	      this.debug('pattern match', p, f, hit)
	    }

	    if (!hit) return false
	  }

	  // Note: ending in / means that we'll get a final ""
	  // at the end of the pattern.  This can only match a
	  // corresponding "" at the end of the file.
	  // If the file ends in /, then it can only match a
	  // a pattern that ends in /, unless the pattern just
	  // doesn't have any more for it. But, a/b/ should *not*
	  // match "a/b/*", even though "" matches against the
	  // [^/]*? pattern, except in partial mode, where it might
	  // simply not be reached yet.
	  // However, a/b/ should still satisfy a/*

	  // now either we fell off the end of the pattern, or we're done.
	  if (fi === fl && pi === pl) {
	    // ran out of pattern and filename at the same time.
	    // an exact hit!
	    return true
	  } else if (fi === fl) {
	    // ran out of file, but still had pattern left.
	    // this is ok if we're doing the match as part of
	    // a glob fs traversal.
	    return partial
	  } else if (pi === pl) {
	    // ran out of pattern, still have file left.
	    // this is only acceptable if we're on the very last
	    // empty segment of a file with a trailing slash.
	    // a/* should match a/b/
	    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
	    return emptyFileEnd
	  }

	  // should be unreachable.
	  throw new Error('wtf?')
	}

	// replace stuff like \* with *
	function globUnescape (s) {
	  return s.replace(/\\(.)/g, '$1')
	}

	function regExpEscape (s) {
	  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
	}


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(9).inherits


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = globSync
	globSync.GlobSync = GlobSync

	var fs = __webpack_require__(2)
	var minimatch = __webpack_require__(40)
	var Minimatch = minimatch.Minimatch
	var Glob = __webpack_require__(39).Glob
	var util = __webpack_require__(9)
	var path = __webpack_require__(4)
	var assert = __webpack_require__(11)
	var isAbsolute = __webpack_require__(12)
	var common = __webpack_require__(43)
	var alphasort = common.alphasort
	var alphasorti = common.alphasorti
	var setopts = common.setopts
	var ownProp = common.ownProp
	var childrenIgnored = common.childrenIgnored

	function globSync (pattern, options) {
	  if (typeof options === 'function' || arguments.length === 3)
	    throw new TypeError('callback provided to sync glob\n'+
	                        'See: https://github.com/isaacs/node-glob/issues/167')

	  return new GlobSync(pattern, options).found
	}

	function GlobSync (pattern, options) {
	  if (!pattern)
	    throw new Error('must provide pattern')

	  if (typeof options === 'function' || arguments.length === 3)
	    throw new TypeError('callback provided to sync glob\n'+
	                        'See: https://github.com/isaacs/node-glob/issues/167')

	  if (!(this instanceof GlobSync))
	    return new GlobSync(pattern, options)

	  setopts(this, pattern, options)

	  if (this.noprocess)
	    return this

	  var n = this.minimatch.set.length
	  this.matches = new Array(n)
	  for (var i = 0; i < n; i ++) {
	    this._process(this.minimatch.set[i], i, false)
	  }
	  this._finish()
	}

	GlobSync.prototype._finish = function () {
	  assert(this instanceof GlobSync)
	  if (this.realpath) {
	    var self = this
	    this.matches.forEach(function (matchset, index) {
	      var set = self.matches[index] = Object.create(null)
	      for (var p in matchset) {
	        try {
	          p = self._makeAbs(p)
	          var real = fs.realpathSync(p, self.realpathCache)
	          set[real] = true
	        } catch (er) {
	          if (er.syscall === 'stat')
	            set[self._makeAbs(p)] = true
	          else
	            throw er
	        }
	      }
	    })
	  }
	  common.finish(this)
	}


	GlobSync.prototype._process = function (pattern, index, inGlobStar) {
	  assert(this instanceof GlobSync)

	  // Get the first [n] parts of pattern that are all strings.
	  var n = 0
	  while (typeof pattern[n] === 'string') {
	    n ++
	  }
	  // now n is the index of the first one that is *not* a string.

	  // See if there's anything else
	  var prefix
	  switch (n) {
	    // if not, then this is rather simple
	    case pattern.length:
	      this._processSimple(pattern.join('/'), index)
	      return

	    case 0:
	      // pattern *starts* with some non-trivial item.
	      // going to readdir(cwd), but not include the prefix in matches.
	      prefix = null
	      break

	    default:
	      // pattern has some string bits in the front.
	      // whatever it starts with, whether that's 'absolute' like /foo/bar,
	      // or 'relative' like '../baz'
	      prefix = pattern.slice(0, n).join('/')
	      break
	  }

	  var remain = pattern.slice(n)

	  // get the list of entries.
	  var read
	  if (prefix === null)
	    read = '.'
	  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
	    if (!prefix || !isAbsolute(prefix))
	      prefix = '/' + prefix
	    read = prefix
	  } else
	    read = prefix

	  var abs = this._makeAbs(read)

	  //if ignored, skip processing
	  if (childrenIgnored(this, read))
	    return

	  var isGlobStar = remain[0] === minimatch.GLOBSTAR
	  if (isGlobStar)
	    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
	  else
	    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
	}


	GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
	  var entries = this._readdir(abs, inGlobStar)

	  // if the abs isn't a dir, then nothing can match!
	  if (!entries)
	    return

	  // It will only match dot entries if it starts with a dot, or if
	  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
	  var pn = remain[0]
	  var negate = !!this.minimatch.negate
	  var rawGlob = pn._glob
	  var dotOk = this.dot || rawGlob.charAt(0) === '.'

	  var matchedEntries = []
	  for (var i = 0; i < entries.length; i++) {
	    var e = entries[i]
	    if (e.charAt(0) !== '.' || dotOk) {
	      var m
	      if (negate && !prefix) {
	        m = !e.match(pn)
	      } else {
	        m = e.match(pn)
	      }
	      if (m)
	        matchedEntries.push(e)
	    }
	  }

	  var len = matchedEntries.length
	  // If there are no matched entries, then nothing matches.
	  if (len === 0)
	    return

	  // if this is the last remaining pattern bit, then no need for
	  // an additional stat *unless* the user has specified mark or
	  // stat explicitly.  We know they exist, since readdir returned
	  // them.

	  if (remain.length === 1 && !this.mark && !this.stat) {
	    if (!this.matches[index])
	      this.matches[index] = Object.create(null)

	    for (var i = 0; i < len; i ++) {
	      var e = matchedEntries[i]
	      if (prefix) {
	        if (prefix.slice(-1) !== '/')
	          e = prefix + '/' + e
	        else
	          e = prefix + e
	      }

	      if (e.charAt(0) === '/' && !this.nomount) {
	        e = path.join(this.root, e)
	      }
	      this.matches[index][e] = true
	    }
	    // This was the last one, and no stats were needed
	    return
	  }

	  // now test all matched entries as stand-ins for that part
	  // of the pattern.
	  remain.shift()
	  for (var i = 0; i < len; i ++) {
	    var e = matchedEntries[i]
	    var newPattern
	    if (prefix)
	      newPattern = [prefix, e]
	    else
	      newPattern = [e]
	    this._process(newPattern.concat(remain), index, inGlobStar)
	  }
	}


	GlobSync.prototype._emitMatch = function (index, e) {
	  var abs = this._makeAbs(e)
	  if (this.mark)
	    e = this._mark(e)

	  if (this.matches[index][e])
	    return

	  if (this.nodir) {
	    var c = this.cache[this._makeAbs(e)]
	    if (c === 'DIR' || Array.isArray(c))
	      return
	  }

	  this.matches[index][e] = true
	  if (this.stat)
	    this._stat(e)
	}


	GlobSync.prototype._readdirInGlobStar = function (abs) {
	  // follow all symlinked directories forever
	  // just proceed as if this is a non-globstar situation
	  if (this.follow)
	    return this._readdir(abs, false)

	  var entries
	  var lstat
	  var stat
	  try {
	    lstat = fs.lstatSync(abs)
	  } catch (er) {
	    // lstat failed, doesn't exist
	    return null
	  }

	  var isSym = lstat.isSymbolicLink()
	  this.symlinks[abs] = isSym

	  // If it's not a symlink or a dir, then it's definitely a regular file.
	  // don't bother doing a readdir in that case.
	  if (!isSym && !lstat.isDirectory())
	    this.cache[abs] = 'FILE'
	  else
	    entries = this._readdir(abs, false)

	  return entries
	}

	GlobSync.prototype._readdir = function (abs, inGlobStar) {
	  var entries

	  if (inGlobStar && !ownProp(this.symlinks, abs))
	    return this._readdirInGlobStar(abs)

	  if (ownProp(this.cache, abs)) {
	    var c = this.cache[abs]
	    if (!c || c === 'FILE')
	      return null

	    if (Array.isArray(c))
	      return c
	  }

	  try {
	    return this._readdirEntries(abs, fs.readdirSync(abs))
	  } catch (er) {
	    this._readdirError(abs, er)
	    return null
	  }
	}

	GlobSync.prototype._readdirEntries = function (abs, entries) {
	  // if we haven't asked to stat everything, then just
	  // assume that everything in there exists, so we can avoid
	  // having to stat it a second time.
	  if (!this.mark && !this.stat) {
	    for (var i = 0; i < entries.length; i ++) {
	      var e = entries[i]
	      if (abs === '/')
	        e = abs + e
	      else
	        e = abs + '/' + e
	      this.cache[e] = true
	    }
	  }

	  this.cache[abs] = entries

	  // mark and cache dir-ness
	  return entries
	}

	GlobSync.prototype._readdirError = function (f, er) {
	  // handle errors, and cache the information
	  switch (er.code) {
	    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
	    case 'ENOTDIR': // totally normal. means it *does* exist.
	      this.cache[this._makeAbs(f)] = 'FILE'
	      if (f === this.cwd) {
	        var error = new Error(er.code + ' invalid cwd ' + f)
	        error.path = f
	        error.code = er.code
	        throw error
	      }
	      break

	    case 'ENOENT': // not terribly unusual
	    case 'ELOOP':
	    case 'ENAMETOOLONG':
	    case 'UNKNOWN':
	      this.cache[this._makeAbs(f)] = false
	      break

	    default: // some unusual error.  Treat as failure.
	      this.cache[this._makeAbs(f)] = false
	      if (this.strict)
	        throw er
	      if (!this.silent)
	        console.error('glob error', er)
	      break
	  }
	}

	GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

	  var entries = this._readdir(abs, inGlobStar)

	  // no entries means not a dir, so it can never have matches
	  // foo.txt/** doesn't match foo.txt
	  if (!entries)
	    return

	  // test without the globstar, and with every child both below
	  // and replacing the globstar.
	  var remainWithoutGlobStar = remain.slice(1)
	  var gspref = prefix ? [ prefix ] : []
	  var noGlobStar = gspref.concat(remainWithoutGlobStar)

	  // the noGlobStar pattern exits the inGlobStar state
	  this._process(noGlobStar, index, false)

	  var len = entries.length
	  var isSym = this.symlinks[abs]

	  // If it's a symlink, and we're in a globstar, then stop
	  if (isSym && inGlobStar)
	    return

	  for (var i = 0; i < len; i++) {
	    var e = entries[i]
	    if (e.charAt(0) === '.' && !this.dot)
	      continue

	    // these two cases enter the inGlobStar state
	    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
	    this._process(instead, index, true)

	    var below = gspref.concat(entries[i], remain)
	    this._process(below, index, true)
	  }
	}

	GlobSync.prototype._processSimple = function (prefix, index) {
	  // XXX review this.  Shouldn't it be doing the mounting etc
	  // before doing stat?  kinda weird?
	  var exists = this._stat(prefix)

	  if (!this.matches[index])
	    this.matches[index] = Object.create(null)

	  // If it doesn't exist, then just mark the lack of results
	  if (!exists)
	    return

	  if (prefix && isAbsolute(prefix) && !this.nomount) {
	    var trail = /[\/\\]$/.test(prefix)
	    if (prefix.charAt(0) === '/') {
	      prefix = path.join(this.root, prefix)
	    } else {
	      prefix = path.resolve(this.root, prefix)
	      if (trail)
	        prefix += '/'
	    }
	  }

	  if (process.platform === 'win32')
	    prefix = prefix.replace(/\\/g, '/')

	  // Mark this as a match
	  this.matches[index][prefix] = true
	}

	// Returns either 'DIR', 'FILE', or false
	GlobSync.prototype._stat = function (f) {
	  var abs = this._makeAbs(f)
	  var needDir = f.slice(-1) === '/'

	  if (f.length > this.maxLength)
	    return false

	  if (!this.stat && ownProp(this.cache, abs)) {
	    var c = this.cache[abs]

	    if (Array.isArray(c))
	      c = 'DIR'

	    // It exists, but maybe not how we need it
	    if (!needDir || c === 'DIR')
	      return c

	    if (needDir && c === 'FILE')
	      return false

	    // otherwise we have to stat, because maybe c=true
	    // if we know it exists, but not what it is.
	  }

	  var exists
	  var stat = this.statCache[abs]
	  if (!stat) {
	    var lstat
	    try {
	      lstat = fs.lstatSync(abs)
	    } catch (er) {
	      return false
	    }

	    if (lstat.isSymbolicLink()) {
	      try {
	        stat = fs.statSync(abs)
	      } catch (er) {
	        stat = lstat
	      }
	    } else {
	      stat = lstat
	    }
	  }

	  this.statCache[abs] = stat

	  var c = stat.isDirectory() ? 'DIR' : 'FILE'
	  this.cache[abs] = this.cache[abs] || c

	  if (needDir && c !== 'DIR')
	    return false

	  return c
	}

	GlobSync.prototype._mark = function (p) {
	  return common.mark(this, p)
	}

	GlobSync.prototype._makeAbs = function (f) {
	  return common.makeAbs(this, f)
	}


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	exports.alphasort = alphasort
	exports.alphasorti = alphasorti
	exports.setopts = setopts
	exports.ownProp = ownProp
	exports.makeAbs = makeAbs
	exports.finish = finish
	exports.mark = mark
	exports.isIgnored = isIgnored
	exports.childrenIgnored = childrenIgnored

	function ownProp (obj, field) {
	  return Object.prototype.hasOwnProperty.call(obj, field)
	}

	var path = __webpack_require__(4)
	var minimatch = __webpack_require__(40)
	var isAbsolute = __webpack_require__(12)
	var Minimatch = minimatch.Minimatch

	function alphasorti (a, b) {
	  return a.toLowerCase().localeCompare(b.toLowerCase())
	}

	function alphasort (a, b) {
	  return a.localeCompare(b)
	}

	function setupIgnores (self, options) {
	  self.ignore = options.ignore || []

	  if (!Array.isArray(self.ignore))
	    self.ignore = [self.ignore]

	  if (self.ignore.length) {
	    self.ignore = self.ignore.map(ignoreMap)
	  }
	}

	// ignore patterns are always in dot:true mode.
	function ignoreMap (pattern) {
	  var gmatcher = null
	  if (pattern.slice(-3) === '/**') {
	    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
	    gmatcher = new Minimatch(gpattern, { dot: true })
	  }

	  return {
	    matcher: new Minimatch(pattern, { dot: true }),
	    gmatcher: gmatcher
	  }
	}

	function setopts (self, pattern, options) {
	  if (!options)
	    options = {}

	  // base-matching: just use globstar for that.
	  if (options.matchBase && -1 === pattern.indexOf("/")) {
	    if (options.noglobstar) {
	      throw new Error("base matching requires globstar")
	    }
	    pattern = "**/" + pattern
	  }

	  self.silent = !!options.silent
	  self.pattern = pattern
	  self.strict = options.strict !== false
	  self.realpath = !!options.realpath
	  self.realpathCache = options.realpathCache || Object.create(null)
	  self.follow = !!options.follow
	  self.dot = !!options.dot
	  self.mark = !!options.mark
	  self.nodir = !!options.nodir
	  if (self.nodir)
	    self.mark = true
	  self.sync = !!options.sync
	  self.nounique = !!options.nounique
	  self.nonull = !!options.nonull
	  self.nosort = !!options.nosort
	  self.nocase = !!options.nocase
	  self.stat = !!options.stat
	  self.noprocess = !!options.noprocess

	  self.maxLength = options.maxLength || Infinity
	  self.cache = options.cache || Object.create(null)
	  self.statCache = options.statCache || Object.create(null)
	  self.symlinks = options.symlinks || Object.create(null)

	  setupIgnores(self, options)

	  self.changedCwd = false
	  var cwd = process.cwd()
	  if (!ownProp(options, "cwd"))
	    self.cwd = cwd
	  else {
	    self.cwd = path.resolve(options.cwd)
	    self.changedCwd = self.cwd !== cwd
	  }

	  self.root = options.root || path.resolve(self.cwd, "/")
	  self.root = path.resolve(self.root)
	  if (process.platform === "win32")
	    self.root = self.root.replace(/\\/g, "/")

	  self.nomount = !!options.nomount

	  // disable comments and negation in Minimatch.
	  // Note that they are not supported in Glob itself anyway.
	  options.nonegate = true
	  options.nocomment = true

	  self.minimatch = new Minimatch(pattern, options)
	  self.options = self.minimatch.options
	}

	function finish (self) {
	  var nou = self.nounique
	  var all = nou ? [] : Object.create(null)

	  for (var i = 0, l = self.matches.length; i < l; i ++) {
	    var matches = self.matches[i]
	    if (!matches || Object.keys(matches).length === 0) {
	      if (self.nonull) {
	        // do like the shell, and spit out the literal glob
	        var literal = self.minimatch.globSet[i]
	        if (nou)
	          all.push(literal)
	        else
	          all[literal] = true
	      }
	    } else {
	      // had matches
	      var m = Object.keys(matches)
	      if (nou)
	        all.push.apply(all, m)
	      else
	        m.forEach(function (m) {
	          all[m] = true
	        })
	    }
	  }

	  if (!nou)
	    all = Object.keys(all)

	  if (!self.nosort)
	    all = all.sort(self.nocase ? alphasorti : alphasort)

	  // at *some* point we statted all of these
	  if (self.mark) {
	    for (var i = 0; i < all.length; i++) {
	      all[i] = self._mark(all[i])
	    }
	    if (self.nodir) {
	      all = all.filter(function (e) {
	        return !(/\/$/.test(e))
	      })
	    }
	  }

	  if (self.ignore.length)
	    all = all.filter(function(m) {
	      return !isIgnored(self, m)
	    })

	  self.found = all
	}

	function mark (self, p) {
	  var abs = makeAbs(self, p)
	  var c = self.cache[abs]
	  var m = p
	  if (c) {
	    var isDir = c === 'DIR' || Array.isArray(c)
	    var slash = p.slice(-1) === '/'

	    if (isDir && !slash)
	      m += '/'
	    else if (!isDir && slash)
	      m = m.slice(0, -1)

	    if (m !== p) {
	      var mabs = makeAbs(self, m)
	      self.statCache[mabs] = self.statCache[abs]
	      self.cache[mabs] = self.cache[abs]
	    }
	  }

	  return m
	}

	// lotta situps...
	function makeAbs (self, f) {
	  var abs = f
	  if (f.charAt(0) === '/') {
	    abs = path.join(self.root, f)
	  } else if (isAbsolute(f) || f === '') {
	    abs = f
	  } else if (self.changedCwd) {
	    abs = path.resolve(self.cwd, f)
	  } else {
	    abs = path.resolve(f)
	  }
	  return abs
	}


	// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
	// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
	function isIgnored (self, path) {
	  if (!self.ignore.length)
	    return false

	  return self.ignore.some(function(item) {
	    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
	  })
	}

	function childrenIgnored (self, path) {
	  if (!self.ignore.length)
	    return false

	  return self.ignore.some(function(item) {
	    return !!(item.gmatcher && item.gmatcher.match(path))
	  })
	}


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	var jsonFile = __webpack_require__(45)

	jsonFile.outputJsonSync = __webpack_require__(47)
	jsonFile.outputJson = __webpack_require__(48)
	// aliases
	jsonFile.outputJSONSync = __webpack_require__(47)
	jsonFile.outputJSON = __webpack_require__(48)

	module.exports = jsonFile


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	var jsonFile = __webpack_require__(46)

	module.exports = {
	  // jsonfile exports
	  readJson: jsonFile.readFile,
	  readJSON: jsonFile.readFile,
	  readJsonSync: jsonFile.readFileSync,
	  readJSONSync: jsonFile.readFileSync,
	  writeJson: jsonFile.writeFile,
	  writeJSON: jsonFile.writeFile,
	  writeJsonSync: jsonFile.writeFileSync,
	  writeJSONSync: jsonFile.writeFileSync,
	  spaces: 2 // default in fs-extra
	}


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(2)

	function readFile (file, options, callback) {
	  if (callback == null) {
	    callback = options
	    options = {}
	  }

	  fs.readFile(file, options, function (err, data) {
	    if (err) return callback(err)

	    var obj
	    try {
	      obj = JSON.parse(data, options ? options.reviver : null)
	    } catch (err2) {
	      err2.message = file + ': ' + err2.message
	      return callback(err2)
	    }

	    callback(null, obj)
	  })
	}

	function readFileSync (file, options) {
	  options = options || {}
	  if (typeof options === 'string') {
	    options = {encoding: options}
	  }

	  var shouldThrow = 'throws' in options ? options.throws : true
	  var content = fs.readFileSync(file, options)

	  try {
	    return JSON.parse(content, options.reviver)
	  } catch (err) {
	    if (shouldThrow) {
	      err.message = file + ': ' + err.message
	      throw err
	    } else {
	      return null
	    }
	  }
	}

	function writeFile (file, obj, options, callback) {
	  if (callback == null) {
	    callback = options
	    options = {}
	  }

	  var spaces = typeof options === 'object' && options !== null
	    ? 'spaces' in options
	    ? options.spaces : this.spaces
	    : this.spaces

	  var str = ''
	  try {
	    str = JSON.stringify(obj, options ? options.replacer : null, spaces) + '\n'
	  } catch (err) {
	    if (callback) return callback(err, null)
	  }

	  fs.writeFile(file, str, options, callback)
	}

	function writeFileSync (file, obj, options) {
	  options = options || {}

	  var spaces = typeof options === 'object' && options !== null
	    ? 'spaces' in options
	    ? options.spaces : this.spaces
	    : this.spaces

	  var str = JSON.stringify(obj, options.replacer, spaces) + '\n'
	  // not sure if fs.writeFileSync returns anything, but just in case
	  return fs.writeFileSync(file, str, options)
	}

	var jsonfile = {
	  spaces: null,
	  readFile: readFile,
	  readFileSync: readFileSync,
	  writeFile: writeFile,
	  writeFileSync: writeFileSync
	}

	module.exports = jsonfile


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var jsonFile = __webpack_require__(45)
	var mkdir = __webpack_require__(31)

	function outputJsonSync (file, data, options) {
	  var dir = path.dirname(file)

	  if (!fs.existsSync(dir)) {
	    mkdir.mkdirsSync(dir)
	  }

	  jsonFile.writeJsonSync(file, data, options)
	}

	module.exports = outputJsonSync


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)
	var path = __webpack_require__(4)
	var jsonFile = __webpack_require__(45)
	var mkdir = __webpack_require__(31)

	function outputJson (file, data, options, callback) {
	  if (typeof options === 'function') {
	    callback = options
	    options = {}
	  }

	  var dir = path.dirname(file)

	  fs.exists(dir, function (itDoes) {
	    if (itDoes) return jsonFile.writeJson(file, data, options, callback)

	    mkdir.mkdirs(dir, function (err) {
	      if (err) return callback(err)
	      jsonFile.writeJson(file, data, options, callback)
	    })
	  })
	}

	module.exports = outputJson


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	// most of this code was written by Andrew Kelley
	// licensed under the BSD license: see
	// https://github.com/andrewrk/node-mv/blob/master/package.json

	// this needs a cleanup

	var fs = __webpack_require__(20)
	var ncp = __webpack_require__(28)
	var path = __webpack_require__(4)
	var rimraf = __webpack_require__(38)
	var mkdirp = __webpack_require__(31).mkdirs

	function mv (source, dest, options, callback) {
	  if (typeof options === 'function') {
	    callback = options
	    options = {}
	  }

	  var shouldMkdirp = ('mkdirp' in options) ? options.mkdirp : true
	  var clobber = ('clobber' in options) ? options.clobber : false

	  var limit = options.limit || 16

	  if (shouldMkdirp) {
	    mkdirs()
	  } else {
	    doRename()
	  }

	  function mkdirs () {
	    mkdirp(path.dirname(dest), function (err) {
	      if (err) return callback(err)
	      doRename()
	    })
	  }

	  function doRename () {
	    if (clobber) {
	      fs.rename(source, dest, function (err) {
	        if (!err) return callback()

	        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST') {
	          rimraf(dest, function (err) {
	            if (err) return callback(err)
	            options.clobber = false // just clobbered it, no need to do it again
	            mv(source, dest, options, callback)
	          })
	          return
	        }

	        // weird Windows shit
	        if (err.code === 'EPERM') {
	          setTimeout(function () {
	            rimraf(dest, function (err) {
	              if (err) return callback(err)
	              options.clobber = false
	              mv(source, dest, options, callback)
	            })
	          }, 200)
	          return
	        }

	        if (err.code !== 'EXDEV') return callback(err)
	        moveAcrossDevice(source, dest, clobber, limit, callback)
	      })
	    } else {
	      fs.link(source, dest, function (err) {
	        if (err) {
	          if (err.code === 'EXDEV' || err.code === 'EISDIR' || err.code === 'EPERM') {
	            moveAcrossDevice(source, dest, clobber, limit, callback)
	            return
	          }
	          callback(err)
	          return
	        }
	        fs.unlink(source, callback)
	      })
	    }
	  }
	}

	function moveAcrossDevice (source, dest, clobber, limit, callback) {
	  fs.stat(source, function (err, stat) {
	    if (err) {
	      callback(err)
	      return
	    }

	    if (stat.isDirectory()) {
	      moveDirAcrossDevice(source, dest, clobber, limit, callback)
	    } else {
	      moveFileAcrossDevice(source, dest, clobber, limit, callback)
	    }
	  })
	}

	function moveFileAcrossDevice (source, dest, clobber, limit, callback) {
	  var outFlags = clobber ? 'w' : 'wx'
	  var ins = fs.createReadStream(source)
	  var outs = fs.createWriteStream(dest, {flags: outFlags})

	  ins.on('error', function (err) {
	    ins.destroy()
	    outs.destroy()
	    outs.removeListener('close', onClose)

	    // may want to create a directory but `out` line above
	    // creates an empty file for us: See #108
	    // don't care about error here
	    fs.unlink(dest, function () {
	      // note: `err` here is from the input stream errror
	      if (err.code === 'EISDIR' || err.code === 'EPERM') {
	        moveDirAcrossDevice(source, dest, clobber, limit, callback)
	      } else {
	        callback(err)
	      }
	    })
	  })

	  outs.on('error', function (err) {
	    ins.destroy()
	    outs.destroy()
	    outs.removeListener('close', onClose)
	    callback(err)
	  })

	  outs.once('close', onClose)
	  ins.pipe(outs)

	  function onClose () {
	    fs.unlink(source, callback)
	  }
	}

	function moveDirAcrossDevice (source, dest, clobber, limit, callback) {
	  var options = {
	    stopOnErr: true,
	    clobber: false,
	    limit: limit
	  }

	  function startNcp () {
	    ncp(source, dest, options, function (errList) {
	      if (errList) return callback(errList[0])
	      rimraf(source, callback)
	    })
	  }

	  if (clobber) {
	    rimraf(dest, function (err) {
	      if (err) return callback(err)
	      startNcp()
	    })
	  } else {
	    startNcp()
	  }
	}

	module.exports = {
	  move: mv
	}


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  createOutputStream: __webpack_require__(51)
	}


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	var fs = __webpack_require__(2)
	var mkdir = __webpack_require__(31)
	var WriteStream = fs.WriteStream

	function createOutputStream (file, options) {
	  var dirExists = false
	  var dir = path.dirname(file)
	  options = options || {}

	  // if fd is set with an actual number, file is created, hence directory is too
	  if (options.fd) {
	    return fs.createWriteStream(file, options)
	  } else {
	    // this hacks the WriteStream constructor from calling open()
	    options.fd = -1
	  }

	  var ws = new WriteStream(file, options)

	  var oldOpen = ws.open
	  ws.open = function () {
	    ws.fd = null // set actual fd
	    if (dirExists) return oldOpen.call(ws)

	    // this only runs once on first write
	    mkdir.mkdirs(dir, function (err) {
	      if (err) {
	        ws.destroy()
	        ws.emit('error', err)
	        return
	      }
	      dirExists = true
	      oldOpen.call(ws)
	    })
	  }

	  ws.open()

	  return ws
	}

	module.exports = createOutputStream


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(2)
	var path = __webpack_require__(4)
	var mkdir = __webpack_require__(31)
	var remove = __webpack_require__(37)

	function emptyDir (dir, callback) {
	  fs.readdir(dir, function (err, items) {
	    if (err) return mkdir.mkdirs(dir, callback)

	    items = items.map(function (item) {
	      return path.join(dir, item)
	    })

	    deleteItem()

	    function deleteItem () {
	      var item = items.pop()
	      if (!item) return callback()
	      remove.remove(item, function (err) {
	        if (err) return callback(err)
	        deleteItem()
	      })
	    }
	  })
	}

	function emptyDirSync (dir) {
	  var items
	  try {
	    items = fs.readdirSync(dir)
	  } catch (err) {
	    return mkdir.mkdirsSync(dir)
	  }

	  items.forEach(function (item) {
	    item = path.join(dir, item)
	    remove.removeSync(item)
	  })
	}

	module.exports = {
	  emptyDirSync: emptyDirSync,
	  emptydirSync: emptyDirSync,
	  emptyDir: emptyDir,
	  emptydir: emptyDir
	}


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	var file = __webpack_require__(54)
	var link = __webpack_require__(55)
	var symlink = __webpack_require__(56)

	module.exports = {
	  // file
	  createFile: file.createFile,
	  createFileSync: file.createFileSync,
	  ensureFile: file.createFile,
	  ensureFileSync: file.createFileSync,
	  // link
	  createLink: link.createLink,
	  createLinkSync: link.createLinkSync,
	  ensureLink: link.createLink,
	  ensureLinkSync: link.createLinkSync,
	  // symlink
	  createSymlink: symlink.createSymlink,
	  createSymlinkSync: symlink.createSymlinkSync,
	  ensureSymlink: symlink.createSymlink,
	  ensureSymlinkSync: symlink.createSymlinkSync
	}


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	var fs = __webpack_require__(20)
	var mkdir = __webpack_require__(31)

	function createFile (file, callback) {
	  function makeFile () {
	    fs.writeFile(file, '', function (err) {
	      if (err) return callback(err)
	      callback()
	    })
	  }

	  fs.exists(file, function (fileExists) {
	    if (fileExists) return callback()
	    var dir = path.dirname(file)
	    fs.exists(dir, function (dirExists) {
	      if (dirExists) return makeFile()
	      mkdir.mkdirs(dir, function (err) {
	        if (err) return callback(err)
	        makeFile()
	      })
	    })
	  })
	}

	function createFileSync (file) {
	  if (fs.existsSync(file)) return

	  var dir = path.dirname(file)
	  if (!fs.existsSync(dir)) {
	    mkdir.mkdirsSync(dir)
	  }

	  fs.writeFileSync(file, '')
	}

	module.exports = {
	  createFile: createFile,
	  createFileSync: createFileSync,
	  // alias
	  ensureFile: createFile,
	  ensureFileSync: createFileSync
	}


/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	var fs = __webpack_require__(20)
	var mkdir = __webpack_require__(31)

	function createLink (srcpath, dstpath, callback) {
	  function makeLink (srcpath, dstpath) {
	    fs.link(srcpath, dstpath, function (err) {
	      if (err) return callback(err)
	      callback(null)
	    })
	  }

	  fs.exists(dstpath, function (destinationExists) {
	    if (destinationExists) return callback(null)
	    fs.lstat(srcpath, function (err, stat) {
	      if (err) {
	        err.message = err.message.replace('lstat', 'ensureLink')
	        return callback(err)
	      }

	      var dir = path.dirname(dstpath)
	      fs.exists(dir, function (dirExists) {
	        if (dirExists) return makeLink(srcpath, dstpath)
	        mkdir.mkdirs(dir, function (err) {
	          if (err) return callback(err)
	          makeLink(srcpath, dstpath)
	        })
	      })
	    })
	  })
	}

	function createLinkSync (srcpath, dstpath, callback) {
	  var destinationExists = fs.existsSync(dstpath)
	  if (destinationExists) return undefined

	  try {
	    fs.lstatSync(srcpath)
	  } catch (err) {
	    err.message = err.message.replace('lstat', 'ensureLink')
	    throw err
	  }

	  var dir = path.dirname(dstpath)
	  var dirExists = fs.existsSync(dir)
	  if (dirExists) return fs.linkSync(srcpath, dstpath)
	  mkdir.mkdirsSync(dir)

	  return fs.linkSync(srcpath, dstpath)
	}

	module.exports = {
	  createLink: createLink,
	  createLinkSync: createLinkSync,
	  // alias
	  ensureLink: createLink,
	  ensureLinkSync: createLinkSync
	}


/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	var fs = __webpack_require__(20)
	var _mkdirs = __webpack_require__(31)
	var mkdirs = _mkdirs.mkdirs
	var mkdirsSync = _mkdirs.mkdirsSync

	var _symlinkPaths = __webpack_require__(57)
	var symlinkPaths = _symlinkPaths.symlinkPaths
	var symlinkPathsSync = _symlinkPaths.symlinkPathsSync

	var _symlinkType = __webpack_require__(58)
	var symlinkType = _symlinkType.symlinkType
	var symlinkTypeSync = _symlinkType.symlinkTypeSync

	function createSymlink (srcpath, dstpath, type, callback) {
	  callback = (typeof type === 'function') ? type : callback
	  type = (typeof type === 'function') ? false : type

	  fs.exists(dstpath, function (destinationExists) {
	    if (destinationExists) return callback(null)
	    symlinkPaths(srcpath, dstpath, function (err, relative) {
	      if (err) return callback(err)
	      srcpath = relative.toDst
	      symlinkType(relative.toCwd, type, function (err, type) {
	        if (err) return callback(err)
	        var dir = path.dirname(dstpath)
	        fs.exists(dir, function (dirExists) {
	          if (dirExists) return fs.symlink(srcpath, dstpath, type, callback)
	          mkdirs(dir, function (err) {
	            if (err) return callback(err)
	            fs.symlink(srcpath, dstpath, type, callback)
	          })
	        })
	      })
	    })
	  })
	}

	function createSymlinkSync (srcpath, dstpath, type, callback) {
	  callback = (typeof type === 'function') ? type : callback
	  type = (typeof type === 'function') ? false : type

	  var destinationExists = fs.existsSync(dstpath)
	  if (destinationExists) return undefined

	  var relative = symlinkPathsSync(srcpath, dstpath)
	  srcpath = relative.toDst
	  type = symlinkTypeSync(relative.toCwd, type)
	  var dir = path.dirname(dstpath)
	  var exists = fs.existsSync(dir)
	  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
	  mkdirsSync(dir)
	  return fs.symlinkSync(srcpath, dstpath, type)
	}

	module.exports = {
	  createSymlink: createSymlink,
	  createSymlinkSync: createSymlinkSync,
	  // alias
	  ensureSymlink: createSymlink,
	  ensureSymlinkSync: createSymlinkSync
	}


/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	// path.isAbsolute shim for Node.js 0.10 support
	path.isAbsolute = (path.isAbsolute) ? path.isAbsolute : __webpack_require__(12)
	var fs = __webpack_require__(20)

	/**
	 * Function that returns two types of paths, one relative to symlink, and one
	 * relative to the current working directory. Checks if path is absolute or
	 * relative. If the path is relative, this function checks if the path is
	 * relative to symlink or relative to current working directory. This is an
	 * initiative to find a smarter `srcpath` to supply when building symlinks.
	 * This allows you to determine which path to use out of one of three possible
	 * types of source paths. The first is an absolute path. This is detected by
	 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
	 * see if it exists. If it does it's used, if not an error is returned
	 * (callback)/ thrown (sync). The other two options for `srcpath` are a
	 * relative url. By default Node's `fs.symlink` works by creating a symlink
	 * using `dstpath` and expects the `srcpath` to be relative to the newly
	 * created symlink. If you provide a `srcpath` that does not exist on the file
	 * system it results in a broken symlink. To minimize this, the function
	 * checks to see if the 'relative to symlink' source file exists, and if it
	 * does it will use it. If it does not, it checks if there's a file that
	 * exists that is relative to the current working directory, if does its used.
	 * This preserves the expectations of the original fs.symlink spec and adds
	 * the ability to pass in `relative to current working direcotry` paths.
	 */

	function symlinkPaths (srcpath, dstpath, callback) {
	  if (path.isAbsolute(srcpath)) {
	    return fs.lstat(srcpath, function (err, stat) {
	      if (err) {
	        err.message = err.message.replace('lstat', 'ensureSymlink')
	        return callback(err)
	      }
	      return callback(null, {
	        'toCwd': srcpath,
	        'toDst': srcpath
	      })
	    })
	  } else {
	    var dstdir = path.dirname(dstpath)
	    var relativeToDst = path.join(dstdir, srcpath)
	    return fs.exists(relativeToDst, function (exists) {
	      if (exists) {
	        return callback(null, {
	          'toCwd': relativeToDst,
	          'toDst': srcpath
	        })
	      } else {
	        return fs.lstat(srcpath, function (err, stat) {
	          if (err) {
	            err.message = err.message.replace('lstat', 'ensureSymlink')
	            return callback(err)
	          }
	          return callback(null, {
	            'toCwd': srcpath,
	            'toDst': path.relative(dstdir, srcpath)
	          })
	        })
	      }
	    })
	  }
	}

	function symlinkPathsSync (srcpath, dstpath) {
	  var exists
	  if (path.isAbsolute(srcpath)) {
	    exists = fs.existsSync(srcpath)
	    if (!exists) throw new Error('absolute srcpath does not exist')
	    return {
	      'toCwd': srcpath,
	      'toDst': srcpath
	    }
	  } else {
	    var dstdir = path.dirname(dstpath)
	    var relativeToDst = path.join(dstdir, srcpath)
	    exists = fs.existsSync(relativeToDst)
	    if (exists) {
	      return {
	        'toCwd': relativeToDst,
	        'toDst': srcpath
	      }
	    } else {
	      exists = fs.existsSync(srcpath)
	      if (!exists) throw new Error('relative srcpath does not exist')
	      return {
	        'toCwd': srcpath,
	        'toDst': path.relative(dstdir, srcpath)
	      }
	    }
	  }
	}

	module.exports = {
	  'symlinkPaths': symlinkPaths,
	  'symlinkPathsSync': symlinkPathsSync
	}


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(20)

	function symlinkType (srcpath, type, callback) {
	  callback = (typeof type === 'function') ? type : callback
	  type = (typeof type === 'function') ? false : type
	  if (type) return callback(null, type)
	  fs.lstat(srcpath, function (err, stats) {
	    if (err) return callback(null, 'file')
	    type = (stats && stats.isDirectory()) ? 'dir' : 'file'
	    callback(null, type)
	  })
	}

	function symlinkTypeSync (srcpath, type) {
	  if (type) return type
	  try {
	    var stats = fs.lstatSync(srcpath)
	  } catch (e) {
	    return 'file'
	  }
	  return (stats && stats.isDirectory()) ? 'dir' : 'file'
	}

	module.exports = {
	  symlinkType: symlinkType,
	  symlinkTypeSync: symlinkTypeSync
	}


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	var path = __webpack_require__(4)
	var fs = __webpack_require__(20)
	var mkdir = __webpack_require__(31)

	function outputFile (file, data, encoding, callback) {
	  if (typeof encoding === 'function') {
	    callback = encoding
	    encoding = 'utf8'
	  }

	  var dir = path.dirname(file)
	  fs.exists(dir, function (itDoes) {
	    if (itDoes) return fs.writeFile(file, data, encoding, callback)

	    mkdir.mkdirs(dir, function (err) {
	      if (err) return callback(err)

	      fs.writeFile(file, data, encoding, callback)
	    })
	  })
	}

	function outputFileSync (file, data, encoding) {
	  var dir = path.dirname(file)
	  if (fs.existsSync(dir)) {
	    return fs.writeFileSync.apply(fs, arguments)
	  }
	  mkdir.mkdirsSync(dir)
	  fs.writeFileSync.apply(fs, arguments)
	}

	module.exports = {
	  outputFile: outputFile,
	  outputFileSync: outputFileSync
	}


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	var klaw = __webpack_require__(61)

	module.exports = {
	  walk: klaw
	}


/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	var assert = __webpack_require__(11)
	var fs = __webpack_require__(2)
	var path = __webpack_require__(4)
	var Readable = __webpack_require__(25).Readable
	var util = __webpack_require__(9)
	var assign = __webpack_require__(62)

	function Walker (dir, options) {
	  assert.strictEqual(typeof dir, 'string', '`dir` parameter should be of type string. Got type: ' + typeof dir)
	  var defaultStreamOptions = { objectMode: true }
	  var defaultOpts = { queueMethod: 'shift', pathSorter: undefined }
	  options = assign(defaultOpts, options, defaultStreamOptions)

	  Readable.call(this, options)
	  this.root = path.resolve(dir)
	  this.paths = [this.root]
	  this.options = options
	}
	util.inherits(Walker, Readable)

	Walker.prototype._read = function () {
	  if (this.paths.length === 0) return this.push(null)
	  var self = this
	  var pathItem = this.paths[this.options.queueMethod]()

	  fs.lstat(pathItem, function (err, stats) {
	    var item = { path: pathItem, stats: stats }
	    if (err) return self.emit('error', err, item)
	    if (!stats.isDirectory()) return self.push(item)

	    fs.readdir(pathItem, function (err, pathItems) {
	      if (err) {
	        self.push(item)
	        return self.emit('error', err, item)
	      }

	      pathItems = pathItems.map(function (part) { return path.join(pathItem, part) })
	      if (self.options.pathSorter) pathItems.sort(self.options.pathSorter)
	      pathItems.forEach(function (pi) { self.paths.push(pi) })

	      self.push(item)
	    })
	  })
	}

	function walk (root, options) {
	  return new Walker(root, options)
	}

	module.exports = walk


/***/ },
/* 62 */
/***/ function(module, exports) {

	// simple mutable assign (extracted from fs-extra)
	// I really like object-assign package, but I wanted a lean package with zero deps
	function _assign () {
	  var args = [].slice.call(arguments).filter(function (i) { return i })
	  var dest = args.shift()
	  args.forEach(function (src) {
	    Object.keys(src).forEach(function (key) {
	      dest[key] = src[key]
	    })
	  })

	  return dest
	}

	// thank you baby Jesus for Node v4 and Object.assign
	module.exports = Object.assign || _assign


/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
	  Copyright (c) jQuery Foundation, Inc. and Contributors, All Rights Reserved.

	  Redistribution and use in source and binary forms, with or without
	  modification, are permitted provided that the following conditions are met:

	    * Redistributions of source code must retain the above copyright
	      notice, this list of conditions and the following disclaimer.
	    * Redistributions in binary form must reproduce the above copyright
	      notice, this list of conditions and the following disclaimer in the
	      documentation and/or other materials provided with the distribution.

	  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
	  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
	  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
	  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
	  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	(function (root, factory) {
	    'use strict';

	    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
	    // Rhino, and plain browser loading.

	    /* istanbul ignore next */
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof exports !== 'undefined') {
	        factory(exports);
	    } else {
	        factory((root.esprima = {}));
	    }
	}(this, function (exports) {
	    'use strict';

	    var Token,
	        TokenName,
	        FnExprTokens,
	        Syntax,
	        PlaceHolders,
	        Messages,
	        Regex,
	        source,
	        strict,
	        index,
	        lineNumber,
	        lineStart,
	        hasLineTerminator,
	        lastIndex,
	        lastLineNumber,
	        lastLineStart,
	        startIndex,
	        startLineNumber,
	        startLineStart,
	        scanning,
	        length,
	        lookahead,
	        state,
	        extra,
	        isBindingElement,
	        isAssignmentTarget,
	        firstCoverInitializedNameError;

	    Token = {
	        BooleanLiteral: 1,
	        EOF: 2,
	        Identifier: 3,
	        Keyword: 4,
	        NullLiteral: 5,
	        NumericLiteral: 6,
	        Punctuator: 7,
	        StringLiteral: 8,
	        RegularExpression: 9,
	        Template: 10
	    };

	    TokenName = {};
	    TokenName[Token.BooleanLiteral] = 'Boolean';
	    TokenName[Token.EOF] = '<end>';
	    TokenName[Token.Identifier] = 'Identifier';
	    TokenName[Token.Keyword] = 'Keyword';
	    TokenName[Token.NullLiteral] = 'Null';
	    TokenName[Token.NumericLiteral] = 'Numeric';
	    TokenName[Token.Punctuator] = 'Punctuator';
	    TokenName[Token.StringLiteral] = 'String';
	    TokenName[Token.RegularExpression] = 'RegularExpression';
	    TokenName[Token.Template] = 'Template';

	    // A function following one of those tokens is an expression.
	    FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
	                    'return', 'case', 'delete', 'throw', 'void',
	                    // assignment operators
	                    '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=',
	                    '&=', '|=', '^=', ',',
	                    // binary/unary operators
	                    '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
	                    '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
	                    '<=', '<', '>', '!=', '!=='];

	    Syntax = {
	        AssignmentExpression: 'AssignmentExpression',
	        AssignmentPattern: 'AssignmentPattern',
	        ArrayExpression: 'ArrayExpression',
	        ArrayPattern: 'ArrayPattern',
	        ArrowFunctionExpression: 'ArrowFunctionExpression',
	        BlockStatement: 'BlockStatement',
	        BinaryExpression: 'BinaryExpression',
	        BreakStatement: 'BreakStatement',
	        CallExpression: 'CallExpression',
	        CatchClause: 'CatchClause',
	        ClassBody: 'ClassBody',
	        ClassDeclaration: 'ClassDeclaration',
	        ClassExpression: 'ClassExpression',
	        ConditionalExpression: 'ConditionalExpression',
	        ContinueStatement: 'ContinueStatement',
	        DoWhileStatement: 'DoWhileStatement',
	        DebuggerStatement: 'DebuggerStatement',
	        EmptyStatement: 'EmptyStatement',
	        ExportAllDeclaration: 'ExportAllDeclaration',
	        ExportDefaultDeclaration: 'ExportDefaultDeclaration',
	        ExportNamedDeclaration: 'ExportNamedDeclaration',
	        ExportSpecifier: 'ExportSpecifier',
	        ExpressionStatement: 'ExpressionStatement',
	        ForStatement: 'ForStatement',
	        ForOfStatement: 'ForOfStatement',
	        ForInStatement: 'ForInStatement',
	        FunctionDeclaration: 'FunctionDeclaration',
	        FunctionExpression: 'FunctionExpression',
	        Identifier: 'Identifier',
	        IfStatement: 'IfStatement',
	        ImportDeclaration: 'ImportDeclaration',
	        ImportDefaultSpecifier: 'ImportDefaultSpecifier',
	        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
	        ImportSpecifier: 'ImportSpecifier',
	        Literal: 'Literal',
	        LabeledStatement: 'LabeledStatement',
	        LogicalExpression: 'LogicalExpression',
	        MemberExpression: 'MemberExpression',
	        MetaProperty: 'MetaProperty',
	        MethodDefinition: 'MethodDefinition',
	        NewExpression: 'NewExpression',
	        ObjectExpression: 'ObjectExpression',
	        ObjectPattern: 'ObjectPattern',
	        Program: 'Program',
	        Property: 'Property',
	        RestElement: 'RestElement',
	        ReturnStatement: 'ReturnStatement',
	        SequenceExpression: 'SequenceExpression',
	        SpreadElement: 'SpreadElement',
	        Super: 'Super',
	        SwitchCase: 'SwitchCase',
	        SwitchStatement: 'SwitchStatement',
	        TaggedTemplateExpression: 'TaggedTemplateExpression',
	        TemplateElement: 'TemplateElement',
	        TemplateLiteral: 'TemplateLiteral',
	        ThisExpression: 'ThisExpression',
	        ThrowStatement: 'ThrowStatement',
	        TryStatement: 'TryStatement',
	        UnaryExpression: 'UnaryExpression',
	        UpdateExpression: 'UpdateExpression',
	        VariableDeclaration: 'VariableDeclaration',
	        VariableDeclarator: 'VariableDeclarator',
	        WhileStatement: 'WhileStatement',
	        WithStatement: 'WithStatement',
	        YieldExpression: 'YieldExpression'
	    };

	    PlaceHolders = {
	        ArrowParameterPlaceHolder: 'ArrowParameterPlaceHolder'
	    };

	    // Error messages should be identical to V8.
	    Messages = {
	        UnexpectedToken: 'Unexpected token %0',
	        UnexpectedNumber: 'Unexpected number',
	        UnexpectedString: 'Unexpected string',
	        UnexpectedIdentifier: 'Unexpected identifier',
	        UnexpectedReserved: 'Unexpected reserved word',
	        UnexpectedTemplate: 'Unexpected quasi %0',
	        UnexpectedEOS: 'Unexpected end of input',
	        NewlineAfterThrow: 'Illegal newline after throw',
	        InvalidRegExp: 'Invalid regular expression',
	        UnterminatedRegExp: 'Invalid regular expression: missing /',
	        InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
	        InvalidLHSInForIn: 'Invalid left-hand side in for-in',
	        InvalidLHSInForLoop: 'Invalid left-hand side in for-loop',
	        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
	        NoCatchOrFinally: 'Missing catch or finally after try',
	        UnknownLabel: 'Undefined label \'%0\'',
	        Redeclaration: '%0 \'%1\' has already been declared',
	        IllegalContinue: 'Illegal continue statement',
	        IllegalBreak: 'Illegal break statement',
	        IllegalReturn: 'Illegal return statement',
	        StrictModeWith: 'Strict mode code may not include a with statement',
	        StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
	        StrictVarName: 'Variable name may not be eval or arguments in strict mode',
	        StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
	        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
	        StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
	        StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
	        StrictDelete: 'Delete of an unqualified identifier in strict mode.',
	        StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
	        StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
	        StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
	        StrictReservedWord: 'Use of future reserved word in strict mode',
	        TemplateOctalLiteral: 'Octal literals are not allowed in template strings.',
	        ParameterAfterRestParameter: 'Rest parameter must be last formal parameter',
	        DefaultRestParameter: 'Unexpected token =',
	        ObjectPatternAsRestParameter: 'Unexpected token {',
	        DuplicateProtoProperty: 'Duplicate __proto__ fields are not allowed in object literals',
	        ConstructorSpecialMethod: 'Class constructor may not be an accessor',
	        DuplicateConstructor: 'A class may only have one constructor',
	        StaticPrototype: 'Classes may not have static property named prototype',
	        MissingFromClause: 'Unexpected token',
	        NoAsAfterImportNamespace: 'Unexpected token',
	        InvalidModuleSpecifier: 'Unexpected token',
	        IllegalImportDeclaration: 'Unexpected token',
	        IllegalExportDeclaration: 'Unexpected token',
	        DuplicateBinding: 'Duplicate binding %0'
	    };

	    // See also tools/generate-unicode-regex.js.
	    Regex = {
	        // ECMAScript 6/Unicode v7.0.0 NonAsciiIdentifierStart:
	        NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDE00-\uDE11\uDE13-\uDE2B\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDE00-\uDE2F\uDE44\uDE80-\uDEAA]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]/,

	        // ECMAScript 6/Unicode v7.0.0 NonAsciiIdentifierPart:
	        NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDD0-\uDDDA\uDE00-\uDE11\uDE13-\uDE37\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF01-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
	    };

	    // Ensure the condition is true, otherwise throw an error.
	    // This is only to have a better contract semantic, i.e. another safety net
	    // to catch a logic error. The condition shall be fulfilled in normal case.
	    // Do NOT use this to enforce a certain condition on any user input.

	    function assert(condition, message) {
	        /* istanbul ignore if */
	        if (!condition) {
	            throw new Error('ASSERT: ' + message);
	        }
	    }

	    function isDecimalDigit(ch) {
	        return (ch >= 0x30 && ch <= 0x39);   // 0..9
	    }

	    function isHexDigit(ch) {
	        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
	    }

	    function isOctalDigit(ch) {
	        return '01234567'.indexOf(ch) >= 0;
	    }

	    function octalToDecimal(ch) {
	        // \0 is not octal escape sequence
	        var octal = (ch !== '0'), code = '01234567'.indexOf(ch);

	        if (index < length && isOctalDigit(source[index])) {
	            octal = true;
	            code = code * 8 + '01234567'.indexOf(source[index++]);

	            // 3 digits are only allowed when string starts
	            // with 0, 1, 2, 3
	            if ('0123'.indexOf(ch) >= 0 &&
	                    index < length &&
	                    isOctalDigit(source[index])) {
	                code = code * 8 + '01234567'.indexOf(source[index++]);
	            }
	        }

	        return {
	            code: code,
	            octal: octal
	        };
	    }

	    // ECMA-262 11.2 White Space

	    function isWhiteSpace(ch) {
	        return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
	            (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
	    }

	    // ECMA-262 11.3 Line Terminators

	    function isLineTerminator(ch) {
	        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
	    }

	    // ECMA-262 11.6 Identifier Names and Identifiers

	    function fromCodePoint(cp) {
	        return (cp < 0x10000) ? String.fromCharCode(cp) :
	            String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10)) +
	            String.fromCharCode(0xDC00 + ((cp - 0x10000) & 1023));
	    }

	    function isIdentifierStart(ch) {
	        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
	            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
	            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
	            (ch === 0x5C) ||                      // \ (backslash)
	            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch)));
	    }

	    function isIdentifierPart(ch) {
	        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
	            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
	            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
	            (ch >= 0x30 && ch <= 0x39) ||         // 0..9
	            (ch === 0x5C) ||                      // \ (backslash)
	            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch)));
	    }

	    // ECMA-262 11.6.2.2 Future Reserved Words

	    function isFutureReservedWord(id) {
	        switch (id) {
	        case 'enum':
	        case 'export':
	        case 'import':
	        case 'super':
	            return true;
	        default:
	            return false;
	        }
	    }

	    function isStrictModeReservedWord(id) {
	        switch (id) {
	        case 'implements':
	        case 'interface':
	        case 'package':
	        case 'private':
	        case 'protected':
	        case 'public':
	        case 'static':
	        case 'yield':
	        case 'let':
	            return true;
	        default:
	            return false;
	        }
	    }

	    function isRestrictedWord(id) {
	        return id === 'eval' || id === 'arguments';
	    }

	    // ECMA-262 11.6.2.1 Keywords

	    function isKeyword(id) {
	        switch (id.length) {
	        case 2:
	            return (id === 'if') || (id === 'in') || (id === 'do');
	        case 3:
	            return (id === 'var') || (id === 'for') || (id === 'new') ||
	                (id === 'try') || (id === 'let');
	        case 4:
	            return (id === 'this') || (id === 'else') || (id === 'case') ||
	                (id === 'void') || (id === 'with') || (id === 'enum');
	        case 5:
	            return (id === 'while') || (id === 'break') || (id === 'catch') ||
	                (id === 'throw') || (id === 'const') || (id === 'yield') ||
	                (id === 'class') || (id === 'super');
	        case 6:
	            return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
	                (id === 'switch') || (id === 'export') || (id === 'import');
	        case 7:
	            return (id === 'default') || (id === 'finally') || (id === 'extends');
	        case 8:
	            return (id === 'function') || (id === 'continue') || (id === 'debugger');
	        case 10:
	            return (id === 'instanceof');
	        default:
	            return false;
	        }
	    }

	    // ECMA-262 11.4 Comments

	    function addComment(type, value, start, end, loc) {
	        var comment;

	        assert(typeof start === 'number', 'Comment must have valid position');

	        state.lastCommentStart = start;

	        comment = {
	            type: type,
	            value: value
	        };
	        if (extra.range) {
	            comment.range = [start, end];
	        }
	        if (extra.loc) {
	            comment.loc = loc;
	        }
	        extra.comments.push(comment);
	        if (extra.attachComment) {
	            extra.leadingComments.push(comment);
	            extra.trailingComments.push(comment);
	        }
	        if (extra.tokenize) {
	            comment.type = comment.type + 'Comment';
	            if (extra.delegate) {
	                comment = extra.delegate(comment);
	            }
	            extra.tokens.push(comment);
	        }
	    }

	    function skipSingleLineComment(offset) {
	        var start, loc, ch, comment;

	        start = index - offset;
	        loc = {
	            start: {
	                line: lineNumber,
	                column: index - lineStart - offset
	            }
	        };

	        while (index < length) {
	            ch = source.charCodeAt(index);
	            ++index;
	            if (isLineTerminator(ch)) {
	                hasLineTerminator = true;
	                if (extra.comments) {
	                    comment = source.slice(start + offset, index - 1);
	                    loc.end = {
	                        line: lineNumber,
	                        column: index - lineStart - 1
	                    };
	                    addComment('Line', comment, start, index - 1, loc);
	                }
	                if (ch === 13 && source.charCodeAt(index) === 10) {
	                    ++index;
	                }
	                ++lineNumber;
	                lineStart = index;
	                return;
	            }
	        }

	        if (extra.comments) {
	            comment = source.slice(start + offset, index);
	            loc.end = {
	                line: lineNumber,
	                column: index - lineStart
	            };
	            addComment('Line', comment, start, index, loc);
	        }
	    }

	    function skipMultiLineComment() {
	        var start, loc, ch, comment;

	        if (extra.comments) {
	            start = index - 2;
	            loc = {
	                start: {
	                    line: lineNumber,
	                    column: index - lineStart - 2
	                }
	            };
	        }

	        while (index < length) {
	            ch = source.charCodeAt(index);
	            if (isLineTerminator(ch)) {
	                if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
	                    ++index;
	                }
	                hasLineTerminator = true;
	                ++lineNumber;
	                ++index;
	                lineStart = index;
	            } else if (ch === 0x2A) {
	                // Block comment ends with '*/'.
	                if (source.charCodeAt(index + 1) === 0x2F) {
	                    ++index;
	                    ++index;
	                    if (extra.comments) {
	                        comment = source.slice(start + 2, index - 2);
	                        loc.end = {
	                            line: lineNumber,
	                            column: index - lineStart
	                        };
	                        addComment('Block', comment, start, index, loc);
	                    }
	                    return;
	                }
	                ++index;
	            } else {
	                ++index;
	            }
	        }

	        // Ran off the end of the file - the whole thing is a comment
	        if (extra.comments) {
	            loc.end = {
	                line: lineNumber,
	                column: index - lineStart
	            };
	            comment = source.slice(start + 2, index);
	            addComment('Block', comment, start, index, loc);
	        }
	        tolerateUnexpectedToken();
	    }

	    function skipComment() {
	        var ch, start;
	        hasLineTerminator = false;

	        start = (index === 0);
	        while (index < length) {
	            ch = source.charCodeAt(index);

	            if (isWhiteSpace(ch)) {
	                ++index;
	            } else if (isLineTerminator(ch)) {
	                hasLineTerminator = true;
	                ++index;
	                if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
	                    ++index;
	                }
	                ++lineNumber;
	                lineStart = index;
	                start = true;
	            } else if (ch === 0x2F) { // U+002F is '/'
	                ch = source.charCodeAt(index + 1);
	                if (ch === 0x2F) {
	                    ++index;
	                    ++index;
	                    skipSingleLineComment(2);
	                    start = true;
	                } else if (ch === 0x2A) {  // U+002A is '*'
	                    ++index;
	                    ++index;
	                    skipMultiLineComment();
	                } else {
	                    break;
	                }
	            } else if (start && ch === 0x2D) { // U+002D is '-'
	                // U+003E is '>'
	                if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
	                    // '-->' is a single-line comment
	                    index += 3;
	                    skipSingleLineComment(3);
	                } else {
	                    break;
	                }
	            } else if (ch === 0x3C) { // U+003C is '<'
	                if (source.slice(index + 1, index + 4) === '!--') {
	                    ++index; // `<`
	                    ++index; // `!`
	                    ++index; // `-`
	                    ++index; // `-`
	                    skipSingleLineComment(4);
	                } else {
	                    break;
	                }
	            } else {
	                break;
	            }
	        }
	    }

	    function scanHexEscape(prefix) {
	        var i, len, ch, code = 0;

	        len = (prefix === 'u') ? 4 : 2;
	        for (i = 0; i < len; ++i) {
	            if (index < length && isHexDigit(source[index])) {
	                ch = source[index++];
	                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
	            } else {
	                return '';
	            }
	        }
	        return String.fromCharCode(code);
	    }

	    function scanUnicodeCodePointEscape() {
	        var ch, code;

	        ch = source[index];
	        code = 0;

	        // At least, one hex digit is required.
	        if (ch === '}') {
	            throwUnexpectedToken();
	        }

	        while (index < length) {
	            ch = source[index++];
	            if (!isHexDigit(ch)) {
	                break;
	            }
	            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
	        }

	        if (code > 0x10FFFF || ch !== '}') {
	            throwUnexpectedToken();
	        }

	        return fromCodePoint(code);
	    }

	    function codePointAt(i) {
	        var cp, first, second;

	        cp = source.charCodeAt(i);
	        if (cp >= 0xD800 && cp <= 0xDBFF) {
	            second = source.charCodeAt(i + 1);
	            if (second >= 0xDC00 && second <= 0xDFFF) {
	                first = cp;
	                cp = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
	            }
	        }

	        return cp;
	    }

	    function getComplexIdentifier() {
	        var cp, ch, id;

	        cp = codePointAt(index);
	        id = fromCodePoint(cp);
	        index += id.length;

	        // '\u' (U+005C, U+0075) denotes an escaped character.
	        if (cp === 0x5C) {
	            if (source.charCodeAt(index) !== 0x75) {
	                throwUnexpectedToken();
	            }
	            ++index;
	            if (source[index] === '{') {
	                ++index;
	                ch = scanUnicodeCodePointEscape();
	            } else {
	                ch = scanHexEscape('u');
	                cp = ch.charCodeAt(0);
	                if (!ch || ch === '\\' || !isIdentifierStart(cp)) {
	                    throwUnexpectedToken();
	                }
	            }
	            id = ch;
	        }

	        while (index < length) {
	            cp = codePointAt(index);
	            if (!isIdentifierPart(cp)) {
	                break;
	            }
	            ch = fromCodePoint(cp);
	            id += ch;
	            index += ch.length;

	            // '\u' (U+005C, U+0075) denotes an escaped character.
	            if (cp === 0x5C) {
	                id = id.substr(0, id.length - 1);
	                if (source.charCodeAt(index) !== 0x75) {
	                    throwUnexpectedToken();
	                }
	                ++index;
	                if (source[index] === '{') {
	                    ++index;
	                    ch = scanUnicodeCodePointEscape();
	                } else {
	                    ch = scanHexEscape('u');
	                    cp = ch.charCodeAt(0);
	                    if (!ch || ch === '\\' || !isIdentifierPart(cp)) {
	                        throwUnexpectedToken();
	                    }
	                }
	                id += ch;
	            }
	        }

	        return id;
	    }

	    function getIdentifier() {
	        var start, ch;

	        start = index++;
	        while (index < length) {
	            ch = source.charCodeAt(index);
	            if (ch === 0x5C) {
	                // Blackslash (U+005C) marks Unicode escape sequence.
	                index = start;
	                return getComplexIdentifier();
	            } else if (ch >= 0xD800 && ch < 0xDFFF) {
	                // Need to handle surrogate pairs.
	                index = start;
	                return getComplexIdentifier();
	            }
	            if (isIdentifierPart(ch)) {
	                ++index;
	            } else {
	                break;
	            }
	        }

	        return source.slice(start, index);
	    }

	    function scanIdentifier() {
	        var start, id, type;

	        start = index;

	        // Backslash (U+005C) starts an escaped character.
	        id = (source.charCodeAt(index) === 0x5C) ? getComplexIdentifier() : getIdentifier();

	        // There is no keyword or literal with only one character.
	        // Thus, it must be an identifier.
	        if (id.length === 1) {
	            type = Token.Identifier;
	        } else if (isKeyword(id)) {
	            type = Token.Keyword;
	        } else if (id === 'null') {
	            type = Token.NullLiteral;
	        } else if (id === 'true' || id === 'false') {
	            type = Token.BooleanLiteral;
	        } else {
	            type = Token.Identifier;
	        }

	        return {
	            type: type,
	            value: id,
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }


	    // ECMA-262 11.7 Punctuators

	    function scanPunctuator() {
	        var token, str;

	        token = {
	            type: Token.Punctuator,
	            value: '',
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: index,
	            end: index
	        };

	        // Check for most common single-character punctuators.
	        str = source[index];
	        switch (str) {

	        case '(':
	            if (extra.tokenize) {
	                extra.openParenToken = extra.tokenValues.length;
	            }
	            ++index;
	            break;

	        case '{':
	            if (extra.tokenize) {
	                extra.openCurlyToken = extra.tokenValues.length;
	            }
	            state.curlyStack.push('{');
	            ++index;
	            break;

	        case '.':
	            ++index;
	            if (source[index] === '.' && source[index + 1] === '.') {
	                // Spread operator: ...
	                index += 2;
	                str = '...';
	            }
	            break;

	        case '}':
	            ++index;
	            state.curlyStack.pop();
	            break;
	        case ')':
	        case ';':
	        case ',':
	        case '[':
	        case ']':
	        case ':':
	        case '?':
	        case '~':
	            ++index;
	            break;

	        default:
	            // 4-character punctuator.
	            str = source.substr(index, 4);
	            if (str === '>>>=') {
	                index += 4;
	            } else {

	                // 3-character punctuators.
	                str = str.substr(0, 3);
	                if (str === '===' || str === '!==' || str === '>>>' ||
	                    str === '<<=' || str === '>>=') {
	                    index += 3;
	                } else {

	                    // 2-character punctuators.
	                    str = str.substr(0, 2);
	                    if (str === '&&' || str === '||' || str === '==' || str === '!=' ||
	                        str === '+=' || str === '-=' || str === '*=' || str === '/=' ||
	                        str === '++' || str === '--' || str === '<<' || str === '>>' ||
	                        str === '&=' || str === '|=' || str === '^=' || str === '%=' ||
	                        str === '<=' || str === '>=' || str === '=>') {
	                        index += 2;
	                    } else {

	                        // 1-character punctuators.
	                        str = source[index];
	                        if ('<>=!+-*%&|^/'.indexOf(str) >= 0) {
	                            ++index;
	                        }
	                    }
	                }
	            }
	        }

	        if (index === token.start) {
	            throwUnexpectedToken();
	        }

	        token.end = index;
	        token.value = str;
	        return token;
	    }

	    // ECMA-262 11.8.3 Numeric Literals

	    function scanHexLiteral(start) {
	        var number = '';

	        while (index < length) {
	            if (!isHexDigit(source[index])) {
	                break;
	            }
	            number += source[index++];
	        }

	        if (number.length === 0) {
	            throwUnexpectedToken();
	        }

	        if (isIdentifierStart(source.charCodeAt(index))) {
	            throwUnexpectedToken();
	        }

	        return {
	            type: Token.NumericLiteral,
	            value: parseInt('0x' + number, 16),
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }

	    function scanBinaryLiteral(start) {
	        var ch, number;

	        number = '';

	        while (index < length) {
	            ch = source[index];
	            if (ch !== '0' && ch !== '1') {
	                break;
	            }
	            number += source[index++];
	        }

	        if (number.length === 0) {
	            // only 0b or 0B
	            throwUnexpectedToken();
	        }

	        if (index < length) {
	            ch = source.charCodeAt(index);
	            /* istanbul ignore else */
	            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
	                throwUnexpectedToken();
	            }
	        }

	        return {
	            type: Token.NumericLiteral,
	            value: parseInt(number, 2),
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }

	    function scanOctalLiteral(prefix, start) {
	        var number, octal;

	        if (isOctalDigit(prefix)) {
	            octal = true;
	            number = '0' + source[index++];
	        } else {
	            octal = false;
	            ++index;
	            number = '';
	        }

	        while (index < length) {
	            if (!isOctalDigit(source[index])) {
	                break;
	            }
	            number += source[index++];
	        }

	        if (!octal && number.length === 0) {
	            // only 0o or 0O
	            throwUnexpectedToken();
	        }

	        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
	            throwUnexpectedToken();
	        }

	        return {
	            type: Token.NumericLiteral,
	            value: parseInt(number, 8),
	            octal: octal,
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }

	    function isImplicitOctalLiteral() {
	        var i, ch;

	        // Implicit octal, unless there is a non-octal digit.
	        // (Annex B.1.1 on Numeric Literals)
	        for (i = index + 1; i < length; ++i) {
	            ch = source[i];
	            if (ch === '8' || ch === '9') {
	                return false;
	            }
	            if (!isOctalDigit(ch)) {
	                return true;
	            }
	        }

	        return true;
	    }

	    function scanNumericLiteral() {
	        var number, start, ch;

	        ch = source[index];
	        assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
	            'Numeric literal must start with a decimal digit or a decimal point');

	        start = index;
	        number = '';
	        if (ch !== '.') {
	            number = source[index++];
	            ch = source[index];

	            // Hex number starts with '0x'.
	            // Octal number starts with '0'.
	            // Octal number in ES6 starts with '0o'.
	            // Binary number in ES6 starts with '0b'.
	            if (number === '0') {
	                if (ch === 'x' || ch === 'X') {
	                    ++index;
	                    return scanHexLiteral(start);
	                }
	                if (ch === 'b' || ch === 'B') {
	                    ++index;
	                    return scanBinaryLiteral(start);
	                }
	                if (ch === 'o' || ch === 'O') {
	                    return scanOctalLiteral(ch, start);
	                }

	                if (isOctalDigit(ch)) {
	                    if (isImplicitOctalLiteral()) {
	                        return scanOctalLiteral(ch, start);
	                    }
	                }
	            }

	            while (isDecimalDigit(source.charCodeAt(index))) {
	                number += source[index++];
	            }
	            ch = source[index];
	        }

	        if (ch === '.') {
	            number += source[index++];
	            while (isDecimalDigit(source.charCodeAt(index))) {
	                number += source[index++];
	            }
	            ch = source[index];
	        }

	        if (ch === 'e' || ch === 'E') {
	            number += source[index++];

	            ch = source[index];
	            if (ch === '+' || ch === '-') {
	                number += source[index++];
	            }
	            if (isDecimalDigit(source.charCodeAt(index))) {
	                while (isDecimalDigit(source.charCodeAt(index))) {
	                    number += source[index++];
	                }
	            } else {
	                throwUnexpectedToken();
	            }
	        }

	        if (isIdentifierStart(source.charCodeAt(index))) {
	            throwUnexpectedToken();
	        }

	        return {
	            type: Token.NumericLiteral,
	            value: parseFloat(number),
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }

	    // ECMA-262 11.8.4 String Literals

	    function scanStringLiteral() {
	        var str = '', quote, start, ch, unescaped, octToDec, octal = false;

	        quote = source[index];
	        assert((quote === '\'' || quote === '"'),
	            'String literal must starts with a quote');

	        start = index;
	        ++index;

	        while (index < length) {
	            ch = source[index++];

	            if (ch === quote) {
	                quote = '';
	                break;
	            } else if (ch === '\\') {
	                ch = source[index++];
	                if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
	                    switch (ch) {
	                    case 'u':
	                    case 'x':
	                        if (source[index] === '{') {
	                            ++index;
	                            str += scanUnicodeCodePointEscape();
	                        } else {
	                            unescaped = scanHexEscape(ch);
	                            if (!unescaped) {
	                                throw throwUnexpectedToken();
	                            }
	                            str += unescaped;
	                        }
	                        break;
	                    case 'n':
	                        str += '\n';
	                        break;
	                    case 'r':
	                        str += '\r';
	                        break;
	                    case 't':
	                        str += '\t';
	                        break;
	                    case 'b':
	                        str += '\b';
	                        break;
	                    case 'f':
	                        str += '\f';
	                        break;
	                    case 'v':
	                        str += '\x0B';
	                        break;
	                    case '8':
	                    case '9':
	                        str += ch;
	                        tolerateUnexpectedToken();
	                        break;

	                    default:
	                        if (isOctalDigit(ch)) {
	                            octToDec = octalToDecimal(ch);

	                            octal = octToDec.octal || octal;
	                            str += String.fromCharCode(octToDec.code);
	                        } else {
	                            str += ch;
	                        }
	                        break;
	                    }
	                } else {
	                    ++lineNumber;
	                    if (ch === '\r' && source[index] === '\n') {
	                        ++index;
	                    }
	                    lineStart = index;
	                }
	            } else if (isLineTerminator(ch.charCodeAt(0))) {
	                break;
	            } else {
	                str += ch;
	            }
	        }

	        if (quote !== '') {
	            index = start;
	            throwUnexpectedToken();
	        }

	        return {
	            type: Token.StringLiteral,
	            value: str,
	            octal: octal,
	            lineNumber: startLineNumber,
	            lineStart: startLineStart,
	            start: start,
	            end: index
	        };
	    }

	    // ECMA-262 11.8.6 Template Literal Lexical Components

	    function scanTemplate() {
	        var cooked = '', ch, start, rawOffset, terminated, head, tail, restore, unescaped;

	        terminated = false;
	        tail = false;
	        start = index;
	        head = (source[index] === '`');
	        rawOffset = 2;

	        ++index;

	        while (index < length) {
	            ch = source[index++];
	            if (ch === '`') {
	                rawOffset = 1;
	                tail = true;
	                terminated = true;
	                break;
	            } else if (ch === '$') {
	                if (source[index] === '{') {
	                    state.curlyStack.push('${');
	                    ++index;
	                    terminated = true;
	                    break;
	                }
	                cooked += ch;
	            } else if (ch === '\\') {
	                ch = source[index++];
	                if (!isLineTerminator(ch.charCodeAt(0))) {
	                    switch (ch) {
	                    case 'n':
	                        cooked += '\n';
	                        break;
	                    case 'r':
	                        cooked += '\r';
	                        break;
	                    case 't':
	                        cooked += '\t';
	                        break;
	                    case 'u':
	                    case 'x':
	                        if (source[index] === '{') {
	                            ++index;
	                            cooked += scanUnicodeCodePointEscape();
	                        } else {
	                            restore = index;
	                            unescaped = scanHexEscape(ch);
	                            if (unescaped) {
	                                cooked += unescaped;
	                            } else {
	                                index = restore;
	                                cooked += ch;
	                            }
	                        }
	                        break;
	                    case 'b':
	                        cooked += '\b';
	                        break;
	                    case 'f':
	                        cooked += '\f';
	                        break;
	                    case 'v':
	                        cooked += '\v';
	                        break;

	                    default:
	                        if (ch === '0') {
	                            if (isDecimalDigit(source.charCodeAt(index))) {
	                                // Illegal: \01 \02 and so on
	                                throwError(Messages.TemplateOctalLiteral);
	                            }
	                            cooked += '\0';
	                        } else if (isOctalDigit(ch)) {
	                            // Illegal: \1 \2
	                            throwError(Messages.TemplateOctalLiteral);
	                        } else {
	                            cooked += ch;
	                        }
	                        break;
	                    }
	                } else {
	                    ++lineNumber;
	                    if (ch === '\r' && source[index] === '\n') {
	                        ++index;
	                    }
	                    lineStart = index;
	                }
	            } else if (isLineTerminator(ch.charCodeAt(0))) {
	                ++lineNumber;
	                if (ch === '\r' && source[index] === '\n') {
	                    ++index;
	                }
	                lineStart = index;
	                cooked += '\n';
	            } else {
	                cooked += ch;
	            }
	        }

	        if (!terminated) {
	            throwUnexpectedToken();
	        }

	        if (!head) {
	            state.curlyStack.pop();
	        }

	        return {
	            type: Token.Template,
	            value: {
	                cooked: cooked,
	                raw: source.slice(start + 1, index - rawOffset)
	            },
	            head: head,
	            tail: tail,
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            start: start,
	            end: index
	        };
	    }

	    // ECMA-262 11.8.5 Regular Expression Literals

	    function testRegExp(pattern, flags) {
	        // The BMP character to use as a replacement for astral symbols when
	        // translating an ES6 "u"-flagged pattern to an ES5-compatible
	        // approximation.
	        // Note: replacing with '\uFFFF' enables false positives in unlikely
	        // scenarios. For example, `[\u{1044f}-\u{10440}]` is an invalid
	        // pattern that would not be detected by this substitution.
	        var astralSubstitute = '\uFFFF',
	            tmp = pattern;

	        if (flags.indexOf('u') >= 0) {
	            tmp = tmp
	                // Replace every Unicode escape sequence with the equivalent
	                // BMP character or a constant ASCII code point in the case of
	                // astral symbols. (See the above note on `astralSubstitute`
	                // for more information.)
	                .replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function ($0, $1, $2) {
	                    var codePoint = parseInt($1 || $2, 16);
	                    if (codePoint > 0x10FFFF) {
	                        throwUnexpectedToken(null, Messages.InvalidRegExp);
	                    }
	                    if (codePoint <= 0xFFFF) {
	                        return String.fromCharCode(codePoint);
	                    }
	                    return astralSubstitute;
	                })
	                // Replace each paired surrogate with a single ASCII symbol to
	                // avoid throwing on regular expressions that are only valid in
	                // combination with the "u" flag.
	                .replace(
	                    /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
	                    astralSubstitute
	                );
	        }

	        // First, detect invalid regular expressions.
	        try {
	            RegExp(tmp);
	        } catch (e) {
	            throwUnexpectedToken(null, Messages.InvalidRegExp);
	        }

	        // Return a regular expression object for this pattern-flag pair, or
	        // `null` in case the current environment doesn't support the flags it
	        // uses.
	        try {
	            return new RegExp(pattern, flags);
	        } catch (exception) {
	            return null;
	        }
	    }

	    function scanRegExpBody() {
	        var ch, str, classMarker, terminated, body;

	        ch = source[index];
	        assert(ch === '/', 'Regular expression literal must start with a slash');
	        str = source[index++];

	        classMarker = false;
	        terminated = false;
	        while (index < length) {
	            ch = source[index++];
	            str += ch;
	            if (ch === '\\') {
	                ch = source[index++];
	                // ECMA-262 7.8.5
	                if (isLineTerminator(ch.charCodeAt(0))) {
	                    throwUnexpectedToken(null, Messages.UnterminatedRegExp);
	                }
	                str += ch;
	            } else if (isLineTerminator(ch.charCodeAt(0))) {
	                throwUnexpectedToken(null, Messages.UnterminatedRegExp);
	            } else if (classMarker) {
	                if (ch === ']') {
	                    classMarker = false;
	                }
	            } else {
	                if (ch === '/') {
	                    terminated = true;
	                    break;
	                } else if (ch === '[') {
	                    classMarker = true;
	                }
	            }
	        }

	        if (!terminated) {
	            throwUnexpectedToken(null, Messages.UnterminatedRegExp);
	        }

	        // Exclude leading and trailing slash.
	        body = str.substr(1, str.length - 2);
	        return {
	            value: body,
	            literal: str
	        };
	    }

	    function scanRegExpFlags() {
	        var ch, str, flags, restore;

	        str = '';
	        flags = '';
	        while (index < length) {
	            ch = source[index];
	            if (!isIdentifierPart(ch.charCodeAt(0))) {
	                break;
	            }

	            ++index;
	            if (ch === '\\' && index < length) {
	                ch = source[index];
	                if (ch === 'u') {
	                    ++index;
	                    restore = index;
	                    ch = scanHexEscape('u');
	                    if (ch) {
	                        flags += ch;
	                        for (str += '\\u'; restore < index; ++restore) {
	                            str += source[restore];
	                        }
	                    } else {
	                        index = restore;
	                        flags += 'u';
	                        str += '\\u';
	                    }
	                    tolerateUnexpectedToken();
	                } else {
	                    str += '\\';
	                    tolerateUnexpectedToken();
	                }
	            } else {
	                flags += ch;
	                str += ch;
	            }
	        }

	        return {
	            value: flags,
	            literal: str
	        };
	    }

	    function scanRegExp() {
	        var start, body, flags, value;
	        scanning = true;

	        lookahead = null;
	        skipComment();
	        start = index;

	        body = scanRegExpBody();
	        flags = scanRegExpFlags();
	        value = testRegExp(body.value, flags.value);
	        scanning = false;
	        if (extra.tokenize) {
	            return {
	                type: Token.RegularExpression,
	                value: value,
	                regex: {
	                    pattern: body.value,
	                    flags: flags.value
	                },
	                lineNumber: lineNumber,
	                lineStart: lineStart,
	                start: start,
	                end: index
	            };
	        }

	        return {
	            literal: body.literal + flags.literal,
	            value: value,
	            regex: {
	                pattern: body.value,
	                flags: flags.value
	            },
	            start: start,
	            end: index
	        };
	    }

	    function collectRegex() {
	        var pos, loc, regex, token;

	        skipComment();

	        pos = index;
	        loc = {
	            start: {
	                line: lineNumber,
	                column: index - lineStart
	            }
	        };

	        regex = scanRegExp();

	        loc.end = {
	            line: lineNumber,
	            column: index - lineStart
	        };

	        /* istanbul ignore next */
	        if (!extra.tokenize) {
	            // Pop the previous token, which is likely '/' or '/='
	            if (extra.tokens.length > 0) {
	                token = extra.tokens[extra.tokens.length - 1];
	                if (token.range[0] === pos && token.type === 'Punctuator') {
	                    if (token.value === '/' || token.value === '/=') {
	                        extra.tokens.pop();
	                    }
	                }
	            }

	            extra.tokens.push({
	                type: 'RegularExpression',
	                value: regex.literal,
	                regex: regex.regex,
	                range: [pos, index],
	                loc: loc
	            });
	        }

	        return regex;
	    }

	    function isIdentifierName(token) {
	        return token.type === Token.Identifier ||
	            token.type === Token.Keyword ||
	            token.type === Token.BooleanLiteral ||
	            token.type === Token.NullLiteral;
	    }

	    // Using the following algorithm:
	    // https://github.com/mozilla/sweet.js/wiki/design

	    function advanceSlash() {
	        var regex, previous, check;

	        function testKeyword(value) {
	            return value && (value.length > 1) && (value[0] >= 'a') && (value[0] <= 'z');
	        }

	        previous = extra.tokenValues[extra.tokens.length - 1];
	        regex = (previous !== null);

	        switch (previous) {
	        case 'this':
	        case ']':
	            regex = false;
	            break;

	        case ')':
	            check = extra.tokenValues[extra.openParenToken - 1];
	            regex = (check === 'if' || check === 'while' || check === 'for' || check === 'with');
	            break;

	        case '}':
	            // Dividing a function by anything makes little sense,
	            // but we have to check for that.
	            regex = false;
	            if (testKeyword(extra.tokenValues[extra.openCurlyToken - 3])) {
	                // Anonymous function, e.g. function(){} /42
	                check = extra.tokenValues[extra.openCurlyToken - 4];
	                regex = check ? (FnExprTokens.indexOf(check) < 0) : false;
	            } else if (testKeyword(extra.tokenValues[extra.openCurlyToken - 4])) {
	                // Named function, e.g. function f(){} /42/
	                check = extra.tokenValues[extra.openCurlyToken - 5];
	                regex = check ? (FnExprTokens.indexOf(check) < 0) : true;
	            }
	        }

	        return regex ? collectRegex() : scanPunctuator();
	    }

	    function advance() {
	        var cp, token;

	        if (index >= length) {
	            return {
	                type: Token.EOF,
	                lineNumber: lineNumber,
	                lineStart: lineStart,
	                start: index,
	                end: index
	            };
	        }

	        cp = source.charCodeAt(index);

	        if (isIdentifierStart(cp)) {
	            token = scanIdentifier();
	            if (strict && isStrictModeReservedWord(token.value)) {
	                token.type = Token.Keyword;
	            }
	            return token;
	        }

	        // Very common: ( and ) and ;
	        if (cp === 0x28 || cp === 0x29 || cp === 0x3B) {
	            return scanPunctuator();
	        }

	        // String literal starts with single quote (U+0027) or double quote (U+0022).
	        if (cp === 0x27 || cp === 0x22) {
	            return scanStringLiteral();
	        }

	        // Dot (.) U+002E can also start a floating-point number, hence the need
	        // to check the next character.
	        if (cp === 0x2E) {
	            if (isDecimalDigit(source.charCodeAt(index + 1))) {
	                return scanNumericLiteral();
	            }
	            return scanPunctuator();
	        }

	        if (isDecimalDigit(cp)) {
	            return scanNumericLiteral();
	        }

	        // Slash (/) U+002F can also start a regex.
	        if (extra.tokenize && cp === 0x2F) {
	            return advanceSlash();
	        }

	        // Template literals start with ` (U+0060) for template head
	        // or } (U+007D) for template middle or template tail.
	        if (cp === 0x60 || (cp === 0x7D && state.curlyStack[state.curlyStack.length - 1] === '${')) {
	            return scanTemplate();
	        }

	        // Possible identifier start in a surrogate pair.
	        if (cp >= 0xD800 && cp < 0xDFFF) {
	            cp = codePointAt(index);
	            if (isIdentifierStart(cp)) {
	                return scanIdentifier();
	            }
	        }

	        return scanPunctuator();
	    }

	    function collectToken() {
	        var loc, token, value, entry;

	        loc = {
	            start: {
	                line: lineNumber,
	                column: index - lineStart
	            }
	        };

	        token = advance();
	        loc.end = {
	            line: lineNumber,
	            column: index - lineStart
	        };

	        if (token.type !== Token.EOF) {
	            value = source.slice(token.start, token.end);
	            entry = {
	                type: TokenName[token.type],
	                value: value,
	                range: [token.start, token.end],
	                loc: loc
	            };
	            if (token.regex) {
	                entry.regex = {
	                    pattern: token.regex.pattern,
	                    flags: token.regex.flags
	                };
	            }
	            if (extra.tokenValues) {
	                extra.tokenValues.push((entry.type === 'Punctuator' || entry.type === 'Keyword') ? entry.value : null);
	            }
	            if (extra.tokenize) {
	                if (!extra.range) {
	                    delete entry.range;
	                }
	                if (!extra.loc) {
	                    delete entry.loc;
	                }
	                if (extra.delegate) {
	                    entry = extra.delegate(entry);
	                }
	            }
	            extra.tokens.push(entry);
	        }

	        return token;
	    }

	    function lex() {
	        var token;
	        scanning = true;

	        lastIndex = index;
	        lastLineNumber = lineNumber;
	        lastLineStart = lineStart;

	        skipComment();

	        token = lookahead;

	        startIndex = index;
	        startLineNumber = lineNumber;
	        startLineStart = lineStart;

	        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
	        scanning = false;
	        return token;
	    }

	    function peek() {
	        scanning = true;

	        skipComment();

	        lastIndex = index;
	        lastLineNumber = lineNumber;
	        lastLineStart = lineStart;

	        startIndex = index;
	        startLineNumber = lineNumber;
	        startLineStart = lineStart;

	        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
	        scanning = false;
	    }

	    function Position() {
	        this.line = startLineNumber;
	        this.column = startIndex - startLineStart;
	    }

	    function SourceLocation() {
	        this.start = new Position();
	        this.end = null;
	    }

	    function WrappingSourceLocation(startToken) {
	        this.start = {
	            line: startToken.lineNumber,
	            column: startToken.start - startToken.lineStart
	        };
	        this.end = null;
	    }

	    function Node() {
	        if (extra.range) {
	            this.range = [startIndex, 0];
	        }
	        if (extra.loc) {
	            this.loc = new SourceLocation();
	        }
	    }

	    function WrappingNode(startToken) {
	        if (extra.range) {
	            this.range = [startToken.start, 0];
	        }
	        if (extra.loc) {
	            this.loc = new WrappingSourceLocation(startToken);
	        }
	    }

	    WrappingNode.prototype = Node.prototype = {

	        processComment: function () {
	            var lastChild,
	                innerComments,
	                leadingComments,
	                trailingComments,
	                bottomRight = extra.bottomRightStack,
	                i,
	                comment,
	                last = bottomRight[bottomRight.length - 1];

	            if (this.type === Syntax.Program) {
	                if (this.body.length > 0) {
	                    return;
	                }
	            }
	            /**
	             * patch innnerComments for properties empty block
	             * `function a() {/** comments **\/}`
	             */

	            if (this.type === Syntax.BlockStatement && this.body.length === 0) {
	                innerComments = [];
	                for (i = extra.leadingComments.length - 1; i >= 0; --i) {
	                    comment = extra.leadingComments[i];
	                    if (this.range[1] >= comment.range[1]) {
	                        innerComments.unshift(comment);
	                        extra.leadingComments.splice(i, 1);
	                        extra.trailingComments.splice(i, 1);
	                    }
	                }
	                if (innerComments.length) {
	                    this.innerComments = innerComments;
	                    //bottomRight.push(this);
	                    return;
	                }
	            }

	            if (extra.trailingComments.length > 0) {
	                trailingComments = [];
	                for (i = extra.trailingComments.length - 1; i >= 0; --i) {
	                    comment = extra.trailingComments[i];
	                    if (comment.range[0] >= this.range[1]) {
	                        trailingComments.unshift(comment);
	                        extra.trailingComments.splice(i, 1);
	                    }
	                }
	                extra.trailingComments = [];
	            } else {
	                if (last && last.trailingComments && last.trailingComments[0].range[0] >= this.range[1]) {
	                    trailingComments = last.trailingComments;
	                    delete last.trailingComments;
	                }
	            }

	            // Eating the stack.
	            while (last && last.range[0] >= this.range[0]) {
	                lastChild = bottomRight.pop();
	                last = bottomRight[bottomRight.length - 1];
	            }

	            if (lastChild) {
	                if (lastChild.leadingComments) {
	                    leadingComments = [];
	                    for (i = lastChild.leadingComments.length - 1; i >= 0; --i) {
	                        comment = lastChild.leadingComments[i];
	                        if (comment.range[1] <= this.range[0]) {
	                            leadingComments.unshift(comment);
	                            lastChild.leadingComments.splice(i, 1);
	                        }
	                    }

	                    if (!lastChild.leadingComments.length) {
	                        lastChild.leadingComments = undefined;
	                    }
	                }
	            } else if (extra.leadingComments.length > 0) {
	                leadingComments = [];
	                for (i = extra.leadingComments.length - 1; i >= 0; --i) {
	                    comment = extra.leadingComments[i];
	                    if (comment.range[1] <= this.range[0]) {
	                        leadingComments.unshift(comment);
	                        extra.leadingComments.splice(i, 1);
	                    }
	                }
	            }


	            if (leadingComments && leadingComments.length > 0) {
	                this.leadingComments = leadingComments;
	            }
	            if (trailingComments && trailingComments.length > 0) {
	                this.trailingComments = trailingComments;
	            }

	            bottomRight.push(this);
	        },

	        finish: function () {
	            if (extra.range) {
	                this.range[1] = lastIndex;
	            }
	            if (extra.loc) {
	                this.loc.end = {
	                    line: lastLineNumber,
	                    column: lastIndex - lastLineStart
	                };
	                if (extra.source) {
	                    this.loc.source = extra.source;
	                }
	            }

	            if (extra.attachComment) {
	                this.processComment();
	            }
	        },

	        finishArrayExpression: function (elements) {
	            this.type = Syntax.ArrayExpression;
	            this.elements = elements;
	            this.finish();
	            return this;
	        },

	        finishArrayPattern: function (elements) {
	            this.type = Syntax.ArrayPattern;
	            this.elements = elements;
	            this.finish();
	            return this;
	        },

	        finishArrowFunctionExpression: function (params, defaults, body, expression) {
	            this.type = Syntax.ArrowFunctionExpression;
	            this.id = null;
	            this.params = params;
	            this.defaults = defaults;
	            this.body = body;
	            this.generator = false;
	            this.expression = expression;
	            this.finish();
	            return this;
	        },

	        finishAssignmentExpression: function (operator, left, right) {
	            this.type = Syntax.AssignmentExpression;
	            this.operator = operator;
	            this.left = left;
	            this.right = right;
	            this.finish();
	            return this;
	        },

	        finishAssignmentPattern: function (left, right) {
	            this.type = Syntax.AssignmentPattern;
	            this.left = left;
	            this.right = right;
	            this.finish();
	            return this;
	        },

	        finishBinaryExpression: function (operator, left, right) {
	            this.type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression : Syntax.BinaryExpression;
	            this.operator = operator;
	            this.left = left;
	            this.right = right;
	            this.finish();
	            return this;
	        },

	        finishBlockStatement: function (body) {
	            this.type = Syntax.BlockStatement;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishBreakStatement: function (label) {
	            this.type = Syntax.BreakStatement;
	            this.label = label;
	            this.finish();
	            return this;
	        },

	        finishCallExpression: function (callee, args) {
	            this.type = Syntax.CallExpression;
	            this.callee = callee;
	            this.arguments = args;
	            this.finish();
	            return this;
	        },

	        finishCatchClause: function (param, body) {
	            this.type = Syntax.CatchClause;
	            this.param = param;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishClassBody: function (body) {
	            this.type = Syntax.ClassBody;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishClassDeclaration: function (id, superClass, body) {
	            this.type = Syntax.ClassDeclaration;
	            this.id = id;
	            this.superClass = superClass;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishClassExpression: function (id, superClass, body) {
	            this.type = Syntax.ClassExpression;
	            this.id = id;
	            this.superClass = superClass;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishConditionalExpression: function (test, consequent, alternate) {
	            this.type = Syntax.ConditionalExpression;
	            this.test = test;
	            this.consequent = consequent;
	            this.alternate = alternate;
	            this.finish();
	            return this;
	        },

	        finishContinueStatement: function (label) {
	            this.type = Syntax.ContinueStatement;
	            this.label = label;
	            this.finish();
	            return this;
	        },

	        finishDebuggerStatement: function () {
	            this.type = Syntax.DebuggerStatement;
	            this.finish();
	            return this;
	        },

	        finishDoWhileStatement: function (body, test) {
	            this.type = Syntax.DoWhileStatement;
	            this.body = body;
	            this.test = test;
	            this.finish();
	            return this;
	        },

	        finishEmptyStatement: function () {
	            this.type = Syntax.EmptyStatement;
	            this.finish();
	            return this;
	        },

	        finishExpressionStatement: function (expression) {
	            this.type = Syntax.ExpressionStatement;
	            this.expression = expression;
	            this.finish();
	            return this;
	        },

	        finishForStatement: function (init, test, update, body) {
	            this.type = Syntax.ForStatement;
	            this.init = init;
	            this.test = test;
	            this.update = update;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishForOfStatement: function (left, right, body) {
	            this.type = Syntax.ForOfStatement;
	            this.left = left;
	            this.right = right;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishForInStatement: function (left, right, body) {
	            this.type = Syntax.ForInStatement;
	            this.left = left;
	            this.right = right;
	            this.body = body;
	            this.each = false;
	            this.finish();
	            return this;
	        },

	        finishFunctionDeclaration: function (id, params, defaults, body, generator) {
	            this.type = Syntax.FunctionDeclaration;
	            this.id = id;
	            this.params = params;
	            this.defaults = defaults;
	            this.body = body;
	            this.generator = generator;
	            this.expression = false;
	            this.finish();
	            return this;
	        },

	        finishFunctionExpression: function (id, params, defaults, body, generator) {
	            this.type = Syntax.FunctionExpression;
	            this.id = id;
	            this.params = params;
	            this.defaults = defaults;
	            this.body = body;
	            this.generator = generator;
	            this.expression = false;
	            this.finish();
	            return this;
	        },

	        finishIdentifier: function (name) {
	            this.type = Syntax.Identifier;
	            this.name = name;
	            this.finish();
	            return this;
	        },

	        finishIfStatement: function (test, consequent, alternate) {
	            this.type = Syntax.IfStatement;
	            this.test = test;
	            this.consequent = consequent;
	            this.alternate = alternate;
	            this.finish();
	            return this;
	        },

	        finishLabeledStatement: function (label, body) {
	            this.type = Syntax.LabeledStatement;
	            this.label = label;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishLiteral: function (token) {
	            this.type = Syntax.Literal;
	            this.value = token.value;
	            this.raw = source.slice(token.start, token.end);
	            if (token.regex) {
	                this.regex = token.regex;
	            }
	            this.finish();
	            return this;
	        },

	        finishMemberExpression: function (accessor, object, property) {
	            this.type = Syntax.MemberExpression;
	            this.computed = accessor === '[';
	            this.object = object;
	            this.property = property;
	            this.finish();
	            return this;
	        },

	        finishMetaProperty: function (meta, property) {
	            this.type = Syntax.MetaProperty;
	            this.meta = meta;
	            this.property = property;
	            this.finish();
	            return this;
	        },

	        finishNewExpression: function (callee, args) {
	            this.type = Syntax.NewExpression;
	            this.callee = callee;
	            this.arguments = args;
	            this.finish();
	            return this;
	        },

	        finishObjectExpression: function (properties) {
	            this.type = Syntax.ObjectExpression;
	            this.properties = properties;
	            this.finish();
	            return this;
	        },

	        finishObjectPattern: function (properties) {
	            this.type = Syntax.ObjectPattern;
	            this.properties = properties;
	            this.finish();
	            return this;
	        },

	        finishPostfixExpression: function (operator, argument) {
	            this.type = Syntax.UpdateExpression;
	            this.operator = operator;
	            this.argument = argument;
	            this.prefix = false;
	            this.finish();
	            return this;
	        },

	        finishProgram: function (body, sourceType) {
	            this.type = Syntax.Program;
	            this.body = body;
	            this.sourceType = sourceType;
	            this.finish();
	            return this;
	        },

	        finishProperty: function (kind, key, computed, value, method, shorthand) {
	            this.type = Syntax.Property;
	            this.key = key;
	            this.computed = computed;
	            this.value = value;
	            this.kind = kind;
	            this.method = method;
	            this.shorthand = shorthand;
	            this.finish();
	            return this;
	        },

	        finishRestElement: function (argument) {
	            this.type = Syntax.RestElement;
	            this.argument = argument;
	            this.finish();
	            return this;
	        },

	        finishReturnStatement: function (argument) {
	            this.type = Syntax.ReturnStatement;
	            this.argument = argument;
	            this.finish();
	            return this;
	        },

	        finishSequenceExpression: function (expressions) {
	            this.type = Syntax.SequenceExpression;
	            this.expressions = expressions;
	            this.finish();
	            return this;
	        },

	        finishSpreadElement: function (argument) {
	            this.type = Syntax.SpreadElement;
	            this.argument = argument;
	            this.finish();
	            return this;
	        },

	        finishSwitchCase: function (test, consequent) {
	            this.type = Syntax.SwitchCase;
	            this.test = test;
	            this.consequent = consequent;
	            this.finish();
	            return this;
	        },

	        finishSuper: function () {
	            this.type = Syntax.Super;
	            this.finish();
	            return this;
	        },

	        finishSwitchStatement: function (discriminant, cases) {
	            this.type = Syntax.SwitchStatement;
	            this.discriminant = discriminant;
	            this.cases = cases;
	            this.finish();
	            return this;
	        },

	        finishTaggedTemplateExpression: function (tag, quasi) {
	            this.type = Syntax.TaggedTemplateExpression;
	            this.tag = tag;
	            this.quasi = quasi;
	            this.finish();
	            return this;
	        },

	        finishTemplateElement: function (value, tail) {
	            this.type = Syntax.TemplateElement;
	            this.value = value;
	            this.tail = tail;
	            this.finish();
	            return this;
	        },

	        finishTemplateLiteral: function (quasis, expressions) {
	            this.type = Syntax.TemplateLiteral;
	            this.quasis = quasis;
	            this.expressions = expressions;
	            this.finish();
	            return this;
	        },

	        finishThisExpression: function () {
	            this.type = Syntax.ThisExpression;
	            this.finish();
	            return this;
	        },

	        finishThrowStatement: function (argument) {
	            this.type = Syntax.ThrowStatement;
	            this.argument = argument;
	            this.finish();
	            return this;
	        },

	        finishTryStatement: function (block, handler, finalizer) {
	            this.type = Syntax.TryStatement;
	            this.block = block;
	            this.guardedHandlers = [];
	            this.handlers = handler ? [handler] : [];
	            this.handler = handler;
	            this.finalizer = finalizer;
	            this.finish();
	            return this;
	        },

	        finishUnaryExpression: function (operator, argument) {
	            this.type = (operator === '++' || operator === '--') ? Syntax.UpdateExpression : Syntax.UnaryExpression;
	            this.operator = operator;
	            this.argument = argument;
	            this.prefix = true;
	            this.finish();
	            return this;
	        },

	        finishVariableDeclaration: function (declarations) {
	            this.type = Syntax.VariableDeclaration;
	            this.declarations = declarations;
	            this.kind = 'var';
	            this.finish();
	            return this;
	        },

	        finishLexicalDeclaration: function (declarations, kind) {
	            this.type = Syntax.VariableDeclaration;
	            this.declarations = declarations;
	            this.kind = kind;
	            this.finish();
	            return this;
	        },

	        finishVariableDeclarator: function (id, init) {
	            this.type = Syntax.VariableDeclarator;
	            this.id = id;
	            this.init = init;
	            this.finish();
	            return this;
	        },

	        finishWhileStatement: function (test, body) {
	            this.type = Syntax.WhileStatement;
	            this.test = test;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishWithStatement: function (object, body) {
	            this.type = Syntax.WithStatement;
	            this.object = object;
	            this.body = body;
	            this.finish();
	            return this;
	        },

	        finishExportSpecifier: function (local, exported) {
	            this.type = Syntax.ExportSpecifier;
	            this.exported = exported || local;
	            this.local = local;
	            this.finish();
	            return this;
	        },

	        finishImportDefaultSpecifier: function (local) {
	            this.type = Syntax.ImportDefaultSpecifier;
	            this.local = local;
	            this.finish();
	            return this;
	        },

	        finishImportNamespaceSpecifier: function (local) {
	            this.type = Syntax.ImportNamespaceSpecifier;
	            this.local = local;
	            this.finish();
	            return this;
	        },

	        finishExportNamedDeclaration: function (declaration, specifiers, src) {
	            this.type = Syntax.ExportNamedDeclaration;
	            this.declaration = declaration;
	            this.specifiers = specifiers;
	            this.source = src;
	            this.finish();
	            return this;
	        },

	        finishExportDefaultDeclaration: function (declaration) {
	            this.type = Syntax.ExportDefaultDeclaration;
	            this.declaration = declaration;
	            this.finish();
	            return this;
	        },

	        finishExportAllDeclaration: function (src) {
	            this.type = Syntax.ExportAllDeclaration;
	            this.source = src;
	            this.finish();
	            return this;
	        },

	        finishImportSpecifier: function (local, imported) {
	            this.type = Syntax.ImportSpecifier;
	            this.local = local || imported;
	            this.imported = imported;
	            this.finish();
	            return this;
	        },

	        finishImportDeclaration: function (specifiers, src) {
	            this.type = Syntax.ImportDeclaration;
	            this.specifiers = specifiers;
	            this.source = src;
	            this.finish();
	            return this;
	        },

	        finishYieldExpression: function (argument, delegate) {
	            this.type = Syntax.YieldExpression;
	            this.argument = argument;
	            this.delegate = delegate;
	            this.finish();
	            return this;
	        }
	    };


	    function recordError(error) {
	        var e, existing;

	        for (e = 0; e < extra.errors.length; e++) {
	            existing = extra.errors[e];
	            // Prevent duplicated error.
	            /* istanbul ignore next */
	            if (existing.index === error.index && existing.message === error.message) {
	                return;
	            }
	        }

	        extra.errors.push(error);
	    }

	    function constructError(msg, column) {
	        var error = new Error(msg);
	        try {
	            throw error;
	        } catch (base) {
	            /* istanbul ignore else */
	            if (Object.create && Object.defineProperty) {
	                error = Object.create(base);
	                Object.defineProperty(error, 'column', { value: column });
	            }
	        } finally {
	            return error;
	        }
	    }

	    function createError(line, pos, description) {
	        var msg, column, error;

	        msg = 'Line ' + line + ': ' + description;
	        column = pos - (scanning ? lineStart : lastLineStart) + 1;
	        error = constructError(msg, column);
	        error.lineNumber = line;
	        error.description = description;
	        error.index = pos;
	        return error;
	    }

	    // Throw an exception

	    function throwError(messageFormat) {
	        var args, msg;

	        args = Array.prototype.slice.call(arguments, 1);
	        msg = messageFormat.replace(/%(\d)/g,
	            function (whole, idx) {
	                assert(idx < args.length, 'Message reference must be in range');
	                return args[idx];
	            }
	        );

	        throw createError(lastLineNumber, lastIndex, msg);
	    }

	    function tolerateError(messageFormat) {
	        var args, msg, error;

	        args = Array.prototype.slice.call(arguments, 1);
	        /* istanbul ignore next */
	        msg = messageFormat.replace(/%(\d)/g,
	            function (whole, idx) {
	                assert(idx < args.length, 'Message reference must be in range');
	                return args[idx];
	            }
	        );

	        error = createError(lineNumber, lastIndex, msg);
	        if (extra.errors) {
	            recordError(error);
	        } else {
	            throw error;
	        }
	    }

	    // Throw an exception because of the token.

	    function unexpectedTokenError(token, message) {
	        var value, msg = message || Messages.UnexpectedToken;

	        if (token) {
	            if (!message) {
	                msg = (token.type === Token.EOF) ? Messages.UnexpectedEOS :
	                    (token.type === Token.Identifier) ? Messages.UnexpectedIdentifier :
	                    (token.type === Token.NumericLiteral) ? Messages.UnexpectedNumber :
	                    (token.type === Token.StringLiteral) ? Messages.UnexpectedString :
	                    (token.type === Token.Template) ? Messages.UnexpectedTemplate :
	                    Messages.UnexpectedToken;

	                if (token.type === Token.Keyword) {
	                    if (isFutureReservedWord(token.value)) {
	                        msg = Messages.UnexpectedReserved;
	                    } else if (strict && isStrictModeReservedWord(token.value)) {
	                        msg = Messages.StrictReservedWord;
	                    }
	                }
	            }

	            value = (token.type === Token.Template) ? token.value.raw : token.value;
	        } else {
	            value = 'ILLEGAL';
	        }

	        msg = msg.replace('%0', value);

	        return (token && typeof token.lineNumber === 'number') ?
	            createError(token.lineNumber, token.start, msg) :
	            createError(scanning ? lineNumber : lastLineNumber, scanning ? index : lastIndex, msg);
	    }

	    function throwUnexpectedToken(token, message) {
	        throw unexpectedTokenError(token, message);
	    }

	    function tolerateUnexpectedToken(token, message) {
	        var error = unexpectedTokenError(token, message);
	        if (extra.errors) {
	            recordError(error);
	        } else {
	            throw error;
	        }
	    }

	    // Expect the next token to match the specified punctuator.
	    // If not, an exception will be thrown.

	    function expect(value) {
	        var token = lex();
	        if (token.type !== Token.Punctuator || token.value !== value) {
	            throwUnexpectedToken(token);
	        }
	    }

	    /**
	     * @name expectCommaSeparator
	     * @description Quietly expect a comma when in tolerant mode, otherwise delegates
	     * to <code>expect(value)</code>
	     * @since 2.0
	     */
	    function expectCommaSeparator() {
	        var token;

	        if (extra.errors) {
	            token = lookahead;
	            if (token.type === Token.Punctuator && token.value === ',') {
	                lex();
	            } else if (token.type === Token.Punctuator && token.value === ';') {
	                lex();
	                tolerateUnexpectedToken(token);
	            } else {
	                tolerateUnexpectedToken(token, Messages.UnexpectedToken);
	            }
	        } else {
	            expect(',');
	        }
	    }

	    // Expect the next token to match the specified keyword.
	    // If not, an exception will be thrown.

	    function expectKeyword(keyword) {
	        var token = lex();
	        if (token.type !== Token.Keyword || token.value !== keyword) {
	            throwUnexpectedToken(token);
	        }
	    }

	    // Return true if the next token matches the specified punctuator.

	    function match(value) {
	        return lookahead.type === Token.Punctuator && lookahead.value === value;
	    }

	    // Return true if the next token matches the specified keyword

	    function matchKeyword(keyword) {
	        return lookahead.type === Token.Keyword && lookahead.value === keyword;
	    }

	    // Return true if the next token matches the specified contextual keyword
	    // (where an identifier is sometimes a keyword depending on the context)

	    function matchContextualKeyword(keyword) {
	        return lookahead.type === Token.Identifier && lookahead.value === keyword;
	    }

	    // Return true if the next token is an assignment operator

	    function matchAssign() {
	        var op;

	        if (lookahead.type !== Token.Punctuator) {
	            return false;
	        }
	        op = lookahead.value;
	        return op === '=' ||
	            op === '*=' ||
	            op === '/=' ||
	            op === '%=' ||
	            op === '+=' ||
	            op === '-=' ||
	            op === '<<=' ||
	            op === '>>=' ||
	            op === '>>>=' ||
	            op === '&=' ||
	            op === '^=' ||
	            op === '|=';
	    }

	    function consumeSemicolon() {
	        // Catch the very common case first: immediately a semicolon (U+003B).
	        if (source.charCodeAt(startIndex) === 0x3B || match(';')) {
	            lex();
	            return;
	        }

	        if (hasLineTerminator) {
	            return;
	        }

	        // FIXME(ikarienator): this is seemingly an issue in the previous location info convention.
	        lastIndex = startIndex;
	        lastLineNumber = startLineNumber;
	        lastLineStart = startLineStart;

	        if (lookahead.type !== Token.EOF && !match('}')) {
	            throwUnexpectedToken(lookahead);
	        }
	    }

	    // Cover grammar support.
	    //
	    // When an assignment expression position starts with an left parenthesis, the determination of the type
	    // of the syntax is to be deferred arbitrarily long until the end of the parentheses pair (plus a lookahead)
	    // or the first comma. This situation also defers the determination of all the expressions nested in the pair.
	    //
	    // There are three productions that can be parsed in a parentheses pair that needs to be determined
	    // after the outermost pair is closed. They are:
	    //
	    //   1. AssignmentExpression
	    //   2. BindingElements
	    //   3. AssignmentTargets
	    //
	    // In order to avoid exponential backtracking, we use two flags to denote if the production can be
	    // binding element or assignment target.
	    //
	    // The three productions have the relationship:
	    //
	    //   BindingElements ⊆ AssignmentTargets ⊆ AssignmentExpression
	    //
	    // with a single exception that CoverInitializedName when used directly in an Expression, generates
	    // an early error. Therefore, we need the third state, firstCoverInitializedNameError, to track the
	    // first usage of CoverInitializedName and report it when we reached the end of the parentheses pair.
	    //
	    // isolateCoverGrammar function runs the given parser function with a new cover grammar context, and it does not
	    // effect the current flags. This means the production the parser parses is only used as an expression. Therefore
	    // the CoverInitializedName check is conducted.
	    //
	    // inheritCoverGrammar function runs the given parse function with a new cover grammar context, and it propagates
	    // the flags outside of the parser. This means the production the parser parses is used as a part of a potential
	    // pattern. The CoverInitializedName check is deferred.
	    function isolateCoverGrammar(parser) {
	        var oldIsBindingElement = isBindingElement,
	            oldIsAssignmentTarget = isAssignmentTarget,
	            oldFirstCoverInitializedNameError = firstCoverInitializedNameError,
	            result;
	        isBindingElement = true;
	        isAssignmentTarget = true;
	        firstCoverInitializedNameError = null;
	        result = parser();
	        if (firstCoverInitializedNameError !== null) {
	            throwUnexpectedToken(firstCoverInitializedNameError);
	        }
	        isBindingElement = oldIsBindingElement;
	        isAssignmentTarget = oldIsAssignmentTarget;
	        firstCoverInitializedNameError = oldFirstCoverInitializedNameError;
	        return result;
	    }

	    function inheritCoverGrammar(parser) {
	        var oldIsBindingElement = isBindingElement,
	            oldIsAssignmentTarget = isAssignmentTarget,
	            oldFirstCoverInitializedNameError = firstCoverInitializedNameError,
	            result;
	        isBindingElement = true;
	        isAssignmentTarget = true;
	        firstCoverInitializedNameError = null;
	        result = parser();
	        isBindingElement = isBindingElement && oldIsBindingElement;
	        isAssignmentTarget = isAssignmentTarget && oldIsAssignmentTarget;
	        firstCoverInitializedNameError = oldFirstCoverInitializedNameError || firstCoverInitializedNameError;
	        return result;
	    }

	    // ECMA-262 13.3.3 Destructuring Binding Patterns

	    function parseArrayPattern(params, kind) {
	        var node = new Node(), elements = [], rest, restNode;
	        expect('[');

	        while (!match(']')) {
	            if (match(',')) {
	                lex();
	                elements.push(null);
	            } else {
	                if (match('...')) {
	                    restNode = new Node();
	                    lex();
	                    params.push(lookahead);
	                    rest = parseVariableIdentifier(kind);
	                    elements.push(restNode.finishRestElement(rest));
	                    break;
	                } else {
	                    elements.push(parsePatternWithDefault(params, kind));
	                }
	                if (!match(']')) {
	                    expect(',');
	                }
	            }

	        }

	        expect(']');

	        return node.finishArrayPattern(elements);
	    }

	    function parsePropertyPattern(params, kind) {
	        var node = new Node(), key, keyToken, computed = match('['), init;
	        if (lookahead.type === Token.Identifier) {
	            keyToken = lookahead;
	            key = parseVariableIdentifier();
	            if (match('=')) {
	                params.push(keyToken);
	                lex();
	                init = parseAssignmentExpression();

	                return node.finishProperty(
	                    'init', key, false,
	                    new WrappingNode(keyToken).finishAssignmentPattern(key, init), false, true);
	            } else if (!match(':')) {
	                params.push(keyToken);
	                return node.finishProperty('init', key, false, key, false, true);
	            }
	        } else {
	            key = parseObjectPropertyKey();
	        }
	        expect(':');
	        init = parsePatternWithDefault(params, kind);
	        return node.finishProperty('init', key, computed, init, false, false);
	    }

	    function parseObjectPattern(params, kind) {
	        var node = new Node(), properties = [];

	        expect('{');

	        while (!match('}')) {
	            properties.push(parsePropertyPattern(params, kind));
	            if (!match('}')) {
	                expect(',');
	            }
	        }

	        lex();

	        return node.finishObjectPattern(properties);
	    }

	    function parsePattern(params, kind) {
	        if (match('[')) {
	            return parseArrayPattern(params, kind);
	        } else if (match('{')) {
	            return parseObjectPattern(params, kind);
	        } else if (matchKeyword('let')) {
	            if (kind === 'const' || kind === 'let') {
	                tolerateUnexpectedToken(lookahead, Messages.UnexpectedToken);
	            }
	        }

	        params.push(lookahead);
	        return parseVariableIdentifier(kind);
	    }

	    function parsePatternWithDefault(params, kind) {
	        var startToken = lookahead, pattern, previousAllowYield, right;
	        pattern = parsePattern(params, kind);
	        if (match('=')) {
	            lex();
	            previousAllowYield = state.allowYield;
	            state.allowYield = true;
	            right = isolateCoverGrammar(parseAssignmentExpression);
	            state.allowYield = previousAllowYield;
	            pattern = new WrappingNode(startToken).finishAssignmentPattern(pattern, right);
	        }
	        return pattern;
	    }

	    // ECMA-262 12.2.5 Array Initializer

	    function parseArrayInitializer() {
	        var elements = [], node = new Node(), restSpread;

	        expect('[');

	        while (!match(']')) {
	            if (match(',')) {
	                lex();
	                elements.push(null);
	            } else if (match('...')) {
	                restSpread = new Node();
	                lex();
	                restSpread.finishSpreadElement(inheritCoverGrammar(parseAssignmentExpression));

	                if (!match(']')) {
	                    isAssignmentTarget = isBindingElement = false;
	                    expect(',');
	                }
	                elements.push(restSpread);
	            } else {
	                elements.push(inheritCoverGrammar(parseAssignmentExpression));

	                if (!match(']')) {
	                    expect(',');
	                }
	            }
	        }

	        lex();

	        return node.finishArrayExpression(elements);
	    }

	    // ECMA-262 12.2.6 Object Initializer

	    function parsePropertyFunction(node, paramInfo, isGenerator) {
	        var previousStrict, body;

	        isAssignmentTarget = isBindingElement = false;

	        previousStrict = strict;
	        body = isolateCoverGrammar(parseFunctionSourceElements);

	        if (strict && paramInfo.firstRestricted) {
	            tolerateUnexpectedToken(paramInfo.firstRestricted, paramInfo.message);
	        }
	        if (strict && paramInfo.stricted) {
	            tolerateUnexpectedToken(paramInfo.stricted, paramInfo.message);
	        }

	        strict = previousStrict;
	        return node.finishFunctionExpression(null, paramInfo.params, paramInfo.defaults, body, isGenerator);
	    }

	    function parsePropertyMethodFunction() {
	        var params, method, node = new Node(),
	            previousAllowYield = state.allowYield;

	        state.allowYield = false;
	        params = parseParams();
	        state.allowYield = previousAllowYield;

	        state.allowYield = false;
	        method = parsePropertyFunction(node, params, false);
	        state.allowYield = previousAllowYield;

	        return method;
	    }

	    function parseObjectPropertyKey() {
	        var token, node = new Node(), expr;

	        token = lex();

	        // Note: This function is called only from parseObjectProperty(), where
	        // EOF and Punctuator tokens are already filtered out.

	        switch (token.type) {
	        case Token.StringLiteral:
	        case Token.NumericLiteral:
	            if (strict && token.octal) {
	                tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
	            }
	            return node.finishLiteral(token);
	        case Token.Identifier:
	        case Token.BooleanLiteral:
	        case Token.NullLiteral:
	        case Token.Keyword:
	            return node.finishIdentifier(token.value);
	        case Token.Punctuator:
	            if (token.value === '[') {
	                expr = isolateCoverGrammar(parseAssignmentExpression);
	                expect(']');
	                return expr;
	            }
	            break;
	        }
	        throwUnexpectedToken(token);
	    }

	    function lookaheadPropertyName() {
	        switch (lookahead.type) {
	        case Token.Identifier:
	        case Token.StringLiteral:
	        case Token.BooleanLiteral:
	        case Token.NullLiteral:
	        case Token.NumericLiteral:
	        case Token.Keyword:
	            return true;
	        case Token.Punctuator:
	            return lookahead.value === '[';
	        }
	        return false;
	    }

	    // This function is to try to parse a MethodDefinition as defined in 14.3. But in the case of object literals,
	    // it might be called at a position where there is in fact a short hand identifier pattern or a data property.
	    // This can only be determined after we consumed up to the left parentheses.
	    //
	    // In order to avoid back tracking, it returns `null` if the position is not a MethodDefinition and the caller
	    // is responsible to visit other options.
	    function tryParseMethodDefinition(token, key, computed, node) {
	        var value, options, methodNode, params,
	            previousAllowYield = state.allowYield;

	        if (token.type === Token.Identifier) {
	            // check for `get` and `set`;

	            if (token.value === 'get' && lookaheadPropertyName()) {
	                computed = match('[');
	                key = parseObjectPropertyKey();
	                methodNode = new Node();
	                expect('(');
	                expect(')');

	                state.allowYield = false;
	                value = parsePropertyFunction(methodNode, {
	                    params: [],
	                    defaults: [],
	                    stricted: null,
	                    firstRestricted: null,
	                    message: null
	                }, false);
	                state.allowYield = previousAllowYield;

	                return node.finishProperty('get', key, computed, value, false, false);
	            } else if (token.value === 'set' && lookaheadPropertyName()) {
	                computed = match('[');
	                key = parseObjectPropertyKey();
	                methodNode = new Node();
	                expect('(');

	                options = {
	                    params: [],
	                    defaultCount: 0,
	                    defaults: [],
	                    firstRestricted: null,
	                    paramSet: {}
	                };
	                if (match(')')) {
	                    tolerateUnexpectedToken(lookahead);
	                } else {
	                    state.allowYield = false;
	                    parseParam(options);
	                    state.allowYield = previousAllowYield;
	                    if (options.defaultCount === 0) {
	                        options.defaults = [];
	                    }
	                }
	                expect(')');

	                state.allowYield = false;
	                value = parsePropertyFunction(methodNode, options, false);
	                state.allowYield = previousAllowYield;

	                return node.finishProperty('set', key, computed, value, false, false);
	            }
	        } else if (token.type === Token.Punctuator && token.value === '*' && lookaheadPropertyName()) {
	            computed = match('[');
	            key = parseObjectPropertyKey();
	            methodNode = new Node();

	            state.allowYield = true;
	            params = parseParams();
	            state.allowYield = previousAllowYield;

	            state.allowYield = false;
	            value = parsePropertyFunction(methodNode, params, true);
	            state.allowYield = previousAllowYield;

	            return node.finishProperty('init', key, computed, value, true, false);
	        }

	        if (key && match('(')) {
	            value = parsePropertyMethodFunction();
	            return node.finishProperty('init', key, computed, value, true, false);
	        }

	        // Not a MethodDefinition.
	        return null;
	    }

	    function parseObjectProperty(hasProto) {
	        var token = lookahead, node = new Node(), computed, key, maybeMethod, proto, value;

	        computed = match('[');
	        if (match('*')) {
	            lex();
	        } else {
	            key = parseObjectPropertyKey();
	        }
	        maybeMethod = tryParseMethodDefinition(token, key, computed, node);
	        if (maybeMethod) {
	            return maybeMethod;
	        }

	        if (!key) {
	            throwUnexpectedToken(lookahead);
	        }

	        // Check for duplicated __proto__
	        if (!computed) {
	            proto = (key.type === Syntax.Identifier && key.name === '__proto__') ||
	                (key.type === Syntax.Literal && key.value === '__proto__');
	            if (hasProto.value && proto) {
	                tolerateError(Messages.DuplicateProtoProperty);
	            }
	            hasProto.value |= proto;
	        }

	        if (match(':')) {
	            lex();
	            value = inheritCoverGrammar(parseAssignmentExpression);
	            return node.finishProperty('init', key, computed, value, false, false);
	        }

	        if (token.type === Token.Identifier) {
	            if (match('=')) {
	                firstCoverInitializedNameError = lookahead;
	                lex();
	                value = isolateCoverGrammar(parseAssignmentExpression);
	                return node.finishProperty('init', key, computed,
	                    new WrappingNode(token).finishAssignmentPattern(key, value), false, true);
	            }
	            return node.finishProperty('init', key, computed, key, false, true);
	        }

	        throwUnexpectedToken(lookahead);
	    }

	    function parseObjectInitializer() {
	        var properties = [], hasProto = {value: false}, node = new Node();

	        expect('{');

	        while (!match('}')) {
	            properties.push(parseObjectProperty(hasProto));

	            if (!match('}')) {
	                expectCommaSeparator();
	            }
	        }

	        expect('}');

	        return node.finishObjectExpression(properties);
	    }

	    function reinterpretExpressionAsPattern(expr) {
	        var i;
	        switch (expr.type) {
	        case Syntax.Identifier:
	        case Syntax.MemberExpression:
	        case Syntax.RestElement:
	        case Syntax.AssignmentPattern:
	            break;
	        case Syntax.SpreadElement:
	            expr.type = Syntax.RestElement;
	            reinterpretExpressionAsPattern(expr.argument);
	            break;
	        case Syntax.ArrayExpression:
	            expr.type = Syntax.ArrayPattern;
	            for (i = 0; i < expr.elements.length; i++) {
	                if (expr.elements[i] !== null) {
	                    reinterpretExpressionAsPattern(expr.elements[i]);
	                }
	            }
	            break;
	        case Syntax.ObjectExpression:
	            expr.type = Syntax.ObjectPattern;
	            for (i = 0; i < expr.properties.length; i++) {
	                reinterpretExpressionAsPattern(expr.properties[i].value);
	            }
	            break;
	        case Syntax.AssignmentExpression:
	            expr.type = Syntax.AssignmentPattern;
	            reinterpretExpressionAsPattern(expr.left);
	            break;
	        default:
	            // Allow other node type for tolerant parsing.
	            break;
	        }
	    }

	    // ECMA-262 12.2.9 Template Literals

	    function parseTemplateElement(option) {
	        var node, token;

	        if (lookahead.type !== Token.Template || (option.head && !lookahead.head)) {
	            throwUnexpectedToken();
	        }

	        node = new Node();
	        token = lex();

	        return node.finishTemplateElement({ raw: token.value.raw, cooked: token.value.cooked }, token.tail);
	    }

	    function parseTemplateLiteral() {
	        var quasi, quasis, expressions, node = new Node();

	        quasi = parseTemplateElement({ head: true });
	        quasis = [quasi];
	        expressions = [];

	        while (!quasi.tail) {
	            expressions.push(parseExpression());
	            quasi = parseTemplateElement({ head: false });
	            quasis.push(quasi);
	        }

	        return node.finishTemplateLiteral(quasis, expressions);
	    }

	    // ECMA-262 12.2.10 The Grouping Operator

	    function parseGroupExpression() {
	        var expr, expressions, startToken, i, params = [];

	        expect('(');

	        if (match(')')) {
	            lex();
	            if (!match('=>')) {
	                expect('=>');
	            }
	            return {
	                type: PlaceHolders.ArrowParameterPlaceHolder,
	                params: [],
	                rawParams: []
	            };
	        }

	        startToken = lookahead;
	        if (match('...')) {
	            expr = parseRestElement(params);
	            expect(')');
	            if (!match('=>')) {
	                expect('=>');
	            }
	            return {
	                type: PlaceHolders.ArrowParameterPlaceHolder,
	                params: [expr]
	            };
	        }

	        isBindingElement = true;
	        expr = inheritCoverGrammar(parseAssignmentExpression);

	        if (match(',')) {
	            isAssignmentTarget = false;
	            expressions = [expr];

	            while (startIndex < length) {
	                if (!match(',')) {
	                    break;
	                }
	                lex();

	                if (match('...')) {
	                    if (!isBindingElement) {
	                        throwUnexpectedToken(lookahead);
	                    }
	                    expressions.push(parseRestElement(params));
	                    expect(')');
	                    if (!match('=>')) {
	                        expect('=>');
	                    }
	                    isBindingElement = false;
	                    for (i = 0; i < expressions.length; i++) {
	                        reinterpretExpressionAsPattern(expressions[i]);
	                    }
	                    return {
	                        type: PlaceHolders.ArrowParameterPlaceHolder,
	                        params: expressions
	                    };
	                }

	                expressions.push(inheritCoverGrammar(parseAssignmentExpression));
	            }

	            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
	        }


	        expect(')');

	        if (match('=>')) {
	            if (expr.type === Syntax.Identifier && expr.name === 'yield') {
	                return {
	                    type: PlaceHolders.ArrowParameterPlaceHolder,
	                    params: [expr]
	                };
	            }

	            if (!isBindingElement) {
	                throwUnexpectedToken(lookahead);
	            }

	            if (expr.type === Syntax.SequenceExpression) {
	                for (i = 0; i < expr.expressions.length; i++) {
	                    reinterpretExpressionAsPattern(expr.expressions[i]);
	                }
	            } else {
	                reinterpretExpressionAsPattern(expr);
	            }

	            expr = {
	                type: PlaceHolders.ArrowParameterPlaceHolder,
	                params: expr.type === Syntax.SequenceExpression ? expr.expressions : [expr]
	            };
	        }
	        isBindingElement = false;
	        return expr;
	    }


	    // ECMA-262 12.2 Primary Expressions

	    function parsePrimaryExpression() {
	        var type, token, expr, node;

	        if (match('(')) {
	            isBindingElement = false;
	            return inheritCoverGrammar(parseGroupExpression);
	        }

	        if (match('[')) {
	            return inheritCoverGrammar(parseArrayInitializer);
	        }

	        if (match('{')) {
	            return inheritCoverGrammar(parseObjectInitializer);
	        }

	        type = lookahead.type;
	        node = new Node();

	        if (type === Token.Identifier) {
	            if (state.sourceType === 'module' && lookahead.value === 'await') {
	                tolerateUnexpectedToken(lookahead);
	            }
	            expr = node.finishIdentifier(lex().value);
	        } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
	            isAssignmentTarget = isBindingElement = false;
	            if (strict && lookahead.octal) {
	                tolerateUnexpectedToken(lookahead, Messages.StrictOctalLiteral);
	            }
	            expr = node.finishLiteral(lex());
	        } else if (type === Token.Keyword) {
	            if (!strict && state.allowYield && matchKeyword('yield')) {
	                return parseNonComputedProperty();
	            }
	            if (!strict && matchKeyword('let')) {
	                return node.finishIdentifier(lex().value);
	            }
	            isAssignmentTarget = isBindingElement = false;
	            if (matchKeyword('function')) {
	                return parseFunctionExpression();
	            }
	            if (matchKeyword('this')) {
	                lex();
	                return node.finishThisExpression();
	            }
	            if (matchKeyword('class')) {
	                return parseClassExpression();
	            }
	            throwUnexpectedToken(lex());
	        } else if (type === Token.BooleanLiteral) {
	            isAssignmentTarget = isBindingElement = false;
	            token = lex();
	            token.value = (token.value === 'true');
	            expr = node.finishLiteral(token);
	        } else if (type === Token.NullLiteral) {
	            isAssignmentTarget = isBindingElement = false;
	            token = lex();
	            token.value = null;
	            expr = node.finishLiteral(token);
	        } else if (match('/') || match('/=')) {
	            isAssignmentTarget = isBindingElement = false;
	            index = startIndex;

	            if (typeof extra.tokens !== 'undefined') {
	                token = collectRegex();
	            } else {
	                token = scanRegExp();
	            }
	            lex();
	            expr = node.finishLiteral(token);
	        } else if (type === Token.Template) {
	            expr = parseTemplateLiteral();
	        } else {
	            throwUnexpectedToken(lex());
	        }

	        return expr;
	    }

	    // ECMA-262 12.3 Left-Hand-Side Expressions

	    function parseArguments() {
	        var args = [], expr;

	        expect('(');

	        if (!match(')')) {
	            while (startIndex < length) {
	                if (match('...')) {
	                    expr = new Node();
	                    lex();
	                    expr.finishSpreadElement(isolateCoverGrammar(parseAssignmentExpression));
	                } else {
	                    expr = isolateCoverGrammar(parseAssignmentExpression);
	                }
	                args.push(expr);
	                if (match(')')) {
	                    break;
	                }
	                expectCommaSeparator();
	            }
	        }

	        expect(')');

	        return args;
	    }

	    function parseNonComputedProperty() {
	        var token, node = new Node();

	        token = lex();

	        if (!isIdentifierName(token)) {
	            throwUnexpectedToken(token);
	        }

	        return node.finishIdentifier(token.value);
	    }

	    function parseNonComputedMember() {
	        expect('.');

	        return parseNonComputedProperty();
	    }

	    function parseComputedMember() {
	        var expr;

	        expect('[');

	        expr = isolateCoverGrammar(parseExpression);

	        expect(']');

	        return expr;
	    }

	    // ECMA-262 12.3.3 The new Operator

	    function parseNewExpression() {
	        var callee, args, node = new Node();

	        expectKeyword('new');

	        if (match('.')) {
	            lex();
	            if (lookahead.type === Token.Identifier && lookahead.value === 'target') {
	                if (state.inFunctionBody) {
	                    lex();
	                    return node.finishMetaProperty('new', 'target');
	                }
	            }
	            throwUnexpectedToken(lookahead);
	        }

	        callee = isolateCoverGrammar(parseLeftHandSideExpression);
	        args = match('(') ? parseArguments() : [];

	        isAssignmentTarget = isBindingElement = false;

	        return node.finishNewExpression(callee, args);
	    }

	    // ECMA-262 12.3.4 Function Calls

	    function parseLeftHandSideExpressionAllowCall() {
	        var quasi, expr, args, property, startToken, previousAllowIn = state.allowIn;

	        startToken = lookahead;
	        state.allowIn = true;

	        if (matchKeyword('super') && state.inFunctionBody) {
	            expr = new Node();
	            lex();
	            expr = expr.finishSuper();
	            if (!match('(') && !match('.') && !match('[')) {
	                throwUnexpectedToken(lookahead);
	            }
	        } else {
	            expr = inheritCoverGrammar(matchKeyword('new') ? parseNewExpression : parsePrimaryExpression);
	        }

	        for (;;) {
	            if (match('.')) {
	                isBindingElement = false;
	                isAssignmentTarget = true;
	                property = parseNonComputedMember();
	                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
	            } else if (match('(')) {
	                isBindingElement = false;
	                isAssignmentTarget = false;
	                args = parseArguments();
	                expr = new WrappingNode(startToken).finishCallExpression(expr, args);
	            } else if (match('[')) {
	                isBindingElement = false;
	                isAssignmentTarget = true;
	                property = parseComputedMember();
	                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
	            } else if (lookahead.type === Token.Template && lookahead.head) {
	                quasi = parseTemplateLiteral();
	                expr = new WrappingNode(startToken).finishTaggedTemplateExpression(expr, quasi);
	            } else {
	                break;
	            }
	        }
	        state.allowIn = previousAllowIn;

	        return expr;
	    }

	    // ECMA-262 12.3 Left-Hand-Side Expressions

	    function parseLeftHandSideExpression() {
	        var quasi, expr, property, startToken;
	        assert(state.allowIn, 'callee of new expression always allow in keyword.');

	        startToken = lookahead;

	        if (matchKeyword('super') && state.inFunctionBody) {
	            expr = new Node();
	            lex();
	            expr = expr.finishSuper();
	            if (!match('[') && !match('.')) {
	                throwUnexpectedToken(lookahead);
	            }
	        } else {
	            expr = inheritCoverGrammar(matchKeyword('new') ? parseNewExpression : parsePrimaryExpression);
	        }

	        for (;;) {
	            if (match('[')) {
	                isBindingElement = false;
	                isAssignmentTarget = true;
	                property = parseComputedMember();
	                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
	            } else if (match('.')) {
	                isBindingElement = false;
	                isAssignmentTarget = true;
	                property = parseNonComputedMember();
	                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
	            } else if (lookahead.type === Token.Template && lookahead.head) {
	                quasi = parseTemplateLiteral();
	                expr = new WrappingNode(startToken).finishTaggedTemplateExpression(expr, quasi);
	            } else {
	                break;
	            }
	        }
	        return expr;
	    }

	    // ECMA-262 12.4 Postfix Expressions

	    function parsePostfixExpression() {
	        var expr, token, startToken = lookahead;

	        expr = inheritCoverGrammar(parseLeftHandSideExpressionAllowCall);

	        if (!hasLineTerminator && lookahead.type === Token.Punctuator) {
	            if (match('++') || match('--')) {
	                // ECMA-262 11.3.1, 11.3.2
	                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
	                    tolerateError(Messages.StrictLHSPostfix);
	                }

	                if (!isAssignmentTarget) {
	                    tolerateError(Messages.InvalidLHSInAssignment);
	                }

	                isAssignmentTarget = isBindingElement = false;

	                token = lex();
	                expr = new WrappingNode(startToken).finishPostfixExpression(token.value, expr);
	            }
	        }

	        return expr;
	    }

	    // ECMA-262 12.5 Unary Operators

	    function parseUnaryExpression() {
	        var token, expr, startToken;

	        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
	            expr = parsePostfixExpression();
	        } else if (match('++') || match('--')) {
	            startToken = lookahead;
	            token = lex();
	            expr = inheritCoverGrammar(parseUnaryExpression);
	            // ECMA-262 11.4.4, 11.4.5
	            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
	                tolerateError(Messages.StrictLHSPrefix);
	            }

	            if (!isAssignmentTarget) {
	                tolerateError(Messages.InvalidLHSInAssignment);
	            }
	            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
	            isAssignmentTarget = isBindingElement = false;
	        } else if (match('+') || match('-') || match('~') || match('!')) {
	            startToken = lookahead;
	            token = lex();
	            expr = inheritCoverGrammar(parseUnaryExpression);
	            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
	            isAssignmentTarget = isBindingElement = false;
	        } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
	            startToken = lookahead;
	            token = lex();
	            expr = inheritCoverGrammar(parseUnaryExpression);
	            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
	            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
	                tolerateError(Messages.StrictDelete);
	            }
	            isAssignmentTarget = isBindingElement = false;
	        } else {
	            expr = parsePostfixExpression();
	        }

	        return expr;
	    }

	    function binaryPrecedence(token, allowIn) {
	        var prec = 0;

	        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
	            return 0;
	        }

	        switch (token.value) {
	        case '||':
	            prec = 1;
	            break;

	        case '&&':
	            prec = 2;
	            break;

	        case '|':
	            prec = 3;
	            break;

	        case '^':
	            prec = 4;
	            break;

	        case '&':
	            prec = 5;
	            break;

	        case '==':
	        case '!=':
	        case '===':
	        case '!==':
	            prec = 6;
	            break;

	        case '<':
	        case '>':
	        case '<=':
	        case '>=':
	        case 'instanceof':
	            prec = 7;
	            break;

	        case 'in':
	            prec = allowIn ? 7 : 0;
	            break;

	        case '<<':
	        case '>>':
	        case '>>>':
	            prec = 8;
	            break;

	        case '+':
	        case '-':
	            prec = 9;
	            break;

	        case '*':
	        case '/':
	        case '%':
	            prec = 11;
	            break;

	        default:
	            break;
	        }

	        return prec;
	    }

	    // ECMA-262 12.6 Multiplicative Operators
	    // ECMA-262 12.7 Additive Operators
	    // ECMA-262 12.8 Bitwise Shift Operators
	    // ECMA-262 12.9 Relational Operators
	    // ECMA-262 12.10 Equality Operators
	    // ECMA-262 12.11 Binary Bitwise Operators
	    // ECMA-262 12.12 Binary Logical Operators

	    function parseBinaryExpression() {
	        var marker, markers, expr, token, prec, stack, right, operator, left, i;

	        marker = lookahead;
	        left = inheritCoverGrammar(parseUnaryExpression);

	        token = lookahead;
	        prec = binaryPrecedence(token, state.allowIn);
	        if (prec === 0) {
	            return left;
	        }
	        isAssignmentTarget = isBindingElement = false;
	        token.prec = prec;
	        lex();

	        markers = [marker, lookahead];
	        right = isolateCoverGrammar(parseUnaryExpression);

	        stack = [left, token, right];

	        while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {

	            // Reduce: make a binary expression from the three topmost entries.
	            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
	                right = stack.pop();
	                operator = stack.pop().value;
	                left = stack.pop();
	                markers.pop();
	                expr = new WrappingNode(markers[markers.length - 1]).finishBinaryExpression(operator, left, right);
	                stack.push(expr);
	            }

	            // Shift.
	            token = lex();
	            token.prec = prec;
	            stack.push(token);
	            markers.push(lookahead);
	            expr = isolateCoverGrammar(parseUnaryExpression);
	            stack.push(expr);
	        }

	        // Final reduce to clean-up the stack.
	        i = stack.length - 1;
	        expr = stack[i];
	        markers.pop();
	        while (i > 1) {
	            expr = new WrappingNode(markers.pop()).finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
	            i -= 2;
	        }

	        return expr;
	    }


	    // ECMA-262 12.13 Conditional Operator

	    function parseConditionalExpression() {
	        var expr, previousAllowIn, consequent, alternate, startToken;

	        startToken = lookahead;

	        expr = inheritCoverGrammar(parseBinaryExpression);
	        if (match('?')) {
	            lex();
	            previousAllowIn = state.allowIn;
	            state.allowIn = true;
	            consequent = isolateCoverGrammar(parseAssignmentExpression);
	            state.allowIn = previousAllowIn;
	            expect(':');
	            alternate = isolateCoverGrammar(parseAssignmentExpression);

	            expr = new WrappingNode(startToken).finishConditionalExpression(expr, consequent, alternate);
	            isAssignmentTarget = isBindingElement = false;
	        }

	        return expr;
	    }

	    // ECMA-262 14.2 Arrow Function Definitions

	    function parseConciseBody() {
	        if (match('{')) {
	            return parseFunctionSourceElements();
	        }
	        return isolateCoverGrammar(parseAssignmentExpression);
	    }

	    function checkPatternParam(options, param) {
	        var i;
	        switch (param.type) {
	        case Syntax.Identifier:
	            validateParam(options, param, param.name);
	            break;
	        case Syntax.RestElement:
	            checkPatternParam(options, param.argument);
	            break;
	        case Syntax.AssignmentPattern:
	            checkPatternParam(options, param.left);
	            break;
	        case Syntax.ArrayPattern:
	            for (i = 0; i < param.elements.length; i++) {
	                if (param.elements[i] !== null) {
	                    checkPatternParam(options, param.elements[i]);
	                }
	            }
	            break;
	        case Syntax.YieldExpression:
	            break;
	        default:
	            assert(param.type === Syntax.ObjectPattern, 'Invalid type');
	            for (i = 0; i < param.properties.length; i++) {
	                checkPatternParam(options, param.properties[i].value);
	            }
	            break;
	        }
	    }
	    function reinterpretAsCoverFormalsList(expr) {
	        var i, len, param, params, defaults, defaultCount, options, token;

	        defaults = [];
	        defaultCount = 0;
	        params = [expr];

	        switch (expr.type) {
	        case Syntax.Identifier:
	            break;
	        case PlaceHolders.ArrowParameterPlaceHolder:
	            params = expr.params;
	            break;
	        default:
	            return null;
	        }

	        options = {
	            paramSet: {}
	        };

	        for (i = 0, len = params.length; i < len; i += 1) {
	            param = params[i];
	            switch (param.type) {
	            case Syntax.AssignmentPattern:
	                params[i] = param.left;
	                if (param.right.type === Syntax.YieldExpression) {
	                    if (param.right.argument) {
	                        throwUnexpectedToken(lookahead);
	                    }
	                    param.right.type = Syntax.Identifier;
	                    param.right.name = 'yield';
	                    delete param.right.argument;
	                    delete param.right.delegate;
	                }
	                defaults.push(param.right);
	                ++defaultCount;
	                checkPatternParam(options, param.left);
	                break;
	            default:
	                checkPatternParam(options, param);
	                params[i] = param;
	                defaults.push(null);
	                break;
	            }
	        }

	        if (strict || !state.allowYield) {
	            for (i = 0, len = params.length; i < len; i += 1) {
	                param = params[i];
	                if (param.type === Syntax.YieldExpression) {
	                    throwUnexpectedToken(lookahead);
	                }
	            }
	        }

	        if (options.message === Messages.StrictParamDupe) {
	            token = strict ? options.stricted : options.firstRestricted;
	            throwUnexpectedToken(token, options.message);
	        }

	        if (defaultCount === 0) {
	            defaults = [];
	        }

	        return {
	            params: params,
	            defaults: defaults,
	            stricted: options.stricted,
	            firstRestricted: options.firstRestricted,
	            message: options.message
	        };
	    }

	    function parseArrowFunctionExpression(options, node) {
	        var previousStrict, previousAllowYield, body;

	        if (hasLineTerminator) {
	            tolerateUnexpectedToken(lookahead);
	        }
	        expect('=>');

	        previousStrict = strict;
	        previousAllowYield = state.allowYield;
	        state.allowYield = true;

	        body = parseConciseBody();

	        if (strict && options.firstRestricted) {
	            throwUnexpectedToken(options.firstRestricted, options.message);
	        }
	        if (strict && options.stricted) {
	            tolerateUnexpectedToken(options.stricted, options.message);
	        }

	        strict = previousStrict;
	        state.allowYield = previousAllowYield;

	        return node.finishArrowFunctionExpression(options.params, options.defaults, body, body.type !== Syntax.BlockStatement);
	    }

	    // ECMA-262 14.4 Yield expression

	    function parseYieldExpression() {
	        var argument, expr, delegate, previousAllowYield;

	        argument = null;
	        expr = new Node();
	        delegate = false;

	        expectKeyword('yield');

	        if (!hasLineTerminator) {
	            previousAllowYield = state.allowYield;
	            state.allowYield = false;
	            delegate = match('*');
	            if (delegate) {
	                lex();
	                argument = parseAssignmentExpression();
	            } else {
	                if (!match(';') && !match('}') && !match(')') && lookahead.type !== Token.EOF) {
	                    argument = parseAssignmentExpression();
	                }
	            }
	            state.allowYield = previousAllowYield;
	        }

	        return expr.finishYieldExpression(argument, delegate);
	    }

	    // ECMA-262 12.14 Assignment Operators

	    function parseAssignmentExpression() {
	        var token, expr, right, list, startToken;

	        startToken = lookahead;
	        token = lookahead;

	        if (!state.allowYield && matchKeyword('yield')) {
	            return parseYieldExpression();
	        }

	        expr = parseConditionalExpression();

	        if (expr.type === PlaceHolders.ArrowParameterPlaceHolder || match('=>')) {
	            isAssignmentTarget = isBindingElement = false;
	            list = reinterpretAsCoverFormalsList(expr);

	            if (list) {
	                firstCoverInitializedNameError = null;
	                return parseArrowFunctionExpression(list, new WrappingNode(startToken));
	            }

	            return expr;
	        }

	        if (matchAssign()) {
	            if (!isAssignmentTarget) {
	                tolerateError(Messages.InvalidLHSInAssignment);
	            }

	            // ECMA-262 12.1.1
	            if (strict && expr.type === Syntax.Identifier) {
	                if (isRestrictedWord(expr.name)) {
	                    tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
	                }
	                if (isStrictModeReservedWord(expr.name)) {
	                    tolerateUnexpectedToken(token, Messages.StrictReservedWord);
	                }
	            }

	            if (!match('=')) {
	                isAssignmentTarget = isBindingElement = false;
	            } else {
	                reinterpretExpressionAsPattern(expr);
	            }

	            token = lex();
	            right = isolateCoverGrammar(parseAssignmentExpression);
	            expr = new WrappingNode(startToken).finishAssignmentExpression(token.value, expr, right);
	            firstCoverInitializedNameError = null;
	        }

	        return expr;
	    }

	    // ECMA-262 12.15 Comma Operator

	    function parseExpression() {
	        var expr, startToken = lookahead, expressions;

	        expr = isolateCoverGrammar(parseAssignmentExpression);

	        if (match(',')) {
	            expressions = [expr];

	            while (startIndex < length) {
	                if (!match(',')) {
	                    break;
	                }
	                lex();
	                expressions.push(isolateCoverGrammar(parseAssignmentExpression));
	            }

	            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
	        }

	        return expr;
	    }

	    // ECMA-262 13.2 Block

	    function parseStatementListItem() {
	        if (lookahead.type === Token.Keyword) {
	            switch (lookahead.value) {
	            case 'export':
	                if (state.sourceType !== 'module') {
	                    tolerateUnexpectedToken(lookahead, Messages.IllegalExportDeclaration);
	                }
	                return parseExportDeclaration();
	            case 'import':
	                if (state.sourceType !== 'module') {
	                    tolerateUnexpectedToken(lookahead, Messages.IllegalImportDeclaration);
	                }
	                return parseImportDeclaration();
	            case 'const':
	                return parseLexicalDeclaration({inFor: false});
	            case 'function':
	                return parseFunctionDeclaration(new Node());
	            case 'class':
	                return parseClassDeclaration();
	            }
	        }

	        if (matchKeyword('let') && isLexicalDeclaration()) {
	            return parseLexicalDeclaration({inFor: false});
	        }

	        return parseStatement();
	    }

	    function parseStatementList() {
	        var list = [];
	        while (startIndex < length) {
	            if (match('}')) {
	                break;
	            }
	            list.push(parseStatementListItem());
	        }

	        return list;
	    }

	    function parseBlock() {
	        var block, node = new Node();

	        expect('{');

	        block = parseStatementList();

	        expect('}');

	        return node.finishBlockStatement(block);
	    }

	    // ECMA-262 13.3.2 Variable Statement

	    function parseVariableIdentifier(kind) {
	        var token, node = new Node();

	        token = lex();

	        if (token.type === Token.Keyword && token.value === 'yield') {
	            if (strict) {
	                tolerateUnexpectedToken(token, Messages.StrictReservedWord);
	            } if (!state.allowYield) {
	                throwUnexpectedToken(token);
	            }
	        } else if (token.type !== Token.Identifier) {
	            if (strict && token.type === Token.Keyword && isStrictModeReservedWord(token.value)) {
	                tolerateUnexpectedToken(token, Messages.StrictReservedWord);
	            } else {
	                if (strict || token.value !== 'let' || kind !== 'var') {
	                    throwUnexpectedToken(token);
	                }
	            }
	        } else if (state.sourceType === 'module' && token.type === Token.Identifier && token.value === 'await') {
	            tolerateUnexpectedToken(token);
	        }

	        return node.finishIdentifier(token.value);
	    }

	    function parseVariableDeclaration(options) {
	        var init = null, id, node = new Node(), params = [];

	        id = parsePattern(params, 'var');

	        // ECMA-262 12.2.1
	        if (strict && isRestrictedWord(id.name)) {
	            tolerateError(Messages.StrictVarName);
	        }

	        if (match('=')) {
	            lex();
	            init = isolateCoverGrammar(parseAssignmentExpression);
	        } else if (id.type !== Syntax.Identifier && !options.inFor) {
	            expect('=');
	        }

	        return node.finishVariableDeclarator(id, init);
	    }

	    function parseVariableDeclarationList(options) {
	        var opt, list;

	        opt = { inFor: options.inFor };
	        list = [parseVariableDeclaration(opt)];

	        while (match(',')) {
	            lex();
	            list.push(parseVariableDeclaration(opt));
	        }

	        return list;
	    }

	    function parseVariableStatement(node) {
	        var declarations;

	        expectKeyword('var');

	        declarations = parseVariableDeclarationList({ inFor: false });

	        consumeSemicolon();

	        return node.finishVariableDeclaration(declarations);
	    }

	    // ECMA-262 13.3.1 Let and Const Declarations

	    function parseLexicalBinding(kind, options) {
	        var init = null, id, node = new Node(), params = [];

	        id = parsePattern(params, kind);

	        // ECMA-262 12.2.1
	        if (strict && id.type === Syntax.Identifier && isRestrictedWord(id.name)) {
	            tolerateError(Messages.StrictVarName);
	        }

	        if (kind === 'const') {
	            if (!matchKeyword('in') && !matchContextualKeyword('of')) {
	                expect('=');
	                init = isolateCoverGrammar(parseAssignmentExpression);
	            }
	        } else if ((!options.inFor && id.type !== Syntax.Identifier) || match('=')) {
	            expect('=');
	            init = isolateCoverGrammar(parseAssignmentExpression);
	        }

	        return node.finishVariableDeclarator(id, init);
	    }

	    function parseBindingList(kind, options) {
	        var list = [parseLexicalBinding(kind, options)];

	        while (match(',')) {
	            lex();
	            list.push(parseLexicalBinding(kind, options));
	        }

	        return list;
	    }


	    function tokenizerState() {
	        return {
	            index: index,
	            lineNumber: lineNumber,
	            lineStart: lineStart,
	            hasLineTerminator: hasLineTerminator,
	            lastIndex: lastIndex,
	            lastLineNumber: lastLineNumber,
	            lastLineStart: lastLineStart,
	            startIndex: startIndex,
	            startLineNumber: startLineNumber,
	            startLineStart: startLineStart,
	            lookahead: lookahead,
	            tokenCount: extra.tokens ? extra.tokens.length : 0
	        };
	    }

	    function resetTokenizerState(ts) {
	        index = ts.index;
	        lineNumber = ts.lineNumber;
	        lineStart = ts.lineStart;
	        hasLineTerminator = ts.hasLineTerminator;
	        lastIndex = ts.lastIndex;
	        lastLineNumber = ts.lastLineNumber;
	        lastLineStart = ts.lastLineStart;
	        startIndex = ts.startIndex;
	        startLineNumber = ts.startLineNumber;
	        startLineStart = ts.startLineStart;
	        lookahead = ts.lookahead;
	        if (extra.tokens) {
	            extra.tokens.splice(ts.tokenCount, extra.tokens.length);
	        }
	    }

	    function isLexicalDeclaration() {
	        var lexical, ts;

	        ts = tokenizerState();

	        lex();
	        lexical = (lookahead.type === Token.Identifier) || match('[') || match('{') ||
	            matchKeyword('let') || matchKeyword('yield');

	        resetTokenizerState(ts);

	        return lexical;
	    }

	    function parseLexicalDeclaration(options) {
	        var kind, declarations, node = new Node();

	        kind = lex().value;
	        assert(kind === 'let' || kind === 'const', 'Lexical declaration must be either let or const');

	        declarations = parseBindingList(kind, options);

	        consumeSemicolon();

	        return node.finishLexicalDeclaration(declarations, kind);
	    }

	    function parseRestElement(params) {
	        var param, node = new Node();

	        lex();

	        if (match('{')) {
	            throwError(Messages.ObjectPatternAsRestParameter);
	        }

	        params.push(lookahead);

	        param = parseVariableIdentifier();

	        if (match('=')) {
	            throwError(Messages.DefaultRestParameter);
	        }

	        if (!match(')')) {
	            throwError(Messages.ParameterAfterRestParameter);
	        }

	        return node.finishRestElement(param);
	    }

	    // ECMA-262 13.4 Empty Statement

	    function parseEmptyStatement(node) {
	        expect(';');
	        return node.finishEmptyStatement();
	    }

	    // ECMA-262 12.4 Expression Statement

	    function parseExpressionStatement(node) {
	        var expr = parseExpression();
	        consumeSemicolon();
	        return node.finishExpressionStatement(expr);
	    }

	    // ECMA-262 13.6 If statement

	    function parseIfStatement(node) {
	        var test, consequent, alternate;

	        expectKeyword('if');

	        expect('(');

	        test = parseExpression();

	        expect(')');

	        consequent = parseStatement();

	        if (matchKeyword('else')) {
	            lex();
	            alternate = parseStatement();
	        } else {
	            alternate = null;
	        }

	        return node.finishIfStatement(test, consequent, alternate);
	    }

	    // ECMA-262 13.7 Iteration Statements

	    function parseDoWhileStatement(node) {
	        var body, test, oldInIteration;

	        expectKeyword('do');

	        oldInIteration = state.inIteration;
	        state.inIteration = true;

	        body = parseStatement();

	        state.inIteration = oldInIteration;

	        expectKeyword('while');

	        expect('(');

	        test = parseExpression();

	        expect(')');

	        if (match(';')) {
	            lex();
	        }

	        return node.finishDoWhileStatement(body, test);
	    }

	    function parseWhileStatement(node) {
	        var test, body, oldInIteration;

	        expectKeyword('while');

	        expect('(');

	        test = parseExpression();

	        expect(')');

	        oldInIteration = state.inIteration;
	        state.inIteration = true;

	        body = parseStatement();

	        state.inIteration = oldInIteration;

	        return node.finishWhileStatement(test, body);
	    }

	    function parseForStatement(node) {
	        var init, forIn, initSeq, initStartToken, test, update, left, right, kind, declarations,
	            body, oldInIteration, previousAllowIn = state.allowIn;

	        init = test = update = null;
	        forIn = true;

	        expectKeyword('for');

	        expect('(');

	        if (match(';')) {
	            lex();
	        } else {
	            if (matchKeyword('var')) {
	                init = new Node();
	                lex();

	                state.allowIn = false;
	                declarations = parseVariableDeclarationList({ inFor: true });
	                state.allowIn = previousAllowIn;

	                if (declarations.length === 1 && matchKeyword('in')) {
	                    init = init.finishVariableDeclaration(declarations);
	                    lex();
	                    left = init;
	                    right = parseExpression();
	                    init = null;
	                } else if (declarations.length === 1 && declarations[0].init === null && matchContextualKeyword('of')) {
	                    init = init.finishVariableDeclaration(declarations);
	                    lex();
	                    left = init;
	                    right = parseAssignmentExpression();
	                    init = null;
	                    forIn = false;
	                } else {
	                    init = init.finishVariableDeclaration(declarations);
	                    expect(';');
	                }
	            } else if (matchKeyword('const') || matchKeyword('let')) {
	                init = new Node();
	                kind = lex().value;

	                if (!strict && lookahead.value === 'in') {
	                    init = init.finishIdentifier(kind);
	                    lex();
	                    left = init;
	                    right = parseExpression();
	                    init = null;
	                } else {
	                    state.allowIn = false;
	                    declarations = parseBindingList(kind, {inFor: true});
	                    state.allowIn = previousAllowIn;

	                    if (declarations.length === 1 && declarations[0].init === null && matchKeyword('in')) {
	                        init = init.finishLexicalDeclaration(declarations, kind);
	                        lex();
	                        left = init;
	                        right = parseExpression();
	                        init = null;
	                    } else if (declarations.length === 1 && declarations[0].init === null && matchContextualKeyword('of')) {
	                        init = init.finishLexicalDeclaration(declarations, kind);
	                        lex();
	                        left = init;
	                        right = parseAssignmentExpression();
	                        init = null;
	                        forIn = false;
	                    } else {
	                        consumeSemicolon();
	                        init = init.finishLexicalDeclaration(declarations, kind);
	                    }
	                }
	            } else {
	                initStartToken = lookahead;
	                state.allowIn = false;
	                init = inheritCoverGrammar(parseAssignmentExpression);
	                state.allowIn = previousAllowIn;

	                if (matchKeyword('in')) {
	                    if (!isAssignmentTarget) {
	                        tolerateError(Messages.InvalidLHSInForIn);
	                    }

	                    lex();
	                    reinterpretExpressionAsPattern(init);
	                    left = init;
	                    right = parseExpression();
	                    init = null;
	                } else if (matchContextualKeyword('of')) {
	                    if (!isAssignmentTarget) {
	                        tolerateError(Messages.InvalidLHSInForLoop);
	                    }

	                    lex();
	                    reinterpretExpressionAsPattern(init);
	                    left = init;
	                    right = parseAssignmentExpression();
	                    init = null;
	                    forIn = false;
	                } else {
	                    if (match(',')) {
	                        initSeq = [init];
	                        while (match(',')) {
	                            lex();
	                            initSeq.push(isolateCoverGrammar(parseAssignmentExpression));
	                        }
	                        init = new WrappingNode(initStartToken).finishSequenceExpression(initSeq);
	                    }
	                    expect(';');
	                }
	            }
	        }

	        if (typeof left === 'undefined') {

	            if (!match(';')) {
	                test = parseExpression();
	            }
	            expect(';');

	            if (!match(')')) {
	                update = parseExpression();
	            }
	        }

	        expect(')');

	        oldInIteration = state.inIteration;
	        state.inIteration = true;

	        body = isolateCoverGrammar(parseStatement);

	        state.inIteration = oldInIteration;

	        return (typeof left === 'undefined') ?
	                node.finishForStatement(init, test, update, body) :
	                forIn ? node.finishForInStatement(left, right, body) :
	                    node.finishForOfStatement(left, right, body);
	    }

	    // ECMA-262 13.8 The continue statement

	    function parseContinueStatement(node) {
	        var label = null, key;

	        expectKeyword('continue');

	        // Optimize the most common form: 'continue;'.
	        if (source.charCodeAt(startIndex) === 0x3B) {
	            lex();

	            if (!state.inIteration) {
	                throwError(Messages.IllegalContinue);
	            }

	            return node.finishContinueStatement(null);
	        }

	        if (hasLineTerminator) {
	            if (!state.inIteration) {
	                throwError(Messages.IllegalContinue);
	            }

	            return node.finishContinueStatement(null);
	        }

	        if (lookahead.type === Token.Identifier) {
	            label = parseVariableIdentifier();

	            key = '$' + label.name;
	            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
	                throwError(Messages.UnknownLabel, label.name);
	            }
	        }

	        consumeSemicolon();

	        if (label === null && !state.inIteration) {
	            throwError(Messages.IllegalContinue);
	        }

	        return node.finishContinueStatement(label);
	    }

	    // ECMA-262 13.9 The break statement

	    function parseBreakStatement(node) {
	        var label = null, key;

	        expectKeyword('break');

	        // Catch the very common case first: immediately a semicolon (U+003B).
	        if (source.charCodeAt(lastIndex) === 0x3B) {
	            lex();

	            if (!(state.inIteration || state.inSwitch)) {
	                throwError(Messages.IllegalBreak);
	            }

	            return node.finishBreakStatement(null);
	        }

	        if (hasLineTerminator) {
	            if (!(state.inIteration || state.inSwitch)) {
	                throwError(Messages.IllegalBreak);
	            }
	        } else if (lookahead.type === Token.Identifier) {
	            label = parseVariableIdentifier();

	            key = '$' + label.name;
	            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
	                throwError(Messages.UnknownLabel, label.name);
	            }
	        }

	        consumeSemicolon();

	        if (label === null && !(state.inIteration || state.inSwitch)) {
	            throwError(Messages.IllegalBreak);
	        }

	        return node.finishBreakStatement(label);
	    }

	    // ECMA-262 13.10 The return statement

	    function parseReturnStatement(node) {
	        var argument = null;

	        expectKeyword('return');

	        if (!state.inFunctionBody) {
	            tolerateError(Messages.IllegalReturn);
	        }

	        // 'return' followed by a space and an identifier is very common.
	        if (source.charCodeAt(lastIndex) === 0x20) {
	            if (isIdentifierStart(source.charCodeAt(lastIndex + 1))) {
	                argument = parseExpression();
	                consumeSemicolon();
	                return node.finishReturnStatement(argument);
	            }
	        }

	        if (hasLineTerminator) {
	            // HACK
	            return node.finishReturnStatement(null);
	        }

	        if (!match(';')) {
	            if (!match('}') && lookahead.type !== Token.EOF) {
	                argument = parseExpression();
	            }
	        }

	        consumeSemicolon();

	        return node.finishReturnStatement(argument);
	    }

	    // ECMA-262 13.11 The with statement

	    function parseWithStatement(node) {
	        var object, body;

	        if (strict) {
	            tolerateError(Messages.StrictModeWith);
	        }

	        expectKeyword('with');

	        expect('(');

	        object = parseExpression();

	        expect(')');

	        body = parseStatement();

	        return node.finishWithStatement(object, body);
	    }

	    // ECMA-262 13.12 The switch statement

	    function parseSwitchCase() {
	        var test, consequent = [], statement, node = new Node();

	        if (matchKeyword('default')) {
	            lex();
	            test = null;
	        } else {
	            expectKeyword('case');
	            test = parseExpression();
	        }
	        expect(':');

	        while (startIndex < length) {
	            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
	                break;
	            }
	            statement = parseStatementListItem();
	            consequent.push(statement);
	        }

	        return node.finishSwitchCase(test, consequent);
	    }

	    function parseSwitchStatement(node) {
	        var discriminant, cases, clause, oldInSwitch, defaultFound;

	        expectKeyword('switch');

	        expect('(');

	        discriminant = parseExpression();

	        expect(')');

	        expect('{');

	        cases = [];

	        if (match('}')) {
	            lex();
	            return node.finishSwitchStatement(discriminant, cases);
	        }

	        oldInSwitch = state.inSwitch;
	        state.inSwitch = true;
	        defaultFound = false;

	        while (startIndex < length) {
	            if (match('}')) {
	                break;
	            }
	            clause = parseSwitchCase();
	            if (clause.test === null) {
	                if (defaultFound) {
	                    throwError(Messages.MultipleDefaultsInSwitch);
	                }
	                defaultFound = true;
	            }
	            cases.push(clause);
	        }

	        state.inSwitch = oldInSwitch;

	        expect('}');

	        return node.finishSwitchStatement(discriminant, cases);
	    }

	    // ECMA-262 13.14 The throw statement

	    function parseThrowStatement(node) {
	        var argument;

	        expectKeyword('throw');

	        if (hasLineTerminator) {
	            throwError(Messages.NewlineAfterThrow);
	        }

	        argument = parseExpression();

	        consumeSemicolon();

	        return node.finishThrowStatement(argument);
	    }

	    // ECMA-262 13.15 The try statement

	    function parseCatchClause() {
	        var param, params = [], paramMap = {}, key, i, body, node = new Node();

	        expectKeyword('catch');

	        expect('(');
	        if (match(')')) {
	            throwUnexpectedToken(lookahead);
	        }

	        param = parsePattern(params);
	        for (i = 0; i < params.length; i++) {
	            key = '$' + params[i].value;
	            if (Object.prototype.hasOwnProperty.call(paramMap, key)) {
	                tolerateError(Messages.DuplicateBinding, params[i].value);
	            }
	            paramMap[key] = true;
	        }

	        // ECMA-262 12.14.1
	        if (strict && isRestrictedWord(param.name)) {
	            tolerateError(Messages.StrictCatchVariable);
	        }

	        expect(')');
	        body = parseBlock();
	        return node.finishCatchClause(param, body);
	    }

	    function parseTryStatement(node) {
	        var block, handler = null, finalizer = null;

	        expectKeyword('try');

	        block = parseBlock();

	        if (matchKeyword('catch')) {
	            handler = parseCatchClause();
	        }

	        if (matchKeyword('finally')) {
	            lex();
	            finalizer = parseBlock();
	        }

	        if (!handler && !finalizer) {
	            throwError(Messages.NoCatchOrFinally);
	        }

	        return node.finishTryStatement(block, handler, finalizer);
	    }

	    // ECMA-262 13.16 The debugger statement

	    function parseDebuggerStatement(node) {
	        expectKeyword('debugger');

	        consumeSemicolon();

	        return node.finishDebuggerStatement();
	    }

	    // 13 Statements

	    function parseStatement() {
	        var type = lookahead.type,
	            expr,
	            labeledBody,
	            key,
	            node;

	        if (type === Token.EOF) {
	            throwUnexpectedToken(lookahead);
	        }

	        if (type === Token.Punctuator && lookahead.value === '{') {
	            return parseBlock();
	        }
	        isAssignmentTarget = isBindingElement = true;
	        node = new Node();

	        if (type === Token.Punctuator) {
	            switch (lookahead.value) {
	            case ';':
	                return parseEmptyStatement(node);
	            case '(':
	                return parseExpressionStatement(node);
	            default:
	                break;
	            }
	        } else if (type === Token.Keyword) {
	            switch (lookahead.value) {
	            case 'break':
	                return parseBreakStatement(node);
	            case 'continue':
	                return parseContinueStatement(node);
	            case 'debugger':
	                return parseDebuggerStatement(node);
	            case 'do':
	                return parseDoWhileStatement(node);
	            case 'for':
	                return parseForStatement(node);
	            case 'function':
	                return parseFunctionDeclaration(node);
	            case 'if':
	                return parseIfStatement(node);
	            case 'return':
	                return parseReturnStatement(node);
	            case 'switch':
	                return parseSwitchStatement(node);
	            case 'throw':
	                return parseThrowStatement(node);
	            case 'try':
	                return parseTryStatement(node);
	            case 'var':
	                return parseVariableStatement(node);
	            case 'while':
	                return parseWhileStatement(node);
	            case 'with':
	                return parseWithStatement(node);
	            default:
	                break;
	            }
	        }

	        expr = parseExpression();

	        // ECMA-262 12.12 Labelled Statements
	        if ((expr.type === Syntax.Identifier) && match(':')) {
	            lex();

	            key = '$' + expr.name;
	            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
	                throwError(Messages.Redeclaration, 'Label', expr.name);
	            }

	            state.labelSet[key] = true;
	            labeledBody = parseStatement();
	            delete state.labelSet[key];
	            return node.finishLabeledStatement(expr, labeledBody);
	        }

	        consumeSemicolon();

	        return node.finishExpressionStatement(expr);
	    }

	    // ECMA-262 14.1 Function Definition

	    function parseFunctionSourceElements() {
	        var statement, body = [], token, directive, firstRestricted,
	            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody,
	            node = new Node();

	        expect('{');

	        while (startIndex < length) {
	            if (lookahead.type !== Token.StringLiteral) {
	                break;
	            }
	            token = lookahead;

	            statement = parseStatementListItem();
	            body.push(statement);
	            if (statement.expression.type !== Syntax.Literal) {
	                // this is not directive
	                break;
	            }
	            directive = source.slice(token.start + 1, token.end - 1);
	            if (directive === 'use strict') {
	                strict = true;
	                if (firstRestricted) {
	                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
	                }
	            } else {
	                if (!firstRestricted && token.octal) {
	                    firstRestricted = token;
	                }
	            }
	        }

	        oldLabelSet = state.labelSet;
	        oldInIteration = state.inIteration;
	        oldInSwitch = state.inSwitch;
	        oldInFunctionBody = state.inFunctionBody;

	        state.labelSet = {};
	        state.inIteration = false;
	        state.inSwitch = false;
	        state.inFunctionBody = true;

	        while (startIndex < length) {
	            if (match('}')) {
	                break;
	            }
	            body.push(parseStatementListItem());
	        }

	        expect('}');

	        state.labelSet = oldLabelSet;
	        state.inIteration = oldInIteration;
	        state.inSwitch = oldInSwitch;
	        state.inFunctionBody = oldInFunctionBody;

	        return node.finishBlockStatement(body);
	    }

	    function validateParam(options, param, name) {
	        var key = '$' + name;
	        if (strict) {
	            if (isRestrictedWord(name)) {
	                options.stricted = param;
	                options.message = Messages.StrictParamName;
	            }
	            if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
	                options.stricted = param;
	                options.message = Messages.StrictParamDupe;
	            }
	        } else if (!options.firstRestricted) {
	            if (isRestrictedWord(name)) {
	                options.firstRestricted = param;
	                options.message = Messages.StrictParamName;
	            } else if (isStrictModeReservedWord(name)) {
	                options.firstRestricted = param;
	                options.message = Messages.StrictReservedWord;
	            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
	                options.stricted = param;
	                options.message = Messages.StrictParamDupe;
	            }
	        }
	        options.paramSet[key] = true;
	    }

	    function parseParam(options) {
	        var token, param, params = [], i, def;

	        token = lookahead;
	        if (token.value === '...') {
	            param = parseRestElement(params);
	            validateParam(options, param.argument, param.argument.name);
	            options.params.push(param);
	            options.defaults.push(null);
	            return false;
	        }

	        param = parsePatternWithDefault(params);
	        for (i = 0; i < params.length; i++) {
	            validateParam(options, params[i], params[i].value);
	        }

	        if (param.type === Syntax.AssignmentPattern) {
	            def = param.right;
	            param = param.left;
	            ++options.defaultCount;
	        }

	        options.params.push(param);
	        options.defaults.push(def);

	        return !match(')');
	    }

	    function parseParams(firstRestricted) {
	        var options;

	        options = {
	            params: [],
	            defaultCount: 0,
	            defaults: [],
	            firstRestricted: firstRestricted
	        };

	        expect('(');

	        if (!match(')')) {
	            options.paramSet = {};
	            while (startIndex < length) {
	                if (!parseParam(options)) {
	                    break;
	                }
	                expect(',');
	            }
	        }

	        expect(')');

	        if (options.defaultCount === 0) {
	            options.defaults = [];
	        }

	        return {
	            params: options.params,
	            defaults: options.defaults,
	            stricted: options.stricted,
	            firstRestricted: options.firstRestricted,
	            message: options.message
	        };
	    }

	    function parseFunctionDeclaration(node, identifierIsOptional) {
	        var id = null, params = [], defaults = [], body, token, stricted, tmp, firstRestricted, message, previousStrict,
	            isGenerator, previousAllowYield;

	        previousAllowYield = state.allowYield;

	        expectKeyword('function');

	        isGenerator = match('*');
	        if (isGenerator) {
	            lex();
	        }

	        if (!identifierIsOptional || !match('(')) {
	            token = lookahead;
	            id = parseVariableIdentifier();
	            if (strict) {
	                if (isRestrictedWord(token.value)) {
	                    tolerateUnexpectedToken(token, Messages.StrictFunctionName);
	                }
	            } else {
	                if (isRestrictedWord(token.value)) {
	                    firstRestricted = token;
	                    message = Messages.StrictFunctionName;
	                } else if (isStrictModeReservedWord(token.value)) {
	                    firstRestricted = token;
	                    message = Messages.StrictReservedWord;
	                }
	            }
	        }

	        state.allowYield = !isGenerator;
	        tmp = parseParams(firstRestricted);
	        params = tmp.params;
	        defaults = tmp.defaults;
	        stricted = tmp.stricted;
	        firstRestricted = tmp.firstRestricted;
	        if (tmp.message) {
	            message = tmp.message;
	        }


	        previousStrict = strict;
	        body = parseFunctionSourceElements();
	        if (strict && firstRestricted) {
	            throwUnexpectedToken(firstRestricted, message);
	        }
	        if (strict && stricted) {
	            tolerateUnexpectedToken(stricted, message);
	        }

	        strict = previousStrict;
	        state.allowYield = previousAllowYield;

	        return node.finishFunctionDeclaration(id, params, defaults, body, isGenerator);
	    }

	    function parseFunctionExpression() {
	        var token, id = null, stricted, firstRestricted, message, tmp,
	            params = [], defaults = [], body, previousStrict, node = new Node(),
	            isGenerator, previousAllowYield;

	        previousAllowYield = state.allowYield;

	        expectKeyword('function');

	        isGenerator = match('*');
	        if (isGenerator) {
	            lex();
	        }

	        state.allowYield = !isGenerator;
	        if (!match('(')) {
	            token = lookahead;
	            id = (!strict && !isGenerator && matchKeyword('yield')) ? parseNonComputedProperty() : parseVariableIdentifier();
	            if (strict) {
	                if (isRestrictedWord(token.value)) {
	                    tolerateUnexpectedToken(token, Messages.StrictFunctionName);
	                }
	            } else {
	                if (isRestrictedWord(token.value)) {
	                    firstRestricted = token;
	                    message = Messages.StrictFunctionName;
	                } else if (isStrictModeReservedWord(token.value)) {
	                    firstRestricted = token;
	                    message = Messages.StrictReservedWord;
	                }
	            }
	        }

	        tmp = parseParams(firstRestricted);
	        params = tmp.params;
	        defaults = tmp.defaults;
	        stricted = tmp.stricted;
	        firstRestricted = tmp.firstRestricted;
	        if (tmp.message) {
	            message = tmp.message;
	        }

	        previousStrict = strict;
	        body = parseFunctionSourceElements();
	        if (strict && firstRestricted) {
	            throwUnexpectedToken(firstRestricted, message);
	        }
	        if (strict && stricted) {
	            tolerateUnexpectedToken(stricted, message);
	        }
	        strict = previousStrict;
	        state.allowYield = previousAllowYield;

	        return node.finishFunctionExpression(id, params, defaults, body, isGenerator);
	    }

	    // ECMA-262 14.5 Class Definitions

	    function parseClassBody() {
	        var classBody, token, isStatic, hasConstructor = false, body, method, computed, key;

	        classBody = new Node();

	        expect('{');
	        body = [];
	        while (!match('}')) {
	            if (match(';')) {
	                lex();
	            } else {
	                method = new Node();
	                token = lookahead;
	                isStatic = false;
	                computed = match('[');
	                if (match('*')) {
	                    lex();
	                } else {
	                    key = parseObjectPropertyKey();
	                    if (key.name === 'static' && (lookaheadPropertyName() || match('*'))) {
	                        token = lookahead;
	                        isStatic = true;
	                        computed = match('[');
	                        if (match('*')) {
	                            lex();
	                        } else {
	                            key = parseObjectPropertyKey();
	                        }
	                    }
	                }
	                method = tryParseMethodDefinition(token, key, computed, method);
	                if (method) {
	                    method['static'] = isStatic; // jscs:ignore requireDotNotation
	                    if (method.kind === 'init') {
	                        method.kind = 'method';
	                    }
	                    if (!isStatic) {
	                        if (!method.computed && (method.key.name || method.key.value.toString()) === 'constructor') {
	                            if (method.kind !== 'method' || !method.method || method.value.generator) {
	                                throwUnexpectedToken(token, Messages.ConstructorSpecialMethod);
	                            }
	                            if (hasConstructor) {
	                                throwUnexpectedToken(token, Messages.DuplicateConstructor);
	                            } else {
	                                hasConstructor = true;
	                            }
	                            method.kind = 'constructor';
	                        }
	                    } else {
	                        if (!method.computed && (method.key.name || method.key.value.toString()) === 'prototype') {
	                            throwUnexpectedToken(token, Messages.StaticPrototype);
	                        }
	                    }
	                    method.type = Syntax.MethodDefinition;
	                    delete method.method;
	                    delete method.shorthand;
	                    body.push(method);
	                } else {
	                    throwUnexpectedToken(lookahead);
	                }
	            }
	        }
	        lex();
	        return classBody.finishClassBody(body);
	    }

	    function parseClassDeclaration(identifierIsOptional) {
	        var id = null, superClass = null, classNode = new Node(), classBody, previousStrict = strict;
	        strict = true;

	        expectKeyword('class');

	        if (!identifierIsOptional || lookahead.type === Token.Identifier) {
	            id = parseVariableIdentifier();
	        }

	        if (matchKeyword('extends')) {
	            lex();
	            superClass = isolateCoverGrammar(parseLeftHandSideExpressionAllowCall);
	        }
	        classBody = parseClassBody();
	        strict = previousStrict;

	        return classNode.finishClassDeclaration(id, superClass, classBody);
	    }

	    function parseClassExpression() {
	        var id = null, superClass = null, classNode = new Node(), classBody, previousStrict = strict;
	        strict = true;

	        expectKeyword('class');

	        if (lookahead.type === Token.Identifier) {
	            id = parseVariableIdentifier();
	        }

	        if (matchKeyword('extends')) {
	            lex();
	            superClass = isolateCoverGrammar(parseLeftHandSideExpressionAllowCall);
	        }
	        classBody = parseClassBody();
	        strict = previousStrict;

	        return classNode.finishClassExpression(id, superClass, classBody);
	    }

	    // ECMA-262 15.2 Modules

	    function parseModuleSpecifier() {
	        var node = new Node();

	        if (lookahead.type !== Token.StringLiteral) {
	            throwError(Messages.InvalidModuleSpecifier);
	        }
	        return node.finishLiteral(lex());
	    }

	    // ECMA-262 15.2.3 Exports

	    function parseExportSpecifier() {
	        var exported, local, node = new Node(), def;
	        if (matchKeyword('default')) {
	            // export {default} from 'something';
	            def = new Node();
	            lex();
	            local = def.finishIdentifier('default');
	        } else {
	            local = parseVariableIdentifier();
	        }
	        if (matchContextualKeyword('as')) {
	            lex();
	            exported = parseNonComputedProperty();
	        }
	        return node.finishExportSpecifier(local, exported);
	    }

	    function parseExportNamedDeclaration(node) {
	        var declaration = null,
	            isExportFromIdentifier,
	            src = null, specifiers = [];

	        // non-default export
	        if (lookahead.type === Token.Keyword) {
	            // covers:
	            // export var f = 1;
	            switch (lookahead.value) {
	                case 'let':
	                case 'const':
	                    declaration = parseLexicalDeclaration({inFor: false});
	                    return node.finishExportNamedDeclaration(declaration, specifiers, null);
	                case 'var':
	                case 'class':
	                case 'function':
	                    declaration = parseStatementListItem();
	                    return node.finishExportNamedDeclaration(declaration, specifiers, null);
	            }
	        }

	        expect('{');
	        while (!match('}')) {
	            isExportFromIdentifier = isExportFromIdentifier || matchKeyword('default');
	            specifiers.push(parseExportSpecifier());
	            if (!match('}')) {
	                expect(',');
	                if (match('}')) {
	                    break;
	                }
	            }
	        }
	        expect('}');

	        if (matchContextualKeyword('from')) {
	            // covering:
	            // export {default} from 'foo';
	            // export {foo} from 'foo';
	            lex();
	            src = parseModuleSpecifier();
	            consumeSemicolon();
	        } else if (isExportFromIdentifier) {
	            // covering:
	            // export {default}; // missing fromClause
	            throwError(lookahead.value ?
	                    Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
	        } else {
	            // cover
	            // export {foo};
	            consumeSemicolon();
	        }
	        return node.finishExportNamedDeclaration(declaration, specifiers, src);
	    }

	    function parseExportDefaultDeclaration(node) {
	        var declaration = null,
	            expression = null;

	        // covers:
	        // export default ...
	        expectKeyword('default');

	        if (matchKeyword('function')) {
	            // covers:
	            // export default function foo () {}
	            // export default function () {}
	            declaration = parseFunctionDeclaration(new Node(), true);
	            return node.finishExportDefaultDeclaration(declaration);
	        }
	        if (matchKeyword('class')) {
	            declaration = parseClassDeclaration(true);
	            return node.finishExportDefaultDeclaration(declaration);
	        }

	        if (matchContextualKeyword('from')) {
	            throwError(Messages.UnexpectedToken, lookahead.value);
	        }

	        // covers:
	        // export default {};
	        // export default [];
	        // export default (1 + 2);
	        if (match('{')) {
	            expression = parseObjectInitializer();
	        } else if (match('[')) {
	            expression = parseArrayInitializer();
	        } else {
	            expression = parseAssignmentExpression();
	        }
	        consumeSemicolon();
	        return node.finishExportDefaultDeclaration(expression);
	    }

	    function parseExportAllDeclaration(node) {
	        var src;

	        // covers:
	        // export * from 'foo';
	        expect('*');
	        if (!matchContextualKeyword('from')) {
	            throwError(lookahead.value ?
	                    Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
	        }
	        lex();
	        src = parseModuleSpecifier();
	        consumeSemicolon();

	        return node.finishExportAllDeclaration(src);
	    }

	    function parseExportDeclaration() {
	        var node = new Node();
	        if (state.inFunctionBody) {
	            throwError(Messages.IllegalExportDeclaration);
	        }

	        expectKeyword('export');

	        if (matchKeyword('default')) {
	            return parseExportDefaultDeclaration(node);
	        }
	        if (match('*')) {
	            return parseExportAllDeclaration(node);
	        }
	        return parseExportNamedDeclaration(node);
	    }

	    // ECMA-262 15.2.2 Imports

	    function parseImportSpecifier() {
	        // import {<foo as bar>} ...;
	        var local, imported, node = new Node();

	        imported = parseNonComputedProperty();
	        if (matchContextualKeyword('as')) {
	            lex();
	            local = parseVariableIdentifier();
	        }

	        return node.finishImportSpecifier(local, imported);
	    }

	    function parseNamedImports() {
	        var specifiers = [];
	        // {foo, bar as bas}
	        expect('{');
	        while (!match('}')) {
	            specifiers.push(parseImportSpecifier());
	            if (!match('}')) {
	                expect(',');
	                if (match('}')) {
	                    break;
	                }
	            }
	        }
	        expect('}');
	        return specifiers;
	    }

	    function parseImportDefaultSpecifier() {
	        // import <foo> ...;
	        var local, node = new Node();

	        local = parseNonComputedProperty();

	        return node.finishImportDefaultSpecifier(local);
	    }

	    function parseImportNamespaceSpecifier() {
	        // import <* as foo> ...;
	        var local, node = new Node();

	        expect('*');
	        if (!matchContextualKeyword('as')) {
	            throwError(Messages.NoAsAfterImportNamespace);
	        }
	        lex();
	        local = parseNonComputedProperty();

	        return node.finishImportNamespaceSpecifier(local);
	    }

	    function parseImportDeclaration() {
	        var specifiers = [], src, node = new Node();

	        if (state.inFunctionBody) {
	            throwError(Messages.IllegalImportDeclaration);
	        }

	        expectKeyword('import');

	        if (lookahead.type === Token.StringLiteral) {
	            // import 'foo';
	            src = parseModuleSpecifier();
	        } else {

	            if (match('{')) {
	                // import {bar}
	                specifiers = specifiers.concat(parseNamedImports());
	            } else if (match('*')) {
	                // import * as foo
	                specifiers.push(parseImportNamespaceSpecifier());
	            } else if (isIdentifierName(lookahead) && !matchKeyword('default')) {
	                // import foo
	                specifiers.push(parseImportDefaultSpecifier());
	                if (match(',')) {
	                    lex();
	                    if (match('*')) {
	                        // import foo, * as foo
	                        specifiers.push(parseImportNamespaceSpecifier());
	                    } else if (match('{')) {
	                        // import foo, {bar}
	                        specifiers = specifiers.concat(parseNamedImports());
	                    } else {
	                        throwUnexpectedToken(lookahead);
	                    }
	                }
	            } else {
	                throwUnexpectedToken(lex());
	            }

	            if (!matchContextualKeyword('from')) {
	                throwError(lookahead.value ?
	                        Messages.UnexpectedToken : Messages.MissingFromClause, lookahead.value);
	            }
	            lex();
	            src = parseModuleSpecifier();
	        }

	        consumeSemicolon();
	        return node.finishImportDeclaration(specifiers, src);
	    }

	    // ECMA-262 15.1 Scripts

	    function parseScriptBody() {
	        var statement, body = [], token, directive, firstRestricted;

	        while (startIndex < length) {
	            token = lookahead;
	            if (token.type !== Token.StringLiteral) {
	                break;
	            }

	            statement = parseStatementListItem();
	            body.push(statement);
	            if (statement.expression.type !== Syntax.Literal) {
	                // this is not directive
	                break;
	            }
	            directive = source.slice(token.start + 1, token.end - 1);
	            if (directive === 'use strict') {
	                strict = true;
	                if (firstRestricted) {
	                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
	                }
	            } else {
	                if (!firstRestricted && token.octal) {
	                    firstRestricted = token;
	                }
	            }
	        }

	        while (startIndex < length) {
	            statement = parseStatementListItem();
	            /* istanbul ignore if */
	            if (typeof statement === 'undefined') {
	                break;
	            }
	            body.push(statement);
	        }
	        return body;
	    }

	    function parseProgram() {
	        var body, node;

	        peek();
	        node = new Node();

	        body = parseScriptBody();
	        return node.finishProgram(body, state.sourceType);
	    }

	    function filterTokenLocation() {
	        var i, entry, token, tokens = [];

	        for (i = 0; i < extra.tokens.length; ++i) {
	            entry = extra.tokens[i];
	            token = {
	                type: entry.type,
	                value: entry.value
	            };
	            if (entry.regex) {
	                token.regex = {
	                    pattern: entry.regex.pattern,
	                    flags: entry.regex.flags
	                };
	            }
	            if (extra.range) {
	                token.range = entry.range;
	            }
	            if (extra.loc) {
	                token.loc = entry.loc;
	            }
	            tokens.push(token);
	        }

	        extra.tokens = tokens;
	    }

	    function tokenize(code, options, delegate) {
	        var toString,
	            tokens;

	        toString = String;
	        if (typeof code !== 'string' && !(code instanceof String)) {
	            code = toString(code);
	        }

	        source = code;
	        index = 0;
	        lineNumber = (source.length > 0) ? 1 : 0;
	        lineStart = 0;
	        startIndex = index;
	        startLineNumber = lineNumber;
	        startLineStart = lineStart;
	        length = source.length;
	        lookahead = null;
	        state = {
	            allowIn: true,
	            allowYield: true,
	            labelSet: {},
	            inFunctionBody: false,
	            inIteration: false,
	            inSwitch: false,
	            lastCommentStart: -1,
	            curlyStack: []
	        };

	        extra = {};

	        // Options matching.
	        options = options || {};

	        // Of course we collect tokens here.
	        options.tokens = true;
	        extra.tokens = [];
	        extra.tokenValues = [];
	        extra.tokenize = true;
	        extra.delegate = delegate;

	        // The following two fields are necessary to compute the Regex tokens.
	        extra.openParenToken = -1;
	        extra.openCurlyToken = -1;

	        extra.range = (typeof options.range === 'boolean') && options.range;
	        extra.loc = (typeof options.loc === 'boolean') && options.loc;

	        if (typeof options.comment === 'boolean' && options.comment) {
	            extra.comments = [];
	        }
	        if (typeof options.tolerant === 'boolean' && options.tolerant) {
	            extra.errors = [];
	        }

	        try {
	            peek();
	            if (lookahead.type === Token.EOF) {
	                return extra.tokens;
	            }

	            lex();
	            while (lookahead.type !== Token.EOF) {
	                try {
	                    lex();
	                } catch (lexError) {
	                    if (extra.errors) {
	                        recordError(lexError);
	                        // We have to break on the first error
	                        // to avoid infinite loops.
	                        break;
	                    } else {
	                        throw lexError;
	                    }
	                }
	            }

	            tokens = extra.tokens;
	            if (typeof extra.errors !== 'undefined') {
	                tokens.errors = extra.errors;
	            }
	        } catch (e) {
	            throw e;
	        } finally {
	            extra = {};
	        }
	        return tokens;
	    }

	    function parse(code, options) {
	        var program, toString;

	        toString = String;
	        if (typeof code !== 'string' && !(code instanceof String)) {
	            code = toString(code);
	        }

	        source = code;
	        index = 0;
	        lineNumber = (source.length > 0) ? 1 : 0;
	        lineStart = 0;
	        startIndex = index;
	        startLineNumber = lineNumber;
	        startLineStart = lineStart;
	        length = source.length;
	        lookahead = null;
	        state = {
	            allowIn: true,
	            allowYield: true,
	            labelSet: {},
	            inFunctionBody: false,
	            inIteration: false,
	            inSwitch: false,
	            lastCommentStart: -1,
	            curlyStack: [],
	            sourceType: 'script'
	        };
	        strict = false;

	        extra = {};
	        if (typeof options !== 'undefined') {
	            extra.range = (typeof options.range === 'boolean') && options.range;
	            extra.loc = (typeof options.loc === 'boolean') && options.loc;
	            extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;

	            if (extra.loc && options.source !== null && options.source !== undefined) {
	                extra.source = toString(options.source);
	            }

	            if (typeof options.tokens === 'boolean' && options.tokens) {
	                extra.tokens = [];
	            }
	            if (typeof options.comment === 'boolean' && options.comment) {
	                extra.comments = [];
	            }
	            if (typeof options.tolerant === 'boolean' && options.tolerant) {
	                extra.errors = [];
	            }
	            if (extra.attachComment) {
	                extra.range = true;
	                extra.comments = [];
	                extra.bottomRightStack = [];
	                extra.trailingComments = [];
	                extra.leadingComments = [];
	            }
	            if (options.sourceType === 'module') {
	                // very restrictive condition for now
	                state.sourceType = options.sourceType;
	                strict = true;
	            }
	        }

	        try {
	            program = parseProgram();
	            if (typeof extra.comments !== 'undefined') {
	                program.comments = extra.comments;
	            }
	            if (typeof extra.tokens !== 'undefined') {
	                filterTokenLocation();
	                program.tokens = extra.tokens;
	            }
	            if (typeof extra.errors !== 'undefined') {
	                program.errors = extra.errors;
	            }
	        } catch (e) {
	            throw e;
	        } finally {
	            extra = {};
	        }

	        return program;
	    }

	    // Sync with *.json manifests.
	    exports.version = '2.7.2';

	    exports.tokenize = tokenize;

	    exports.parse = parse;

	    // Deep copy.
	    /* istanbul ignore next */
	    exports.Syntax = (function () {
	        var name, types = {};

	        if (typeof Object.create === 'function') {
	            types = Object.create(null);
	        }

	        for (name in Syntax) {
	            if (Syntax.hasOwnProperty(name)) {
	                types[name] = Syntax[name];
	            }
	        }

	        if (typeof Object.freeze === 'function') {
	            Object.freeze(types);
	        }

	        return types;
	    }());

	}));
	/* vim: set sw=4 ts=4 et tw=80 : */


/***/ }
/******/ ]);