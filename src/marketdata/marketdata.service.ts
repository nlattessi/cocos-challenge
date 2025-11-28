import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marketdata } from './marketdata.entity';

export const ORDERED_MARKETDATA_QUERY = `
    SELECT id, instrumentid, ROW_NUMBER () OVER (PARTITION BY instrumentid ORDER BY date DESC) as row_num
    FROM marketdata`;

@Injectable()
export class MarketdataService {
    constructor(
        @InjectRepository(Marketdata)
        private readonly marketdataRepository: Repository<Marketdata>,
    ) { }

    async findOne(id: number): Promise<Marketdata> {
        const marketdata = await this.marketdataRepository.findOne({
            where: { id },
            relations: {
                instrument: true,
            },
        })

        if (!marketdata) {
            throw new NotFoundException('marketdata with this id not found');
        }

        return marketdata;
    }

    async findLastClosePriceByInstrumentId(instrumentId: number): Promise<number> {
        const marketdata = await this.marketdataRepository
            .createQueryBuilder('marketdata')
            .select('marketdata.close')
            .where('marketdata.instrumentid = :instrumentId', { instrumentId })
            .orderBy('date', 'DESC')
            .limit(1)
            .getOne();

        if (!marketdata) {
            throw new NotFoundException('marketdata with this id not found');
        }

        return marketdata.close;
    }

    async findLastClosePriceByTicker(ticker: string): Promise<number> {
        const marketdata = await this.marketdataRepository
            .createQueryBuilder('marketdata')
            .innerJoin('marketdata.instrument', 'instruments')
            .select('marketdata.close')
            .where('instruments.ticker = :ticker', { ticker })
            .orderBy('date', 'DESC')
            .limit(1)
            .getOne();

        if (!marketdata) {
            throw new NotFoundException('marketdata with this ticker not found');
        }

        return marketdata.close;
    }
}
