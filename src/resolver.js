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