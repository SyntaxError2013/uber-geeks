#!/bin/bash
wifi_router_url=http://192.168.208.251/
curl -s $wifi_router_url"dyn_clients_only.asp" | egrep  --color=never -o  "[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}" | while read mac; do
  curl -X POST -d "mac=$mac&type=wifi" localhost:3000/temp
done