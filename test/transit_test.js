/*globals setTimeout */
var Transit = require('../src/transit.js');
var State = require('../src/state.js');
var Errors = require('../src/errors.js');

var Promise = require("bluebird");
var sinon = require('sinon');

describe('Transit', function(){

  var t;
  beforeEach(function(){
    t = new Transit('/test', Promise);
  });

  describe('#construct()', function() {

    it("should mixin promise", function(){



    });


    it("should mixin event emitter", function(){



    });


    it("should construct promises", function(){
    
      t.url.should.equal('/test');

      t.setAttribute('test', 'test');
      t.getAttribute('test').should.equal('test');

      t.setAttributes({
        test: 'replace',
        "new": 'new'
      });

      t.getAttribute('test').should.equal('replace');
      t.getAttribute('new').should.equal('new');

      t.addAttributes({
        test: 'replace2',
        extra: 'extra'
      });

      t.getAttribute('test').should.equal('replace2');
      t.getAttribute('new').should.equal('new');
      t.getAttribute('extra').should.equal('extra');

      t.hasAttribute('extra').should.equal(true);
      t.hasAttribute('bogus').should.equal(false);
      
      var res = t.getAttributes();
      Object.keys(res).length.should.equal(3);

    });


  });


  describe('#run()', function() {

    it("it should throw", function(){

      (function(){
        t.run();  
      }).should.throw(Errors.ControllerNotFound); //no controller

      t.controller.fn = function(){};
      t.controller.args = 'a';

      (function(){
        t.run();  
      }).should.throw(Error); //invalid args

      t.controller.args = ['a'];
      t.controller.scope = 'a';
    
      (function(){
        t.run();  
      }).should.throw(Error); //invalid scope

    });

    it("should be resolved when controller returns immediately", function(done){

      sinon.spy(t, 'render');
      t.controller.fn = function() {
        arguments[0].should.equal(t);
        return 'a';
      };

      var p = t.run();  
      p.then.should.be.an.instanceOf(Function); // promises/A+
      
      p.then(function(){        
        t.render.callCount.should.equal(1);
        done();
      });

    });

    it("should not call controller when new state is already set", function(done){

      sinon.spy(t, 'render');

      var s = new State('finished up front');
      t.to = s;

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

    it("on async response from controller call render", function(done){

      sinon.spy(t, 'render');
      var s = new State('async response');
      t.controller.fn = function(t) {
        setTimeout(function(){
          t.render(s);
        }, 100);
      };

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
      }).should.throw(Errors.ControllerReturnedInvalid);
    });

    it("Should set a new state when received one", function(){
      var s = new State('html');
      t.render(s);
      t.to.should.equal(s);
    });


  });

  describe('#start()', function() {


    it("should work", function(){

      var p = t.start();
      p.then.should.be.an.instanceOf(Function); // promises/A+
    });

  });



  describe('#end()', function() {

    it("it should throw", function(){
      (function(){
        t.end();  
      }).should.throw(Errors.ControllerReturnedInvalid);
    });

    it("should work", function(){

      t.to = new State('hello world');
      var p = t.end();
      p.then.should.be.an.instanceOf(Function); // promises/A+
    });

  });



});
