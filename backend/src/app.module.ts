import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { PublicModule } from './public/public.module';
import { CurrencyModule } from './currency/currency.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    CurrencyModule,
    CartModule,
    AdminModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
