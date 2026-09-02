.PHONY: migrate-up migrate-down serve build image release

migrate-up:
	$(MAKE) -C server migrate-up

migrate-down:
	$(MAKE) -C server migrate-down

serve:
	$(MAKE) -C server serve

build:
	$(MAKE) -C server build

image:
	docker build -t shatalker-api -f server/Dockerfile server
	docker build -t shatalker-web -f Dockerfile.web .

release: image
	@echo "goose first: docker compose -f docker-compose.prod.yml run --rm migrate"
	@echo "then: docker compose -f docker-compose.prod.yml up -d"
	@echo "TLS sits in front of nginx :80. Do not use compose for local make serve."
