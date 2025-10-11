import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const WebRtcAnswerSchema = z.object({
  sdp: z.string().min(1, 'SDP cannot be empty'),
  type: z.string().optional().default('answer'),
})

export class WebRtcAnswerDto extends createZodDto(WebRtcAnswerSchema) {}

const IceCandidateSchema = z.object({
  candidate: z.string().min(1, 'Candidate cannot be empty'),
  sdpMid: z.string().min(1, 'SDP MID cannot be empty'),
  sdpMLineIndex: z.number().int().min(0, 'SDP MLine index must be a non-negative integer'),
})

export class IceCandidateDto extends createZodDto(IceCandidateSchema) {}
