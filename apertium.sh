#!/bin/sh
# Fixes Apertium 3.2 /dev/stdout when called from nodejs child_process.
# Apparently the difference is /proc/self/fd/1 is a pipe instead of a socket.
exec apertium "$@" | cat
