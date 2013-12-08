/* global window */
var Ticket = require('../src/ticket.js');
var Transit = require('../src/transit.js');
var State = require('../src/state.js');
var Resolver = require('../src/resolver.js');
var Normalizer = require('../src/normalizer.js');
var Errors = require('../src/errors.js');

var Promise = require("bluebird");
var Emitter = require('eventemitter2').EventEmitter2;

var express = require('express');
var request = require('supertest');
var Browser = require("zombie");

var bctx, sctx, browser;
var server = false;
var browser = false;
try {
  var bctx = window;
  var sctx = false; //fake server ctx
  var sinon = window.sinon;

} catch(e) {
  server = true;
  var sinon = require('sinon');
}

describe('Ticket', function(){

  var st, bt, e, r, n;
  beforeEach(function(){

    e = new Emitter();
    r = new Resolver();
    n = new Normalizer(Promise, e);

    if(server) {
      browser = new Browser({ debug: true });
      sctx = express();
      bctx = browser.open();
      st = new Ticket(r, n, Promise, sctx);      
    }
  
    bt = new Ticket(r, n, Promise, bctx);

  });


  describe('#construct()', function(){

    it('should initialize members', function(){
      if(server) {
        st.should.be.an.instanceOf(Ticket);
        st.context.should.equal(sctx);
      }

      bt.should.be.an.instanceOf(Ticket);
      bt.context.should.equal(bctx);
    });

  });


  describe('#isServer()', function(){
    it('should return true if on server', function(){
      if(server) {
        st.isServer().should.equal(true);  
      }
      
      bt.isServer().should.equal(false);
    });
  });


  describe('#install()', function(){

    var doClick;
    beforeEach(function(){
      sinon.stub(bt, 'normalize', function(){ return new Transit('/test', Promise, e); });
      sinon.stub(bt, 'handle', function(){});

      if(server) {
        sinon.stub(st, 'normalize', function(){ return new Transit('/test', Promise, e); });
        sinon.stub(st, 'handle', function(){});
      }

      //create fake click
      var e = bctx.document.createEvent('MouseEvents');
      e.initEvent('click', true, true);
      doClick = function() {
        bctx.document.dispatchEvent(e);
      };

    });

    it('should install event listener in the browser', function(done){

      bt.install(function(t, args){
        t.should.be.an.instanceOf(Transit);
        args.length.should.equal(1);

        //check if api is called
        bt.normalize.callCount.should.equal(1);
        bt.handle.callCount.should.equal(0);

        done();
      });

      //click to call install
      doClick();

    });

    it('should not call handle when normalize return false', function(){

      bt.normalize.restore(); //restore to return false
      sinon.stub(bt, 'normalize', function(){ return false; });

      bt.install();
      doClick();

      //handle should not have been called
      bt.normalize.callCount.should.equal(1);
      bt.handle.callCount.should.equal(0);

    });

    it('exceptions should reject the deferred', function(done){

      bt.handle.restore(); //restore to return false
      sinon.stub(bt, 'handle', function(){ throw new Error('test'); });


      bt.install(function(t){

        t.deferred.promise.catch(function(err){
          err.message.should.equal('test');
          bt.normalize.callCount.should.equal(1);
          bt.handle.callCount.should.equal(1);
          done();
        });

      });

      doClick();

    });

    if(server) {
      it('should install middleware listener on the server', function(done){

        st.install(function(t, args){
          t.should.be.an.instanceOf(Transit);
          args.length.should.equal(3);

          //check if api is called
          st.normalize.callCount.should.equal(1);
          st.handle.callCount.should.equal(0);
          done();

        });

        //send fake request
        request(sctx)
          .get('/bogus')
          .expect(200, '')
          .end(function(){});

      });
    }

  });


  describe('#handle()', function(){

    var t;
    beforeEach(function(){
      t = new Transit('/bogus', Promise, e);
      Promise.onPossiblyUnhandledRejection(function(error){
          throw error;
      });

      sinon.spy(r, 'getScope');
      sinon.spy(r, 'getArguments');
      sinon.spy(r, 'getFunction');

    });

    it('should complete when all return immediately', function(done){

      var success = false;
      t.on('end', function(){
        success = true;
      });

      sinon.stub(t, 'start', function(){ return new Promise(function(res, rej){ res(); }); });
      sinon.stub(t, 'run', function(){ return new Promise(function(res, rej){ res(); }); });
      sinon.stub(t, 'end', function(){ return new Promise(function(res, rej){ res(); }); });

      var p = bt.handle(t);
      p.should.be.an.instanceOf(Promise);
      p.then(function(){

        success.should.equal(true);
        r.getScope.callCount.should.equal(1);
        r.getArguments.callCount.should.equal(1);
        r.getFunction.callCount.should.equal(1);

        done();
      });

    });


    it('should throw when start throws', function(done){

      t.controller.fn = function(){};
      sinon.stub(t, 'start', function(){ 
        return new Promise(function(resolve, reject){
          throw new Error('deliberate error 1'); 
        });
      });

      sinon.stub(t, 'run', function(){ return new Promise(function(res, rej){ res(); }); });
      sinon.stub(t, 'end', function(){ return new Promise(function(res, rej){ res(); }); });

      var p = bt.handle(t);
      p.catch(function(err){
        err.message.should.equal('deliberate error 1');

        r.getScope.callCount.should.equal(1);
        r.getArguments.callCount.should.equal(1);
        r.getFunction.callCount.should.equal(0); //controller.fn was already set

        done();
      });

    });

    it('should throw when run throws', function(done){

      sinon.stub(t, 'run', function(){ 
        return new Promise(function(resolve, reject){
          throw new Error('deliberate error 2'); 
        });
      });

      sinon.stub(t, 'start', function(){ return new Promise(function(res, rej){ res(); }); });
      sinon.stub(t, 'end', function(){ return new Promise(function(res, rej){ res(); }); });

      var p = bt.handle(t);
      p.catch(function(err){
        err.message.should.equal('deliberate error 2');
        done();
      });

    });


    it('should throw timeout when run takes to long', function(done){

      t.timeout = 100;
      sinon.stub(t, 'start', function(){ return new Promise(function(res, rej){ res(); }); });
      sinon.stub(t, 'run', function(){ return new Promise(function(res, rej){  }); });
      sinon.stub(t, 'end', function(){ return new Promise(function(res, rej){ res(); }); });

      var p = bt.handle(t);
      p.catch(Errors.ControllerTimeout, function(err){
        err.message.indexOf(t.timeout.toString()).should.not.equal(-1); //error should display timeout
        done();
      });

    });




  });



  describe('#normalize()', function(){

    it('should throw on wrong browser event', function(){

      var link = bctx.document.createElement('a');       
      var failed = false;
      link.id = 'test-link';
      link.innerHTML = 'test';
      bctx.document.body.appendChild(link);

      link.onclick = function(e) {
        try {
          bt.normalize();
          failed = false;
        } catch(err) {
          failed = true;
        }
      };

      var e = bctx.document.createEvent('MouseEvents');
      e.initEvent('click', true, true);
      link.dispatchEvent(e);
      failed.should.equal(true); //e not passed

      link.onclick = function(e) {
        try {
          bt.normalize('bogus');
          failed = false;
        } catch(err) {
          failed = true;
        }
      };

      link.dispatchEvent(e);
      failed.should.equal(true); // no event passed
      var t = false;

      link.onclick = function(e) {
          t = bt.normalize(e);  //should return false on no href
          if(t === false) {
            failed = false;
          } else {
            failed = true;
          }
      };

      link.dispatchEvent(e);
      failed.should.equal(false); // no href to be found

      link.onclick = function(e) {
          t = bt.normalize(e);          
          if(t === false) {
            failed = true;
          } else {
            failed = false;
          }

          e.preventDefault();
      };

      link.setAttribute('href', '/#/test');
      link.dispatchEvent(e);
      failed.should.equal(false);

      //asserts
      t.should.be.an.instanceOf(Transit);
      t.url.should.equal('/test');

      link.setAttribute('href', '/test');
      link.dispatchEvent(e);
      t.url.should.equal('/test');

    });

  
    if(server) {
      it('should throw on wrong server args', function(){

        sctx.use(function(req,res){

          (function(){
            st.normalize('a'); //to few args
          }).should.throw();

          (function(){
            st.normalize('a', 'a'); // wrong req
          }).should.throw();
          
          (function(){
            st.normalize(req, 'a'); // wrong req
          }).should.throw();

          var t = st.normalize(req, res);
          t.should.be.an.instanceOf(Transit);

          if(req.url === '/test') {
            t.url.should.equal('/test');
          } else {
            t.url.should.equal('/test2');
          }
          res.end();
        });

        //trigger middleware
        request(sctx).get('/test').end(function(){});
        request(sctx).post('/test2').end(function(){});

      });
    }


  });

});



