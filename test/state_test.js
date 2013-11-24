var State = require('../src/state.js');

describe('State', function(){

  var s;
  beforeEach(function(){
    s = new State('html');
    s.content.should.equal('html');
  });

  it("should construct promises", function(){
  

  });

});
