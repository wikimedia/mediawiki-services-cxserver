#!/usr/bin/env python

# Apertium 3.2 fails when spawned from nodejs, because it is a shell script
# running a unix pipeline, and nodejs stdout is a socket rather than a pipe.
# This wrapper script just provides an intermediate buffer around stdout.
# It is written in python rather than shell as there are fewer security issues
# and security restriction problems.

import sys
import subprocess

args = ['apertium']
args += sys.argv[1:]
process = subprocess.Popen(args, stdin=sys.stdin, stdout=subprocess.PIPE)
for line in process.stdout:
    sys.stdout.write(line)
