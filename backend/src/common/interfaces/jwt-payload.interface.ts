export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends JwtPayload {
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}
