exports.getStatus = () => ({
  status: 'ok'
});

exports.connect = (name, params, cb) => {
  if (name === 'error') {
    return cb(new Error('connection failed'));
  }

  return cb(null);
};
