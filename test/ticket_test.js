/* global window */
var Ticket = require('../src/ticket.js');
var Transit = require('../src/transit.js');
var State = require('../src/state.js');
var Resolver = require('../src/resolver.js');

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

  var st, bt, e, r;
  beforeEach(function(){

    e = new Emitter();
    r = new Resolver();

    if(server) {
      browser = new Browser({ debug: true });
      sctx = express();
      bctx = browser.open();
      st = new Ticket(e, r, Promise, sctx);      
    }
  
    bt = new Ticket(e, r, Promise, bctx);

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

    it('should install event listener in the browser', function(){

      sinon.stub(bt, 'normalize', function(){ return new Transit('/test', Promise); });
      sinon.stub(bt, 'handle', function(){ return new Promise(function(resolve, reject){resolve('test');}); });
      var res = bt.install();
      bctx.document.onclick();
      bt.normalize.callCount.should.equal(1);
      bt.handle.callCount.should.equal(1);
      res.should.equal(bt);

    });

    if(server) {
      it('should install middleware listener on the server', function(done){

        var t = new Transit('/test', Promise);
        sinon.stub(st, 'normalize', function(req, res){ 
            arguments.length.should.equal(2); 
            res.end(); //just cancel the req for now
            return t;
        });

        sinon.stub(st, 'handle', function(){ 
            return new Promise(function(resolve, reject){
                resolve('test');

              });
            }
        );

        st.install();
        
        request(sctx)
          .get('/bogus')
          .expect(200, '')
          .end(function(){
            st.normalize.callCount.should.equal(1);
            st.handle.callCount.should.equal(1);
            t.hasAttribute('_res').should.equal(true);
            t.hasAttribute('_req').should.equal(true);
            t.hasAttribute('_next').should.equal(true);
            done();
          });

      });
    }

  });

  describe('#handle()', function(){

    var t;
    beforeEach(function(){
      t = new Transit('/bogus', Promise);
    });

    
    it('should emit start event', function(done) {

      e.on('transit.start', function(t){
        t.setFunction( function(){} );
        t.should.be.an.instanceOf(Transit);
        done();
      });
      
      bt.handle(t);
      t.stopTimeout();

    });


    it('should call deconstruct and emit controller event', function(done) {

      sinon.stub(t, 'deconstruct');

      var c = function() {};

      e.on('transit.start', function(t){
        t.setFunction( c );
      });

      e.on('transit.controller', function(t){        
        t.scope.should.an.instanceOf(Object);
        t.fn.should.equal(c);
        t.args.should.be.an.instanceOf(Array);
        t.deconstruct.callCount.should.equal(1);
        done();
      });
      
      bt.handle(t);
      t.stopTimeout();

    });
  

    it('should run function and emit view event', function(done) {

      e.on('transit.controller', function(t){  
        t.setFunction(function(){
          this.render(new State('hello world'));
        });
      });

      e.on('transit.view', function(t){  
        t.should.be.an.instanceOf(Transit);
        t.result.content.should.equal('hello world');

        done();
      });

      bt.handle(t);

    });

    it('should run end event', function(done) {

      e.on('transit.controller', function(t){  
        t.setFunction(function(){
          this.render(new State('hello world'));
        });
      });

      e.on('transit.end', function(t){
        t.should.be.an.instanceOf(Transit);

        done();
      });

      var ended = bt.handle(t);
      ended.should.be.an.instanceOf(Promise);

    });

    
    it('throw on wrong response', function() {

      r.getFunction = function(){ return false; };
      (function(){
        try {
          bt.handle(t);    
        } catch(err) {
          t.stopTimeout();
          throw err;
        }        
      }).should.throw();
      
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
        try {
          t = bt.normalize(e);

          failed = false;
          e.preventDefault();
        } catch(err) {
          failed = true;
        }
      };

      link.dispatchEvent(e);
      failed.should.equal(true); // no href to be found

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
            t.method.should.equal('POST');
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



