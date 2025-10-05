import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import * as React from 'react'
import { OTPEmail } from 'emails/otp'

@Injectable()
export class EmailService {
  private resend: Resend
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }
  async sendOTP(payload: { email: string; code: string }) {
    const subject = 'Mã OTP'
    return await this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [payload.email],
      subject,
      react: <OTPEmail otpCode={payload.code} title={subject} />,
    })
  }
}
