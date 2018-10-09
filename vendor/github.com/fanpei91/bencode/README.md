bencode [![Build Status](https://travis-ci.org/marksamman/bencode.svg?branch=master)](https://travis-ci.org/marksamman/bencode)
=======

Bencode implementation in Go

## Install

```bash
$ go get github.com/marksamman/bencode
```

## Usage

### Encode
bencode.Encode takes a map[string]interface{} as argument and returns a byte array. Example:
```go
package main

import (
	"fmt"

	"github.com/marksamman/bencode"
)

func main() {
	dict := make(map[string]interface{})
	dict["string key"] = "hello world"
	dict["int key"] = 123456
	fmt.Printf("bencode encoded dict: %s\n", bencode.Encode(dict))
}
```

### Decode
bencode.Decode takes an io.Reader as argument and returns (map[string]interface{}, error). Example:
```go
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/marksamman/bencode"
)

func main() {
	file, err := os.Open(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	dict, err := bencode.Decode(file)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("string: %s\n", dict["string key"].(string))
	fmt.Printf("int: %d\n", dict["int key"].(int64))
}
```
