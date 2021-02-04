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


## Registered devices:

There's a list of already registered devices (in my server at least):

| VID  | PID  | SNO      |
|------|------|----------|
| 0001 | 0007 | 00000007 |

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