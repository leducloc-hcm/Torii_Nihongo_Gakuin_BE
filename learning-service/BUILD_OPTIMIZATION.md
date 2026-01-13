# Build Optimization Guide

## Memory Issues

If you encounter "JavaScript heap out of memory" errors during build:

### Solution 1: Dockerfile (Already Applied)
The Dockerfile now includes:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```
This allocates 4GB of memory for Node.js during build.

### Solution 2: Increase Docker Memory
If the build still fails, increase Docker Desktop memory:
1. Open Docker Desktop
2. Go to Settings → Resources → Advanced
3. Increase Memory to at least 6GB (recommended: 8GB)
4. Apply & Restart

### Solution 3: Build Locally First
If Docker build continues to fail, build locally and copy dist:
```bash
cd learning-service
npm install
npm run build
# Then rebuild Docker image
```

### Solution 4: Multi-stage Build Optimization
The Dockerfile uses multi-stage builds to minimize final image size.

## Build Performance Tips

1. **Use BuildKit**: Enable Docker BuildKit for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose build
   ```

2. **Layer Caching**: The Dockerfile is optimized for layer caching:
   - Dependencies are installed before copying source code
   - Prisma generation happens before build

3. **Parallel Builds**: Build services in parallel:
   ```bash
   docker-compose build --parallel
   ```

## Troubleshooting

If build still fails:
1. Check available system memory: `free -h` (Linux) or Activity Monitor (Mac)
2. Close other memory-intensive applications
3. Try building one service at a time
4. Consider using a CI/CD pipeline with more resources
