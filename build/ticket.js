;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Ticket = require('./src/ticket.js');

module.exports = Ticket;
},{"./src/ticket.js":4}],2:[function(require,module,exports){
/**
 * This error is thrown whenever the controller returns something that cannot be used
 */
function ControllerReturnedInvalidError() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = 'ControllerReturnedInvalidError';

    this.stack = tmp.stack;
    this.message = tmp.message;

    return this;
}
    var IntermediateInheritor = function() {};
        IntermediateInheritor.prototype = Error.prototype;
    ControllerReturnedInvalidError.prototype = new IntermediateInheritor();


/**
 * This error is thrown whenever the controller fails to retrurn something in time
 */
function ControllerTimeoutError() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = 'ControllerTimeoutError';

    this.stack = tmp.stack;
    this.message = tmp.message;

    return this;
}
    var IntermediateInheritor = function() {};
        IntermediateInheritor.prototype = Error.prototype;
    ControllerTimeoutError.prototype = new IntermediateInheritor();


/**
 * Is thrown whenever it failed to find a controller
 */
function ControllerNotFoundError() {
    var tmp = Error.apply(this, arguments);
    tmp.name = this.name = 'ControllerNotFoundError';

    this.stack = tmp.stack;
    this.message = tmp.message;

    return this;
}
    var IntermediateInheritor = function() {};
        IntermediateInheritor.prototype = Error.prototype;
    ControllerNotFoundError.prototype = new IntermediateInheritor();


module.exports = {
  ControllerNotFound: ControllerNotFoundError,
  ControllerTimeout: ControllerTimeoutError,
  ControllerReturnedInvalid: ControllerReturnedInvalidError
};
},{}],3:[function(require,module,exports){
var State = function State(content) {
  var self = this;

  /**
   * The state's content  
   * @type {string}
   */
  self.content = content;

};

module.exports = State;
},{}],4:[function(require,module,exports){
/* globals setTimeout, clearTimeout */
var Transit = require('./transit.js');
var Errors = require('./errors.js');

/**
 * The ticket instance takes an single argument in the browser environment; the browser window
 *
 * @param {object} emmitter The event emitter that emits the kernel events
 * @param {Resolver} resolver the object responsible for resolving the callable from the transition
 * @param {Normalizer} is able to normalize browser events and request objects into an new transit
 * @param {Promise} the bluebird promise lib
 * @param {DOMWindow|express} [context] the window on the client & express app on the server
 */
var Ticket = function Ticket(resolver, normalizer, Promise, context) {
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
   * @return {Promise} resolves when transit is handled
   */
  self.handle = function handle(transit) {
    var deferred = transit.deferred;

    //deconstruct state
    var started = transit.start();

    transit.controller.scope = resolver.getScope(transit);
    transit.controller.args = resolver.getArguments(transit);
      if(typeof transit.controller.fn !== 'function')
        transit.controller.fn = resolver.getFunction(transit);

    //reject when controller run takes to long
    var timer = setTimeout(function(){
      deferred.reject(new Errors.ControllerTimeout('Controller for transit to url "' + transit.url + '" exceeded maximum execution time of: "'+transit.timeout+'ms", did the controller call render?'));
    }, transit.timeout);

    //run controller
    var ended = transit.run().then(function(){
      clearTimeout(timer);

      //when ran, end the transit
      return transit.end();
    }, function(err){
      deferred.reject(err);
    });

    //when everything is finished, resolve it with new state
    Promise.all([started, ended]).then(function(){
      transit.emit('end', transit); //let transit emit end event

      //when start and end it complete resolve the transit
      deferred.resolve(transit.to);
    }, function(err){
      deferred.reject(err);
    });

    return deferred.promise;
  };


  /**
   * Install the kernel with the handler to handle transits
   *   
   * @param  {Function} fn the transit handler
   * @return {[type]}      [description]
   */
  self.install = function install(fn) {
    var doHandle = function(t, args) {
        fn(t, args);
        try {
          self.handle(t);  
        } catch(err) {
          t.deferred.reject(err);
        }
    };

    if(self.isServer()) {
      self.context.use(function(req, res, next){
        var t = self.normalize(req, res);
        doHandle(t, arguments);
      });
    } else {
      self.context.document.onclick = function(e) {      
        var t = self.normalize(e);
        if(t === false || t === undefined)
          return;

        doHandle(t, arguments);
      };
    }
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

      return normalizer.normalizeServerRequest(req, res);

    } else {

      var e = arguments[0];      
      if(e === undefined || e.currentTarget === undefined) {
        throw new Error('[CLIENT] normalize() expects argument to be an DOMEvent, received:' + e);
      }

      return normalizer.normalizeBrowserEvent(e);

    }

  };

};

module.exports = Ticket;
},{"./errors.js":2,"./transit.js":5}],5:[function(require,module,exports){
/* globals setTimeout, clearTimeout */
var State = require('./state.js');
var Errors = require('./errors.js');

/**
 * A new transition requires the url to transit to and the method
 *   
 * @param {string} url    the url
 */
var Transit = function Transit(url, Promise, emitter) {
  var self = this;
  var attributes = {};
  var controllerResolver = Promise.defer();

  /**
   * The new url we are transitioning to
   * @type {string}
   */
  self.url = url;

  /**
   * How long the controller can take before it times out
   * @type {Number}
   */
  self.timeout = 5000;

  /**
   * Will contain the new state we are transitting to
   * 
   * @type {Boolean}
   */
  self.to = false;

  /**
   * The result that is returned from the controller
   * @type {mixed}
   */
  self.result = false;

  /**
   * The promise that completes whenever the transit is completely finished
   * @type {Promise}
   */
  self.deferred = Promise.defer();


  /**
   * Holds the controller as an scope, fn and args
   * @type {Object}
   */
  self.controller = {
    scope: self,
    args: [],
    fn: false
  };

  /**
   * Attach a listener to an event on this transit
   * 
   * @param  {string}   event name of the event
   * @param  {Function} fn    the handler
   * @return {Transit}         itself
   * @chainable
   */
  self.on = function on(event, fn) {
    emitter.on('transit.'+event+'.'+self.url, fn);



    return self;
  };

  /**
   * Emit an event from the transit using the specific prefix
   * 
   * @param  {string}   event name of the event   
   * @param {args}  other arguments
   * @return {Transit}         itself
   * @chainable
   */
  self.emit = function emit(event) {
    var args = Array.prototype.slice.call(arguments);
    args[0] = 'transit.'+event+'.'+self.url;
    emitter.emit.apply(emitter, args);
    return self;
  };  

  /**
   * Returns promise that completes when deconstruction 
   * phase from old state is complete
   *   
   * @return {Promise} the promise
   */
  self.start = function start() {
    self.emit('start', self); //[EMIT] before anything
    return Promise.all([]);
  };

  /**
   * Returns promise that completes when construction 
   * phase to the new state is complete
   *   
   * @return {Promise} the promise
   */
  self.end = function end() {

    //check if new state is set
    if(self.to === false)
      throw new Errors.ControllerReturnedInvalid('Transit "to" state was not set from result, result is: "'+self.result+'"');

    return Promise.all([]);
  };

  /**
   * Returns a promise that completes whenever the controller
   * has finished running;
   * 
   * @return {Promise} the promise
   */
  self.run = function run() {
    self.emit('controller', self); //[EMIT] before controller is called
    var p = controllerResolver.promise;
    if(self.to !== false) {
      self.render(self.to);
      return p;
    }

    if(self.result !== false) {
      self.render(self.result);
      return p;
    }

    if(!self.controller.fn) {
      throw new Errors.ControllerNotFound('Unable to find the controller for path "'+self.url+'". Maybe you forgot to add the matching route?');
    }

    if(!Array.isArray(self.controller.args)) {
      throw new Error('Provided controller arguments should be an Array, received "'+self.controller.args+'"');
    }

    if(typeof self.controller.scope !== 'object') {
      throw new Error('Provided controller scope should be an Object, received "'+self.controller.scope+'"');
    }

    //if controller returns something right away (sync), try to render it
    var args = self.controller.args;

    args.unshift(self);
    var res = self.controller.fn.apply(self.controller.scope, args);
    if(res !== undefined) {
      self.render(res);
    }

    return p;
  };

  /**
   * Renders the result of the controller, this resolves the promise
   * returned by run()
   *   
   * @param  {mixed} result
   */
  self.render = function render(result) {
    controllerResolver.resolve(result);
    self.result = result;
    self.emit('view', self);

    if(!self.result) {
      throw new Errors.ControllerReturnedInvalid('Did you provide a value when rendering? received: "'+result+'"');
    }

    //duck type to see if if its an state object, if so set it right away
    if(typeof self.result === 'object' && self.result.content !== undefined) {
      self.to = self.result;
    }
    
  };

  /**
   * ATTRIBUTE MANIPULATION
   */

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
   * Add several attributes to the transit, does not remove existing
   * attributes but does overwrite
   * 
   * @param {object} attrs the attributes
   */
  self.addAttributes = function addAttributes(attrs) {
    Object.keys(attrs).forEach(function(key){
      attributes[key] = attrs[key];
    });
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
   * Get all configured attributes of the transit
   *
   * @method getAttributes()
   * @return {object} [description]
   */
  self.getAttributes = function getAttributes() {
    return attributes;
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


};

module.exports = Transit;
},{"./errors.js":2,"./state.js":3}]},{},[1])
;