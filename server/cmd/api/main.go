package main

import (
	"log"

	"shatalker/internal/config"
	"shatalker/internal/db"
	apihttp "shatalker/internal/http"
)

func main() {
	cfg := config.Load()
	gdb, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	r := apihttp.NewRouter(cfg, gdb)
	addr := ":" + cfg.Port
	log.Println("listen", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
