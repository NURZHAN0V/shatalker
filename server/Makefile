-include .env
export

.PHONY: migrate-up migrate-down serve build

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

serve:
	go run ./cmd/api

build:
	mkdir -p bin
	go build -o bin/api ./cmd/api
