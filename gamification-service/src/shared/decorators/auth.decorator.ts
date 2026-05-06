import { SetMetadata, applyDecorators } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Auth = (types: string[]) => {
  return applyDecorators(SetMetadata("authTypes", types));
};
