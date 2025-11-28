# Rollup Span Processor

A React + TypeScript application with Express backend and PostgreSQL database, featuring the Rollup Span Processor which summarises high-volume span data.

## Prerequisites

- `make`
- `podman` and `podman-compose` (or `docker-compose`)
- A [Honeycomb](https://ui.honeycomb.io/login) account (free tier is fine)
- A Honeycomb API key for that account

### Using Nix

If you have Nix with flakes enabled, install dependencies via:
```bash
nix develop
```

This provides `podman`, `podman-compose`, and `make` based on `flake.nix`.

## Getting Started

Start all services:
```bash
make up
```

This will:
- Install dependencies
- Start the frontend (http://localhost:5173)
- Start the backend (http://localhost:3001)
- Start PostgreSQL (localhost:5432)

## Available Commands
```bash
make up        # Start all services
make down      # Stop all services
make clean     # Stop services and remove volumes/images
make logs      # Follow logs (all services)
make logs S=backend   # Follow logs for specific service
make shell     # Open shell in backend container
make install PKG=<package>  # Install new package
```

## Environment Variables

Optionally, create `.env` file for configuration:
```bash
HONEYCOMB_API_KEY=your_api_key
```

Or just use the dynamic export headers by inputting an API key in the frontend.
