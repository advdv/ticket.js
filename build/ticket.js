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
var Ticket = function Ticket(emitter, resolver, normalizer, Promise, context) {
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
    return new Promise(function(resolve, reject){

      //[EMIT] for start logic
      emitter.emit('transit.start', transit);

      //deconstruct state
      var started = transit.start();

      //use the resolver to get scope, args and fn
      transit.setScope( resolver.getScope(transit) );
      transit.setArguments( resolver.getArguments(transit) );
      if(transit.fn === false)
        transit.setFunction( resolver.getFunction(transit) );

      //[DELEGATE] for just before controller logic
      emitter.emit('transit.controller', transit);

      //reject when controller run takes to long
      var timer = setTimeout(function(){
        reject(new Errors.ControllerTimeout('Controller for transit to url "' + transit.url + '" exceeded maximum execution time of: "'+transit.MAX_EXECUTION_TIME+'ms", did the controller call render?'));
      }, transit.MAX_EXECUTION_TIME);

      //run controller
      var ended = transit.run().then(function(){
        clearTimeout(timer);

        try {
          //[EMIT] for view logic
          emitter.emit('transit.view', transit);  
        } catch(err) {
          reject(err);
        }

        return transit.end();
      }, reject);

      //when everything is finished, resolve it with new state
      Promise.all([started, ended]).then(function(){

        //[EMIT] for end logic
        emitter.emit('transit.end', transit);

        resolve(transit.to);
      }, reject);

    });
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
        var t = self.normalize(e);
        if(t === false || t === undefined)
          return;

        self.handle(t);
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
 * @param {string} method the method
 */
var Transit = function Transit(url, Promise, method) {
  var self = this;
  var deferred = Promise.defer();
  var attributes = {};
  var timer;

  /**
   * Maximum time we wait for the controller to finish
   * 
   * @type {Number}
   */
  self.MAX_EXECUTION_TIME = 5000;



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
   * The function that acts as the controller
   * @type {mixed}
   */
  self.fn = false;

  /**
   * Scope in which the controller function will be executed
   * @type {object}
   */
  self.scope = self;

  /**
   * The arguments that will be passed to the function
   * @type {Array}
   */
  self.arguments = [];


  /**
   * The result that is returned from the controller
   * @type {mixed}
   */
  self.result = false;

  /**
   * The new state we Transition TO
   * @type {State}
   */
  self.to = false;

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
    self.arguments = args;
  };

  /**
   * Start the deconstruct phase of the transit, ask the current
   * state for the que
   * 
   * @return {Promise} the promise that completes when the que is finished
   * @todo  retrieve from current state
   */
  self.start = function start() {
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
  self.end = function end() {
    if(self.to === false)
      throw new Errors.ControllerReturnedInvalid('Transit "to" was not set from result, result is: "'+self.result+'"');

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

    var p = deferred.promise;
    if(self.to !== false) {
      self.render(self.to);
      return p;
    }

    if(self.result !== false) {
      self.render(self.result);
      return p;
    }

    if(!self.fn) {
      throw new Errors.ControllerNotFound('Unable to find the controller for path "'+self.url+'". Maybe you forgot to add the matching route?');
    }

    if(!Array.isArray(self.arguments)) {
      throw new Error('Provided controller arguments should be an Array, received "'+self.arguments+'"');
    }

    if(typeof self.scope !== 'object') {
      throw new Error('Provided controller scope should be an Object, received "'+self.scope+'"');
    }

    //if controller returns something right away (sync), try to render it
    var res = self.fn.apply(self.scope, [self]);
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
    deferred.resolve(result);
    self.result = result;
    
    if(!result) {
      throw new Error('Did you provide a value when rendering? received: "'+result+'"');
    }

    //duck type to see if if its an state object, if so set it right away
    if(typeof result === 'object' && result.content !== undefined) {
      self.to = result;
    }
    
  };

};

module.exports = Transit;
},{"./errors.js":2,"./state.js":3}]},{},[1])
;