;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Ticket = require('./src/ticket.js');

module.exports = Ticket;
},{"./src/ticket.js":2}],2:[function(require,module,exports){
/* global process */

/**
 * The ticket instance takes an single argument in the browser environment; the browser window
 * 
 * @param {DOMWindow} [win] the dom window not needed on the server
 */
var Ticket = function Ticket(context) {
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
   * Install onto the context, in the browser this means listening to click
   * events, on the server this installing middleware
   *
   * @method install()
   */
  self.install = function install() {
    if(self.isServer()) {
      self.context.use(function(req, res, next){
        self.handle(req, res);

        //Todo: call next()?

      });
    } else {
      self.context.document.onclick = function(e) {      
        self.handle(e);
      };
    }
  };


  /**
   * Handles the event for each environment, in the browser this is the click event, on the 
   * server the request/res object
   *
   * @method handel()
   * @param  {DOMEvent|req} the event/request
   * @param  {res} [res] the response object of the server
   */
  self.handle = function handle() {

    if(self.isServer()) {
      if(arguments.length !== 2) {
        throw new Error('[SERVER] Handle() expects 2 arguments, received: '+ arguments.length);
      }        

      var req = arguments[0];
      var res = arguments[1];

      if(req.url === undefined)
        throw new Error('[SERVER] Handle() expects first arguments to be an req object with an url, received: '+ req);

      if(res.statusCode === undefined)
        throw new Error('[SERVER] Handle() expects second arguments to be an res object with an url, received: '+ req);

      //TODO: Return something useful

    } else {


      var e = arguments[0];      
      if(e === undefined || e.currentTarget === undefined) {
        throw new Error('[CLIENT] Handle() expects argument to be an DOMEvent, received:' + e);
      }

      if(e.currentTarget.hasAttribute('href') === false) 
        throw new Error('[CLIENT] Handle() expected clicked element "'+e.currentTarget+'" to have an href attribute:' + e);

      var url = e.currentTarget.getAttribute('href');

      //TODO: return something useful

    }

  };




};

module.exports = Ticket;
},{}]},{},[1])
;