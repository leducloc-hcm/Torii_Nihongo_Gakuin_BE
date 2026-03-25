import { Injectable } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { GoogleAuthStateType } from "src/routes/auth/auth.model";
import { AuthRepository } from "src/routes/auth/auth.repo";
import { AuthService } from "src/routes/auth/auth.service";
import { GoogleUserInfoError } from "src/routes/auth/auth.error";
import { HashingService } from "src/shared/services/hashing.service";
import { v4 as uuidv4 } from "uuid";
import { RoleName } from "src/shared/constants/role.constant";
import { VerifyStatus } from "src/shared/constants/auth.constant";
import { ProfileService } from "../profile/profile.service";
import { CartService } from "../cart/cart.service";
import {
  parseDeviceInfo,
  getLocationFromIp,
} from "src/shared/device-info.helper";

const MAX_DEVICES_PER_USER = 2;

@Injectable()
export class GoogleService {
  private oauth2Client: OAuth2Client;
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
    private readonly cartService: CartService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }
  getAuthorizationUrl({ userAgent, ip }: GoogleAuthStateType) {
    const scope = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ];
    // Chuyển Object sang string base64 an toàn bỏ lên url
    const stateString = Buffer.from(
      JSON.stringify({
        userAgent,
        ip,
      }),
    ).toString("base64");
    const url = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope,
      include_granted_scopes: true,
      state: stateString,
    });
    return { url };
  }
  async googleCallback({ code, state }: { code: string; state: string }) {
    try {
      let userAgent = "Unknown";
      let ip = "Unknown";
      // 1. Lấy state từ url
      try {
        if (state) {
          const clientInfo = JSON.parse(
            Buffer.from(state, "base64").toString(),
          ) as GoogleAuthStateType;
          userAgent = clientInfo.userAgent;
          ip = clientInfo.ip;
        }
      } catch (error) {
        console.error("Error parsing state", error);
      }
      // 2. Dùng code để lấy token
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // 3. Lấy thông tin google user
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: "v2",
      });
      const { data } = await oauth2.userinfo.get();
      if (!data.email) {
        throw GoogleUserInfoError;
      }

      let user = await this.authRepository.findUniqueUserIncludeRole({
        email: data.email,
      });
      // Nếu không có user tức là người mới, vậy nên sẽ tiến hành đăng ký
      if (!user) {
        const randomPassword = uuidv4();
        const hashedPassword = await this.hashingService.hash(randomPassword);
        user = await this.authRepository.createUserInclueRole({
          email: data.email,
          name: data.name ?? "",
          password: hashedPassword,
          status: VerifyStatus.VERIFIED,
        });

        // Create profile and initialize cart for the new user
        await Promise.all([
          this.profileService.createProfile({
            email: data.email,
            name: data.name ?? "",
            role: RoleName.Customer,
          }),
          this.cartService.initCart(user.id),
        ]);
      }
      // Enforce device limit: max 2 active devices per user
      const activeDevices = await this.authRepository.findActiveDevicesByUserId(
        user.id,
      );
      if (activeDevices.length >= MAX_DEVICES_PER_USER) {
        const devicesToRemove = activeDevices.slice(
          0,
          activeDevices.length - MAX_DEVICES_PER_USER + 1,
        );
        await Promise.all(
          devicesToRemove.map((d) =>
            this.authRepository.deactivateDeviceAndDeleteTokens(d.id),
          ),
        );
      }

      const parsedDevice = parseDeviceInfo(userAgent);
      const location = await getLocationFromIp(ip);

      const device = await this.authRepository.createDevice({
        userId: user.id,
        userAgent,
        ip,
        deviceName: parsedDevice.deviceName,
        browserName: parsedDevice.browserName,
        osName: parsedDevice.osName,
        location,
      });
      const authTokens = await this.authService.generateTokens({
        userId: user.id,
        email: user.email,
        deviceId: device.id,
        role: user.role,
      });
      return authTokens;
    } catch (error) {
      console.error("Error in googleCallback", error);
      throw error;
    }
  }
}
