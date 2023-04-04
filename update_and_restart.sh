#!/bin/bash

cd /home/ec2-user/projects/numba
git pull
yarn build
pm2 restart all
