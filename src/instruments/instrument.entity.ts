import { Exclude } from "class-transformer";
import { Marketdata } from "src/marketdata/marketdata.entity";
import { Order } from "src/orders/order.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { InstrumentType } from "./instruments.enums";

@Entity('instruments')
export class Instrument {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number;

    @Column({ type: 'varchar', length: 10 })
    ticker: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 10 })
    type: InstrumentType;

    @Exclude()
    orders: Order[];

    @OneToMany(
        () => Marketdata,
        (marketdata: Marketdata) => marketdata.instrument,
    )
    marketdata: Marketdata[];
}
