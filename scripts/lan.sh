#!/bin/bash
lan_interface=eth0
arp-scan --interface $lan_interface 192.168.208.001-192.168.208.250 | egrep  --color=never -o  "[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}" | while read mac; do
  curl -X POST -d "mac=$mac&type=lan" localhost:3000/temp
done
