'use strict' ;

const drachtio = require('drachtio') ;
const app = drachtio() ;
const Mrf = require('drachtio-fsmrf') ;
const Srf = require('drachtio-srf') ;
const mrf = new Mrf(app) ;
const srf = new Srf(app) ;
const debug = app.debug = require('debug')('drachtio-sample') ;

const opts = {
  domain: 'sip.example.com',
  user: 	username,
  password: 'password',
  hostport: 5060,
  callednumber: 15555555555,
}

const mediaServers = [] ;

const MediaResources = {

  addMediaServer: function(ms) {
    mediaServers.push( ms ) ;
  },

  getMediaServer: function() {
    return mediaServers[0] ;
  }
} ;

const drachtioConnectOpts = { host: 'localhost', port: 8022, secret: 'cymru'} ;
const mediaserverConnectOpts = { address: '127.0.0.1', port: 8021, secret: 'ClueCon', listenPort: 8085 } ;

srf.connect(drachtioConnectOpts) ;
mrf.connect(mediaserverConnectOpts) ;

srf.on('connect', (err, hostport) => {
  console.log('connected to drachtio listening for SIP on %s', hostport) ;
}) ;

mrf.on('connect', (ms) => {
  console.log('connected to media server listening on %s:%s', ms.sipAddress, ms.sipPort) ;
  addMediaServer( ms ) ;
}) ;

// registerUser function's callback receives expires variable
// from the 200 OK back from the registrar
register(opts, srf, (opts, srf, expires) => {
  console.log(`re-registering`);
  srf.request(`sip:${opts.user}@${opts.domain}`, {
      method: 'REGISTER',
      headers: {
          'Expires': expires,
          'From': `sip:${opts.user}@${opts.domain}`,
          'Contact': `sip:${opts.user}@${opts.domain}:${opts.hostport}`
      },
      auth: {
        username: opts.user,
        password: opts.password
      }
  });
});

//unregister after 10 minutes
setTimeout(unregister(opts, srf), 600000);


const register = ( opts, srf, callback ) => {
  srf.request(`sip:${opts.user}@${opts.domain}`, {
      method: 'REGISTER',
      headers: {
          'Expires': '3600',
          'From': `sip:${opts.user}@${opts.domain}`,
          'Contact': `sip:${opts.user}@${opts.domain}:${opts.hostport}`
      },
      auth: {
        username: opts.user,
        password: opts.password
      }
  }, function(err, req){
      if( err ) {
        return err ;
      }
      req.on('response', function(res) {
          if( 200 !== res.status) {
            console.log(`Error registering ${res.status}`);
          } else if (200 == res.status) {
            console.log(res.headers);
            var expiresPosition = res.headers.contact.search("expires=");
            var headerLength = res.headers.contact.length;
            var expires = res.headers.contact.substring(expiresPosition+8, headerLength);
            //callback(opts, srf, expires);

            // wrapping the callback in setInterval allows the user to stay registered
            // based on the expires header in the 200 OK response from the registrar
            setInterval(() => { callback( opts, srf, expires); }, expires*1000, opts, srf, expires);
          }
      }) ;
  }) ;
} // register

// still need to test how to clear the setInterval that is in the callback of
// register function
const unregister = ( opts, srf ) => {
  srf.request(`sip:${opts.user}@${opts.domain}`, {
      method: 'REGISTER',
      headers: {
          'Expires': '0',
          'From': `sip:${opts.user}@${opts.domain}`,
          'Contact': `sip:${opts.user}@${opts.domain}:${opts.hostport}`
      },
      auth: {
        username: opts.user,
        password: opts.password
      }
  }, function(err, req){
      if( err ) {
        return err ;
      }
      req.on('response', function(res) {
          if( 200 !== res.status) {
            console.log(`Error registering ${res.status}`);
          } else if (200 == res.status) {
            console.log(res.headers);
            var expiresPosition = res.headers.contact.search("expires=");
            var headerLength = res.headers.contact.length;
            var expires = res.headers.contact.substring(expiresPosition+8, headerLength);
            //callback(opts, srf, expires);

            // wrapping the callback in setInterval allows the user to stay registered
            // based on the expires header in the 200 OK response from the registrar
            clearInterval();
          }
      }) ;
  }) ;
} // unregister


module.exports.register = register;
module.exports.unregister = unregister;
