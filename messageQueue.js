const queue = {};

function addMessage(uuid, callback, timeout) {
  const errorTimeout = setTimeout(() => rejectMessage(uuid, new Error('Operation timeout')), timeout || 20000);

  queue[uuid] = {
    callback: callback,
    timeout: timeout || 20000,
    errorTimeout: errorTimeout
  };
}

function resolveMessage(uuid, data) {
  queue[uuid].callback(null, data);

  deleteMessage(uuid);
}

function rejectMessage(uuid, error) {
  queue[uuid].callback(error);

  deleteMessage(uuid);
}

function deleteMessage(uuid) {
  if (queue[uuid].errorTimeout) {
    clearTimeout(queue[uuid].errorTimeout);
  }

  delete queue[uuid];
}

function hasQueue(uuid) {
  return queue[uuid];
}

exports = {
  addMessage: addMessage,
  resolveMessage: resolveMessage,
  rejectMessage: rejectMessage,
  hasQueue: hasQueue
};