const SmartMeteoStation = require("SmartMeteoStation");

const station = new SmartMeteoStation({
  config: {
      pins: {
        sda: D21,
        scl: D22,
        bitrate: 400000
      },
      button: D25,
      lcd: [D21, D22],
      apiKey: "cba698145cd27d8bf5dabd4ed13fe294",
      cities: ["2673730", "498817", "551487"]
  },
  sno: "00000007"
});

station.connect();