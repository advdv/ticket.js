var Ticket = require('../src/ticket.js');

describe('Ticket', function(){

  var t;
  beforeEach(function(){
    
    t = new Ticket();

  });


  describe('#construct()', function(){

    it('should initialize members', function(){

      t.should.be.an.instanceOf(Ticket);

    });

  });


});