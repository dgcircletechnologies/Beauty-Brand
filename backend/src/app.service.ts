import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `Success ${new Date().toISOString()}`;
  }
}
