# energizer91's smart house devices

This repository contains firmwares for all available smart devices at the moment.

## Available VIDs:

VID is 4 16bit digit code of Vendor ID starting from 0001;

| VID  | Name        |
|------|-------------|
| 0001 | energizer91 |

## Available PIDs:

PID is 4 16bit digit code of Product ID starting from 0001;

| PID  | Name                     |
|------|--------------------------|
| 0001 | Smart bulb               |
| 0002 | Smart switch             |
| 0003 | Smart temperature sensor |
| 0004 | Smart light meter        |
| 0005 | Smart relay              |
| 0006 | Smart RGB LED            |
| 0007 | Smart meteo station      |
| 0008 | Smart Control            |
| 0009 | Smart Thermostat         |


## Registered devices:

There's a list of already registered devices (in my server at least):

| VID  | PID  | SNO      |
|------|------|----------|
| 0001 | 0003 | 00000003 |
| 0001 | 0007 | 00000007 |
| 0001 | 0003 | 00000009 |
| 0001 | 0009 | 00000010 |

## Connecting new devices:

When you first connect a device it creates an AP with SSID SmartDevice_VID_PID which you can connect.
After that you should go to 192.168.4.1 and enter following info:
- Gateway address (IP of your Raspberry Pi server)
- Wifi network to connect
- Wifi password (if needed)

After that device will disable AP and will try to connect to gateway.

TBD:
- checking wifi availability and re-enable config if something goes wrong
- resetting config so you can reconnect to other network without IDE (button maybe?)

## Flashing:

### ESP8266

Get the latest firmware for ESP8266 from https://www.espruino.com/EspruinoESP8266. Install esptools.

```bash
python esptool.py --port COM6 --baud 115200 write_flash --flash_freq 80m --flash_mode qio --flash_size 32m 0x0000 boot_v1.6.bin 0x1000 espruino_esp8266_user1.bin 0x3FC000 esp_init_data_default.bin 0x3FE000 blank.bin
```

### ESP32

Get the latest firmware for ESP32 from https://www.espruino.com/ESP32. Install esptools.

```bash
python esptool.py --chip esp32 --port COM5 --baud 921600 --after hard_reset write_flash -z --flash_mode dio --flash_freq 40m --flash_size detect 0x1000 bootloader.bin 0x8000 partitions_espruino.bin 0x10000 espruino_esp32.bin
```

