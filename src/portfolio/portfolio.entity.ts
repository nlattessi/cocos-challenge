import { Expose, Type } from "class-transformer";
import { AssetEntity } from "./asset.entity";

export class PortfolioEntity {
    @Expose()
    accountTotal: number;

    @Expose()
    arsAvailable: number;

    @Type(() => AssetEntity)
    @Expose()
    assets: AssetEntity[];
}
