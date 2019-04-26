#!/bin/bash
GOARCH=amd64 GOOS=linux go build -o releases/torsniff-${VERSION}-linux-amd64
GOARCH=386 GOOS=linux go build -o releases/torsniff-${VERSION}-linux-386

GOARCH=amd64 GOOS=windows go build -o releases/torsniff-${VERSION}-windows-amd64.exe
GOARCH=386 GOOS=windows go build -o releases/torsniff-${VERSION}-windows-386.exe

GOARCH=amd64 GOOS=darwin go build -o releases/torsniff-${VERSION}-darwin-amd64
