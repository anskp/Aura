# Aura Platform Setup Guide

This comprehensive guide provides all the necessary steps to install, configure, and run the Aura Real-World Asset (RWA) platform.

## Prerequisites

Before starting, ensure you have the following installed:
- Node.js (Version 18 or 20)
- pnpm (Recommended) or npm
- PostgreSQL (For the backend database)
- Harhdat (For contract development)

---

## Global Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repository_url>
    cd Aura
    ```

2.  **Install Monorepo Dependencies**:
    From the root directory:
    ```bash
    pnpm install
    ```

---

## Environment Configuration

Copy the example environment files for each module and fill in the required values.

### 1. Smart Contracts
Path: `packages/contracts/.env`
```env
PRIVATE_KEY=your_private_key
RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_api_key
```

### 2. Backend API
Path: `apps/backend/.env`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/aura
RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
IDENTITY_REGISTRY_ADDRESS=0x...
NAV_ORACLE_ADDRESS=0x...
POR_ORACLE_ADDRESS=0x...
STABLECOIN_ADDRESS=0x...
CHAINLINK_CRE_URL=your_cre_endpoint
```

### 3. Frontend Web App
Path: `apps/frontend/.env`
```env
VITE_API_URL=http://localhost:3000
VITE_SUMSUB_TOKEN=your_token_here
VITE_RPC_URL=your_rpc_url
VITE_IDENTITY_REGISTRY_ADDRESS=0x...
```

---

## Component Setup

### Database Initialization
From the root or `apps/backend`:
```bash
pnpm run prisma:generate
pnpm run prisma:migrate
```

### Smart Contract Compilation
From the root or `packages/contracts`:
```bash
pnpm run compile
```

---

## Execution Commands

### Full Platform (Monorepo)
To run all components (Frontend, Backend) simultaneously:
```bash
pnpm run dev
```

### Individual Components
- **Frontend only**: `cd apps/frontend && pnpm run dev`
- **Backend only**: `cd apps/backend && pnpm run dev`
- **Contracts testing**: `cd packages/contracts && pnpm run test`

---

## Production Build

To compile all applications for production:
```bash
pnpm run build
```
The production artifacts will be located in the respective `dist/` or `build/` folders of each application.
