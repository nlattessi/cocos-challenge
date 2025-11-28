import { Exclude } from "class-transformer";
import { ColumnNumericTransformer } from "src/common/transformers/column.numeric.transformer";
import { Instrument } from "src/instruments/instrument.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('marketdata')
export class Marketdata {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number;

    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    high: number;

    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    low: number;

    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    open: number;

    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    close: number;

    @Column({
        name: 'previousclose',
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    previousClose: number;

    @Column({ type: 'date' })
    date: string;

    @ManyToOne(
        () => Instrument,
        (instrument: Instrument) => instrument.marketdata,
    )
    @JoinColumn({ name: 'instrumentid' })
    @Exclude()
    instrument: Instrument
}
