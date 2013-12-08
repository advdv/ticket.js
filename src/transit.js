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
   * This is called at the very ending of an transit, it
   * emits the end event and removes all listeners
   * @return {[type]} [description]
   */
  self.terminate = function terminate() {
    self.emit('end', self); //let transit emit end event
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