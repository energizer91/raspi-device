const queue = {};

function addMessage(uuid, callback, timeout) {
  queue[uuid] = {
    callback: callback,
    timeout: timeout || 20,
    tick: 0
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
  delete queue[uuid];
}

function hasQueue(uuid) {
  return queue[uuid];
}

setInterval(() => {
  for (let uuid in queue) {
    if (!queue[uuid]) {
      continue;
    }

    queue[uuid].tick++;

    if (queue[uuid].tick >= queue[uuid].timeout) {
      rejectMessage(uuid, new Error('Operation timeout'));
    }
  }
}, 1000);

exports = {
  addMessage: addMessage,
  resolveMessage: resolveMessage,
  rejectMessage: rejectMessage,
  hasQueue: hasQueue
};