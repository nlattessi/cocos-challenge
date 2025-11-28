import { ClassSerializerInterceptor, Controller, Get, Param, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { PortfolioEntity } from 'src/portfolio/portfolio.entity';
import { PortfolioService } from 'src/portfolio/portfolio.service';

@Controller('accounts')
export class AccountsController {
    constructor(private readonly portfolioService: PortfolioService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ type: PortfolioEntity })
    @Get(':accountNumber/portfolio')
    async getPortfolio(@Param('accountNumber') accountNumber: string): Promise<PortfolioEntity> {
        return await this.portfolioService.getPortfolioByAccountNumber(accountNumber);
    }
}
