#!/bin/bash

sudo apt-get install freeglut3-dev libglew-dev cmake libpng-dev

cmake .
make all