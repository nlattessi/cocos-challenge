import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module';
import { Instrument } from './instruments/instrument.entity';
import { InstrumentsModule } from './instruments/instruments.module';
import { Marketdata } from './marketdata/marketdata.entity';
import { MarketdataModule } from './marketdata/marketdata.module';
import { Order } from './orders/order.entity';
import { OrdersModule } from './orders/orders.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST') || '127.0.0.1',
        port: parseInt(configService.get<string>('DATABASE_PORT') ?? '') || 5432,
        username: configService.get<string>('DATABASE_USER') || 'postgres',
        password: configService.get<string>('DATABASE_PASS'),
        database: configService.get<string>('DATABASE_NAME') || 'cocos',
        entities: [User, Instrument, Order, Marketdata],
        synchronize: false,
        logging: configService.get<string>('DATABASE_LOGGING') === 'true',
        ssl: configService.get<string>('DATABASE_SSL') === 'true',
      }),
    }),
    UsersModule,
    InstrumentsModule,
    OrdersModule,
    MarketdataModule,
    PortfolioModule,
    AccountsModule,
  ],
})
export class AppModule { }
