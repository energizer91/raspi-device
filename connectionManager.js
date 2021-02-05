const http = require("http");
const Storage = require("Storage")
const wifi = require("Wifi");

function connectionManager(name) {
  return new Promise((resolve, reject) => {
    let server = null;
    const listener = (req, res) => {
      const url = req.url;
      console.log("Requesting", req.url);

      switch (url) {
        case "/networks":
          wifi.scan((networks) => {
            console.log("Scanned networks", networks);
            res.writeHead(200);
            res.write(JSON.stringify(networks));
            res.end();
          })
          break;
        case "/network":
          if (req.method !== "POST") {
            res.writeHead(404);
            res.write("Not found");
            res.end();
          }

          let d = "";

          req.on("data", (chunk) => d += chunk);
          req.on("end", () => {
            const data = JSON.parse(d);

            Storage.write("config", JSON.stringify(data));

            res.writeHead(200);
            res.write(JSON.stringify({status: "success"}));
            res.end();

            wifi.stopAP(() => {
              if (server) {
                server.close();
              }

              resolve(data);
            });
          });

          break;
        default:
          let name = req.url.slice(1);

          if (!name || name === "config") {
            name = "i.html";
          }

          try {
            const file = Storage.read(name);

            if (!file) {
              res.writeHead(404);
              res.end("No file");
              return;
            }

            res.writeHead(200);
            res.end(file);
            break;
          } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
          }
      }
    };

    const connection = Storage.read("config");

    if (!connection) {
      wifi.startAP(name, {}, () => {
        server = http.createServer(listener).listen(80);
      });

      return;
    }

    resolve(JSON.parse(connection));
  })
}

exports = connectionManager;