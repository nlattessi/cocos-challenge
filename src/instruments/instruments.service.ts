
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Marketdata } from 'src/marketdata/marketdata.entity';
import { ORDERED_MARKETDATA_QUERY } from 'src/marketdata/marketdata.service';
import { ILike, Repository } from 'typeorm';
import { FindAllInstrumentsDto } from './dto/find-all.dto';
import { Instrument } from './instrument.entity';

const ARS_TICKER = 'ARS';

@Injectable()
export class InstrumentsService {
    constructor(
        @InjectRepository(Instrument)
        private readonly instrumentsRepository: Repository<Instrument>,
    ) { }

    public async findArsInstrument(): Promise<Instrument> {
        const instrument = await this.instrumentsRepository.findOne({
            where: {
                ticker: ARS_TICKER,
            },
        });

        if (!instrument) {
            throw new NotFoundException("ars instrument not found");
        }

        return instrument;
    }

    public async findOneWithLatestMarketdataByTicker(ticker: string): Promise<Instrument> {
        const instrument = await this.instrumentsRepository
            .createQueryBuilder('instruments')

            .addCommonTableExpression(ORDERED_MARKETDATA_QUERY, 'ordered_marketdata')
            .innerJoinAndSelect('ordered_marketdata', 'om', 'om.instrumentid = instruments.id')
            .innerJoinAndMapMany('instruments.marketdata', Marketdata, 'marketdata', 'marketdata.id = om.id')

            .where('instruments.ticker = :ticker', { ticker })
            .andWhere('om.row_num = 1')

            .getOne();

        if (!instrument) {
            throw new NotFoundException("instrument with this ticker not found");
        }

        return instrument;
    }

    public findAll(findAllDto: FindAllInstrumentsDto): Promise<Instrument[]> {
        const { query } = findAllDto;

        if (!query) {
            return this.instrumentsRepository.find();
        }

        return this.instrumentsRepository.find({
            where: [
                { name: ILike(`%${query}%`) },
                { ticker: ILike(`%${query}%`) },
            ],
        });
    }
}
