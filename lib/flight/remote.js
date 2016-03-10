var Fiber = require('fibers')
  , Future = require('fibers/future')
  , extend = require('util-extend')
  , SSH = require('../transport/ssh')
  , logger = require('../logger')()
  , prettyTime = require('pretty-hrtime')
  , errors = require('../errors');

var _connections = [];

function connect(_context) {
  var future = new Future();

  new Fiber(function () {
    logger.info("Connecting to '" + _context.remote.host + "'");

    try {
      var connection = new SSH(_context);
      _connections.push(connection);
    } catch (e) {
      if (!_context.remote.failsafe) {
        throw new errors.ConnectionFailedError("Error connecting to '" +
          _context.remote.host + "': " + e.message);
      }

      logger.warn("Safely failed connecting to '" +
        _context.remote.host + "': " + e.message);
    }

    return future.return();
  }).run();

  return future;
}

function execute(transport, fn) {
  var future = new Future();

  var fiber = new Fiber(function () {
    var t = process.hrtime();

    logger.info('Executing remote task on ' + transport.runtime.host);
    try {
      fn(transport);
    } catch (e) {
      return future.throw(e);
    }
    logger.info('Remote task on ' + transport.runtime.host +
      ' finished after ' + prettyTime(process.hrtime(t)));

    return future.return();
  });

  fiber.run();

  return future;
}

exports.run = function (fn, context) {
  if (_connections.length === 0) {
    Future.wait(context.hosts.map(function (host) {
      var _context = extend({}, context);
      _context.remote = host;

      return connect(_context);
    }));
  }

  var futures = _connections.map(function (connection) {
    return execute(connection, fn);
  });

  futures.forEach(function (f) {
    f.wait();
  });

};

exports.disconnect = function () {
  _connections.forEach(function (connection) {
    connection.close();
  });

  _connections = [];
};