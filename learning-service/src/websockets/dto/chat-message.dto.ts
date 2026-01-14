import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  type: z.enum(['public', 'private']).default('public'),
  recipientId: z.string().optional(), // Required for private messages
  timestamp: z.number().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['file', 'image', 'document']),
        url: z.string().url(),
        filename: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
})

export class ChatMessageDto extends createZodDto(ChatMessageSchema) {}

const ChatMessageResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: z.enum(['public', 'private']),
  senderId: z.string(),
  senderName: z.string(),
  recipientId: z.string().optional(),
  timestamp: z.number(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['file', 'image', 'document']),
        url: z.string().url(),
        filename: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
})

export class ChatMessageResponseDto extends createZodDto(ChatMessageResponseSchema) {}
