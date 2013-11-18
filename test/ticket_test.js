/* global window */
var Ticket = require('../src/ticket.js');
var sinon = require('sinon');

var express = require('express');
var request = require('supertest');
var Browser = require("zombie");

var bctx, sctx, browser;
var server = false;
var browser = false;
try {
  var bctx = window;
  var sctx = false; //fake server ctx

} catch(e) {
  server = true;
}

describe('Ticket', function(){

  var st, bt;
  beforeEach(function(){

    if(server) {
      browser = new Browser({ debug: true });
      sctx = express();
      bctx = browser.open();
      st = new Ticket(sctx);      
    }
  
    bt = new Ticket(bctx);

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

      sinon.stub(bt, 'handle');
      bt.install();
      bctx.document.onclick();
      bt.handle.callCount.should.equal(1);

    });

    if(server) {
        it('should install middleware listener on the server', function(done){

          sinon.stub(st, 'handle', function(req, res){ arguments.length.should.equal(2); res.end(); });
          st.install();
          
          request(sctx)
            .get('/bogus')
            .expect(200, '')
            .end(function(){
              st.handle.callCount.should.equal(1);
              done();
            });

        });
    }

  });

  describe('#handle()', function(){

    it('should throw on wrong browser event', function(){

      var link = bctx.document.createElement('a');       
      var failed = false;
      link.id = 'test-link';
      link.innerHTML = 'test';
      bctx.document.body.appendChild(link);

      link.onclick = function(e) {
        try {
          bt.handle();
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
          bt.handle('bogus');
          failed = false;
        } catch(err) {
          failed = true;
        }
      };

      link.dispatchEvent(e);
      failed.should.equal(true); // no event passed

      link.onclick = function(e) {
        try {
          bt.handle(e);
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

    });

    if(server) {
      it('should throw on wrong server args', function(){


        sctx.use(function(req,res){

          (function(){
            st.handle('a'); //to few args
          }).should.throw();

          (function(){
            st.handle('a', 'a'); // wrong req
          }).should.throw();
          
          (function(){
            st.handle(req, 'a'); // wrong req
          }).should.throw();


          st.handle(req, res);

          res.end();
        });

        //trigger middleware
        request(sctx).get('/bogus').end(function(){});

      });
    }


  });


});



