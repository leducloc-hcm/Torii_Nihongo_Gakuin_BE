import { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Server, ServerOptions, Socket } from 'socket.io'
import { SharedWebsocketRepository } from 'src/shared/repositories/shared-websocket.repo'
import { TokenService } from 'src/shared/services/token.service'
export class WebsocketAdapter extends IoAdapter {
  private readonly tokenService: TokenService
  private readonly sharedWebsocketRepository: SharedWebsocketRepository
  constructor(app: INestApplicationContext) {
    super(app)
    this.tokenService = app.get(TokenService)
    this.sharedWebsocketRepository = app.get(SharedWebsocketRepository)
  }
  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        // credentials: true,
      },
    })
    // server.use((socket, next) => {
    //   this.authMiddleware(socket, next)
    //     .then(() => {})
    //     .catch(() => {})
    //   return ''
    // })
    return server
  }
  async authMiddleware(socket: Socket, next: (err?: any) => void) {
    const { authorization } = socket.handshake.headers
    if (!authorization) {
      return next(new Error('Thiếu Authorization header'))
    }
    const accessToken = authorization.split(' ')[1]
    if (!accessToken) {
      return next(new Error('Thiếu access token'))
    }
    try {
      const { userId } = await this.tokenService.verifyAccessToken(accessToken)
      await this.sharedWebsocketRepository.create({
        id: socket.id,
        userId,
      })
      socket.on('disconnect', async () => {
        await this.sharedWebsocketRepository.delete(socket.id).catch(() => {})
      })
      next()
    } catch (error) {
      next(error)
    }
  }
}
