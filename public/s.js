function getSignalStrength(rssi) {
    return 2 * (rssi + 100);
}

/**
 *
 * @param {HTMLSelectElement} select
 */
function selectUpdate(select) {
    const selectedIndex = select.selectedIndex;
    let selectedNetwork = null;

    if (selectedIndex >= 0) {
        selectedNetwork = select.options[selectedIndex].value;
    }

    fetch("/networks")
        .then(res => res.json())
        .then(networks => {
            for (let i = 0; i < select.options.length; i++) {
                select.options[i].remove();
            }

            networks.forEach(network => {
                const option = document.createElement("option");
                option.value = network.ssid;
                option.text = network.ssid + " (" + getSignalStrength(network.rssi) + "%)";

                if (network.mac === selectedNetwork) {
                    option.selected = true;
                }

                select.options.add(option);
            });
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const connectForm = document.getElementById("connectForm");
    const apSelect = document.getElementById("apSelect");

    selectUpdate(apSelect);

    const interval = setInterval(selectUpdate, 30000);

    connectForm.addEventListener("submit", e => {
        e.preventDefault();

        const inputs = connectForm.elements;
        const data = {
            gateway: inputs.gateway.value,
            ssid: inputs.ap.value,
            password: inputs.password.value
        }

        fetch("/network", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(res => res.json())
            .then(() => {
                alert("Success!");
            })
            .catch(err => {
                alert("Error: " + JSON.stringify(err));
            })
            .then(() => {
                clearInterval(interval);
            })
    });
});