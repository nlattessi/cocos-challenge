import { Exclude } from "class-transformer";
import { ColumnNumericTransformer } from "src/common/transformers/column.numeric.transformer";
import { Instrument } from "src/instruments/instrument.entity";
import { User } from "src/users/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrderSide, OrderStatus, OrderType } from "./orders.enums";

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number;

    @Column({ type: 'int' })
    size: number;

    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    price: number;

    @Column({ type: 'varchar', length: 10 })
    type: OrderType;

    @Column({ type: 'varchar', length: 10 })
    side: OrderSide;

    @Column({ type: 'varchar', length: 20 })
    status: OrderStatus;

    @Column({ type: "timestamp without time zone" })
    datetime: Date;

    @ManyToOne(
        () => User,
        (user: User) => user.orders,
    )
    @JoinColumn({ name: 'userid' })
    @Exclude()
    user: User;

    @ManyToOne(
        () => Instrument,
        (instrumet: Instrument) => instrumet.orders
    )
    @JoinColumn({ name: 'instrumentid' })
    instrument: Instrument;
}
