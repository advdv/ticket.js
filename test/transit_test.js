var Transit = require('../src/transit.js');
var State = require('../src/state.js');

var Promise = require("bluebird");
var sinon = require('sinon');

describe('Transit', function(){

  var t;
  beforeEach(function(){
    t = new Transit('/test');
  });

  it("should construct promises", function(){
  
    t.method.should.equal('GET');
    t.url.should.equal('/test');

    t.setAttribute('test', 'test');
    t.getAttribute('test').should.equal('test');

    t.setAttributes({
      test: 'replace',
      "new": 'new'
    });

    t.getAttribute('test').should.equal('replace');
    t.getAttribute('new').should.equal('new');

  });


  describe('#run()', function() {

    it("it should throw", function(){

      (function(){
        t.run();  
      }).should.throw();

      t.setFunction(function(){});
      t.setArguments('a');

      (function(){
        t.run();  
      }).should.throw();

      t.setArguments(['a']);
      t.setScope('a');
    
      (function(){
        t.run();  
      }).should.throw();


    });

    it("should be resolved when controller returns immediately", function(done){

      sinon.spy(t, 'render');

      t.setFunction(function(){
        return 'a';
      });

      var p = t.run();  
      p.should.be.an.instanceOf(Promise);
      
      p.then(function(){        
        t.render.callCount.should.equal(1);
        done();
      });

    });

    it("should not call controller when new state is already set", function(done){

      sinon.spy(t, 'render');

      var s = new State('finished up front');
      t.newState = s;

      var p = t.run();
      p.then(function(res){        
        t.render.callCount.should.equal(1);
        res.should.equal(s);
        done();
      });

    });

    it("should not call controller when result is already set", function(done){

      sinon.spy(t, 'render');

      var s = new State('finished up front');
      t.result = s;

      var p = t.run();
      p.then(function(res){        
        t.render.callCount.should.equal(1);
        res.should.equal(s);
        done();
      });

    });


  });

  describe('#render()', function() {

    it("it should throw", function(){
      (function(){
        t.render();  
      }).should.throw();
    });

    it("Should set a new state when received one", function(){
      var s = new State('html');
      t.render(s);
      t.newState.should.equal(s);
    });


  });


  describe('#construct()', function() {

    it("it should throw", function(){
      (function(){
        t.construct();  
      }).should.throw();
    });

    it("should work", function(){

      t.newState = new State('hello world');
      var p = t.construct();
      p.should.be.an.instanceOf(Promise);
    });

  });




});
