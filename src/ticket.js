var Transit = require('./transit.js');

/**
 * The ticket instance takes an single argument in the browser environment; the browser window
 *
 * @param {object} emmitter The event emitter that emits the kernel events
 * @param {Resolver} resolver the object responsible for resolving the callable from the transition
 * @param {Normalizer} is able to normalize browser events and request objects into an new transit
 * @param {Promixe} the promise library
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