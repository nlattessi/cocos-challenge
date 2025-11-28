import { Module } from '@nestjs/common';
import { PortfolioModule } from 'src/portfolio/portfolio.module';
import { AccountsController } from './accounts.controller';

@Module({
    imports: [PortfolioModule],
    controllers: [AccountsController],
})
export class AccountsModule { }
