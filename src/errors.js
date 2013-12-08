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