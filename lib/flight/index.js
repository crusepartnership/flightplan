var local = require('./local')
  , remote = require('./remote');

var TYPE = Object.freeze({
  LOCAL: 1,
  REMOTE: 2
});

exports.TYPE = TYPE;

exports.run = function(type, fn, context) {
  switch(type) {
    case TYPE.LOCAL:
      local.run(fn, context);
      break;

    case TYPE.REMOTE:
      //@TODO workaround for ssh connections not getting reset
      remote.disconnect();
      remote.run(fn, context);
      break;
  }
};

exports.disconnect = function() {
  remote.disconnect();
};