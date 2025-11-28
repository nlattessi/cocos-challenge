import { Module } from '@nestjs/common';
import { OrdersModule } from 'src/orders/orders.module';
import { UsersModule } from 'src/users/users.module';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [UsersModule, OrdersModule],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule { }
