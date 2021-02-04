const SmartMeteoStation = require("SmartMeteoStation");

const station = new SmartMeteoStation({
    config: {
        lcd: [D21, D22],
        apiKey: "cba698145cd27d8bf5dabd4ed13fe294",
        cityId: "2673730"
    },
    sno: "00000007"
});

station.connect();