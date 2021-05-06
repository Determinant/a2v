#!/bin/bash
SRC_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SRC_DIR/env.sh"
image="avaplatform/avalanchego:$release"
j=0
for i in 0 1 2 3; do
    _affin=()
    for ((k="$((j * 2))";k<"$((j * 2 + 3))";k++)); do
        _affin+=($((k % ncpu)))
    done
    OIFS="$IFS"
    IFS=","
    affin="${_affin[*]}"
    IFS="$OIFS"
    staking_port="$((9651 + i * 2))"
    http_port="$((9650 + i * 2))"
    name="staker-$i"
    [[ $(${DOCKER} ps -f "name=$name" --format '{{.Names}}' | grep "$name$") == "$name" ]] && { echo "$i is already running" || true; } || {
        echo "putting $i to core $affin"
        "${DOCKER}" run --name "$name" --ulimit nofile=655360:655360 --cpuset-cpus "$affin" -t --rm \
            -p "$staking_port:$staking_port" \
            -p "$http_port:$http_port" \
            -v "$prefix/$i/:/root/.avalanchego:" -d \
            "${image}" \
            ./build/avalanchego  --public-ip "$ip" --staking-port "$staking_port" --http-host "0.0.0.0" --http-port "$http_port"
    }
    let j++
    sleep 10
done
