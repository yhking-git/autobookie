

module.exports = {
  /**
   * @param {string} s 
   */
  stringToByteArray: function (s) {
    return new TextEncoder().encode(s)
  },

  /**
   * @param {number} n 
   */
  numberToByteArray: function (n) {
    const bytes = new Uint8Array(4);
    bytes[0] = (n >> 24) & 0xff;
    bytes[1] = (n >> 16) & 0xff;
    bytes[2] = (n >> 8) & 0xff;
    bytes[3] = n & 0xff;
    return bytes;
  },

  /**
   * @param {string} date 
   * @returns 
   */
  stringToTimestamp: function (date) {
    return Math.round(new Date(date).getTime()/1000);
  },

  /**
   * @param {number} seconds in second
   * @returns 
   */
  sleep: function (seconds) {
    console.log('wait while sleep for ' + seconds + ' seconds');
    return new Promise(resolve => setTimeout(resolve, seconds*1000));
  },
}
