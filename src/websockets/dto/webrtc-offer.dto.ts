import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const WebRtcOfferSchema = z.object({
  sdp: z.string().min(1, 'SDP cannot be empty'),
  audio: z.boolean().optional().default(true),
  video: z.boolean().optional().default(true),
  data: z.boolean().optional().default(false),
  type: z.string().optional().default('offer'),
})

export class WebRtcOfferDto extends createZodDto(WebRtcOfferSchema) {}
