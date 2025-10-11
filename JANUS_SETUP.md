# Janus WebRTC Gateway Setup and Troubleshooting Guide

## Overview

This guide helps you set up and troubleshoot the Janus WebRTC Gateway connection for the Torii Nihongo Gakuin online class system.

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```bash
# Janus WebRTC Gateway Configuration
JANUS_WS_URL=ws://localhost:8188
JANUS_API_SECRET=janusrocks
JANUS_ADMIN_SECRET=your_admin_secret_here
JANUS_HTTP_URL=http://localhost:8088/janus
```

### Janus Gateway Installation

#### Option 1: Docker (Recommended for Development)

```bash
# Run Janus in Docker
docker run -d --name janus-gateway \
  -p 8088:8088 \
  -p 8188:8188 \
  -p 8989:8989 \
  -p 10000-10200:10000-10200/udp \
  canyan/janus-gateway:latest
```

#### Option 2: Manual Installation (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install libmicrohttpd-dev libjansson-dev \
  libssl-dev libsrtp2-dev libsofia-sip-ua-dev libglib2.0-dev \
  libopus-dev libogg-dev libcurl4-openssl-dev liblua5.3-dev \
  libconfig-dev pkg-config gengetopt libtool automake

# Clone and build Janus
git clone https://github.com/meetecho/janus-gateway.git
cd janus-gateway
sh autogen.sh
./configure --prefix=/opt/janus
make
sudo make install
sudo make configs
```

## Connection Issues and Troubleshooting

### Common Error: ECONNRESET (Socket Hang Up)

This error typically occurs when:

1. Janus Gateway is not running
2. Incorrect WebSocket URL
3. Network connectivity issues
4. Janus Gateway is rejecting connections

### Troubleshooting Steps

#### 1. Verify Janus Gateway is Running

```bash
# Check if Janus is running
curl http://localhost:8088/janus/info

# Expected response should include Janus version info
```

#### 2. Test WebSocket Connection

```bash
# Test WebSocket connectivity using wscat (install with: npm install -g wscat)
wscat -c ws://localhost:8188

# You should see a connection established message
```

#### 3. Check Environment Variables

```bash
# Verify environment variables are loaded
echo $JANUS_WS_URL
echo $JANUS_API_SECRET
```

#### 4. Verify Janus Configuration

Check `/opt/janus/etc/janus/janus.jcfg` for:

```json
{
  "general": {
    "api_secret": "janusrocks",
    "admin_secret": "your_admin_secret"
  },
  "transports": {
    "janus.transport.websockets": {
      "general": {
        "ws": true,
        "ws_port": 8188,
        "wss": false
      }
    }
  }
}
```

#### 5. Check Firewall and Network

```bash
# Check if ports are open
sudo netstat -tulpn | grep :8088
sudo netstat -tulpn | grep :8188

# Test connectivity
telnet localhost 8088
telnet localhost 8188
```

## System Architecture

### Connection Flow

1. **Application Startup**: JanusWebSocketManager attempts connection
2. **Connection Established**: WebSocket connection to Janus Gateway
3. **Session Creation**: Create Janus session for each user
4. **Plugin Attachment**: Attach VideoRoom plugin
5. **Room Management**: Create/join video conference rooms

### Automatic Recovery Features

- **Reconnection Logic**: Exponential backoff (2s, 4s, 8s, 16s, 32s)
- **Session Management**: Tracks active sessions and cleans up on disconnect
- **Error Handling**: Graceful degradation with detailed logging
- **Retry Logic**: Service methods retry up to 3 times on failure

## Monitoring and Logging

### Log Levels

- **INFO**: Connection establishment, session creation
- **WARN**: Connection issues, reconnection attempts
- **ERROR**: Critical failures, max retries reached
- **DEBUG**: Message transactions, detailed flow

### Health Check Endpoint

Add this to your application for monitoring:

```typescript
@Get('/health/janus')
async checkJanusHealth() {
  const isConnected = this.janusWebSocketManager.isConnected()
  return {
    status: isConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    janus: {
      connected: isConnected,
      url: process.env.JANUS_WS_URL
    }
  }
}
```

## Performance Optimization

### Connection Settings

- **Handshake Timeout**: 5 seconds
- **Message Compression**: Disabled for better compatibility
- **Keep-alive**: Automatic through WebSocket ping/pong
- **Max Reconnect Attempts**: 5 with exponential backoff

### Resource Management

- **Session Cleanup**: Automatic cleanup on module destroy
- **Memory Management**: Pending request cleanup on connection loss
- **Timeout Handling**: 10-second timeout for all requests

## Production Deployment

### Docker Compose Example

```yaml
version: '3.8'
services:
  janus:
    image: canyan/janus-gateway:latest
    ports:
      - '8088:8088'
      - '8188:8188'
      - '8989:8989'
      - '10000-10200:10000-10200/udp'
    volumes:
      - ./janus.jcfg:/opt/janus/etc/janus/janus.jcfg
    restart: unless-stopped

  app:
    build: .
    environment:
      - JANUS_WS_URL=ws://janus:8188
      - JANUS_API_SECRET=janusrocks
    depends_on:
      - janus
```

### SSL/TLS Configuration

For production, use secure WebSocket connections:

```bash
# Environment variables for production
JANUS_WS_URL=wss://your-domain.com:8189
JANUS_HTTP_URL=https://your-domain.com:8089/janus
```

## Debugging Commands

### Real-time Connection Monitoring

```bash
# Monitor WebSocket connections
sudo lsof -i :8188

# Watch Janus logs
tail -f /var/log/janus.log

# Monitor application logs
pm2 logs your-app --lines 100
```

### Test Message Flow

```javascript
// Test basic Janus communication
const ws = new WebSocket('ws://localhost:8188')
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      janus: 'info',
      transaction: 'test-123',
    }),
  )
}
```

## Support

If issues persist:

1. Check Janus Gateway documentation: https://janus.conf.meetecho.com/docs/
2. Verify system requirements and dependencies
3. Review application logs for detailed error messages
4. Test with minimal Janus configuration

## Recent Improvements

### Enhanced Error Handling (Latest Update)

- ✅ Exponential backoff reconnection
- ✅ Automatic connection recovery
- ✅ Better error logging and categorization
- ✅ Graceful service degradation
- ✅ Connection status monitoring
- ✅ Request timeout management
- ✅ Resource cleanup on failures
