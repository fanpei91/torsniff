#!/bin/bash
GOARCH=amd64 GOOS=linux go build -o releases/torsniff-linux-amd64
GOARCH=386 GOOS=linux go build -o releases/torsniff-linux-386

GOARCH=amd64 GOOS=windows go build -o releases/torsniff-windows-amd64
GOARCH=386 GOOS=windows go build -o releases/torsniff-windows-386

GOARCH=amd64 GOOS=darwin go build -o releases/torsniff-darwin-amd64
