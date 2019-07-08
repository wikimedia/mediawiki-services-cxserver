#!/bin/sh
# Usage: ./prepare-template-mapping.sh path/to/dir/with/jsons/*.json

for json in "$@"
do
    from="$(echo "$json" | awk '{split($0,a,"_"); print a[3]}' )"
    to="$(echo "$json" | awk '{split($0,a,"_"); print a[5]}' | sed s/\.json$// )"
    nodejs template-mapping.js --from "$from" --to "$to" -i "$json"
done