var Resolver = require('../src/resolver.js');
var Transit = require('../src/transit.js');

var Promise = require("when");

describe('Resolver', function(){

  var t,r;
  beforeEach(function(){
    t = new Transit('/', Promise);
    r = new Resolver();
  });

  it("should get promises", function(){
    var f = function(){};
    var c = r.getFunction(t);
    c.should.equal(false);

    t.setAttribute('_controller', f);
    c = r.getFunction(t);
    c.should.equal(f);

  });

});
