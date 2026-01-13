import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { WebSocket } from 'ws'

@Injectable()
export class JanusWebSocketManager implements OnModuleDestroy {
  private readonly logger = new Logger(JanusWebSocketManager.name)
   
  private ws: WebSocket | null = null
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void
      reject: (error: any) => void
      timeout: NodeJS.Timeout
    }
  >()
  private isConnecting = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 2000 // 2 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null

  // Add ICE server configuration
  private readonly iceServers = [
    {
      urls: process.env.JANUS_STUN_URL || 'stun:janus.torii-nihongo-gakuin.io.vn:3478',
    },
    {
      urls: process.env.JANUS_TURN_URL || 'turn:janus.torii-nihongo-gakuin.io.vn:3478',
      username: process.env.JANUS_TURN_USERNAME || 'turnuser',
      credential: process.env.JANUS_TURN_PASSWORD || 'turnpassword',
    },
  ]

  constructor() {
    this.connect()
  }

  onModuleDestroy() {
    this.cleanup()
  }

  private connect() {
    if (this.isConnecting) {
      return
    }

    const janusWsUrl = process.env.JANUS_WS_URL
    if (!janusWsUrl) {
      this.logger.error('JANUS_WS_URL environment variable is not set')
      return
    }

    this.isConnecting = true
    this.logger.log(`Attempting to connect to Janus WebSocket: ${janusWsUrl}`)

    try {
      this.ws = new WebSocket(janusWsUrl, ['janus-protocol'], {
        handshakeTimeout: 5000, // 5 second timeout
        perMessageDeflate: false, // Disable compression for better compatibility
        headers: {
          Origin: 'http://localhost',
          'User-Agent': 'Torii-Nihongo-Gakuin/1.0',
        },
      })

      this.ws.on('open', () => {
        this.logger.log('✅ Successfully connected to Janus WebSocket')
        this.isConnecting = false
        this.reconnectAttempts = 0

        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      })

      this.ws.on('message', (data: Buffer | string) => {
        try {
          const messageString = data.toString()
          const response = JSON.parse(messageString)
          const transaction = response.transaction

          if (transaction && this.pendingRequests.has(transaction)) {
            const pending = this.pendingRequests.get(transaction)!
            clearTimeout(pending.timeout)
            this.pendingRequests.delete(transaction)
            pending.resolve(response)
          } else {
            // Handle non-transactional messages (events, keepalives, etc.)
            this.logger.debug('Received non-transactional message:', response)
          }
        } catch (error) {
          this.logger.error('Error parsing Janus response:', error)
        }
      })

      this.ws.on('error', (error) => {
        this.logger.error('Janus WebSocket error:', error)
        this.isConnecting = false
        this.handleConnectionFailure()
      })

      this.ws.on('close', (code, reason) => {
        this.logger.warn(`Janus WebSocket connection closed. Code: ${code}, Reason: ${reason}`)
        this.isConnecting = false
        this.ws = null

        // Reject all pending requests
        this.rejectPendingRequests(new Error('WebSocket connection closed'))

        // Attempt to reconnect if not intentionally closed
        if (code !== 1000) {
          // 1000 = normal closure
          this.handleConnectionFailure()
        }
      })
    } catch (error) {
      this.logger.error('Error creating WebSocket connection:', error)
      this.isConnecting = false
      this.handleConnectionFailure()
    }
  }

  async sendAsync(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Try to reconnect if not connected
        if (!this.isConnecting) {
          this.logger.warn('WebSocket not connected, attempting to reconnect...')
          this.connect()
        }
        reject(new Error('WebSocket not connected. Connection attempt initiated.'))
        return
      }

      const transaction = message.transaction || this.generateTransaction()
      message.transaction = transaction

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(transaction)
        reject(new Error(`Request timeout for transaction: ${transaction}`))
      }, 10000)

      this.pendingRequests.set(transaction, { resolve, reject, timeout })

      try {
        this.ws.send(JSON.stringify(message))
        this.logger.debug(`Sent message with transaction: ${transaction}`)
      } catch (error) {
        // Clean up on send error
        clearTimeout(timeout)
        this.pendingRequests.delete(transaction)
        this.logger.error('Error sending message:', error)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async attachPluginAsync(sessionId: number, plugin: string): Promise<number | null> {
    const message = {
      janus: 'attach',
      session_id: sessionId,
      plugin: plugin,
      transaction: this.generateTransaction(),
    }

    const response = await this.sendAsync(message)

    if (response.janus === 'success') {
      return response.data?.id || null
    }

    return null
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private handleConnectionFailure() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`)
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff

    this.logger.warn(
      `Connection failed. Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`,
    )

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private rejectPendingRequests(error: Error) {
    for (const [transaction, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }

  private cleanup() {
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Reject all pending requests
    this.rejectPendingRequests(new Error('WebSocket manager is being destroyed'))

    // Close WebSocket connection
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Normal closure')
    }
    this.ws = null
  }

  // Public method to check connection status
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Public method to manually reconnect
  public async reconnect(): Promise<void> {
    this.logger.log('Manual reconnection requested')
    this.cleanup()
    this.reconnectAttempts = 0
    this.connect()

    // Wait for connection to be established
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.isConnected()) {
          resolve()
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to reconnect after maximum attempts'))
        } else {
          setTimeout(checkConnection, 100)
        }
      }
      checkConnection()
    })
  }

  // Add method to get ICE servers
  public getIceServers() {
    return this.iceServers
  }
}
