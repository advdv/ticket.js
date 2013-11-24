/* globals __dirname */
var Ticket = require('../../src/ticket.js');
var Resolver = require('../../src/resolver.js');
var State = require('../../src/state.js');
var Emitter = require('eventemitter2').EventEmitter2;


var express = require('express');
var app = express();
var emitter = new Emitter();
var resolver = new Resolver();
var kernel = new Ticket(emitter, resolver, app);

emitter.on('transit.start', function(t){

  //some routing layer, call something like router.match(url)
  if(t.url === '/hello') {
    t.setAttribute('_controller', function() {
      this.render('hello world!');
    });
  }

});


emitter.on('transit.view', function(t){

  //some routing layer, create a new state from the controller response
  t.newState = new State(t.result);

});


emitter.on('transit.end', function(t){

  //some server specific config before sending, maybe another middleware
  var res = t.getAttribute('_res');
  res.send(t.newState.content);
  
});

//Middleware
app.use(express.static(__dirname + '/public'));
kernel.install();

app.listen(4000);
console.log('Listening on port 3000');