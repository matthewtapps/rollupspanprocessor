.PHONY: dev build clean container-build container-run container-dev

dev:
	pnpm run dev & pnpm run server

build:
	pnpm run build

server:
	pnpm exec tsx src/server/index.ts

clean:
	rm -rf node_modules dist

container-build:
	podman build -t span-rollup-demo .

container-run:
	podman run -it --rm \
		-p 3000:3000 \
		-p 3001:3001 \
		-v $(PWD):/app:z \
		-e HONEYCOMB_API_KEY=$(HONEYCOMB_API_KEY) \
		span-rollup-demo

container-dev: container-build container-run
