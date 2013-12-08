var Transit = require('./transit.js');

var Normalizer = function Normalizer(Promise, emitter) {
  var self = this;

/**
 * Creates transit instances from an browser event
 * 
 * @param  {DOMEvent} e the event
 * @return {Transit}   the transit instance
 */
  self.normalizeBrowserEvent = function normalizeBrowserEvent(e) {

    if(e.target.hasAttribute === undefined || e.target.hasAttribute('href') === false) 
      return false;

    var url = e.target.getAttribute('href');
    if(url.indexOf('#') !== -1) {
      url = url.substring(url.indexOf('#')+1);
    }

    var t = new Transit(url, Promise, emitter);
    return t;

  };

  /**
   * Creating transit from an express req res
   *   
   * @param  {req} req express request
   * @param  {res} res express response
   * @return {Transit}     The transit instance
   */
  self.normalizeServerRequest = function normalizeServerRequest(req, res) {
    var t = new Transit(req.url, Promise, emitter);

    return t;
  };

};

module.exports = Normalizer;