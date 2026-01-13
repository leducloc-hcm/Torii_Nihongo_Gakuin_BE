export interface JanusResponse {
  janus: string
  session_id?: number
  handle_id?: number
  transaction: string
  data?: any
  plugindata?: {
    plugin: string
    data: any
  }
  jsep?: {
    type: string
    sdp: string
  }
  error?: {
    code: number
    reason: string
  }
}

export interface JanusRequest {
  janus: string
  session_id?: number
  handle_id?: number
  transaction: string
  body?: any
  jsep?: {
    type: string
    sdp: string
  }
}

export interface JanusCreateRoomRequest extends JanusRequest {
  body: {
    request: 'create'
    room: number
    publishers?: number
    bitrate?: number
    bitrate_cap?: boolean
    fir_freq?: number
    audiocodec?: string
    videocodec?: string
    description?: string
    is_private?: boolean
    record?: boolean
    rec_dir?: string
  }
}

export interface JanusJoinRoomRequest extends JanusRequest {
  body: {
    request: 'join'
    room: number
    ptype: 'publisher' | 'subscriber'
    display: string
    streams?: Array<{
      feed: number
      mid?: string
    }>
  }
}

export interface JanusPublishRequest extends JanusRequest {
  body: {
    request: 'publish'
    audio?: boolean
    video?: boolean
    data?: boolean
    audiocodec?: string
    videocodec?: string
    bitrate?: number
    keyframe?: boolean
    record?: boolean
    filename?: string
  }
}

export interface JanusSubscribeRequest extends JanusRequest {
  body: {
    request: 'join'
    room: number
    ptype: 'subscriber'
    streams: Array<{
      feed: number
      mid?: string
    }>
    display: string
  }
}

export interface JanusLeaveRequest extends JanusRequest {
  body: {
    request: 'leave'
    room?: number
  }
}

export interface JanusListParticipantsRequest extends JanusRequest {
  body: {
    request: 'listparticipants'
    room: number
  }
}

export interface JanusTrickleRequest extends JanusRequest {
  janus: 'trickle'
  candidate:
    | {
        candidate: string
        sdpMid: string
        sdpMLineIndex: number
      }
    | { completed: true }
}

export interface JanusKeepAliveRequest {
  janus: 'keepalive'
  session_id: number
  transaction: string
}

export interface JanusParticipant {
  id: number
  display: string
  publisher: boolean
  talking?: boolean
}

export interface JanusStreamInfo {
  mid: string
  mindex: number
  type: 'audio' | 'video' | 'data'
  codec?: string
  ready: boolean
  send: boolean
}

export interface JanusEventData {
  videoroom: string
  room?: number
  participants?: JanusParticipant[]
  streams?: JanusStreamInfo[]
  publishers?: JanusParticipant[]
  leaving?: number
  unpublished?: number
  error_code?: number
  error?: string
}

export interface JanusPluginData {
  plugin: string
  data: JanusEventData
}

export interface JanusEvent extends JanusResponse {
  plugindata: JanusPluginData
  jsep?: {
    type: string
    sdp: string
  }
}

// Configuration interfaces
export interface JanusConfig {
  httpUrl: string
  wsUrl: string
  adminSecret?: string
  apiSecret?: string
  iceServers?: RTCIceServer[]
}

export interface VideoRoomConfig {
  maxPublishers: number
  maxSubscribers: number
  bitrate: number
  bitrateCap: boolean
  firFreq: number
  audioCodec: 'opus' | 'g722' | 'pcmu' | 'pcma'
  videoCodec: 'vp8' | 'vp9' | 'h264'
  recordingEnabled: boolean
  recordingDir?: string
}

// Error types
export enum JanusErrorCode {
  UNKNOWN_ERROR = 458,
  SESSION_NOT_FOUND = 459,
  HANDLE_NOT_FOUND = 460,
  PLUGIN_NOT_FOUND = 461,
  PLUGIN_ATTACH_FAILED = 462,
  PLUGIN_MESSAGE_FAILED = 463,
  PLUGIN_DETACH_FAILED = 464,
  JSEP_UNKNOWN_TYPE = 465,
  JSEP_INVALID_SDP = 466,
  UNAUTHORIZED = 403,
  MISSING_PARAMETER = 456,
  INVALID_PARAMETER = 457,
}

export interface JanusError {
  code: JanusErrorCode
  reason: string
}
