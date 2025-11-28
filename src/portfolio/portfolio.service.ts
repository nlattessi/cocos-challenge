import { Injectable } from '@nestjs/common';
import { OrderSide } from 'src/orders/orders.enums';
import { OrdersService } from 'src/orders/orders.service';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { AssetEntity } from './asset.entity';
import { PortfolioEntity } from './portfolio.entity';

@Injectable()
export class PortfolioService {
    constructor(
        private readonly usersService: UsersService,
        private readonly ordersService: OrdersService,
    ) { }

    public async getPortfolioByAccountNumber(accountNumber: string): Promise<PortfolioEntity> {
        const user = await this.usersService.findOneByAccountNumber(accountNumber);

        const arsAvailable = await this.ordersService.getTotalCashInArsFromOrdersByUserId(user);

        const assets = await this.getAssets(user);

        const accountTotal = assets.reduce((sum, { totalValue }) => sum + totalValue, 0) + arsAvailable;

        return { accountTotal, arsAvailable, assets: Array.from(assets.values()) } as PortfolioEntity;
    }

    private async getAssets(user: User): Promise<AssetEntity[]> {
        const assetsMap = new Map<number, AssetEntity>();

        const orders = await this.ordersService.findAllFilledStockOrdersWithLatestMarketdataByUser(user);

        // Proceso las ordenes agrupando por instrumento
        for (const order of orders) {
            const { side, price, instrument } = order;
            const { name, ticker } = instrument;

            const lastClosePrice = instrument.marketdata.at(0)?.close ?? 0;

            let { size: sharesAmount } = order;
            let totalValue = sharesAmount * price;

            if (side === OrderSide.Sell) {
                sharesAmount *= -1
                totalValue *= -1
            }

            let asset = assetsMap.get(instrument.id);

            if (asset === undefined) {
                asset = { name, ticker, sharesAmount, totalValue, lastClosePrice } as AssetEntity;
            } else {
                asset.sharesAmount += sharesAmount;
                asset.totalValue += totalValue;
            }

            assetsMap.set(instrument.id, asset);
        }

        // Descarto activos que no tengan acciones o sea un valor negativo
        // (dado que entiendo no sería un caso válido pero puede darse según el estado de la DB de prueba)
        const assets = Array.from(assetsMap.values()).filter(asset => asset.sharesAmount > 0);

        assets.map(async asset => {
            const { lastClosePrice, sharesAmount, totalValue } = asset;

            // Calculo de rentabilidad usado:
            // 1. ingreso - inversión = <beneficio>
            // 2. (<beneficio> / inversión) * 100 = rentabilidad
            // https://www.bbva.com/es/salud-financiera/como-calcular-la-rentabilidad-de-una-inversion
            const income = lastClosePrice * sharesAmount;
            const investment = totalValue;
            const profit = income - investment;
            const performance = (profit / investment) * 100;

            // Trunca el valor a 2 dígitos y lo deja como númerico en vez de string;
            // asset.performance = +(performance).toFixed(2);
            asset.performance = performance;

            return asset;
        });

        return assets;
    }
}
