import { Exclude, Expose, Transform } from "class-transformer";

export class AssetEntity {
    @Expose()
    name: string;

    @Expose()
    ticker: string;

    @Expose()
    sharesAmount: number;

    @Expose()
    @Transform(({ value }) => +value.toFixed(2))
    totalValue: number;

    @Expose()
    @Transform(({ value }) => +value.toFixed(2))
    performance: number;

    @Exclude()
    lastClosePrice: number;
}