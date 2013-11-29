;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray ) {

    var SomePromiseArray = require( "./some_promise_array.js" )(PromiseArray);

    function Promise$_Any( promises, useBound, caller ) {
        var ret = Promise$_All(
            promises,
            SomePromiseArray,
            caller,
            useBound === true ? promises._boundTo : void 0
        );
        ret.setHowMany( 1 );
        ret.setUnwrap();
        return ret.promise();
    }

    Promise.any = function Promise$Any( promises ) {
        return Promise$_Any( promises, false, Promise.any );
    };

    Promise.prototype.any = function Promise$any() {
        return Promise$_Any( this, true, this.any );
    };

};

},{"./some_promise_array.js":36}],2:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = (function(){
    var AssertionError = (function() {
        function AssertionError( a ) {
            this.constructor$( a );
            this.message = a;
            this.name = "AssertionError";
        }
        AssertionError.prototype = new Error();
        AssertionError.prototype.constructor = AssertionError;
        AssertionError.prototype.constructor$ = Error;
        return AssertionError;
    })();

    return function assert( boolExpr, message ) {
        if( boolExpr === true ) return;

        var ret = new AssertionError( message );
        if( Error.captureStackTrace ) {
            Error.captureStackTrace( ret, assert );
        }
        if( console && console.error ) {
            console.error( ret.stack + "" );
        }
        throw ret;

    };
})();

},{}],3:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var ASSERT = require("./assert.js");
var schedule = require( "./schedule.js" );
var Queue = require( "./queue.js" );
var errorObj = require( "./util.js").errorObj;
var tryCatch1 = require( "./util.js").tryCatch1;

function Async() {
    this._isTickUsed = false;
    this._length = 0;
    this._lateBuffer = new Queue();
    this._functionBuffer = new Queue( 25000 * 3 );
    var self = this;
    this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
        self._consumeFunctionBuffer();
    };
}

Async.prototype.haveItemsQueued = function Async$haveItemsQueued() {
    return this._length > 0;
};

Async.prototype.invokeLater = function Async$invokeLater( fn, receiver, arg ) {
    this._lateBuffer.push( fn, receiver, arg );
    this._queueTick();
};

Async.prototype.invoke = function Async$invoke( fn, receiver, arg ) {
    var functionBuffer = this._functionBuffer;
    functionBuffer.push( fn, receiver, arg );
    this._length = functionBuffer.length();
    this._queueTick();
};

Async.prototype._consumeFunctionBuffer =
function Async$_consumeFunctionBuffer() {
    var functionBuffer = this._functionBuffer;
    while( functionBuffer.length() > 0 ) {
        var fn = functionBuffer.shift();
        var receiver = functionBuffer.shift();
        var arg = functionBuffer.shift();
        fn.call( receiver, arg );
    }
    this._reset();
    this._consumeLateBuffer();
};

Async.prototype._consumeLateBuffer = function Async$_consumeLateBuffer() {
    var buffer = this._lateBuffer;
    while( buffer.length() > 0 ) {
        var fn = buffer.shift();
        var receiver = buffer.shift();
        var arg = buffer.shift();
        var res = tryCatch1( fn, receiver, arg );
        if( res === errorObj ) {
            this._queueTick();
            throw res.e;
        }
    }
};

Async.prototype._queueTick = function Async$_queue() {
    if( !this._isTickUsed ) {
        schedule( this.consumeFunctionBuffer );
        this._isTickUsed = true;
    }
};

Async.prototype._reset = function Async$_reset() {
    this._isTickUsed = false;
    this._length = 0;
};

module.exports = new Async();

},{"./assert.js":2,"./queue.js":28,"./schedule.js":32,"./util.js":38}],4:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var Promise = require("./promise.js")();
module.exports = Promise;
},{"./promise.js":20}],5:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    Promise.prototype.call = function Promise$call( propertyName ) {
        var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}

        return this._then( function( obj ) {
                return obj[ propertyName ].apply( obj, args );
            },
            void 0,
            void 0,
            void 0,
            void 0,
            this.call
        );
    };

    function Promise$getter( obj ) {
        var prop = typeof this === "string"
            ? this
            : ("" + this);
        return obj[ prop ];
    }
    Promise.prototype.get = function Promise$get( propertyName ) {
        return this._then(
            Promise$getter,
            void 0,
            void 0,
            propertyName,
            void 0,
            this.get
        );
    };
};

},{}],6:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var errors = require( "./errors.js" );
    var async = require( "./async.js" );
    var CancellationError = errors.CancellationError;

    Promise.prototype.cancel = function Promise$cancel() {
        if( !this.isCancellable() ) return this;
        var cancelTarget = this;
        while( cancelTarget._cancellationParent !== void 0 ) {
            cancelTarget = cancelTarget._cancellationParent;
        }
        if( cancelTarget === this ) {
            var err = new CancellationError();
            this._attachExtraTrace( err );
            this._reject( err );
        }
        else {
            async.invoke( cancelTarget.cancel, cancelTarget, void 0 );
        }
        return this;
    };

    Promise.prototype.uncancellable = function Promise$uncancellable() {
        var ret = new Promise();
        ret._setTrace( this.uncancellable, this );
        ret._unsetCancellable();
        ret._assumeStateOf( this, true );
        ret._boundTo = this._boundTo;
        return ret;
    };

    Promise.prototype.fork =
    function Promise$fork( didFulfill, didReject, didProgress ) {
        var ret = this._then( didFulfill, didReject, didProgress,
            void 0, void 0, this.fork );
        ret._cancellationParent = void 0;
        return ret;
    };
};

},{"./async.js":3,"./errors.js":11}],7:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function() {
var ASSERT = require("./assert.js");
var inherits = require( "./util.js").inherits;
var defineProperty = require("./es5.js").defineProperty;

var rignore = new RegExp(
    "\\b(?:Promise(?:Array|Spawn)?\\$_\\w+|tryCatch(?:1|2|Apply)|setTimeout" +
    "|CatchFilter\\$_\\w+|makeNodePromisified|processImmediate|nextTick" +
    "|Async\\$\\w+)\\b"
);

var rtraceline = null;
var formatStack = null;
var areNamesMangled = false;

function formatNonError( obj ) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    }
    else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if( ruselessToString.test( str ) ) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch( e ) {

            }
        }
    }
    return ("(<" + snip( str ) + ">, no stack trace)");
}

function snip( str ) {
    var maxChars = 41;
    if( str.length < maxChars ) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function CapturedTrace( ignoreUntil, isTopLevel ) {
    if( !areNamesMangled ) {
    }
    this.captureStackTrace( ignoreUntil, isTopLevel );

}
inherits( CapturedTrace, Error );

CapturedTrace.prototype.captureStackTrace =
function CapturedTrace$captureStackTrace( ignoreUntil, isTopLevel ) {
    captureStackTrace( this, ignoreUntil, isTopLevel );
};

CapturedTrace.possiblyUnhandledRejection =
function CapturedTrace$PossiblyUnhandledRejection( reason ) {
    if( typeof console === "object" ) {
        var message;
        if (typeof reason === "object" || typeof reason === "function") {
            var stack = reason.stack;
            message = "Possibly unhandled " + formatStack( stack, reason );
        }
        else {
            message = "Possibly unhandled " + String(reason);
        }
        if( typeof console.error === "function" ||
            typeof console.error === "object" ) {
            console.error( message );
        }
        else if( typeof console.log === "function" ||
            typeof console.error === "object" ) {
            console.log( message );
        }
    }
};

areNamesMangled = CapturedTrace.prototype.captureStackTrace.name !==
    "CapturedTrace$captureStackTrace";

CapturedTrace.combine = function CapturedTrace$Combine( current, prev ) {
    var curLast = current.length - 1;
    for( var i = prev.length - 1; i >= 0; --i ) {
        var line = prev[i];
        if( current[ curLast ] === line ) {
            current.pop();
            curLast--;
        }
        else {
            break;
        }
    }

    current.push( "From previous event:" );
    var lines = current.concat( prev );

    var ret = [];


    for( var i = 0, len = lines.length; i < len; ++i ) {

        if( ( rignore.test( lines[i] ) ||
            ( i > 0 && !rtraceline.test( lines[i] ) ) &&
            lines[i] !== "From previous event:" )
        ) {
            continue;
        }
        ret.push( lines[i] );
    }
    return ret;
};

CapturedTrace.isSupported = function CapturedTrace$IsSupported() {
    return typeof captureStackTrace === "function";
};

var captureStackTrace = (function stackDetection() {
    if( typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function" ) {
        rtraceline = /^\s*at\s*/;
        formatStack = function( stack, error ) {
            if( typeof stack === "string" ) return stack;

            if( error.name !== void 0 &&
                error.message !== void 0 ) {
                return error.name + ". " + error.message;
            }
            return formatNonError( error );


        };
        var captureStackTrace = Error.captureStackTrace;
        return function CapturedTrace$_captureStackTrace(
            receiver, ignoreUntil, isTopLevel ) {
            var prev = -1;
            if( !isTopLevel ) {
                prev = Error.stackTraceLimit;
                Error.stackTraceLimit =
                    Math.max(1, Math.min(10000, prev) / 3 | 0);
            }
            captureStackTrace( receiver, ignoreUntil );

            if( !isTopLevel ) {
                Error.stackTraceLimit = prev;
            }
        };
    }
    var err = new Error();

    if( !areNamesMangled && typeof err.stack === "string" &&
        typeof "".startsWith === "function" &&
        ( err.stack.startsWith("stackDetection@")) &&
        stackDetection.name === "stackDetection" ) {

        defineProperty( Error, "stackTraceLimit", {
            writable: true,
            enumerable: false,
            configurable: false,
            value: 25
        });
        rtraceline = /@/;
        var rline = /[@\n]/;

        formatStack = function( stack, error ) {
            if( typeof stack === "string" ) {
                return ( error.name + ". " + error.message + "\n" + stack );
            }

            if( error.name !== void 0 &&
                error.message !== void 0 ) {
                return error.name + ". " + error.message;
            }
            return formatNonError( error );
        };

        return function captureStackTrace(o, fn) {
            var name = fn.name;
            var stack = new Error().stack;
            var split = stack.split( rline );
            var i, len = split.length;
            for (i = 0; i < len; i += 2) {
                if (split[i] === name) {
                    break;
                }
            }
            split = split.slice(i + 2);
            len = split.length - 2;
            var ret = "";
            for (i = 0; i < len; i += 2) {
                ret += split[i];
                ret += "@";
                ret += split[i + 1];
                ret += "\n";
            }
            o.stack = ret;
        };
    }
    else {
        formatStack = function( stack, error ) {
            if( typeof stack === "string" ) return stack;

            if( ( typeof error === "object" ||
                typeof error === "function" ) &&
                error.name !== void 0 &&
                error.message !== void 0 ) {
                return error.name + ". " + error.message;
            }
            return formatNonError( error );
        };

        return null;
    }
})();

return CapturedTrace;
};

},{"./assert.js":2,"./es5.js":13,"./util.js":38}],8:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var ensureNotHandled = require( "./errors.js" ).ensureNotHandled;
var util = require( "./util.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;
var keys = require("./es5.js").keys;

function CatchFilter( instances, callback, promise ) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}


function CatchFilter$_safePredicate( predicate, e ) {
    var safeObject = {};
    var retfilter = tryCatch1( predicate, safeObject, e );

    if( retfilter === errorObj ) return retfilter;

    var safeKeys = keys(safeObject);
    if( safeKeys.length ) {
        errorObj.e = new TypeError(
            "Catch filter must inherit from Error "
          + "or be a simple predicate function" );
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function CatchFilter$_doFilter( e ) {
    var cb = this._callback;

    for( var i = 0, len = this._instances.length; i < len; ++i ) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            ( item != null && item.prototype instanceof Error );

        if( itemIsErrorType && e instanceof item ) {
            var ret = tryCatch1( cb, this._promise._boundTo, e );
            if( ret === errorObj ) {
                throw ret.e;
            }
            return ret;
        } else if( typeof item === "function" && !itemIsErrorType ) {
            var shouldHandle = CatchFilter$_safePredicate(item, e);
            if( shouldHandle === errorObj ) {
                this._promise._attachExtraTrace( errorObj.e );
                e = errorObj.e;
                break;
            } else if(shouldHandle) {
                var ret = tryCatch1( cb, this._promise._boundTo, e );
                if( ret === errorObj ) {
                    throw ret.e;
                }
                return ret;
            }
        }
    }
    ensureNotHandled( e );
    throw e;
};

module.exports = CatchFilter;

},{"./errors.js":11,"./es5.js":13,"./util.js":38}],9:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var ASSERT = require("./assert.js");
    var async = require( "./async.js" );
    var util = require( "./util.js" );
    var isPrimitive = util.isPrimitive;
    var errorObj = util.errorObj;
    var isObject = util.isObject;
    var tryCatch2 = util.tryCatch2;

    function getThen(obj) {
        try {
            return obj.then;
        }
        catch(e) {
            errorObj.e = e;
            return errorObj;
        }
    }

    function isThenable(obj, ref) {
        if (isPrimitive(obj)) {
            return false;
        }
        var then = getThen(obj);

        if (then === errorObj) {
            ref.ref = errorObj;
            return false;
        }

        if (typeof then === "function") {
            ref.ref = then;
            return true;
        }
        return false;
    }

    var ref = {ref: null};
    function Promise$_Cast( obj, caller ) {
        if( isObject( obj ) ) {
            if( obj instanceof Promise ) {
                return obj;
            }

            if( isThenable( obj, ref ) ) {
                caller = typeof caller === "function" ? caller : Promise$_Cast;
                var then = ref.ref;
                ref.ref = null;
                return doThenable( obj, then, caller );
            }
            else if (ref.ref === errorObj) {
                ref.ref = null;
                return Promise.reject(errorObj.e);
            }
            ref.ref = null;
        }
        return obj;
    }

    Promise._cast = Promise$_Cast;
    Promise._isThenable = isThenable;

    function doThenable( x, then, caller ) {
        function resolveFromThenable( a ) {
            if( called ) return;
            called = true;

            if (a === x) {
                resolver.promise._resolveFulfill( a );
                return;
            }
            var b = Promise$_Cast( a );
            if( b === a ) {
                resolver.resolve( a );
            }
            else {
                b._then(
                    resolver.resolve,
                    resolver.reject,
                    void 0,
                    resolver,
                    void 0,
                    resolveFromThenable
                );
            }

        }

        function rejectFromThenable( a ) {
            if( called ) return;
            called = true;
            resolver.reject( a );
        }


        var resolver = Promise.defer( caller );

        var called = false;
        var ret = tryCatch2(then, x, resolveFromThenable, rejectFromThenable);
        if( ret === errorObj && !called ) {
            resolver.reject( ret.e );
        }
        return resolver.promise;
    }

    Promise.prototype._resolveThenable =
    function Promise$_resolveThenable(x, then) {
        var localP = this;
        var key = {};
        var called = false;

        function resolveFromThenable( v ) {
            if( called && this !== key ) return;
            called = true;
            var fn = localP._fulfill;
            var b = Promise$_Cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                if( v === x ) {
                    async.invoke( fn, localP, v );
                }
                else {
                    b._then( resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                }
                return;
            }


            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                v = v._resolvedValue;
                b = Promise$_Cast( v );
                if( b !== v ||
                    ( b instanceof Promise && b !== v ) ) {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                    return;
                }
            }
            async.invoke( fn, localP, v );
        }

        function rejectFromThenable( v ) {
            if( called && this !== key ) return;
            var fn = localP._reject;
            called = true;

            var b = Promise$_Cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                if( v === x ) {
                    async.invoke( fn, localP, v );
                }
                else {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                }
                return;
            }


            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                v = v._resolvedValue;
                b = Promise$_Cast( v );
                if( b !== v ||
                    ( b instanceof Promise && b.isPending() ) ) {
                    b._then(resolveFromThenable, rejectFromThenable, void 0,
                        key, void 0, resolveFromThenable);
                    return;
                }
            }

            async.invoke( fn, localP, v );
        }
        var threw = tryCatch2( then, x,
                resolveFromThenable, rejectFromThenable);

        if( threw === errorObj &&
            !called ) {
            this._attachExtraTrace( threw.e );
            async.invoke( this._reject, this, threw.e );
        }
    };
};

},{"./assert.js":2,"./async.js":3,"./util.js":38}],10:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var util = require("./util.js");
var ASSERT = require("./assert.js");
var isPrimitive = util.isPrimitive;

module.exports = function( Promise ) {

var wrapsPrimitiveReceiver = (function() {
    return this !== "string";
}).call("string");

var returner = function Promise$_returner() {
    return this;
};
var thrower = function Promise$_thrower() {
    throw this;
};

var wrapper = function Promise$_wrapper( value, action ) {
    if( action === 1 ) {
        return function Promise$_thrower() {
            throw value;
        };
    }
    else if( action === 2 ) {
        return function Promise$_returner() {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn =
function Promise$thenReturn( value ) {
    if( wrapsPrimitiveReceiver && isPrimitive( value ) ) {
        return this._then(
            wrapper( value, 2 ),
            void 0,
            void 0,
            void 0,
            void 0,
            this.thenReturn
        );
    }
    return this._then( returner, void 0, void 0,
                        value, void 0, this.thenReturn );
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow =
function Promise$thenThrow( reason ) {
    if( wrapsPrimitiveReceiver && isPrimitive( reason ) ) {
        return this._then(
            wrapper( reason, 1 ),
            void 0,
            void 0,
            void 0,
            void 0,
            this.thenThrow
        );
    }
    return this._then( thrower, void 0, void 0,
                        reason, void 0, this.thenThrow );
};
};

},{"./assert.js":2,"./util.js":38}],11:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var global = require("./global.js");
var Objectfreeze = require("./es5.js").freeze;
var util = require( "./util.js");
var inherits = util.inherits;
var isObject = util.isObject;
var notEnumerableProp = util.notEnumerableProp;
var Error = global.Error;

function isStackAttached( val ) {
    return ( val & 1 ) > 0;
}

function isHandled( val ) {
    return ( val & 2 ) > 0;
}

function withStackAttached( val ) {
    return ( val | 1 );
}

function withHandledMarked( val ) {
    return ( val | 2 );
}

function withHandledUnmarked( val ) {
    return ( val & ( ~2 ) );
}

function ensureNotHandled( reason ) {
    var field;
    if( isObject( reason ) &&
        ( ( field = reason["__promiseHandled__"] ) !== void 0 ) ) {
        reason["__promiseHandled__"] = withHandledUnmarked( field );
    }
}

function attachDefaultState( obj ) {
    try {
        notEnumerableProp( obj, "__promiseHandled__", 0 );
        return true;
    }
    catch( e ) {
        return false;
    }
}

function isError( obj ) {
    return obj instanceof Error;
}

function canAttach( obj ) {
    if( isError( obj ) ) {
        var handledState = obj["__promiseHandled__"];
        if( handledState === void 0 ) {
            return attachDefaultState( obj );
        }
        return !isStackAttached( handledState );
    }
    return false;
}

function subError( nameProperty, defaultMessage ) {
    function SubError( message ) {
        this.message = typeof message === "string" ? message : defaultMessage;
        this.name = nameProperty;
        if( Error.captureStackTrace ) {
            Error.captureStackTrace( this, this.constructor );
        }
    }
    inherits( SubError, Error );
    return SubError;
}

var TypeError = global.TypeError;
if( typeof TypeError !== "function" ) {
    TypeError = subError( "TypeError", "type error" );
}
var CancellationError = subError( "CancellationError", "cancellation error" );
var TimeoutError = subError( "TimeoutError", "timeout error" );

function RejectionError( message ) {
    this.name = "RejectionError";
    this.message = message;
    this.cause = message;

    if( message instanceof Error ) {
        this.message = message.message;
        this.stack = message.stack;
    }
    else if( Error.captureStackTrace ) {
        Error.captureStackTrace( this, this.constructor );
    }

}
inherits( RejectionError, Error );

var key = "__BluebirdErrorTypes__";
var errorTypes = global[key];
if( !errorTypes ) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        RejectionError: RejectionError
    });
    notEnumerableProp( global, key, errorTypes );
}

module.exports = {
    Error: Error,
    TypeError: TypeError,
    CancellationError: errorTypes.CancellationError,
    RejectionError: errorTypes.RejectionError,
    TimeoutError: errorTypes.TimeoutError,
    attachDefaultState: attachDefaultState,
    ensureNotHandled: ensureNotHandled,
    withHandledUnmarked: withHandledUnmarked,
    withHandledMarked: withHandledMarked,
    withStackAttached: withStackAttached,
    isStackAttached: isStackAttached,
    isHandled: isHandled,
    canAttach: canAttach
};

},{"./es5.js":13,"./global.js":16,"./util.js":38}],12:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function(Promise) {
var TypeError = require('./errors.js').TypeError;

function apiRejection( msg ) {
    var error = new TypeError( msg );
    var ret = Promise.rejected( error );
    var parent = ret._peekContext();
    if( parent != null ) {
        parent._attachExtraTrace( error );
    }
    return ret;
}

return apiRejection;
};
},{"./errors.js":11}],13:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var isES5 = (function(){
    "use strict";
    return this === void 0;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        keys: Object.keys,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray
    };
}

else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    function ObjectKeys(o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    }

    function ObjectDefineProperty(o, key, desc) {
        o[key] = desc.value;
        return o;
    }

    function ObjectFreeze(obj) {
        return obj;
    }

    function ObjectGetPrototypeOf(obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    }

    function ArrayIsArray(obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    }

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf
    };
}

},{}],14:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray, apiRejection ) {

    var ASSERT = require( "./assert.js" );

    function Promise$_filterer( fulfilleds ) {
        var fn = this;
        var receiver = void 0;
        if( typeof fn !== "function" )  {
            receiver = fn.receiver;
            fn = fn.fn;
        }
        var ret = new Array( fulfilleds.length );
        var j = 0;
        if( receiver === void 0 ) {
             for( var i = 0, len = fulfilleds.length; i < len; ++i ) {
                var item = fulfilleds[i];
                if( item === void 0 &&
                    !( i in fulfilleds ) ) {
                    continue;
                }
                if( fn( item, i, len ) ) {
                    ret[j++] = item;
                }
            }
        }
        else {
            for( var i = 0, len = fulfilleds.length; i < len; ++i ) {
                var item = fulfilleds[i];
                if( item === void 0 &&
                    !( i in fulfilleds ) ) {
                    continue;
                }
                if( fn.call( receiver, item, i, len ) ) {
                    ret[j++] = item;
                }
            }
        }
        ret.length = j;
        return ret;
    }

    function Promise$_Filter( promises, fn, useBound, caller ) {
        if( typeof fn !== "function" ) {
            return apiRejection( "fn is not a function" );
        }

        if( useBound === true ) {
            fn = {
                fn: fn,
                receiver: promises._boundTo
            };
        }

        return Promise$_All( promises, PromiseArray, caller,
                useBound === true ? promises._boundTo : void 0 )
            .promise()
            ._then( Promise$_filterer, void 0, void 0, fn, void 0, caller );
    }

    Promise.filter = function Promise$Filter( promises, fn ) {
        return Promise$_Filter( promises, fn, false, Promise.filter );
    };

    Promise.prototype.filter = function Promise$filter( fn ) {
        return Promise$_Filter( this, fn, true, this.filter );
    };
};

},{"./assert.js":2}],15:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, apiRejection ) {
    var PromiseSpawn = require( "./promise_spawn.js" )(Promise);
    var errors = require( "./errors.js");
    var TypeError = errors.TypeError;

    Promise.coroutine = function Promise$Coroutine( generatorFunction ) {
        if( typeof generatorFunction !== "function" ) {
            throw new TypeError( "generatorFunction must be a function" );
        }
        var PromiseSpawn$ = PromiseSpawn;
        return function anonymous() {
            var generator = generatorFunction.apply( this, arguments );
            var spawn = new PromiseSpawn$( void 0, void 0, anonymous );
            spawn._generator = generator;
            spawn._next( void 0 );
            return spawn.promise();
        };
    };

    Promise.spawn = function Promise$Spawn( generatorFunction ) {
        if( typeof generatorFunction !== "function" ) {
            return apiRejection( "generatorFunction must be a function" );
        }
        var spawn = new PromiseSpawn( generatorFunction, this, Promise.spawn );
        var ret = spawn.promise();
        spawn._run( Promise.spawn );
        return ret;
    };
};

},{"./errors.js":11,"./promise_spawn.js":24}],16:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = (function(){
    if( typeof this !== "undefined" ) {
        return this;
    }
    if( typeof process !== "undefined" &&
        typeof global !== "undefined" &&
        typeof process.execPath === "string" ) {
        return global;
    }
    if( typeof window !== "undefined" &&
        typeof document !== "undefined" &&
        typeof navigator !== "undefined" && navigator !== null &&
        typeof navigator.appName === "string" ) {
        return window;
    }
})();

},{"__browserify_process":40}],17:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray, apiRejection ) {

    var ASSERT = require( "./assert.js" );

    function Promise$_mapper( fulfilleds ) {
        var fn = this;
        var receiver = void 0;

        if( typeof fn !== "function" )  {
            receiver = fn.receiver;
            fn = fn.fn;
        }
        var shouldDefer = false;

        if( receiver === void 0 ) {
            for( var i = 0, len = fulfilleds.length; i < len; ++i ) {
                if( fulfilleds[i] === void 0 &&
                    !(i in fulfilleds) ) {
                    continue;
                }
                var fulfill = fn( fulfilleds[ i ], i, len );
                if( !shouldDefer && Promise.is( fulfill ) ) {
                    if( fulfill.isFulfilled() ) {
                        fulfilleds[i] = fulfill._resolvedValue;
                        continue;
                    }
                    else {
                        shouldDefer = true;
                    }
                }
                fulfilleds[i] = fulfill;
            }
        }
        else {
            for( var i = 0, len = fulfilleds.length; i < len; ++i ) {
                if( fulfilleds[i] === void 0 &&
                    !(i in fulfilleds) ) {
                    continue;
                }
                var fulfill = fn.call( receiver, fulfilleds[ i ], i, len );
                if( !shouldDefer && Promise.is( fulfill ) ) {
                    if( fulfill.isFulfilled() ) {
                        fulfilleds[i] = fulfill._resolvedValue;
                        continue;
                    }
                    else {
                        shouldDefer = true;
                    }
                }
                fulfilleds[i] = fulfill;
            }
        }
        return shouldDefer
            ? Promise$_All( fulfilleds, PromiseArray,
                Promise$_mapper, void 0 ).promise()
            : fulfilleds;
    }

    function Promise$_Map( promises, fn, useBound, caller ) {
        if( typeof fn !== "function" ) {
            return apiRejection( "fn is not a function" );
        }

        if( useBound === true ) {
            fn = {
                fn: fn,
                receiver: promises._boundTo
            };
        }

        return Promise$_All(
            promises,
            PromiseArray,
            caller,
            useBound === true ? promises._boundTo : void 0
        ).promise()
        ._then(
            Promise$_mapper,
            void 0,
            void 0,
            fn,
            void 0,
            caller
        );
    }

    Promise.prototype.map = function Promise$map( fn ) {
        return Promise$_Map( this, fn, true, this.map );
    };

    Promise.map = function Promise$Map( promises, fn ) {
        return Promise$_Map( promises, fn, false, Promise.map );
    };
};

},{"./assert.js":2}],18:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var util = require( "./util.js" );
    var async = require( "./async.js" );
    var ASSERT = require( "./assert.js" );
    var tryCatch2 = util.tryCatch2;
    var tryCatch1 = util.tryCatch1;
    var errorObj = util.errorObj;

    function thrower( r ) {
        throw r;
    }

    function Promise$_successAdapter( val, receiver ) {
        var nodeback = this;
        var ret = tryCatch2( nodeback, receiver, null, val );
        if( ret === errorObj ) {
            async.invokeLater( thrower, void 0, ret.e );
        }
    }
    function Promise$_errorAdapter( reason, receiver ) {
        var nodeback = this;
        var ret = tryCatch1( nodeback, receiver, reason );
        if( ret === errorObj ) {
            async.invokeLater( thrower, void 0, ret.e );
        }
    }

    Promise.prototype.nodeify = function Promise$nodeify( nodeback ) {
        if( typeof nodeback == "function" ) {
            this._then(
                Promise$_successAdapter,
                Promise$_errorAdapter,
                void 0,
                nodeback,
                this._isBound() ? this._boundTo : null,
                this.nodeify
            );
        }
        return this;
    };
};

},{"./assert.js":2,"./async.js":3,"./util.js":38}],19:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var ASSERT = require( "./assert.js");
    var util = require( "./util.js" );
    var async = require( "./async.js" );
    var tryCatch1 = util.tryCatch1;
    var errorObj = util.errorObj;

    Promise.prototype.progressed = function Promise$progressed( fn ) {
        return this._then( void 0, void 0, fn,
                            void 0, void 0, this.progressed );
    };

    Promise.prototype._progress = function Promise$_progress( progressValue ) {
        if( this._isFollowingOrFulfilledOrRejected() ) return;
        this._resolveProgress( progressValue );

    };

    Promise.prototype._progressAt = function Promise$_progressAt( index ) {
        if( index === 0 ) return this._progress0;
        return this[ index + 2 - 5 ];
    };

    Promise.prototype._resolveProgress =
    function Promise$_resolveProgress( progressValue ) {
        var len = this._length();
        for( var i = 0; i < len; i += 5 ) {
            var fn = this._progressAt( i );
            var promise = this._promiseAt( i );
            if( !Promise.is( promise ) ) {
                fn.call( this._receiverAt( i ), progressValue, promise );
                continue;
            }
            var ret = progressValue;
            if( fn !== void 0 ) {
                this._pushContext();
                ret = tryCatch1( fn, this._receiverAt( i ), progressValue );
                this._popContext();
                if( ret === errorObj ) {
                    if( ret.e != null &&
                        ret.e.name === "StopProgressPropagation" ) {
                        ret.e["__promiseHandled__"] = 2;
                    }
                    else {
                        promise._attachExtraTrace( ret.e );
                        async.invoke( promise._progress, promise, ret.e );
                    }
                }
                else if( Promise.is( ret ) ) {
                    ret._then( promise._progress, null, null, promise, void 0,
                        this._progress );
                }
                else {
                    async.invoke( promise._progress, promise, ret );
                }
            }
            else {
                async.invoke( promise._progress, promise, ret );
            }
        }
    };
};
},{"./assert.js":2,"./async.js":3,"./util.js":38}],20:[function(require,module,exports){
var process=require("__browserify_process");/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function() {
var global = require("./global.js");
var ASSERT = require("./assert.js");

var util = require( "./util.js" );
var async = require( "./async.js" );
var errors = require( "./errors.js" );
var PromiseArray = require( "./promise_array.js" )(Promise);

var CapturedTrace = require( "./captured_trace.js")();
var CatchFilter = require( "./catch_filter.js");
var PromiseResolver = require( "./promise_resolver.js" );

var isArray = util.isArray;
var notEnumerableProp = util.notEnumerableProp;
var isObject = util.isObject;
var ensurePropertyExpansion = util.ensurePropertyExpansion;
var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;
var tryCatch2 = util.tryCatch2;
var tryCatchApply = util.tryCatchApply;

var TypeError = errors.TypeError;
var CancellationError = errors.CancellationError;
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var ensureNotHandled = errors.ensureNotHandled;
var withHandledMarked = errors.withHandledMarked;
var withStackAttached = errors.withStackAttached;
var isStackAttached = errors.isStackAttached;
var isHandled = errors.isHandled;
var canAttach = errors.canAttach;
var apiRejection = require("./errors_api_rejection")(Promise);

var APPLY = {};

var makeSelfResolutionError = function Promise$_makeSelfResolutionError() {
    return new TypeError( "Resolving promises cyclically" );
};

function isPromise( obj ) {
    if( typeof obj !== "object" ) return false;
    return obj instanceof Promise;
}

function Promise( resolver ) {
    this._bitField = 67108864;
    this._fulfill0 = void 0;
    this._reject0 = void 0;
    this._progress0 = void 0;
    this._promise0 = void 0;
    this._receiver0 = void 0;
    this._resolvedValue = void 0;
    this._cancellationParent = void 0;
    this._boundTo = void 0;
    if( longStackTraces ) this._traceParent = this._peekContext();
    if( typeof resolver === "function" ) this._resolveResolver( resolver );

}

Promise.prototype.bind = function Promise$bind( obj ) {
    var ret = new Promise();
    ret._setTrace( this.bind, this );
    ret._assumeStateOf( this, true );
    ret._setBoundTo( obj );
    return ret;
};

Promise.prototype.toString = function Promise$toString() {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] =
function Promise$catch( fn ) {
    var len = arguments.length;
    if( len > 1 ) {
        var catchInstances = new Array( len - 1 ),
            j = 0, i;
        for( i = 0; i < len - 1; ++i ) {
            var item = arguments[i];
            if( typeof item === "function" ) {
                catchInstances[j++] = item;
            }
            else {
                var catchFilterTypeError =
                    new TypeError(
                        "A catch filter must be an error constructor "
                        + "or a filter function");

                this._attachExtraTrace( catchFilterTypeError );
                async.invoke( this._reject, this, catchFilterTypeError );
                return;
            }
        }
        catchInstances.length = j;
        fn = arguments[i];

        this._resetTrace( this.caught );
        var catchFilter = new CatchFilter( catchInstances, fn, this );
        return this._then( void 0, catchFilter.doFilter, void 0,
            catchFilter, void 0, this.caught );
    }
    return this._then( void 0, fn, void 0, void 0, void 0, this.caught );
};

function thrower( r ) {
    throw r;
}
function slowFinally( ret, reasonOrValue ) {
    if( this.isFulfilled() ) {
        return ret._then(function() {
            return reasonOrValue;
        }, thrower, void 0, this, void 0, slowFinally );
    }
    else {
        return ret._then(function() {
            ensureNotHandled( reasonOrValue );
            throw reasonOrValue;
        }, thrower, void 0, this, void 0, slowFinally );
    }
}
Promise.prototype.lastly = Promise.prototype["finally"] =
function Promise$finally( fn ) {
    var r = function( reasonOrValue ) {
        var ret = this._isBound() ? fn.call( this._boundTo ) : fn();
        if( isPromise( ret ) ) {
            return slowFinally.call( this, ret, reasonOrValue );
        }

        if( this.isRejected() ) {
            ensureNotHandled( reasonOrValue );
            throw reasonOrValue;
        }
        return reasonOrValue;
    };
    return this._then( r, r, void 0, this, void 0, this.lastly );
};

Promise.prototype.then =
function Promise$then( didFulfill, didReject, didProgress ) {
    return this._then( didFulfill, didReject, didProgress,
        void 0, void 0, this.then );
};

Promise.prototype.done =
function Promise$done( didFulfill, didReject, didProgress ) {
    var promise = this._then( didFulfill, didReject, didProgress,
        void 0, void 0, this.done );
    promise._setIsFinal();
};

Promise.prototype.spread = function Promise$spread( didFulfill, didReject ) {
    return this._then( didFulfill, didReject, void 0,
        APPLY, void 0, this.spread );
};
Promise.prototype.isFulfilled = function Promise$isFulfilled() {
    return ( this._bitField & 268435456 ) > 0;
};

Promise.prototype.isRejected = function Promise$isRejected() {
    return ( this._bitField & 134217728 ) > 0;
};

Promise.prototype.isPending = function Promise$isPending() {
    return !this.isResolved();
};

Promise.prototype.isResolved = function Promise$isResolved() {
    return ( this._bitField & 402653184 ) > 0;
};

Promise.prototype.isCancellable = function Promise$isCancellable() {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function Promise$toJSON() {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: void 0,
        rejectionReason: void 0
    };
    if( this.isFulfilled() ) {
        ret.fulfillmentValue = this._resolvedValue;
        ret.isFulfilled = true;
    }
    else if( this.isRejected() ) {
        ret.rejectionReason = this._resolvedValue;
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function Promise$all() {
    return Promise$_all( this, true, this.all );
};

Promise.is = isPromise;

function Promise$_all( promises, useBound, caller ) {
    return Promise$_All(
        promises,
        PromiseArray,
        caller,
        useBound === true ? promises._boundTo : void 0
    ).promise();
}
Promise.all = function Promise$All( promises ) {
    return Promise$_all( promises, false, Promise.all );
};

Promise.join = function Promise$Join() {
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    return Promise$_All( args, PromiseArray, Promise.join, void 0 ).promise();
};

Promise.resolve = Promise.fulfilled =
function Promise$Resolve( value, caller ) {
    var ret = new Promise();
    ret._setTrace( typeof caller === "function"
        ? caller
        : Promise.resolve, void 0 );
    if( ret._tryAssumeStateOf( value, false ) ) {
        return ret;
    }
    ret._cleanValues();
    ret._setFulfilled();
    ret._resolvedValue = value;
    return ret;
};

Promise.reject = Promise.rejected = function Promise$Reject( reason ) {
    var ret = new Promise();
    ret._setTrace( Promise.reject, void 0 );
    ret._cleanValues();
    ret._setRejected();
    ret._resolvedValue = reason;
    return ret;
};

Promise.prototype._resolveFromSyncValue =
function Promise$_resolveFromSyncValue(value) {
    if (value === errorObj) {
        this._cleanValues();
        this._setRejected();
        this._resolvedValue = value.e;
    }
    else {
        var maybePromise = Promise._cast(value);
        if (maybePromise instanceof Promise) {
            this._assumeStateOf(maybePromise, true);
        }
        else {
            this._cleanValues();
            this._setFulfilled();
            this._resolvedValue = value;
        }
    }
};

Promise.method = function Promise$_Method( fn ) {
    if( typeof fn !== "function" ) {
        throw new TypeError( "fn must be a function" );
    }
    return function Promise$_method() {
        var value;
        switch(arguments.length) {
        case 0: value = tryCatch1(fn, this, void 0); break;
        case 1: value = tryCatch1(fn, this, arguments[0]); break;
        case 2: value = tryCatch2(fn, this, arguments[0], arguments[1]); break;
        default:
            var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
            value = tryCatchApply(fn, args, this); break;
        }
        var ret = new Promise();
        ret._setTrace(Promise$_method, void 0);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise["try"] = Promise.attempt = function Promise$_Try( fn, args, ctx ) {

    if( typeof fn !== "function" ) {
        return apiRejection("fn must be a function");
    }
    var value = isArray( args )
        ? tryCatchApply( fn, args, ctx )
        : tryCatch1( fn, ctx, args );

    var ret = new Promise();
    ret._setTrace(Promise.attempt, void 0);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.defer = Promise.pending = function Promise$Defer( caller ) {
    var promise = new Promise();
    promise._setTrace( typeof caller === "function"
                              ? caller : Promise.defer, void 0 );
    return new PromiseResolver( promise );
};

Promise.bind = function Promise$Bind( obj ) {
    var ret = new Promise();
    ret._setTrace( Promise.bind, void 0 );
    ret._setFulfilled();
    ret._setBoundTo( obj );
    return ret;
};

Promise.cast = function Promise$Cast( obj, caller ) {
    var ret = Promise._cast( obj, caller );
    if( !( ret instanceof Promise ) ) {
        return Promise.resolve( ret, caller );
    }
    return ret;
};

Promise.onPossiblyUnhandledRejection =
function Promise$OnPossiblyUnhandledRejection( fn ) {
    if( typeof fn === "function" ) {
        CapturedTrace.possiblyUnhandledRejection = fn;
    }
    else {
        CapturedTrace.possiblyUnhandledRejection = void 0;
    }
};

var longStackTraces = false || false || !!(
    typeof process !== "undefined" &&
    typeof process.execPath === "string" &&
    typeof process.env === "object" &&
    process.env[ "BLUEBIRD_DEBUG" ]
);


Promise.longStackTraces = function Promise$LongStackTraces() {
    if( async.haveItemsQueued() &&
        longStackTraces === false
    ) {
        throw new Error("Cannot enable long stack traces " +
        "after promises have been created");
    }
    longStackTraces = true;
};

Promise.hasLongStackTraces = function Promise$HasLongStackTraces() {
    return longStackTraces;
};

Promise.prototype._then =
function Promise$_then(
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData,
    caller
) {
    var haveInternalData = internalData !== void 0;
    var ret = haveInternalData ? internalData : new Promise();

    if( longStackTraces && !haveInternalData ) {
        var haveSameContext = this._peekContext() === this._traceParent;
        ret._traceParent = haveSameContext ? this._traceParent : this;
        ret._setTrace( typeof caller === "function" ?
            caller : this._then, this );

    }

    if( !haveInternalData ) {
        ret._boundTo = this._boundTo;
    }

    var callbackIndex =
        this._addCallbacks( didFulfill, didReject, didProgress, ret, receiver );

    if( this.isResolved() ) {
        async.invoke( this._resolveLast, this, callbackIndex );
    }
    else if( !haveInternalData && this.isCancellable() ) {
        ret._cancellationParent = this;
    }

    return ret;
};

Promise.prototype._length = function Promise$_length() {
    return this._bitField & 16777215;
};

Promise.prototype._isFollowingOrFulfilledOrRejected =
function Promise$_isFollowingOrFulfilledOrRejected() {
    return ( this._bitField & 939524096 ) > 0;
};

Promise.prototype._setLength = function Promise$_setLength( len ) {
    this._bitField = ( this._bitField & -16777216 ) |
        ( len & 16777215 ) ;
};

Promise.prototype._cancellable = function Promise$_cancellable() {
    return ( this._bitField & 67108864 ) > 0;
};

Promise.prototype._setFulfilled = function Promise$_setFulfilled() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function Promise$_setRejected() {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function Promise$_setFollowing() {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function Promise$_setIsFinal() {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function Promise$_isFinal() {
    return ( this._bitField & 33554432 ) > 0;
};

Promise.prototype._setCancellable = function Promise$_setCancellable() {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function Promise$_unsetCancellable() {
    this._bitField = this._bitField & ( ~67108864 );
};

Promise.prototype._receiverAt = function Promise$_receiverAt( index ) {
    var ret;
    if( index === 0 ) {
        ret = this._receiver0;
    }
    else {
        ret = this[ index + 4 - 5 ];
    }
    if( this._isBound() && ret === void 0 ) {
        return this._boundTo;
    }
    return ret;
};

Promise.prototype._promiseAt = function Promise$_promiseAt( index ) {
    if( index === 0 ) return this._promise0;
    return this[ index + 3 - 5 ];
};

Promise.prototype._fulfillAt = function Promise$_fulfillAt( index ) {
    if( index === 0 ) return this._fulfill0;
    return this[ index + 0 - 5 ];
};

Promise.prototype._rejectAt = function Promise$_rejectAt( index ) {
    if( index === 0 ) return this._reject0;
    return this[ index + 1 - 5 ];
};

Promise.prototype._unsetAt = function Promise$_unsetAt( index ) {
    if( index === 0 ) {
        this._fulfill0 =
        this._reject0 =
        this._progress0 =
        this._promise0 =
        this._receiver0 = void 0;
    }
    else {
        this[ index - 5 + 0 ] =
        this[ index - 5 + 1 ] =
        this[ index - 5 + 2 ] =
        this[ index - 5 + 3 ] =
        this[ index - 5 + 4 ] = void 0;
    }
};

Promise.prototype._resolveResolver =
function Promise$_resolveResolver( resolver ) {
    this._setTrace( this._resolveResolver, void 0 );
    var p = new PromiseResolver( this );
    this._pushContext();
    var r = tryCatch2( resolver, this, function Promise$_fulfiller( val ) {
        p.fulfill( val );
    }, function Promise$_rejecter( val ) {
        p.reject( val );
    });
    this._popContext();
    if( r === errorObj ) {
        p.reject( r.e );
    }
};

Promise.prototype._addCallbacks = function Promise$_addCallbacks(
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    fulfill = typeof fulfill === "function" ? fulfill : void 0;
    reject = typeof reject === "function" ? reject : void 0;
    progress = typeof progress === "function" ? progress : void 0;
    var index = this._length();

    if( index === 0 ) {
        this._fulfill0 = fulfill;
        this._reject0  = reject;
        this._progress0 = progress;
        this._promise0 = promise;
        this._receiver0 = receiver;
        this._setLength( index + 5 );
        return index;
    }

    this[ index - 5 + 0 ] = fulfill;
    this[ index - 5 + 1 ] = reject;
    this[ index - 5 + 2 ] = progress;
    this[ index - 5 + 3 ] = promise;
    this[ index - 5 + 4 ] = receiver;

    this._setLength( index + 5 );
    return index;
};

Promise.prototype._spreadSlowCase =
function Promise$_spreadSlowCase( targetFn, promise, values, boundTo ) {
    promise._assumeStateOf(
            Promise$_All( values, PromiseArray, this._spreadSlowCase, boundTo )
            .promise()
            ._then( function() {
                return targetFn.apply( boundTo, arguments );
            }, void 0, void 0, APPLY, void 0,
                    this._spreadSlowCase ),
        false
    );
};

Promise.prototype._setBoundTo = function Promise$_setBoundTo( obj ) {
    this._boundTo = obj;
};

Promise.prototype._isBound = function Promise$_isBound() {
    return this._boundTo !== void 0;
};


var ignore = CatchFilter.prototype.doFilter;
var ref = {ref: null};
Promise.prototype._resolvePromise = function Promise$_resolvePromise(
    onFulfilledOrRejected, receiver, value, promise
) {
    var isRejected = this.isRejected();

    if( isRejected &&
        typeof value === "object" &&
        value !== null ) {
        var handledState = value["__promiseHandled__"];

        if( handledState === void 0 ) {
            notEnumerableProp( value, "__promiseHandled__", 2 );
        }
        else {
            value["__promiseHandled__"] =
                withHandledMarked( handledState );
        }
    }

    if( !isPromise( promise ) ) {
        return onFulfilledOrRejected.call( receiver, value, promise );
    }

    var x;
    if( !isRejected && receiver === APPLY ) {
        if( isArray( value ) ) {
            for( var i = 0, len = value.length; i < len; ++i ) {
                if( isPromise( Promise._cast( value[i] ) ) ) {
                    this._spreadSlowCase(
                        onFulfilledOrRejected,
                        promise,
                        value,
                        this._boundTo
                    );
                    return;
                }
            }
            promise._pushContext();
            x = tryCatchApply( onFulfilledOrRejected, value, this._boundTo );
        }
        else {
            this._spreadSlowCase( onFulfilledOrRejected, promise,
                    value, this._boundTo );
            return;
        }
    }
    else {
        promise._pushContext();
        x = tryCatch1( onFulfilledOrRejected, receiver, value );
    }

    promise._popContext();

    if( x === errorObj ) {
        ensureNotHandled(x.e);
        if( onFulfilledOrRejected !== ignore ) {
            promise._attachExtraTrace( x.e );
        }
        async.invoke( promise._reject, promise, x.e );
    }
    else if( x === promise ) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace( err );
        async.invoke(
            promise._reject,
            promise,
            err
        );
    }
    else {
        if( promise._tryAssumeStateOf( x, true ) ) {
            return;
        }
        else if( Promise._isThenable( x, ref ) ) {
            var then = ref.ref;
            ref.ref = null;
            promise._resolveThenable(x, then);
            return;
        }


        if (ref.ref === errorObj) {
            ref.ref = null;
            var e = errorObj.e;
            promise._attachExtraTrace(e);
            async.invoke(promise._reject, promise, e);
        }
        else {
            ref.ref = null;
            async.invoke( promise._fulfill, promise, x );
        }

    }
};

Promise.prototype._assumeStateOf =
function Promise$_assumeStateOf( promise, mustAsync ) {
    this._setFollowing();
    if( promise.isPending() ) {
        if( promise._cancellable()  ) {
            this._cancellationParent = promise;
        }
        promise._then(
            this._resolveFulfill,
            this._resolveReject,
            this._resolveProgress,
            this,
            void 0,            this._tryAssumeStateOf
        );
    }
    else if( promise.isFulfilled() ) {
        if( mustAsync === true )
            async.invoke( this._resolveFulfill, this, promise._resolvedValue );
        else
            this._resolveFulfill( promise._resolvedValue );
    }
    else {
        if( mustAsync === true )
            async.invoke( this._resolveReject, this, promise._resolvedValue );
        else
            this._resolveReject( promise._resolvedValue );
    }

    if( longStackTraces &&
        promise._traceParent == null ) {
        promise._traceParent = this;
    }
};

Promise.prototype._tryAssumeStateOf =
function Promise$_tryAssumeStateOf( value, mustAsync ) {
    if( !isPromise( value ) ||
        this._isFollowingOrFulfilledOrRejected() ||
        value === this ) return false;

    this._assumeStateOf( value, mustAsync );
    return true;
};

Promise.prototype._resetTrace = function Promise$_resetTrace( caller ) {
    if( longStackTraces ) {
        var context = this._peekContext();
        var isTopLevel = context === void 0;
        this._trace = new CapturedTrace(
            typeof caller === "function"
            ? caller
            : this._resetTrace,
            isTopLevel
        );
    }
};

Promise.prototype._setTrace = function Promise$_setTrace( caller, parent ) {
    if( longStackTraces ) {
        var context = this._peekContext();
        var isTopLevel = context === void 0;
        if( parent !== void 0 &&
            parent._traceParent === context ) {
            this._trace = parent._trace;
        }
        else {
            this._trace = new CapturedTrace(
                typeof caller === "function"
                ? caller
                : this._setTrace,
                isTopLevel
            );
        }
    }
    return this;
};

Promise.prototype._attachExtraTrace =
function Promise$_attachExtraTrace( error ) {
    if( longStackTraces &&
        canAttach( error ) ) {
        var promise = this;
        var stack = error.stack;
        stack = typeof stack === "string"
            ? stack.split("\n") : [];
        var headerLineCount = 1;

        while( promise != null &&
            promise._trace != null ) {
            stack = CapturedTrace.combine(
                stack,
                promise._trace.stack.split( "\n" )
            );
            promise = promise._traceParent;
        }

        var max = Error.stackTraceLimit + headerLineCount;
        var len = stack.length;
        if( len  > max ) {
            stack.length = max;
        }
        if( stack.length <= headerLineCount ) {
            error.stack = "(No stack trace)";
        }
        else {
            error.stack = stack.join("\n");
        }
        error["__promiseHandled__"] =
            withStackAttached( error["__promiseHandled__"] );
    }
};

Promise.prototype._notifyUnhandledRejection =
function Promise$_notifyUnhandledRejection( reason ) {
    if( !isHandled( reason["__promiseHandled__"] ) ) {
        reason["__promiseHandled__"] =
            withHandledMarked( reason["__promiseHandled__"] );
        CapturedTrace.possiblyUnhandledRejection( reason, this );
    }
};

Promise.prototype._unhandledRejection =
function Promise$_unhandledRejection( reason ) {
    if( !isHandled( reason["__promiseHandled__"] ) ) {
        async.invokeLater( this._notifyUnhandledRejection, this, reason );
    }
};

Promise.prototype._cleanValues = function Promise$_cleanValues() {
    this._cancellationParent = void 0;
};

Promise.prototype._fulfill = function Promise$_fulfill( value ) {
    if( this._isFollowingOrFulfilledOrRejected() ) return;
    this._resolveFulfill( value );

};

Promise.prototype._reject = function Promise$_reject( reason ) {
    if( this._isFollowingOrFulfilledOrRejected() ) return;
    this._resolveReject( reason );
};

Promise.prototype._doResolveAt = function Promise$_doResolveAt( i ) {
    var fn = this.isFulfilled()
        ? this._fulfillAt( i )
        : this._rejectAt( i );
    var value = this._resolvedValue;
    var receiver = this._receiverAt( i );
    var promise = this._promiseAt( i );
    this._unsetAt( i );
    this._resolvePromise( fn, receiver, value, promise );
};

Promise.prototype._resolveLast = function Promise$_resolveLast( index ) {
    this._setLength( 0 );
    var fn;
    if( this.isFulfilled() ) {
        fn = this._fulfillAt( index );
    }
    else {
        fn = this._rejectAt( index );
    }

    if( fn !== void 0 ) {
        async.invoke( this._doResolveAt, this, index );
    }
    else {
        var promise = this._promiseAt( index );
        var value = this._resolvedValue;
        this._unsetAt( index );
        if( this.isFulfilled() ) {
            async.invoke( promise._fulfill, promise, value );
        }
        else {
            async.invoke( promise._reject, promise, value );
        }
    }

};

Promise.prototype._resolveFulfill = function Promise$_resolveFulfill( value ) {
    if( value === this ) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace( err );
        return this._resolveReject( err );
    }
    this._cleanValues();
    this._setFulfilled();
    this._resolvedValue = value;
    var len = this._length();
    this._setLength( 0 );
    for( var i = 0; i < len; i+= 5 ) {
        if( this._fulfillAt( i ) !== void 0 ) {
            async.invoke( this._doResolveAt, this, i );
        }
        else {
            var promise = this._promiseAt( i );
            this._unsetAt( i );
            async.invoke( promise._fulfill, promise, value );
        }
    }

};

Promise.prototype._resolveReject = function Promise$_resolveReject( reason ) {
    if( reason === this ) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace( err );
        return this._resolveReject( err );
    }
    this._cleanValues();
    this._setRejected();
    this._resolvedValue = reason;
    if( this._isFinal() ) {
        async.invokeLater( thrower, void 0, reason );
        return;
    }
    var len = this._length();
    this._setLength( 0 );
    var rejectionWasHandled = false;
    for( var i = 0; i < len; i+= 5 ) {
        if( this._rejectAt( i ) !== void 0 ) {
            rejectionWasHandled = true;
            async.invoke( this._doResolveAt, this, i );
        }
        else {
            var promise = this._promiseAt( i );
            this._unsetAt( i );
            if( !rejectionWasHandled )
                rejectionWasHandled = promise._length() > 0;
            async.invoke( promise._reject, promise, reason );
        }
    }

    if( !rejectionWasHandled &&
        CapturedTrace.possiblyUnhandledRejection !== void 0
    ) {

        if( isObject( reason ) ) {
            var handledState = reason["__promiseHandled__"];
            var newReason = reason;

            if( handledState === void 0 ) {
                newReason = ensurePropertyExpansion(reason,
                    "__promiseHandled__", 0 );
                handledState = 0;
            }
            else if( isHandled( handledState ) ) {
                return;
            }

            if( !isStackAttached( handledState ) )  {
                this._attachExtraTrace( newReason );
            }
            async.invoke( this._unhandledRejection, this, newReason );

        }
    }

};

var contextStack = [];
Promise.prototype._peekContext = function Promise$_peekContext() {
    var lastIndex = contextStack.length - 1;
    if( lastIndex >= 0 ) {
        return contextStack[ lastIndex ];
    }
    return void 0;

};

Promise.prototype._pushContext = function Promise$_pushContext() {
    if( !longStackTraces ) return;
    contextStack.push( this );
};

Promise.prototype._popContext = function Promise$_popContext() {
    if( !longStackTraces ) return;
    contextStack.pop();
};


function Promise$_All( promises, PromiseArray, caller, boundTo ) {
    if( isPromise( promises ) ||
        isArray( promises ) ) {

        return new PromiseArray(
            promises,
            typeof caller === "function"
                ? caller
                : Promise$_All,
            boundTo
        );
    }
    return new PromiseArray(
        [ apiRejection( "expecting an array or a promise" ) ],
        caller,
        boundTo
    );
}

var old = global.Promise;

Promise.noConflict = function() {
    if( global.Promise === Promise ) {
        global.Promise = old;
    }
    return Promise;
};

if( !CapturedTrace.isSupported() ) {
    Promise.longStackTraces = function(){};
    longStackTraces = false;
}

require( "./direct_resolve.js" )( Promise );
Promise.CancellationError = CancellationError;
Promise.TimeoutError = TimeoutError;
Promise.TypeError = TypeError;
Promise.RejectionError = RejectionError;
require('./synchronous_inspection.js')(Promise);
require('./any.js')(Promise,Promise$_All,PromiseArray);
require('./race.js')(Promise,Promise$_All,PromiseArray);
require('./call_get.js')(Promise);
require('./filter.js')(Promise,Promise$_All,PromiseArray,apiRejection);
require('./generators.js')(Promise,apiRejection);
require('./map.js')(Promise,Promise$_All,PromiseArray,apiRejection);
require('./nodeify.js')(Promise);
require('./promisify.js')(Promise);
require('./props.js')(Promise,PromiseArray);
require('./reduce.js')(Promise,Promise$_All,PromiseArray,apiRejection);
require('./settle.js')(Promise,Promise$_All,PromiseArray);
require('./some.js')(Promise,Promise$_All,PromiseArray,apiRejection);
require('./progress.js')(Promise);
require('./cancel.js')(Promise);
require('./complex_thenables.js')(Promise);

Promise.prototype = Promise.prototype;
return Promise;

};

},{"./any.js":1,"./assert.js":2,"./async.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./complex_thenables.js":9,"./direct_resolve.js":10,"./errors.js":11,"./errors_api_rejection":12,"./filter.js":14,"./generators.js":15,"./global.js":16,"./map.js":17,"./nodeify.js":18,"./progress.js":19,"./promise_array.js":21,"./promise_resolver.js":23,"./promisify.js":25,"./props.js":27,"./race.js":29,"./reduce.js":31,"./settle.js":33,"./some.js":35,"./synchronous_inspection.js":37,"./util.js":38,"__browserify_process":40}],21:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
var ASSERT = require("./assert.js");
var ensureNotHandled = require( "./errors.js").ensureNotHandled;
var util = require("./util.js");
var async = require( "./async.js");
var hasOwn = {}.hasOwnProperty;
var isArray = util.isArray;

function toFulfillmentValue( val ) {
    switch( val ) {
    case 0: return void 0;
    case 1: return [];
    case 2: return {};
    }
}

function PromiseArray( values, caller, boundTo ) {
    this._values = values;
    this._resolver = Promise.pending( caller );
    if( boundTo !== void 0 ) {
        this._resolver.promise._setBoundTo( boundTo );
    }
    this._length = 0;
    this._totalResolved = 0;
    this._init( void 0, 1 );
}
PromiseArray.PropertiesPromiseArray = function() {};

PromiseArray.prototype.length = function PromiseArray$length() {
    return this._length;
};

PromiseArray.prototype.promise = function PromiseArray$promise() {
    return this._resolver.promise;
};

PromiseArray.prototype._init =
function PromiseArray$_init( _, fulfillValueIfEmpty ) {
    var values = this._values;
    if( Promise.is( values ) ) {
        if( values.isFulfilled() ) {
            values = values._resolvedValue;
            if( !isArray( values ) ) {
                this._fulfill( toFulfillmentValue( fulfillValueIfEmpty ) );
                return;
            }
            this._values = values;
        }
        else if( values.isPending() ) {
            values._then(
                this._init,
                this._reject,
                void 0,
                this,
                fulfillValueIfEmpty,
                this.constructor
            );
            return;
        }
        else {
            this._reject( values._resolvedValue );
            return;
        }
    }
    if( values.length === 0 ) {
        this._fulfill( toFulfillmentValue( fulfillValueIfEmpty ) );
        return;
    }
    var len = values.length;
    var newLen = len;
    var newValues;
    if( this instanceof PromiseArray.PropertiesPromiseArray ) {
        newValues = this._values;
    }
    else {
        newValues = new Array( len );
    }
    var isDirectScanNeeded = false;
    for( var i = 0; i < len; ++i ) {
        var promise = values[i];
        if( promise === void 0 && !hasOwn.call( values, i ) ) {
            newLen--;
            continue;
        }
        var maybePromise = Promise._cast( promise );
        if( maybePromise instanceof Promise &&
            maybePromise.isPending() ) {
            maybePromise._then(
                this._promiseFulfilled,
                this._promiseRejected,
                this._promiseProgressed,

                this,                i,                 this._scanDirectValues
            );
        }
        else {
            isDirectScanNeeded = true;
        }
        newValues[i] = maybePromise;
    }
    if( newLen === 0 ) {
        if( fulfillValueIfEmpty === 1 ) {
            this._fulfill( newValues );
        }
        else {
            this._fulfill( toFulfillmentValue( fulfillValueIfEmpty ) );
        }
        return;
    }
    this._values = newValues;
    this._length = newLen;
    if( isDirectScanNeeded ) {
        var scanMethod = newLen === len
            ? this._scanDirectValues
            : this._scanDirectValuesHoled;
        async.invoke( scanMethod, this, len );
    }
};

PromiseArray.prototype._resolvePromiseAt =
function PromiseArray$_resolvePromiseAt( i ) {
    var value = this._values[i];
    if( !Promise.is( value ) ) {
        this._promiseFulfilled( value, i );
    }
    else if( value.isFulfilled() ) {
        this._promiseFulfilled( value._resolvedValue, i );
    }
    else if( value.isRejected() ) {
        this._promiseRejected( value._resolvedValue, i );
    }
};

PromiseArray.prototype._scanDirectValuesHoled =
function PromiseArray$_scanDirectValuesHoled( len ) {
    for( var i = 0; i < len; ++i ) {
        if( this._isResolved() ) {
            break;
        }
        if( hasOwn.call( this._values, i ) ) {
            this._resolvePromiseAt( i );
        }
    }
};

PromiseArray.prototype._scanDirectValues =
function PromiseArray$_scanDirectValues( len ) {
    for( var i = 0; i < len; ++i ) {
        if( this._isResolved() ) {
            break;
        }
        this._resolvePromiseAt( i );
    }
};

PromiseArray.prototype._isResolved = function PromiseArray$_isResolved() {
    return this._values === null;
};

PromiseArray.prototype._fulfill = function PromiseArray$_fulfill( value ) {
    this._values = null;
    this._resolver.fulfill( value );
};

PromiseArray.prototype._reject = function PromiseArray$_reject( reason ) {
    ensureNotHandled( reason );
    this._values = null;
    this._resolver.reject( reason );
};

PromiseArray.prototype._promiseProgressed =
function PromiseArray$_promiseProgressed( progressValue, index ) {
    if( this._isResolved() ) return;
    this._resolver.progress({
        index: index,
        value: progressValue
    });
};

PromiseArray.prototype._promiseFulfilled =
function PromiseArray$_promiseFulfilled( value, index ) {
    if( this._isResolved() ) return;
    this._values[ index ] = value;
    var totalResolved = ++this._totalResolved;
    if( totalResolved >= this._length ) {
        this._fulfill( this._values );
    }
};

PromiseArray.prototype._promiseRejected =
function PromiseArray$_promiseRejected( reason ) {
    if( this._isResolved() ) return;
    this._totalResolved++;
    this._reject( reason );
};

return PromiseArray;
};

},{"./assert.js":2,"./async.js":3,"./errors.js":11,"./util.js":38}],22:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var TypeError = require( "./errors.js" ).TypeError;

function PromiseInspection( promise ) {
    if( promise !== void 0 ) {
        this._bitField = promise._bitField;
        this._resolvedValue = promise.isResolved()
            ? promise._resolvedValue
            : void 0;
    }
    else {
        this._bitField = 0;
        this._resolvedValue = void 0;
    }
}
PromiseInspection.prototype.isFulfilled =
function PromiseInspection$isFulfilled() {
    return ( this._bitField & 268435456 ) > 0;
};

PromiseInspection.prototype.isRejected =
function PromiseInspection$isRejected() {
    return ( this._bitField & 134217728 ) > 0;
};

PromiseInspection.prototype.isPending = function PromiseInspection$isPending() {
    return ( this._bitField & 402653184 ) === 0;
};

PromiseInspection.prototype.value = function PromiseInspection$value() {
    if( !this.isFulfilled() ) {
        throw new TypeError(
            "cannot get fulfillment value of a non-fulfilled promise");
    }
    return this._resolvedValue;
};

PromiseInspection.prototype.error = function PromiseInspection$error() {
    if( !this.isRejected() ) {
        throw new TypeError(
            "cannot get rejection reason of a non-rejected promise");
    }
    return this._resolvedValue;
};

module.exports = PromiseInspection;

},{"./errors.js":11}],23:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var util = require( "./util.js" );
var maybeWrapAsError = util.maybeWrapAsError;
var errors = require( "./errors.js");
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var async = require( "./async.js" );
var haveGetters = util.haveGetters;
var es5 = require("./es5.js");

function isUntypedError( obj ) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

function wrapAsRejectionError( obj ) {
    if( isUntypedError( obj ) ) {
        return new RejectionError( obj );
    }
    return obj;
}

function nodebackForResolver( resolver ) {
    function PromiseResolver$_callback( err, value ) {
        if( err ) {
            resolver.reject( wrapAsRejectionError( maybeWrapAsError( err ) ) );
        }
        else {
            if( arguments.length > 2 ) {
                var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
                resolver.fulfill( args );
            }
            else {
                resolver.fulfill( value );
            }
        }
    }
    return PromiseResolver$_callback;
}


var PromiseResolver;
if( !haveGetters ) {
    PromiseResolver = function PromiseResolver( promise ) {
        this.promise = promise;
        this.asCallback = nodebackForResolver( this );
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function PromiseResolver( promise ) {
        this.promise = promise;
    };
}
if( haveGetters ) {
    var prop = {
        get: function() {
            return nodebackForResolver( this );
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForResolver = nodebackForResolver;

PromiseResolver.prototype.toString = function PromiseResolver$toString() {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function PromiseResolver$resolve( value ) {
    if( this.promise._tryAssumeStateOf( value, false ) ) {
        return;
    }
    async.invoke( this.promise._fulfill, this.promise, value );
};

PromiseResolver.prototype.reject = function PromiseResolver$reject( reason ) {
    this.promise._attachExtraTrace( reason );
    async.invoke( this.promise._reject, this.promise, reason );
};

PromiseResolver.prototype.progress =
function PromiseResolver$progress( value ) {
    async.invoke( this.promise._progress, this.promise, value );
};

PromiseResolver.prototype.cancel = function PromiseResolver$cancel() {
    async.invoke( this.promise.cancel, this.promise, void 0 );
};

PromiseResolver.prototype.timeout = function PromiseResolver$timeout() {
    this.reject( new TimeoutError( "timeout" ) );
};

PromiseResolver.prototype.isResolved = function PromiseResolver$isResolved() {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function PromiseResolver$toJSON() {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./async.js":3,"./errors.js":11,"./es5.js":13,"./util.js":38}],24:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
var errors = require( "./errors.js" );
var TypeError = errors.TypeError;
var ensureNotHandled = errors.ensureNotHandled;
var util = require("./util.js");
var isArray = util.isArray;
var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;

function PromiseSpawn( generatorFunction, receiver, caller ) {
    this._resolver = Promise.pending( caller );
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = void 0;
}

PromiseSpawn.prototype.promise = function PromiseSpawn$promise() {
    return this._resolver.promise;
};

PromiseSpawn.prototype._run = function PromiseSpawn$_run() {
    this._generator = this._generatorFunction.call( this._receiver );
    this._receiver =
        this._generatorFunction = void 0;
    this._next( void 0 );
};

PromiseSpawn.prototype._continue = function PromiseSpawn$_continue( result ) {
    if( result === errorObj ) {
        this._generator = void 0;
        this._resolver.reject( result.e );
        return;
    }

    var value = result.value;
    if( result.done === true ) {
        this._generator = void 0;
        this._resolver.fulfill( value );
    }
    else {
        var maybePromise = Promise._cast( value, PromiseSpawn$_continue );
        if( !( maybePromise instanceof Promise ) ) {
            if( isArray( maybePromise ) ) {
                maybePromise = Promise.all( maybePromise );
            }
            else {
                this._throw( new TypeError(
                    "A value was yielded that could not be treated as a promise"
                ) );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            void 0,
            this,
            null,
            void 0
        );
    }
};

PromiseSpawn.prototype._throw = function PromiseSpawn$_throw( reason ) {
    ensureNotHandled( reason );
    this.promise()._attachExtraTrace( reason );
    this._continue(
        tryCatch1( this._generator["throw"], this._generator, reason )
    );
};

PromiseSpawn.prototype._next = function PromiseSpawn$_next( value ) {
    this._continue(
        tryCatch1( this._generator.next, this._generator, value )
    );
};

return PromiseSpawn;
};

},{"./errors.js":11,"./util.js":38}],25:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
var THIS = {};
var util = require( "./util.js");
var errors = require( "./errors.js" );
var nodebackForResolver = require( "./promise_resolver.js" )
    ._nodebackForResolver;
var RejectionError = errors.RejectionError;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var notEnumerableProp = util.notEnumerableProp;
var deprecated = util.deprecated;
var ASSERT = require( "./assert.js" );

Promise.prototype.error = function Promise$_error( fn ) {
    return this.caught( RejectionError, fn );
};

function makeNodePromisifiedEval( callback, receiver, originalName ) {
    function getCall(count) {
        var args = new Array(count);
        for( var i = 0, len = args.length; i < len; ++i ) {
            args[i] = "a" + (i+1);
        }
        var comma = count > 0 ? "," : "";

        if( typeof callback === "string" &&
            receiver === THIS ) {
            return "this['" + callback + "']("+args.join(",") +
                comma +" fn);"+
                "break;";
        }
        return ( receiver === void 0
            ? "callback("+args.join(",")+ comma +" fn);"
            : "callback.call("+( receiver === THIS
                ? "this"
                : "receiver" )+", "+args.join(",") + comma + " fn);" ) +
        "break;";
    }

    function getArgs() {
        return "var args = new Array( len + 1 );" +
        "var i = 0;" +
        "for( var i = 0; i < len; ++i ) { " +
        "   args[i] = arguments[i];" +
        "}" +
        "args[i] = fn;";
    }

    var callbackName = ( typeof originalName === "string" ?
        originalName + "Async" :
        "promisified" );

    return new Function("Promise", "callback", "receiver",
            "withAppended", "maybeWrapAsError", "nodebackForResolver",
        "var ret = function " + callbackName +
        "( a1, a2, a3, a4, a5 ) {\"use strict\";" +
        "var len = arguments.length;" +
        "var resolver = Promise.pending( " + callbackName + " );" +
        "var fn = nodebackForResolver( resolver );"+
        "try{" +
        "switch( len ) {" +
        "case 1:" + getCall(1) +
        "case 2:" + getCall(2) +
        "case 3:" + getCall(3) +
        "case 0:" + getCall(0) +
        "case 4:" + getCall(4) +
        "case 5:" + getCall(5) +
        "default: " + getArgs() + (typeof callback === "string"
            ? "this['" + callback + "'].apply("
            : "callback.apply("
        ) +
            ( receiver === THIS ? "this" : "receiver" ) +
        ", args ); break;" +
        "}" +
        "}" +
        "catch(e){ " +
        "" +
        "resolver.reject( maybeWrapAsError( e ) );" +
        "}" +
        "return resolver.promise;" +
        "" +
        "}; ret.__isPromisified__ = true; return ret;"
    )(Promise, callback, receiver, withAppended,
        maybeWrapAsError, nodebackForResolver);
}

function makeNodePromisifiedClosure( callback, receiver ) {
    function promisified() {
        var _receiver = receiver;
        if( receiver === THIS ) _receiver = this;
        if( typeof callback === "string" ) {
            callback = _receiver[callback];
        }
        var resolver = Promise.pending( promisified );
        var fn = nodebackForResolver( resolver );
        try {
            callback.apply( _receiver, withAppended( arguments, fn ) );
        }
        catch(e) {
            resolver.reject( maybeWrapAsError( e ) );
        }
        return resolver.promise;
    }
    promisified.__isPromisified__ = true;
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function f(){}
function isPromisified( fn ) {
    return fn.__isPromisified__ === true;
}
var hasProp = {}.hasOwnProperty;
var roriginal = new RegExp( "__beforePromisified__" + "$" );
function _promisify( callback, receiver, isAll ) {
    if( isAll ) {
        var changed = 0;
        var o = {};
        for( var key in callback ) {
            if( !roriginal.test( key ) &&
                !hasProp.call( callback,
                    ( key + "__beforePromisified__" ) ) &&
                typeof callback[ key ] === "function" ) {
                var fn = callback[key];
                if( !isPromisified( fn ) ) {
                    changed++;
                    var originalKey = key + "__beforePromisified__";
                    var promisifiedKey = key + "Async";
                    notEnumerableProp( callback, originalKey, fn );
                    o[ promisifiedKey ] =
                        makeNodePromisified( originalKey, THIS, key );
                }
            }
        }
        if( changed > 0 ) {
            for( var key in o ) {
                if( hasProp.call( o, key ) ) {
                    callback[key] = o[key];
                }
            }
            f.prototype = callback;
        }

        return callback;
    }
    else {
        return makeNodePromisified( callback, receiver, void 0 );
    }
}

Promise.promisify = function Promise$Promisify( callback, receiver ) {
    if( typeof callback === "object" && callback !== null ) {
        deprecated( "Promise.promisify for promisifying entire objects " +
            "is deprecated. Use Promise.promisifyAll instead." );
        return _promisify( callback, receiver, true );
    }
    if( typeof callback !== "function" ) {
        throw new TypeError( "callback must be a function" );
    }
    if( isPromisified( callback ) ) {
        return callback;
    }
    return _promisify(
        callback,
        arguments.length < 2 ? THIS : receiver,
        false );
};

Promise.promisifyAll = function Promise$PromisifyAll( target ) {
    if( typeof target !== "function" && typeof target !== "object" ) {
        throw new TypeError( "Cannot promisify " + typeof target );
    }
    return _promisify( target, void 0, true );
};
};


},{"./assert.js":2,"./errors.js":11,"./promise_resolver.js":23,"./util.js":38}],26:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function(Promise, PromiseArray) {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var inherits = util.inherits;
var es5 = require("./es5.js");

function PropertiesPromiseArray( obj, caller, boundTo ) {
    var keys = es5.keys( obj );
    var values = new Array( keys.length );
    for( var i = 0, len = values.length; i < len; ++i ) {
        values[i] = obj[keys[i]];
    }
    this.constructor$( values, caller, boundTo );
    if( !this._isResolved() ) {
        for( var i = 0, len = keys.length; i < len; ++i ) {
            values.push( keys[i] );
        }
    }
}
inherits( PropertiesPromiseArray, PromiseArray );

PropertiesPromiseArray.prototype._init =
function PropertiesPromiseArray$_init() {
    this._init$( void 0, 2 ) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled =
function PropertiesPromiseArray$_promiseFulfilled( value, index ) {
    if( this._isResolved() ) return;
    this._values[ index ] = value;
    var totalResolved = ++this._totalResolved;
    if( totalResolved >= this._length ) {
        var val = {};
        var keyOffset = this.length();
        for( var i = 0, len = this.length(); i < len; ++i ) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._fulfill( val );
    }
};

PropertiesPromiseArray.prototype._promiseProgressed =
function PropertiesPromiseArray$_promiseProgressed( value, index ) {
    if( this._isResolved() ) return;

    this._resolver.progress({
        key: this._values[ index + this.length() ],
        value: value
    });
};

PromiseArray.PropertiesPromiseArray = PropertiesPromiseArray;

return PropertiesPromiseArray;
};

},{"./assert.js":2,"./es5.js":13,"./util.js":38}],27:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, PromiseArray ) {
    var PropertiesPromiseArray = require("./properties_promise_array.js")(
        Promise, PromiseArray);
    var util = require( "./util.js" );
    var isPrimitive = util.isPrimitive;

    function Promise$_Props( promises, useBound, caller ) {
        var ret;
        if( isPrimitive( promises ) ) {
            ret = Promise.fulfilled( promises, caller );
        }
        else if( Promise.is( promises ) ) {
            ret = promises._then( Promise.props, void 0, void 0,
                            void 0, void 0, caller );
        }
        else {
            ret = new PropertiesPromiseArray(
                promises,
                caller,
                useBound === true ? promises._boundTo : void 0
            ).promise();
            useBound = false;
        }
        if( useBound === true ) {
            ret._boundTo = promises._boundTo;
        }
        return ret;
    }

    Promise.prototype.props = function Promise$props() {
        return Promise$_Props( this, true, this.props );
    };

    Promise.props = function Promise$Props( promises ) {
        return Promise$_Props( promises, false, Promise.props );
    };
};
},{"./properties_promise_array.js":26,"./util.js":38}],28:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var ASSERT = require("./assert.js");
function arrayCopy( src, srcIndex, dst, dstIndex, len ) {
    for( var j = 0; j < len; ++j ) {
        dst[ j + dstIndex ] = src[ j + srcIndex ];
    }
}

function pow2AtLeast( n ) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}

function getCapacity( capacity ) {
    if( typeof capacity !== "number" ) return 16;
    return pow2AtLeast(
        Math.min(
            Math.max( 16, capacity ), 1073741824 )
    );
}

function Queue( capacity ) {
    this._capacity = getCapacity( capacity );
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
}

Queue.prototype._willBeOverCapacity =
function Queue$_willBeOverCapacity( size ) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function Queue$_pushOne( arg ) {
    var length = this.length();
    this._checkCapacity( length + 1 );
    var i = ( this._front + length ) & ( this._capacity - 1 );
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function Queue$push( fn, receiver, arg ) {
    var length = this.length() + 3;
    if( this._willBeOverCapacity( length ) ) {
        this._pushOne( fn );
        this._pushOne( receiver );
        this._pushOne( arg );
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity( length );
    var wrapMask = this._capacity - 1;
    this[ ( j + 0 ) & wrapMask ] = fn;
    this[ ( j + 1 ) & wrapMask ] = receiver;
    this[ ( j + 2 ) & wrapMask ] = arg;
    this._length = length;
};

Queue.prototype.shift = function Queue$shift() {
    var front = this._front,
        ret = this[ front ];

    this[ front ] = void 0;
    this._front = ( front + 1 ) & ( this._capacity - 1 );
    this._length--;
    return ret;
};

Queue.prototype.length = function Queue$length() {
    return this._length;
};

Queue.prototype._makeCapacity = function Queue$_makeCapacity() {
    var len = this._capacity;
    for( var i = 0; i < len; ++i ) {
        this[i] = void 0;
    }
};

Queue.prototype._checkCapacity = function Queue$_checkCapacity( size ) {
    if( this._capacity < size ) {
        this._resizeTo( this._capacity << 3 );
    }
};

Queue.prototype._resizeTo = function Queue$_resizeTo( capacity ) {
    var oldFront = this._front;
    var oldCapacity = this._capacity;
    var oldQueue = new Array( oldCapacity );
    var length = this.length();

    arrayCopy( this, 0, oldQueue, 0, oldCapacity );
    this._capacity = capacity;
    this._makeCapacity();
    this._front = 0;
    if( oldFront + length <= oldCapacity ) {
        arrayCopy( oldQueue, oldFront, this, 0, length );
    }
    else {        var lengthBeforeWrapping =
            length - ( ( oldFront + length ) & ( oldCapacity - 1 ) );

        arrayCopy( oldQueue, oldFront, this, 0, lengthBeforeWrapping );
        arrayCopy( oldQueue, 0, this, lengthBeforeWrapping,
                    length - lengthBeforeWrapping );
    }
};

module.exports = Queue;

},{"./assert.js":2}],29:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray ) {

    var RacePromiseArray =
        require( "./race_promise_array.js" )(Promise, PromiseArray);

    function Promise$_Race( promises, useBound, caller ) {
        return Promise$_All(
            promises,
            RacePromiseArray,
            caller,
            useBound === true ? promises._boundTo : void 0
        ).promise();
    }

    Promise.race = function Promise$Race( promises ) {
        return Promise$_Race( promises, false, Promise.race );
    };

    Promise.prototype.race = function Promise$race() {
        return Promise$_Race( this, true, this.race );
    };

};

},{"./race_promise_array.js":30}],30:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, PromiseArray ) {
var util = require("./util.js");
var inherits = util.inherits;
function RacePromiseArray( values, caller, boundTo ) {
    this.constructor$( values, caller, boundTo );
}
inherits( RacePromiseArray, PromiseArray );

RacePromiseArray.prototype._init =
function RacePromiseArray$_init() {
    this._init$( void 0, 0 );
};

RacePromiseArray.prototype._promiseFulfilled =
function RacePromiseArray$_promiseFulfilled( value ) {
    if( this._isResolved() ) return;
    this._fulfill( value );

};
RacePromiseArray.prototype._promiseRejected =
function RacePromiseArray$_promiseRejected( reason ) {
    if( this._isResolved() ) return;
    this._reject( reason );
};

return RacePromiseArray;
};

},{"./util.js":38}],31:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray, apiRejection ) {

    var ASSERT = require( "./assert.js" );

    function Promise$_reducer( fulfilleds, initialValue ) {
        var fn = this;
        var receiver = void 0;
        if( typeof fn !== "function" )  {
            receiver = fn.receiver;
            fn = fn.fn;
        }
        var len = fulfilleds.length;
        var accum = void 0;
        var startIndex = 0;

        if( initialValue !== void 0 ) {
            accum = initialValue;
            startIndex = 0;
        }
        else {
            startIndex = 1;
            if( len > 0 ) {
                for( var i = 0; i < len; ++i ) {
                    if( fulfilleds[i] === void 0 &&
                        !(i in fulfilleds) ) {
                        continue;
                    }
                    accum = fulfilleds[i];
                    startIndex = i + 1;
                    break;
                }
            }
        }
        if( receiver === void 0 ) {
            for( var i = startIndex; i < len; ++i ) {
                if( fulfilleds[i] === void 0 &&
                    !(i in fulfilleds) ) {
                    continue;
                }
                accum = fn( accum, fulfilleds[i], i, len );
            }
        }
        else {
            for( var i = startIndex; i < len; ++i ) {
                if( fulfilleds[i] === void 0 &&
                    !(i in fulfilleds) ) {
                    continue;
                }
                accum = fn.call( receiver, accum, fulfilleds[i], i, len );
            }
        }
        return accum;
    }

    function Promise$_unpackReducer( fulfilleds ) {
        var fn = this.fn;
        var initialValue = this.initialValue;
        return Promise$_reducer.call( fn, fulfilleds, initialValue );
    }

    function Promise$_slowReduce(
        promises, fn, initialValue, useBound, caller ) {
        return initialValue._then( function callee( initialValue ) {
            return Promise$_Reduce(
                promises, fn, initialValue, useBound, callee );
        }, void 0, void 0, void 0, void 0, caller);
    }

    function Promise$_Reduce( promises, fn, initialValue, useBound, caller ) {
        if( typeof fn !== "function" ) {
            return apiRejection( "fn is not a function" );
        }

        if( useBound === true ) {
            fn = {
                fn: fn,
                receiver: promises._boundTo
            };
        }

        if( initialValue !== void 0 ) {
            if( Promise.is( initialValue ) ) {
                if( initialValue.isFulfilled() ) {
                    initialValue = initialValue._resolvedValue;
                }
                else {
                    return Promise$_slowReduce( promises,
                        fn, initialValue, useBound, caller );
                }
            }

            return Promise$_All( promises, PromiseArray, caller,
                useBound === true ? promises._boundTo : void 0 )
                .promise()
                ._then( Promise$_unpackReducer, void 0, void 0, {
                    fn: fn,
                    initialValue: initialValue
                }, void 0, Promise.reduce );
        }
        return Promise$_All( promises, PromiseArray, caller,
                useBound === true ? promises._boundTo : void 0 ).promise()
            ._then( Promise$_reducer, void 0, void 0, fn, void 0, caller );
    }


    Promise.reduce = function Promise$Reduce( promises, fn, initialValue ) {
        return Promise$_Reduce( promises, fn,
            initialValue, false, Promise.reduce);
    };

    Promise.prototype.reduce = function Promise$reduce( fn, initialValue ) {
        return Promise$_Reduce( this, fn, initialValue,
                                true, this.reduce );
    };
};

},{"./assert.js":2}],32:[function(require,module,exports){
var process=require("__browserify_process");/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var global = require("./global.js");
var ASSERT = require("./assert.js");
var schedule;
if( typeof process !== "undefined" && process !== null &&
    typeof process.cwd === "function" &&
    typeof process.nextTick === "function" ) {
    schedule = process.nextTick;
}
else if( ( typeof MutationObserver === "function" ||
        typeof WebkitMutationObserver === "function" ||
        typeof WebKitMutationObserver === "function" ) &&
        typeof document !== "undefined" &&
        typeof document.createElement === "function" ) {


    schedule = (function(){
        var MutationObserver = global.MutationObserver ||
            global.WebkitMutationObserver ||
            global.WebKitMutationObserver;
        var div = document.createElement("div");
        var queuedFn = void 0;
        var observer = new MutationObserver(
            function Promise$_Scheduler() {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
            }
        );
        var cur = true;
        observer.observe( div, {
            attributes: true,
            childList: true,
            characterData: true
        });
        return function Promise$_Scheduler( fn ) {
            queuedFn = fn;
            cur = !cur;
            div.setAttribute( "class", cur ? "foo" : "bar" );
        };

    })();
}
else if ( typeof global.postMessage === "function" &&
    typeof global.importScripts !== "function" &&
    typeof global.addEventListener === "function" &&
    typeof global.removeEventListener === "function" ) {

    var MESSAGE_KEY = "bluebird_message_key_" + Math.random();
    schedule = (function(){
        var queuedFn = void 0;

        function Promise$_Scheduler(e) {
            if(e.source === global &&
                e.data === MESSAGE_KEY) {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
            }
        }

        global.addEventListener( "message", Promise$_Scheduler, false );

        return function Promise$_Scheduler( fn ) {
            queuedFn = fn;
            global.postMessage(
                MESSAGE_KEY, "*"
            );
        };

    })();
}
else if( typeof MessageChannel === "function" ) {
    schedule = (function(){
        var queuedFn = void 0;

        var channel = new MessageChannel();
        channel.port1.onmessage = function Promise$_Scheduler() {
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
        };

        return function Promise$_Scheduler( fn ) {
            queuedFn = fn;
            channel.port2.postMessage( null );
        };
    })();
}
else if( global.setTimeout ) {
    schedule = function Promise$_Scheduler( fn ) {
        setTimeout( fn, 4 );
    };
}
else {
    schedule = function Promise$_Scheduler( fn ) {
        fn();
    };
}

module.exports = schedule;

},{"./assert.js":2,"./global.js":16,"__browserify_process":40}],33:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray ) {

    var SettledPromiseArray = require( "./settled_promise_array.js" )(
        Promise, PromiseArray);

    function Promise$_Settle( promises, useBound, caller ) {
        return Promise$_All(
            promises,
            SettledPromiseArray,
            caller,
            useBound === true ? promises._boundTo : void 0
        ).promise();
    }

    Promise.settle = function Promise$Settle( promises ) {
        return Promise$_Settle( promises, false, Promise.settle );
    };

    Promise.prototype.settle = function Promise$settle() {
        return Promise$_Settle( this, true, this.settle );
    };

};
},{"./settled_promise_array.js":34}],34:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, PromiseArray ) {
var ASSERT = require("./assert.js");
var PromiseInspection = require( "./promise_inspection.js" );
var util = require("./util.js");
var inherits = util.inherits;
function SettledPromiseArray( values, caller, boundTo ) {
    this.constructor$( values, caller, boundTo );
}
inherits( SettledPromiseArray, PromiseArray );

SettledPromiseArray.prototype._promiseResolved =
function SettledPromiseArray$_promiseResolved( index, inspection ) {
    this._values[ index ] = inspection;
    var totalResolved = ++this._totalResolved;
    if( totalResolved >= this._length ) {
        this._fulfill( this._values );
    }
};

SettledPromiseArray.prototype._promiseFulfilled =
function SettledPromiseArray$_promiseFulfilled( value, index ) {
    if( this._isResolved() ) return;
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._resolvedValue = value;
    this._promiseResolved( index, ret );
};
SettledPromiseArray.prototype._promiseRejected =
function SettledPromiseArray$_promiseRejected( reason, index ) {
    if( this._isResolved() ) return;
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._resolvedValue = reason;
    this._promiseResolved( index, ret );
};

return SettledPromiseArray;
};
},{"./assert.js":2,"./promise_inspection.js":22,"./util.js":38}],35:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise, Promise$_All, PromiseArray, apiRejection ) {

    var SomePromiseArray = require( "./some_promise_array.js" )(PromiseArray);
    var ASSERT = require( "./assert.js" );

    function Promise$_Some( promises, howMany, useBound, caller ) {
        if( ( howMany | 0 ) !== howMany ) {
            return apiRejection("howMany must be an integer");
        }
        var ret = Promise$_All(
            promises,
            SomePromiseArray,
            caller,
            useBound === true ? promises._boundTo : void 0
        );
        ret.setHowMany( howMany );
        return ret.promise();
    }

    Promise.some = function Promise$Some( promises, howMany ) {
        return Promise$_Some( promises, howMany, false, Promise.some );
    };

    Promise.prototype.some = function Promise$some( count ) {
        return Promise$_Some( this, count, true, this.some );
    };

};
},{"./assert.js":2,"./some_promise_array.js":36}],36:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function ( PromiseArray ) {
var util = require("./util.js");
var inherits = util.inherits;
var isArray = util.isArray;

function SomePromiseArray( values, caller, boundTo ) {
    this.constructor$( values, caller, boundTo );
    this._howMany = 0;
    this._unwrap = false;
}
inherits( SomePromiseArray, PromiseArray );

SomePromiseArray.prototype._init = function SomePromiseArray$_init() {
    this._init$( void 0, 1 );
    var isArrayResolved = isArray( this._values );
    this._holes = isArrayResolved
        ? this._values.length - this.length()
        : 0;

    if( !this._isResolved() && isArrayResolved ) {
        this._howMany = Math.max(0, Math.min( this._howMany, this.length() ) );
        if( this.howMany() > this._canPossiblyFulfill()  ) {
            this._reject( [] );
        }
    }
};

SomePromiseArray.prototype.setUnwrap = function SomePromiseArray$setUnwrap() {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function SomePromiseArray$howMany() {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany =
function SomePromiseArray$setHowMany( count ) {
    if( this._isResolved() ) return;
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled =
function SomePromiseArray$_promiseFulfilled( value ) {
    if( this._isResolved() ) return;
    this._addFulfilled( value );
    if( this._fulfilled() === this.howMany() ) {
        this._values.length = this.howMany();
        if( this.howMany() === 1 && this._unwrap ) {
            this._fulfill( this._values[0] );
        }
        else {
            this._fulfill( this._values );
        }
    }

};
SomePromiseArray.prototype._promiseRejected =
function SomePromiseArray$_promiseRejected( reason ) {
    if( this._isResolved() ) return;
    this._addRejected( reason );
    if( this.howMany() > this._canPossiblyFulfill() ) {
        if( this._values.length === this.length() ) {
            this._reject([]);
        }
        else {
            this._reject( this._values.slice( this.length() + this._holes ) );
        }
    }
};

SomePromiseArray.prototype._fulfilled = function SomePromiseArray$_fulfilled() {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function SomePromiseArray$_rejected() {
    return this._values.length - this.length() - this._holes;
};

SomePromiseArray.prototype._addRejected =
function SomePromiseArray$_addRejected( reason ) {
    this._values.push( reason );
};

SomePromiseArray.prototype._addFulfilled =
function SomePromiseArray$_addFulfilled( value ) {
    this._values[ this._totalResolved++ ] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill =
function SomePromiseArray$_canPossiblyFulfill() {
    return this.length() - this._rejected();
};

return SomePromiseArray;
};

},{"./util.js":38}],37:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
module.exports = function( Promise ) {
    var PromiseInspection = require( "./promise_inspection.js" );

    Promise.prototype.inspect = function Promise$inspect() {
        return new PromiseInspection( this );
    };
};

},{"./promise_inspection.js":22}],38:[function(require,module,exports){
/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
var global = require("./global.js");
var ASSERT = require("./assert.js");
var es5 = require("./es5.js");
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch(e) {
        return false;
    }

})();

var ensurePropertyExpansion = function( obj, prop, value ) {
    try {
        notEnumerableProp( obj, prop, value );
        return obj;
    }
    catch( e ) {
        var ret = {};
        var keys = es5.keys( obj );
        for( var i = 0, len = keys.length; i < len; ++i ) {
            try {
                var key = keys[i];
                ret[key] = obj[key];
            }
            catch( err ) {
                ret[key] = err;
            }
        }
        notEnumerableProp( ret, prop, value );
        return ret;
    }
};

var canEvaluate = (function() {
    if( typeof window !== "undefined" && window !== null &&
        typeof window.document !== "undefined" &&
        typeof navigator !== "undefined" && navigator !== null &&
        typeof navigator.appName === "string" &&
        window === global ) {
        return false;
    }
    return true;
})();

function deprecated( msg ) {
    if( typeof console !== "undefined" && console !== null &&
        typeof console.warn === "function" ) {
        console.warn( "Bluebird: " + msg );
    }
}

var errorObj = {e: {}};
function tryCatch1( fn, receiver, arg ) {
    try {
        return fn.call( receiver, arg );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch2( fn, receiver, arg, arg2 ) {
    try {
        return fn.call( receiver, arg, arg2 );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatchApply( fn, args, receiver ) {
    try {
        return fn.apply( receiver, args );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

var inherits = function( Child, Parent ) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call( Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
            ) {
                this[ propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};

function asString( val ) {
    return typeof val === "string" ? val : ( "" + val );
}

function isPrimitive( val ) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject( value ) {
    return !isPrimitive( value );
}

function maybeWrapAsError( maybeError ) {
    if( !isPrimitive( maybeError ) ) return maybeError;

    return new Error( asString( maybeError ) );
}

function withAppended( target, appendee ) {
    var len = target.length;
    var ret = new Array( len + 1 );
    var i;
    for( i = 0; i < len; ++i ) {
        ret[ i ] = target[ i ];
    }
    ret[ i ] = appendee;
    return ret;
}


function notEnumerableProp( obj, name, value ) {
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty( obj, name, descriptor );
    return obj;
}

module.exports ={
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    ensurePropertyExpansion: ensurePropertyExpansion,
    canEvaluate: canEvaluate,
    deprecated: deprecated,
    errorObj: errorObj,
    tryCatch1: tryCatch1,
    tryCatch2: tryCatch2,
    tryCatchApply: tryCatchApply,
    inherits: inherits,
    withAppended: withAppended,
    asString: asString,
    maybeWrapAsError: maybeWrapAsError
};

},{"./assert.js":2,"./es5.js":13,"./global.js":16}],39:[function(require,module,exports){

},{}],40:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],41:[function(require,module,exports){
var process=require("__browserify_process");;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if(!this._all) {
      this._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define(function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter;
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);

},{"__browserify_process":40}],42:[function(require,module,exports){
var Resolver = function Resolver() {
  var self = this;

  /**
   * Get the scope in which the controller callable will
   * be called
   *
   * @method getScope()
   * @param  {Transit} transit the transit
   * @return {object} the scope
   */
  self.getScope = function getScope(transit) {
    return transit;
  };

  /**
   * Get the function which we will call as the controller
   *
   * @method getFunction()
   * @param  {Transit} transit the transit
   * @return {Function} the function we will call
   */
  self.getFunction = function getFunction(transit) {

    if(transit.hasAttribute('_controller')) {
      return transit.getAttribute('_controller');
    }

    return false;
  };

  /**
   * Get the arguments we will pass to the controller function
   *
   * @method getArguments()
   * @param  {Transit} transit the transit
   * @return {Array}         array of arguments
   */
  self.getArguments = function getArguments(transit) {
    return [];
  };

};

module.exports = Resolver;
},{}],43:[function(require,module,exports){
var State = function State(content) {
  var self = this;

  /**
   * The state's content  
   * @type {string}
   */
  self.content = content;

};

module.exports = State;
},{}],44:[function(require,module,exports){
var Transit = require('./transit.js');

/**
 * The ticket instance takes an single argument in the browser environment; the browser window
 *
 * @param {object} emmitter The event emitter that emits the kernel events
 * @param {Resolver} resolver the object responsible for resolving the callable from the transition
 * @param {Promixe} the promise library
 * @param {DOMWindow|express} [context] the window on the client & express app on the server
 */
var Ticket = function Ticket(emitter, resolver, Promise, context) {
  var self = this;

  /**
   * The the context in which we are running, on the server this is server instance
   * in the browser this is the dom window
   * 
   * @type {DOMWindow|express}
   */
  self.context = context;

  /**
   * Tells us if we are executing on the server or in the browser
   *
   * @method isServer()
   * @return {Boolean} 
   */
  self.isServer = function isServer() {
    return ((self.context.document === undefined) ? (true) : (false));
  };

  /**
   * Handle the normalized transit throughout its livecycle
   *
   * @method handle()
   * @param  {Transit} transit the transit
   * @return {[type]}         [description]
   */
  self.handle = function handle(transit) {

    emitter.emit('transit.start', transit);

    //start deconstruction
    var deconstructed = transit.deconstruct();

    transit.setScope( resolver.getScope(transit) );
    transit.setArguments( resolver.getArguments(transit) );
    if(transit.fn === false)
      transit.setFunction( resolver.getFunction(transit) );

    //controller was found
    emitter.emit('transit.controller', transit);

    //call controller, then construct
    var constructed = transit.run().then(function(res){

      //controller returned, new state can now be created
      emitter.emit('transit.view', transit);

      //start construction
      return transit.construct();
    });

    //when both deconstruction and construction has ended
    var ended = Promise.all([deconstructed, constructed]);
    ended.then(function(){
      emitter.emit('transit.end', transit);
    });

    return ended;
  };

  /**
   * Install onto the context, in the browser this means listening to click
   * events, on the server this means installing middleware
   *
   * @method install()
   */
  self.install = function install() {
    if(self.isServer()) {
      self.context.use(function(req, res, next){
        var t = self.normalize(req, res);
        t.setAttribute('_res', res);
        t.setAttribute('_req', req);
        t.setAttribute('_next', next);
        self.handle(t);
      });
    } else {
      self.context.document.onclick = function(e) {      
        self.handle( self.normalize(e) );
      };
    }

    return self;
  };

  /**
   * Normalize the event for each environment, in the browser this is the click event, on the 
   * server the request/res object
   *
   * @method normalize()
   * @param  {DOMEvent|req} the event/request
   * @param  {res} [res] the response object of the server
   */
  self.normalize = function normalize() {

    if(self.isServer()) {
      if(arguments.length !== 2) {
        throw new Error('[SERVER] normalize() expects 2 arguments, received: '+ arguments.length);
      }        

      var req = arguments[0];
      var res = arguments[1];

      if(req.url === undefined)
        throw new Error('[SERVER] normalize() expects first arguments to be an req object with an url, received: '+ req);

      if(res.statusCode === undefined)
        throw new Error('[SERVER] normalize() expects second arguments to be an res object with a statusCode, received: '+ req);

      return Transit.createFromReq(req, res, Promise);

    } else {

      var e = arguments[0];      
      if(e === undefined || e.currentTarget === undefined) {
        throw new Error('[CLIENT] normalize() expects argument to be an DOMEvent, received:' + e);
      }

      return Transit.createFromEvent(e, Promise);

    }

  };




};

module.exports = Ticket;
},{"./transit.js":45}],45:[function(require,module,exports){
/* globals setTimeout, clearTimeout */
var State = require('./state.js');

/**
 * A new transition requires the url to transit to and the method
 *   
 * @param {string} url    the url
 * @param {string} method the method
 */
var Transit = function Transit(url, Promise, method) {
  var self = this;
  var runResolver = Promise.defer();
  var attributes = {};
  var timer;

  /**
   * Maximum time we wait for the controller to finish
   * 
   * @type {Number}
   */
  self.MAX_EXECUTION_TIME = 5000;

  /**
   * Start maximum execution timer
   */
  self.startTimeout = function startTimeout() {
    timer = setTimeout(function(){
      throw new Error('Controller for transit to url "' + self.url + '" exceeded maximum execution time of: "'+self.MAX_EXECUTION_TIME+'ms", did the controller call render?');
    }, self.MAX_EXECUTION_TIME);
  };

  /**
   * Stop timer that prevents maximum execution time
   */
  self.stopTimeout = function stopTimeout() {
    clearTimeout(timer);
  };

  /**
   * The new url we are transitioning to
   * @type {string}
   */
  self.url = url;

  /**
   * The HTTP method only relevant on server 
   * @type {string}
   */
  self.method = typeof method !== 'undefined' ? method.toUpperCase() : 'GET';

  /**
   * Scope in which the controller function will be executed
   * @type {object}
   */
  self.scope = self;

  /**
   * The arguments that will be passed to the function
   * @type {Array}
   */
  self.args = [];

  /**
   * The function that acts as the controller
   * @type {mixed}
   */
  self.fn = false;

  /**
   * The result that is returned from the controller
   * @type {mixed}
   */
  self.result = false;

  /**
   * The new state we Transition TO
   * @type {State}
   */
  self.newState = false;

  /**
   * The sold state we transit FROM
   * @type {State}
   */
  self.oldState = false;

  /**
   * Set the attributes container on this transit, overwrites existing
   * attributes
   *
   * @method setAttributes()
   * @param {object} attrs the new attributes
   */
  self.setAttributes = function setAttributes(attrs) {
    attributes = attrs;
  };

  /**
   * Set transit specific attribut
   *
   * @method setAttribute()
   * @param {string} key the attribute name
   * @param {mixed} val the value of the attribute
   */
  self.setAttribute = function setAttribute(key, val) {
    attributes[key] = val;
  };

  /**
   * Return the attribute by its name
   *
   * @method getAttribute()
   * @param  {string} key the attribut ename
   * @return {mixed}  key's content
   */
  self.getAttribute = function getAttribute(key) {
    return attributes[key];
  };

  /**
   * Tell wether the attribute is defined
   *
   * @method hasAttribute()
   * @param  {string}  key the attribute key
   * @return {Boolean}  
   */
  self.hasAttribute = function hasAttribute(key) {
    if(self.getAttribute(key) === undefined) {
      return false;
    }
    return true;
  };

  /** 
   * Set the scope in which the controller function will be executed
   *
   * @method setScope()
   * @param {object} scope the object
   */
  self.setScope = function setScope(scope) {
    self.scope = scope;
  };

  /**
   * The function that is called as the controller action, is expected
   * to render something
   *
   * @method setFunction()
   * @param {Function} fn the controller
   */
  self.setFunction = function setFunction(fn) {
    self.fn = fn;
  };

  /**
   * Set the arguments passed to the controller
   *
   * @method setArguments()
   * @param {Array} args the arguments
   */
  self.setArguments = function setArguments(args) {
    self.args = args;
  };

  /**
   * Start the deconstruct phase of the transit, ask the current
   * state for the que
   * 
   * @return {Promise} the promise that completes when the que is finished
   * @todo  retrieve from current state
   */
  self.deconstruct = function deconstruct() {

    var que = [];
    return Promise.all(que);
  };


  /**
   * Get the construct que from the new state and return a promise
   * that resolves when each promise in the que is resolved
   * 
   * @return {Promise} the promise
   * @todo Retrieve que from state
   */
  self.construct = function construct() {
    
    if(self.newState === false)
      throw new Error('Controller did not provide an valid state, received: "'+self.result+'"');

    var que = [];
    return Promise.all(que);
  };

  /**
   * Call the controller as the provided Fn, in the said scope using 
   * the given arguments
   *
   * @method run()
   * @return {Promise} the promise that resolves when the controller is complete
   */
  self.run = function run() {

    var p = runResolver.promise;
    if(self.newState !== false) {
      self.render(self.newState);
      return p;
    }

    if(self.result !== false) {
      self.render(self.result);
      return p;
    }

    if(!self.fn) {
      throw new Error('Unable to find the controller for path "'+self.url+'". Maybe you forgot to add the matching route?');
    }

    if(!Array.isArray(self.args)) {
      throw new Error('Provided controller arguments should be an Array, received "'+self.args+'"');
    }

    if(typeof self.scope !== 'object') {
      throw new Error('Provided controller scope should be an Object, received "'+self.scope+'"');
    }

    //if controller returns something right away (sync), try to render it
    self.startTimeout();
    var res = self.fn.apply(self.scope, self.args);
    if(res !== undefined) {
      self.render(res);
    }

    return p;

  };

  /**
   * Attempts to render the controllers result into the new state
   *
   * @method render()
   * @param  {mixed} result the controllers retunred value
   * @return {State} the new state or an exception
   */
  self.render = function render(result) {
    runResolver.resolve(result);
    self.result = result;
    self.stopTimeout();
    
    if(!result) {
      throw new Error('Did you provide a value when rendering? received: "'+result+'"');
    }

    //duck type to see if if its an state object, if so set it right away
    if(typeof result === 'object' && result.content !== undefined) {
      self.newState = result;
    }
    
  };

};


/**
 * Static factory method for creating transit instances from an browser event
 * 
 * @param  {DOMEvent} e the event
 * @return {Transit}   the transit instance
 */
Transit.createFromEvent = function(e, Promise) {

  if(e.currentTarget.hasAttribute('href') === false) 
    throw new Error('[CLIENT] normalize() expected clicked element "'+e.currentTarget+'" to have an href attribute.');

  var url = e.currentTarget.getAttribute('href');
  if(url.indexOf('#') !== -1) {
    url = url.substring(url.indexOf('#')+1);
  }

  var t = new Transit(url, Promise);
  return t;
};

/**
 * Stacit factory method fro creating transit from an express req res
 *   
 * @param  {req} req express request
 * @param  {res} res express response
 * @return {Transit}     The transit instance
 */
Transit.createFromReq = function(req, res, Promise) {
  var t = new Transit(req.url, Promise, req.method);

  return t;
};



module.exports = Transit;
},{"./state.js":43}],46:[function(require,module,exports){
/* global window */
var Ticket = require('../src/ticket.js');
var Transit = require('../src/transit.js');
var State = require('../src/state.js');
var Resolver = require('../src/resolver.js');

var Promise = require("bluebird");
var Emitter = require('eventemitter2').EventEmitter2;

var express = require('express');
var request = require('supertest');
var Browser = require("zombie");

var bctx, sctx, browser;
var server = false;
var browser = false;
try {
  var bctx = window;
  var sctx = false; //fake server ctx
  var sinon = window.sinon;

} catch(e) {
  server = true;
  var sinon = require('sinon');
}

describe('Ticket', function(){

  var st, bt, e, r;
  beforeEach(function(){

    e = new Emitter();
    r = new Resolver();

    if(server) {
      browser = new Browser({ debug: true });
      sctx = express();
      bctx = browser.open();
      st = new Ticket(e, r, Promise, sctx);      
    }
  
    bt = new Ticket(e, r, Promise, bctx);

  });


  describe('#construct()', function(){

    it('should initialize members', function(){

      if(server) {
        st.should.be.an.instanceOf(Ticket);
        st.context.should.equal(sctx);
      }

      bt.should.be.an.instanceOf(Ticket);
      bt.context.should.equal(bctx);

    });

  });

  describe('#isServer()', function(){

    it('should return true if on server', function(){

      if(server) {
        st.isServer().should.equal(true);  
      }
      
      bt.isServer().should.equal(false);

    });

  });

  describe('#install()', function(){

    it('should install event listener in the browser', function(){

      sinon.stub(bt, 'normalize', function(){ return new Transit('/test', Promise); });
      sinon.stub(bt, 'handle', function(){ return new Promise(function(resolve, reject){resolve('test');}); });
      var res = bt.install();
      bctx.document.onclick();
      bt.normalize.callCount.should.equal(1);
      bt.handle.callCount.should.equal(1);
      res.should.equal(bt);

    });

    if(server) {
      it('should install middleware listener on the server', function(done){

        var t = new Transit('/test', Promise);
        sinon.stub(st, 'normalize', function(req, res){ 
            arguments.length.should.equal(2); 
            res.end(); //just cancel the req for now
            return t;
        });

        sinon.stub(st, 'handle', function(){ 
            return new Promise(function(resolve, reject){
                resolve('test');

              });
            }
        );

        st.install();
        
        request(sctx)
          .get('/bogus')
          .expect(200, '')
          .end(function(){
            st.normalize.callCount.should.equal(1);
            st.handle.callCount.should.equal(1);
            t.hasAttribute('_res').should.equal(true);
            t.hasAttribute('_req').should.equal(true);
            t.hasAttribute('_next').should.equal(true);
            done();
          });

      });
    }

  });

  describe('#handle()', function(){

    var t;
    beforeEach(function(){
      t = new Transit('/bogus', Promise);
    });

    
    it('should emit start event', function(done) {

      e.on('transit.start', function(t){
        t.setFunction( function(){} );
        t.should.be.an.instanceOf(Transit);
        done();
      });
      
      bt.handle(t);
      t.stopTimeout();

    });


    it('should call deconstruct and emit controller event', function(done) {

      sinon.stub(t, 'deconstruct');

      var c = function() {};

      e.on('transit.start', function(t){
        t.setFunction( c );
      });

      e.on('transit.controller', function(t){        
        t.scope.should.an.instanceOf(Object);
        t.fn.should.equal(c);
        t.args.should.be.an.instanceOf(Array);
        t.deconstruct.callCount.should.equal(1);
        done();
      });
      
      bt.handle(t);
      t.stopTimeout();

    });
  

    it('should run function and emit view event', function(done) {

      e.on('transit.controller', function(t){  
        t.setFunction(function(){
          this.render(new State('hello world'));
        });
      });

      e.on('transit.view', function(t){  
        t.should.be.an.instanceOf(Transit);
        t.result.content.should.equal('hello world');

        done();
      });

      bt.handle(t);

    });

    it('should run end event', function(done) {

      e.on('transit.controller', function(t){  
        t.setFunction(function(){
          this.render(new State('hello world'));
        });
      });

      e.on('transit.end', function(t){
        t.should.be.an.instanceOf(Transit);

        done();
      });

      var ended = bt.handle(t);
      ended.should.be.an.instanceOf(Promise);

    });

    
    it('throw on wrong response', function() {

      r.getFunction = function(){ return false; };
      (function(){
        try {
          bt.handle(t);    
        } catch(err) {
          t.stopTimeout();
          throw err;
        }        
      }).should.throw();
      
    });
  
  });

  describe('#normalize()', function(){

    it('should throw on wrong browser event', function(){

      var link = bctx.document.createElement('a');       
      var failed = false;
      link.id = 'test-link';
      link.innerHTML = 'test';
      bctx.document.body.appendChild(link);

      link.onclick = function(e) {
        try {
          bt.normalize();
          failed = false;
        } catch(err) {
          failed = true;
        }
      };

      var e = bctx.document.createEvent('MouseEvents');
      e.initEvent('click', true, true);
      link.dispatchEvent(e);
      failed.should.equal(true); //e not passed

      link.onclick = function(e) {
        try {
          bt.normalize('bogus');
          failed = false;
        } catch(err) {
          failed = true;
        }
      };

      link.dispatchEvent(e);
      failed.should.equal(true); // no event passed
      var t = false;

      link.onclick = function(e) {
        try {
          t = bt.normalize(e);

          failed = false;
          e.preventDefault();
        } catch(err) {
          failed = true;
        }
      };

      link.dispatchEvent(e);
      failed.should.equal(true); // no href to be found

      link.setAttribute('href', '/#/test');
      link.dispatchEvent(e);
      failed.should.equal(false);

      //asserts
      t.should.be.an.instanceOf(Transit);
      t.url.should.equal('/test');

      link.setAttribute('href', '/test');
      link.dispatchEvent(e);
      t.url.should.equal('/test');

    });

    if(server) {
      it('should throw on wrong server args', function(){

        sctx.use(function(req,res){

          (function(){
            st.normalize('a'); //to few args
          }).should.throw();

          (function(){
            st.normalize('a', 'a'); // wrong req
          }).should.throw();
          
          (function(){
            st.normalize(req, 'a'); // wrong req
          }).should.throw();

          var t = st.normalize(req, res);
          t.should.be.an.instanceOf(Transit);

          if(req.url === '/test') {
            t.url.should.equal('/test');
          } else {
            t.url.should.equal('/test2');
            t.method.should.equal('POST');
          }
          res.end();
        });

        //trigger middleware
        request(sctx).get('/test').end(function(){});

        request(sctx).post('/test2').end(function(){});

      });
    }


  });


});




},{"../src/resolver.js":42,"../src/state.js":43,"../src/ticket.js":44,"../src/transit.js":45,"bluebird":4,"eventemitter2":41,"express":39,"sinon":39,"supertest":39,"zombie":39}]},{},[46])
;