var delta = 0x9E3779B9;

function toUint8Array(v, includeLength) {
  var length = v.length;
  var n = length << 2;
  if (includeLength) {
    var m = v[length - 1];
    n -= 4;
    if ((m < n - 3) || (m > n)) {
      return null;
    }
    n = m;
  }
  var bytes = new Uint8Array(n);
  for (var i = 0; i < n; ++i) {
    bytes[i] = v[i >> 2] >> ((i & 3) << 3);
  }
  return bytes;
}

function toUint32Array(bytes, includeLength) {
  var length = bytes.length;
  var n = length >> 2;
  if ((length & 3) !== 0) {
    ++n;
  }
  var v;
  if (includeLength) {
    v = new Uint32Array(n + 1);
    v[n] = length;
  }
  else {
    v = new Uint32Array(n);
  }
  for (var i = 0; i < length; ++i) {
    v[i >> 2] |= bytes[i] << ((i & 3) << 3);
  }
  return v;
}

function mx(sum, y, z, p, e, k) {
  return ((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z));
}

function fixk(k) {
  if (k.length < 16) {
    var key = new Uint8Array(16);
    key.set(k);
    k = key;
  }
  return k;
}

function encryptUint32Array(v, k) {
  var length = v.length;
  var n = length - 1;
  var y, z, sum, e, p, q;
  z = v[n];
  sum = 0;
  for (q = Math.floor(6 + 52 / length) | 0; q > 0; --q) {
    sum += delta;
    e = sum >>> 2 & 3;
    for (p = 0; p < n; ++p) {
      y = v[p + 1];
      z = v[p] += mx(sum, y, z, p, e, k);
    }
    y = v[0];
    z = v[n] += mx(sum, y, z, p, e, k);
  }
  return v;
}

function decryptUint32Array(v, k) {
  var length = v.length;
  var n = length - 1;
  var y, z, sum, e, p, q;
  y = v[0];
  q = Math.floor(6 + 52 / length);
  for (sum = q * delta; sum !== 0; sum -= delta) {
    e = sum >>> 2 & 3;
    for (p = n; p > 0; --p) {
      z = v[p - 1];
      y = v[p] -= mx(sum, y, z, p, e, k);
    }
    z = v[n];
    y = v[0] -= mx(sum, y, z, p, e, k);
  }
  return v;
}

function toBytes(str) {
  var n = str.length;
  // A single code unit uses at most 3 bytes.
  // Two code units at most 4.
  var bytes = new Uint8Array(n * 3);
  var length = 0;
  for (var i = 0; i < n; i++) {
    var codeUnit = str.charCodeAt(i);
    if (codeUnit < 0x80) {
      bytes[length++] = codeUnit;
    }
    else if (codeUnit < 0x800) {
      bytes[length++] = 0xC0 | (codeUnit >> 6);
      bytes[length++] = 0x80 | (codeUnit & 0x3F);
    }
    else if (codeUnit < 0xD800 || codeUnit > 0xDFFF) {
      bytes[length++] = 0xE0 | (codeUnit >> 12);
      bytes[length++] = 0x80 | ((codeUnit >> 6) & 0x3F);
      bytes[length++] = 0x80 | (codeUnit & 0x3F);
    }
    else {
      if (i + 1 < n) {
        var nextCodeUnit = str.charCodeAt(i + 1);
        if (codeUnit < 0xDC00 && 0xDC00 <= nextCodeUnit && nextCodeUnit <= 0xDFFF) {
          var rune = (((codeUnit & 0x03FF) << 10) | (nextCodeUnit & 0x03FF)) + 0x010000;
          bytes[length++] = 0xF0 | (rune >> 18);
          bytes[length++] = 0x80 | ((rune >> 12) & 0x3F);
          bytes[length++] = 0x80 | ((rune >> 6) & 0x3F);
          bytes[length++] = 0x80 | (rune & 0x3F);
          i++;
          continue;
        }
      }
      throw new Error('Malformed string');
    }
  }
  return bytes.subarray(0, length);
}

function encrypt(data, key) {
  if (typeof data === 'string') data = toBytes(data);
  if (typeof key === 'string') key = toBytes(key);
  if (data === undefined || data === null || data.length === 0) {
    return data;
  }
  return toUint8Array(encryptUint32Array(toUint32Array(data, false), toUint32Array(fixk(key), false)), false);
}


function decrypt(data, key) {
  if (data === undefined || data === null || data.length === 0) {
    return data;
  }
  return toUint8Array(decryptUint32Array(toUint32Array(data, false), toUint32Array(fixk(key), false)), false);
}

exports = {
  encrypt: encrypt,
  decrypt: decrypt
};