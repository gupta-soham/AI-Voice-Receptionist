# AI Voice Receptionist - Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the AI Voice Receptionist system.

## Quick Diagnostics

### System Health Check

Run the built-in health check to identify issues:

```bash
# Quick validation
npx tsx tests/validation/quick-validation.ts

# Full system test
npm test

# Check API health
curl http://localhost:3000/api/health
```

### Service Status Check

```bash
# Check Docker containers
docker-compose ps

# Check service logs
docker-compose logs web
docker-compose logs agent
docker-compose logs postgres
```

---

## Common Issues

### 1. Database Connection Issues

#### Symptoms

- `Error: P1001: Can't reach database server`
- `Connection refused` errors
- Health check shows database as disconnected

#### Diagnosis

```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d ai_receptionist -c "SELECT 1;"
```

#### Solutions

**Solution 1: Restart Database Service**

```bash
docker-compose restart postgres
```

**Solution 2: Reset Database**

```bash
# Stop all services
docker-compose down

# Remove database volume (WARNING: This deletes all data)
docker volume rm ai-voice-receptionist_postgres_data

# Start services again
docker-compose up -d
```

**Solution 3: Check Environment Variables**

```bash
# Verify DATABASE_URL in .env file
cat .env | grep DATABASE_URL

# Should be: postgresql://postgres:password@localhost:5432/ai_receptionist?schema=public
```

**Solution 4: Port Conflicts**

```bash
# Check if port 5432 is in use
# Windows:
netstat -ano | findstr :5432

# macOS/Linux:
lsof -i :5432

# If port is in use, change it in docker-compose.yml
```

---

### 2. Web Application Issues

#### Symptoms

- `EADDRINUSE: address already in use :::3000`
- Next.js build errors
- 500 Internal Server Error

#### Diagnosis

```bash
# Check if port 3000 is in use
# Windows:
netstat -ano | findstr :3000

# macOS/Linux:
lsof -i :3000

# Check web service logs
docker-compose logs web

# Check for build errors
npm run build
```

#### Solutions

**Solution 1: Kill Process Using Port**

```bash
# Windows (replace PID with actual process ID):
taskkill /PID <PID> /F

# macOS/Linux:
kill -9 <PID>
```

**Solution 2: Use Different Port**

```yaml
# In docker-compose.yml, change web service ports:
services:
  web:
    ports:
      - '3001:3000' # Use port 3001 instead
```

**Solution 3: Clear Next.js Cache**

```bash
# Remove build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build
```

**Solution 4: Environment Variables**

```bash
# Check required environment variables
cat .env | grep -E "(DATABASE_URL|NEXTJS_URL)"

# Regenerate Prisma client
npm run db:generate
```

---

### 3. Voice Agent Issues

#### Symptoms

- Agent container fails to start
- Webhook delivery failures
- Voice calls not connecting

#### Diagnosis

```bash
# Check agent container status
docker-compose ps agent

# Check agent logs
docker-compose logs agent

# Test agent health endpoint
curl http://localhost:8080/health

# Check webhook configuration
curl http://localhost:3000/api/health | grep webhook

# Verify webhook server port is exposed
docker-compose ps python-agent
curl http://localhost:8080/health
```

#### Solutions

**Solution 1: Agent Dependencies**

```bash
# Rebuild agent container
docker-compose build agent

# Check agent package.json
cd agent && npm install
```

**Solution 2: LiveKit Configuration**

```bash
# Verify LiveKit environment variables in .env
cat .env | grep LIVEKIT

# Required variables:
# LIVEKIT_API_KEY=your_key
# LIVEKIT_API_SECRET=your_secret
# LIVEKIT_URL=wss://your-server.com
```

**Solution 3: Webhook Configuration**

```bash
# Check webhook URL configuration
echo $AGENT_WEBHOOK_URL
echo $WEBHOOK_SECRET

# Test webhook endpoint
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'
```

**Solution 4: Network Connectivity**

```bash
# Test connectivity between services
docker-compose exec web ping agent
docker-compose exec agent ping web
```

---

### 4. API Issues

#### Symptoms

- 404 Not Found errors
- 500 Internal Server Error
- Slow response times

#### Diagnosis

```bash
# Test API endpoints
curl -v http://localhost:3000/api/health
curl -v http://localhost:3000/api/help-requests
curl -v http://localhost:3000/api/knowledge

# Check API logs
docker-compose logs web | grep -i error

# Test database queries
npm run db:studio
```

#### Solutions

**Solution 1: API Route Issues**

```bash
# Check if API routes exist
ls -la app/api/
ls -la app/api/help-requests/
ls -la app/api/knowledge/

# Verify route.ts files
cat app/api/health/route.ts
```

**Solution 2: Prisma Issues**

```bash
# Regenerate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Check schema
npx prisma db pull
```

**Solution 3: CORS Issues**

```bash
# Check CORS configuration in Next.js
# Add to next.config.js:
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ]
  },
}
```

---

### 5. Performance Issues

#### Symptoms

- Slow response times
- High memory usage
- Database timeouts

#### Diagnosis

```bash
# Check system resources
docker stats

# Check database performance
docker-compose exec postgres psql -U postgres -d ai_receptionist -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;"

# Run performance tests
npm run test:performance
```

#### Solutions

**Solution 1: Database Optimization**

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_question ON knowledge_base USING gin(to_tsvector('english', question));
```

**Solution 2: Memory Optimization**

```yaml
# In docker-compose.yml, add memory limits:
services:
  web:
    mem_limit: 512m
  agent:
    mem_limit: 256m
  postgres:
    mem_limit: 256m
```

**Solution 3: Connection Pooling**

```env
# In .env, optimize database connection:
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_receptionist?schema=public&connection_limit=10&pool_timeout=20"
```

---

### 6. Authentication Issues

#### Symptoms

- 401 Unauthorized errors
- JWT token issues
- Login failures

#### Diagnosis

```bash
# Check JWT configuration
cat .env | grep JWT_SECRET

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

#### Solutions

**Solution 1: JWT Configuration**

```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env file
JWT_SECRET=your_new_secret_here
```

**Solution 2: Password Issues**

```bash
# Check supervisor credentials in .env
cat .env | grep -E "(SUPERVISOR_USERNAME|SUPERVISOR_PASSWORD)"

# Reset password (development only)
SUPERVISOR_PASSWORD=newpassword npm run dev
```

---

### 7. Docker Issues

#### Symptoms

- Container build failures
- Volume mount issues
- Network connectivity problems

#### Diagnosis

```bash
# Check Docker system
docker system df
docker system info

# Check container logs
docker-compose logs --tail=50

# Check networks
docker network ls
docker network inspect ai-voice-receptionist_default
```

#### Solutions

**Solution 1: Clean Docker System**

```bash
# Clean up Docker resources
docker system prune -a

# Remove all containers and volumes
docker-compose down -v

# Rebuild everything
docker-compose build --no-cache
docker-compose up
```

**Solution 2: Volume Issues**

```bash
# Check volume mounts
docker-compose config

# Fix permission issues (Linux/macOS)
sudo chown -R $USER:$USER .
```

**Solution 3: Network Issues**

```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up
```

---

## Environment-Specific Issues

### Windows Issues

#### WSL2 Docker Issues

```bash
# Restart WSL2
wsl --shutdown
wsl

# Update WSL2
wsl --update
```

#### File Path Issues

```bash
# Use forward slashes in paths
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_receptionist"

# Not backslashes:
# DATABASE_URL="postgresql:\\postgres:password@localhost:5432\\ai_receptionist"
```

### macOS Issues

#### Docker Desktop Issues

```bash
# Restart Docker Desktop
# Use Docker Desktop GUI or:
killall Docker && open /Applications/Docker.app
```

#### Port Binding Issues

```bash
# Check if ports are available
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :8080
```

### Linux Issues

#### Permission Issues

```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
sudo chown -R $USER:$USER .
```

#### Firewall Issues

```bash
# Check firewall status
sudo ufw status

# Allow ports if needed
sudo ufw allow 3000
sudo ufw allow 5432
sudo ufw allow 8080
```

---

## Advanced Debugging

### Enable Debug Logging

```bash
# Set debug environment variables
DEBUG=* npm run dev

# Or specific modules
DEBUG=prisma:* npm run dev
DEBUG=next:* npm run dev
```

### Database Debugging

```bash
# Connect to database directly
docker-compose exec postgres psql -U postgres -d ai_receptionist

# Check database size and stats
\dt+
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;

# Check active connections
SELECT * FROM pg_stat_activity;
```

### Application Debugging

```bash
# Enable Node.js debugging
node --inspect-brk=0.0.0.0:9229 node_modules/.bin/next dev

# Use Chrome DevTools
# Open chrome://inspect in Chrome browser
```

---

## Getting Help

### Log Collection

When reporting issues, collect these logs:

```bash
# System information
npm run test:system > system-test.log 2>&1

# Service logs
docker-compose logs > docker-logs.txt 2>&1

# System health
curl http://localhost:3000/api/health > health-check.json

# Environment info
docker-compose config > docker-config.yml
```

### Support Channels

1. **Documentation**: Check all files in the `docs/` directory
2. **GitHub Issues**: Create an issue with logs and system info
3. **Community**: Join our Discord/Slack for community support
4. **Professional Support**: Contact support@yourcompany.com

### Before Reporting Issues

1. ✅ Run the quick validation: `npx tsx tests/validation/quick-validation.ts`
2. ✅ Check this troubleshooting guide
3. ✅ Search existing GitHub issues
4. ✅ Collect relevant logs and system information
5. ✅ Try the suggested solutions above

---

## Prevention Tips

### Regular Maintenance

```bash
# Weekly maintenance
docker system prune
npm audit fix
npm update

# Monthly maintenance
docker-compose pull  # Update base images
npm run db:migrate   # Apply any new migrations
```

### Monitoring

```bash
# Set up health monitoring
curl -f http://localhost:3000/api/health || echo "Service down"

# Monitor disk space
df -h

# Monitor memory usage
free -h
```

### Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres ai_receptionist > backup.sql

# Backup configuration
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

This troubleshooting guide covers the most common issues. For specific problems not covered here, please check the other documentation files or contact support.
