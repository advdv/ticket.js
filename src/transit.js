var Promise = require("bluebird");
var State = require('./state.js');

/**
 * A new transition requires the url to transit to and the method
 *   
 * @param {string} url    the url
 * @param {string} method the method
 */
var Transit = function Transit(url, method) {
  var self = this;
  var runResolver = Promise.defer();
  var attributes = {};

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
Transit.createFromEvent = function(e) {

  if(e.currentTarget.hasAttribute('href') === false) 
    throw new Error('[CLIENT] normalize() expected clicked element "'+e.currentTarget+'" to have an href attribute.');

  var url = e.currentTarget.getAttribute('href');
  if(url.indexOf('#') !== -1) {
    url = url.substring(url.indexOf('#')+1);
  }

  var t = new Transit(url);
  return t;
};

/**
 * Stacit factory method fro creating transit from an express req res
 *   
 * @param  {req} req express request
 * @param  {res} res express response
 * @return {Transit}     The transit instance
 */
Transit.createFromReq = function(req, res) {
  var t = new Transit(req.url, req.method);

  return t;
};



module.exports = Transit;